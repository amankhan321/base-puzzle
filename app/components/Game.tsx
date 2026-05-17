'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount, useConnect, useDisconnect, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import sdk from '@farcaster/miniapp-sdk'

const CONTRACT_ADDRESS = '0x9C5fc82C59944f1184fF399d816a3423b6bC2724' as `0x${string}`
const CONTRACT_ABI = [{ name: 'saveScore', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_score', type: 'uint256' }, { name: '_lines', type: 'uint256' }, { name: '_level', type: 'uint256' }], outputs: [] }] as const

const COLS = 10
const ROWS = 18

const PIECES = [
  { shape: [[1,1,1,1]], color: '#22d3ee' },
  { shape: [[1],[1],[1],[1]], color: '#22d3ee' },
  { shape: [[1,1],[1,1]], color: '#facc15' },
  { shape: [[0,1,0],[1,1,1]], color: '#a855f7' },
  { shape: [[1,0],[1,0],[1,1]], color: '#f97316' },
  { shape: [[0,1],[0,1],[1,1]], color: '#3b82f6' },
  { shape: [[0,1,1],[1,1,0]], color: '#4ade80' },
  { shape: [[1,1,0],[0,1,1]], color: '#f43f5e' },
]

const THEMES = [
  { primary: '#6366f1', secondary: '#818cf8', glow: 'rgba(99,102,241,0.6)' },
  { primary: '#22d3ee', secondary: '#67e8f9', glow: 'rgba(34,211,238,0.6)' },
  { primary: '#a855f7', secondary: '#c084fc', glow: 'rgba(168,85,247,0.6)' },
  { primary: '#f97316', secondary: '#fb923c', glow: 'rgba(249,115,22,0.6)' },
  { primary: '#f43f5e', secondary: '#fb7185', glow: 'rgba(244,63,94,0.6)' },
]

type Board = (string | null)[][]
type Piece = { shape: number[][], color: string, x: number, y: number }

function createBoard(): Board { return Array(ROWS).fill(null).map(() => Array(COLS).fill(null)) }

let bag: number[] = []
function randomPiece(): Piece {
  if (bag.length === 0) {
    bag = [...Array(PIECES.length).keys()]
    for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[bag[i], bag[j]] = [bag[j], bag[i]] }
  }
  const p = PIECES[bag.pop()!]
  return { shape: p.shape.map(r => [...r]), color: p.color, x: Math.floor(COLS / 2) - Math.floor(p.shape[0].length / 2), y: 0 }
}

function rotate(shape: number[][]): number[][] { return shape[0].map((_, i) => shape.map(row => row[i]).reverse()) }

function isValid(board: Board, piece: Piece, dx = 0, dy = 0, ns?: number[][]): boolean {
  const shape = ns || piece.shape
  for (let r = 0; r < shape.length; r++) for (let c = 0; c < shape[r].length; c++) {
    if (!shape[r][c]) continue
    const nx = piece.x + c + dx, ny = piece.y + r + dy
    if (nx < 0 || nx >= COLS || ny >= ROWS) return false
    if (ny >= 0 && board[ny][nx]) return false
  }
  return true
}

function placePiece(board: Board, piece: Piece): Board {
  const b = board.map(row => [...row])
  for (let r = 0; r < piece.shape.length; r++) for (let c = 0; c < piece.shape[r].length; c++) {
    if (!piece.shape[r][c]) continue
    const ny = piece.y + r, nx = piece.x + c
    if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) b[ny][nx] = piece.color
  }
  return b
}

function clearLines(board: Board): { board: Board, cleared: number } {
  const kept = board.filter(row => row.some(cell => !cell))
  const cleared = ROWS - kept.length
  return { board: [...Array(cleared).fill(null).map(() => Array(COLS).fill(null)), ...kept], cleared }
}

function getGhostY(board: Board, piece: Piece): number {
  let y = piece.y
  while (isValid(board, { ...piece, y: y + 1 })) y++
  return y
}

// Gem cell renderer
function GemCell({ color, isGhost }: { color: string | null, isGhost: boolean }) {
  if (!color || isGhost) {
    return (
      <div style={{
        aspectRatio: '1',
        background: isGhost ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
        borderRadius: 3,
        border: isGhost ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.04)',
      }} />
    )
  }

  // Parse hex to get darker shade for border
  const r = parseInt(color.slice(1,3), 16)
  const g = parseInt(color.slice(3,5), 16)
  const b = parseInt(color.slice(5,7), 16)
  const dark = `rgba(${Math.floor(r*0.3)},${Math.floor(g*0.3)},${Math.floor(b*0.3)},1)`
  const light = `rgba(${Math.min(255,r+80)},${Math.min(255,g+80)},${Math.min(255,b+80)},1)`
  const mid = `rgba(${r},${g},${b},0.9)`

  return (
    <div style={{
      aspectRatio: '1',
      borderRadius: 3,
      background: `radial-gradient(circle at 35% 35%, ${light} 0%, ${mid} 45%, ${dark} 100%)`,
      border: `1px solid rgba(212,175,55,0.7)`,
      boxShadow: `0 0 6px ${color}90, inset 0 1px 1px rgba(255,255,255,0.4), inset 0 -1px 1px rgba(0,0,0,0.4)`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* shine dot */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '18%',
        width: '22%',
        height: '22%',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.7)',
        filter: 'blur(1px)',
      }} />
      {/* second shine */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '10%',
        width: '40%',
        height: '40%',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
      }} />
    </div>
  )
}

export default function Game() {
  const [isReady, setIsReady] = useState(false)
  const [board, setBoard] = useState<Board>(createBoard())
  const [current, setCurrent] = useState<Piece>(randomPiece)
  const [next, setNext] = useState<Piece>(randomPiece)
  const [held, setHeld] = useState<Piece | null>(null)
  const [canHold, setCanHold] = useState(true)
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [totalLines, setTotalLines] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [paused, setPaused] = useState(false)
  const [combo, setCombo] = useState(0)
  const [showCombo, setShowCombo] = useState(false)
  const [flashBoard, setFlashBoard] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [showSavePrompt, setShowSavePrompt] = useState(false)
  const [missions, setMissions] = useState([
    { id: 1, text: 'Clear 5 lines', target: 5, current: 0, done: false },
    { id: 2, text: 'Reach Lvl 3', target: 3, current: 1, done: false },
    { id: 3, text: 'Score 1000', target: 1000, current: 0, done: false },
  ])

  const boardRef = useRef<Board>(createBoard())
  const currentRef = useRef<Piece>(current)
  const nextRef = useRef<Piece>(next)
  const gameOverRef = useRef(false)
  const pausedRef = useRef(false)
  const scoreRef = useRef(0)
  const levelRef = useRef(1)
  const totalLinesRef = useRef(0)
  const comboRef = useRef(0)

  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  useEffect(() => {
    sdk.actions.ready()
    setIsReady(true)
    const s = localStorage.getItem('basepuzzle_best')
    if (s) setBestScore(parseInt(s))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

useEffect(() => {
    if (!isReady) return
    const fc = connectors.find(c => c.id === 'farcasterMiniApp')
    if (fc) connect({ connector: fc })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady])

  useEffect(() => {
    if (connectors.length === 0) return
    setTimeout(() => {
      const fcConnector = connectors.find(c => c.id === 'farcasterMiniApp')
      const cbConnector = connectors.find(c => c.id === 'coinbaseWalletSDK')
      const urlParams = new URLSearchParams(window.location.search)
      const isAppContext = urlParams.get('app') === '1'
      if (isAppContext && cbConnector) {
        connect({ connector: cbConnector })
      } else if (fcConnector) {
        connect({ connector: fcConnector })
      }
    }, 500)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectors])
  useEffect(() => { if (txSuccess) setSaveMsg('✅ Score saved on Base!') }, [txSuccess])

  const spawnNext = useCallback(() => {
    const np = nextRef.current, nn = randomPiece()
    nextRef.current = nn; setNext(nn)
    if (!isValid(boardRef.current, np)) { gameOverRef.current = true; setGameOver(true); return }
    currentRef.current = np; setCurrent(np); setCanHold(true)
  }, [])

  const lockAndClear = useCallback((b: Board, p: Piece) => {
    const placed = placePiece(b, p)
    const { board: cleared, cleared: n } = clearLines(placed)
    boardRef.current = cleared; setBoard(cleared)
    if (n > 0) {
      setFlashBoard(true); setTimeout(() => setFlashBoard(false), 150)
      const nc = comboRef.current + 1; comboRef.current = nc; setCombo(nc); setShowCombo(true); setTimeout(() => setShowCombo(false), 800)
      const pts = ([0,100,300,500,800][n] ?? 800) * levelRef.current + (nc > 1 ? nc * 50 : 0)
      scoreRef.current += pts; totalLinesRef.current += n; levelRef.current = Math.floor(totalLinesRef.current / 10) + 1
      setScore(scoreRef.current); setTotalLines(totalLinesRef.current); setLevel(levelRef.current)
      setBestScore(b2 => { const nb = Math.max(b2, scoreRef.current); localStorage.setItem('basepuzzle_best', nb.toString()); return nb })
      setMissions(prev => prev.map(m => {
        if (m.done) return m
        if (m.id === 1) { const c = Math.min(m.current + n, m.target); return { ...m, current: c, done: c >= m.target } }
        if (m.id === 2) return { ...m, current: levelRef.current, done: levelRef.current >= m.target }
        if (m.id === 3) { const c = Math.min(m.current + pts, m.target); return { ...m, current: c, done: c >= m.target } }
        return m
      }))
      if (n === 4) setShowSavePrompt(true)
    } else { comboRef.current = 0; setCombo(0) }
    spawnNext()
  }, [spawnNext])

  useEffect(() => {
    if (!isReady) return
    const tick = () => {
      if (gameOverRef.current || pausedRef.current) return
      const p = currentRef.current, b = boardRef.current
      if (isValid(b, p, 0, 1)) { const m = { ...p, y: p.y + 1 }; currentRef.current = m; setCurrent(m) }
      else lockAndClear(b, p)
    }
    const id = setInterval(tick, Math.max(80, 600 - (levelRef.current - 1) * 50))
    return () => clearInterval(id)
  }, [isReady, lockAndClear, level])

  const moveLeft = useCallback(() => { if (gameOverRef.current || pausedRef.current) return; const p = currentRef.current; if (isValid(boardRef.current, p, -1, 0)) { const m = { ...p, x: p.x - 1 }; currentRef.current = m; setCurrent(m) } }, [])
  const moveRight = useCallback(() => { if (gameOverRef.current || pausedRef.current) return; const p = currentRef.current; if (isValid(boardRef.current, p, 1, 0)) { const m = { ...p, x: p.x + 1 }; currentRef.current = m; setCurrent(m) } }, [])
  const moveDown = useCallback(() => { if (gameOverRef.current || pausedRef.current) return; const p = currentRef.current, b = boardRef.current; if (isValid(b, p, 0, 1)) { const m = { ...p, y: p.y + 1 }; currentRef.current = m; setCurrent(m) } else lockAndClear(b, p) }, [lockAndClear])

  const rotatePiece = useCallback(() => {
    if (gameOverRef.current || pausedRef.current) return
    const p = currentRef.current, b = boardRef.current, rot = rotate(p.shape)
    for (const dx of [0, 1, -1, 2, -2]) { if (isValid(b, p, dx, 0, rot)) { const m = { ...p, shape: rot, x: p.x + dx }; currentRef.current = m; setCurrent(m); return } }
  }, [])

  const hardDrop = useCallback(() => {
    if (gameOverRef.current || pausedRef.current) return
    const p = currentRef.current, b = boardRef.current, gy = getGhostY(b, p)
    const d = { ...p, y: gy }; currentRef.current = d; setCurrent(d); lockAndClear(b, d)
  }, [lockAndClear])

  const holdPiece = useCallback(() => {
    if (!canHold || gameOverRef.current || pausedRef.current) return
    const p = currentRef.current
    const reset = (pc: Piece): Piece => ({ ...pc, shape: pc.shape.map(r => [...r]), x: Math.floor(COLS / 2) - Math.floor(pc.shape[0].length / 2), y: 0 })
    setHeld(prev => { if (prev) { const r = reset(prev); currentRef.current = r; setCurrent(r) } else spawnNext(); return reset(p) })
    setCanHold(false)
  }, [canHold, spawnNext])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); moveLeft() }
      if (e.key === 'ArrowRight') { e.preventDefault(); moveRight() }
      if (e.key === 'ArrowDown') { e.preventDefault(); moveDown() }
      if (e.key === 'ArrowUp') { e.preventDefault(); rotatePiece() }
      if (e.key === ' ') { e.preventDefault(); hardDrop() }
      if (e.key === 'c') holdPiece()
      if (e.key === 'p') { pausedRef.current = !pausedRef.current; setPaused(x => !x) }
    }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [moveLeft, moveRight, moveDown, rotatePiece, hardDrop, holdPiece])

  useEffect(() => {
    let sx = 0, sy = 0, st = 0
    const ts = (e: TouchEvent) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now() }
    const te = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy
      const dt = Date.now() - st, adx = Math.abs(dx), ady = Math.abs(dy)
      if (dt < 250 && adx < 15 && ady < 15) { rotatePiece(); return }
      if (adx > ady) { if (adx > 20) dx > 0 ? moveRight() : moveLeft() }
      else { if (ady > 20) dy > 0 ? (ady > 100 ? hardDrop() : moveDown()) : rotatePiece() }
    }
    window.addEventListener('touchstart', ts, { passive: true }); window.addEventListener('touchend', te, { passive: true })
    return () => { window.removeEventListener('touchstart', ts); window.removeEventListener('touchend', te) }
  }, [moveLeft, moveRight, moveDown, rotatePiece, hardDrop])

  const resetGame = () => {
    bag = []; const b = createBoard(), c = randomPiece(), n = randomPiece()
    boardRef.current = b; currentRef.current = c; nextRef.current = n
    gameOverRef.current = false; pausedRef.current = false; scoreRef.current = 0; levelRef.current = 1; totalLinesRef.current = 0; comboRef.current = 0
    setBoard(b); setCurrent(c); setNext(n); setHeld(null); setCanHold(true); setScore(0); setLevel(1); setTotalLines(0); setGameOver(false); setPaused(false); setCombo(0); setSaveMsg(''); setShowSavePrompt(false)
    setMissions([{ id: 1, text: 'Clear 5 lines', target: 5, current: 0, done: false }, { id: 2, text: 'Reach Lvl 3', target: 3, current: 1, done: false }, { id: 3, text: 'Score 1000', target: 1000, current: 0, done: false }])
  }

  const handleConnect = async () => {
    try {
      const fc = connectors.find(c => c.id === 'farcasterMiniApp')
      const cb = connectors.find(c => c.id === 'coinbaseWalletSDK')
      const connector = fc || cb || connectors[0]
      if (connector) await connect({ connector })
    } catch (e) {
      console.error('Connect error:', e)
    }
  }
  const saveScore = () => { if (!isConnected) { handleConnect(); return }; if (!scoreRef.current) return; setSaveMsg('Sending...'); writeContract({ address: CONTRACT_ADDRESS, abi: CONTRACT_ABI, functionName: 'saveScore', args: [BigInt(scoreRef.current), BigInt(totalLinesRef.current), BigInt(levelRef.current)] }) }

  const renderBoard = () => {
    const d = board.map(row => [...row]), gy = getGhostY(board, current)
    for (let r = 0; r < current.shape.length; r++) for (let c = 0; c < current.shape[r].length; c++) {
      if (!current.shape[r][c]) continue
      const ny = gy + r, nx = current.x + c
      if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS && !d[ny][nx]) d[ny][nx] = 'ghost'
    }
    for (let r = 0; r < current.shape.length; r++) for (let c = 0; c < current.shape[r].length; c++) {
      if (!current.shape[r][c]) continue
      const ny = current.y + r, nx = current.x + c
      if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) d[ny][nx] = current.color
    }
    return d
  }

  const Mini = ({ piece }: { piece: Piece | null }) => {
    if (!piece) return <div style={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b5563', fontSize: 11 }}>—</div>
    return (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${piece.shape[0].length}, 11px)`, gap: 2 }}>
        {piece.shape.map((row, r) => row.map((cell, c) => {
          if (!cell) return <div key={`${r}-${c}`} style={{ width: 11, height: 11 }} />
          const col = piece.color
          const rv = parseInt(col.slice(1,3),16), gv = parseInt(col.slice(3,5),16), bv = parseInt(col.slice(5,7),16)
          const light = `rgba(${Math.min(255,rv+80)},${Math.min(255,gv+80)},${Math.min(255,bv+80)},1)`
          const dark = `rgba(${Math.floor(rv*0.3)},${Math.floor(gv*0.3)},${Math.floor(bv*0.3)},1)`
          return (
            <div key={`${r}-${c}`} style={{ width: 11, height: 11, borderRadius: 2, background: `radial-gradient(circle at 35% 35%, ${light} 0%, ${col} 50%, ${dark} 100%)`, border: '1px solid rgba(212,175,55,0.6)', boxShadow: `0 0 4px ${col}80`, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '15%', left: '18%', width: '25%', height: '25%', borderRadius: '50%', background: 'rgba(255,255,255,0.7)' }} />
            </div>
          )
        }))}
      </div>
    )
  }

  if (!isReady) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#030712' }}><div style={{ color: '#fff', fontSize: 16 }}>Loading...</div></div>

  const T = THEMES[Math.min(Math.floor((level - 1) / 2), THEMES.length - 1)]
  const displayBoard = gameOver ? board : renderBoard()

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #0a0510 0%, #060818 40%, #0a0510 100%)', userSelect: 'none', padding: 8, maxWidth: 390, margin: '0 auto', position: 'relative', overflow: 'hidden' }}>

      {/* Background orbs */}
      <div style={{ position: 'fixed', top: '-15%', left: '-10%', width: 280, height: 280, borderRadius: '50%', background: `radial-gradient(circle, ${T.primary}25 0%, transparent 70%)`, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '-10%', right: '-10%', width: 220, height: 220, borderRadius: '50%', background: `radial-gradient(circle, ${T.secondary}20 0%, transparent 70%)`, pointerEvents: 'none', zIndex: 0 }} />

      <div className="scanline-overlay" />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, position: 'relative', zIndex: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 1 }}>
            <span style={{ color: '#fff' }}>BASE </span>
            <span style={{ color: T.primary, textShadow: `0 0 12px ${T.primary}` }}>PUZZLE</span>
            <span style={{ color: '#facc15', marginLeft: 4 }}>✦</span>
          </div>
          <div style={{ fontSize: 10, color: '#6b7280' }}>Onchain Falling Blocks</div>
        </div>
        {isConnected ? (
          <button onClick={() => disconnect()} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80', fontSize: 11, padding: '4px 8px', borderRadius: 20, cursor: 'pointer' }}>
            <div style={{ width: 6, height: 6, background: '#4ade80', borderRadius: '50%' }} />{address?.slice(0,4)}...{address?.slice(-3)}
          </button>
        ) : (
          <button onClick={handleConnect} style={{ background: T.primary, color: '#fff', fontSize: 11, padding: '5px 12px', borderRadius: 20, fontWeight: 700, cursor: 'pointer', border: 'none', boxShadow: `0 0 12px ${T.glow}` }}>⬡ Connect</button>
        )}
      </div>

      {/* Scores */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 8, position: 'relative', zIndex: 10 }}>
        {[{ l: 'BEST', v: bestScore, c: '#facc15' }, { l: 'SCORE', v: score, c: '#60a5fa' }, { l: 'LEVEL', v: level, c: T.primary }, { l: 'LINES', v: totalLines, c: '#e2e8f0' }].map(s => (
          <div key={s.l} style={{ flex: 1, background: 'rgba(10,8,20,0.85)', border: `1px solid ${s.l === 'LEVEL' ? T.primary + '80' : 'rgba(212,175,55,0.15)'}`, borderRadius: 10, padding: '5px 3px', textAlign: 'center', boxShadow: s.l === 'LEVEL' ? `0 0 15px ${T.glow}` : 'none' }}>
            <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 600 }}>{s.l}</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {saveMsg && <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, padding: '5px 10px', textAlign: 'center', fontSize: 11, color: '#4ade80', marginBottom: 6, position: 'relative', zIndex: 10 }}>{saveMsg}</div>}

      {showSavePrompt && !gameOver && (
        <div style={{ background: `${T.primary}20`, border: `1px solid ${T.primary}50`, borderRadius: 10, padding: '6px 10px', fontSize: 11, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 10 }}>
          <span style={{ color: T.secondary }}>🔥 4 Lines! Save to Base?</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={saveScore} style={{ background: T.primary, color: '#fff', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer' }}>Save</button>
            <button onClick={() => setShowSavePrompt(false)} style={{ color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>
        </div>
      )}

      {/* Game area */}
      <div style={{ display: 'flex', gap: 6, position: 'relative', zIndex: 10 }}>

        {/* Left panel */}
        <div style={{ width: 52, display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          <div style={{ background: 'rgba(10,8,20,0.85)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 10, padding: 6 }}>
            <div style={{ fontSize: 9, color: '#9ca3af', textAlign: 'center', marginBottom: 4, fontWeight: 600 }}>NEXT</div>
            <Mini piece={next} />
          </div>
          <div style={{ background: 'rgba(10,8,20,0.85)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 10, padding: 6 }}>
            <div style={{ fontSize: 9, color: '#9ca3af', textAlign: 'center', marginBottom: 4, fontWeight: 600 }}>HOLD</div>
            <Mini piece={held} />
          </div>
          <div style={{ background: 'rgba(10,8,20,0.85)', border: `1px solid ${T.primary}50`, borderRadius: 10, padding: 6 }}>
            <div style={{ fontSize: 9, color: T.primary, textAlign: 'center', marginBottom: 4, fontWeight: 700 }}>GOALS</div>
            {missions.map(m => (
              <div key={m.id} style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 8, color: '#9ca3af' }}>{m.text}</div>
                <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 4, height: 3, marginTop: 2 }}>
                  <div style={{ height: 3, borderRadius: 4, width: `${Math.min(100, (m.current / m.target) * 100)}%`, background: m.done ? '#4ade80' : T.primary, transition: 'width 0.3s' }} />
                </div>
                {m.done && <div style={{ fontSize: 7, color: '#4ade80' }}>✓ Done!</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Board */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div style={{
            background: flashBoard ? 'rgba(255,255,255,0.15)' : 'rgba(5,4,15,0.98)',
            border: `1px solid rgba(212,175,55,0.4)`,
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: `0 0 25px ${T.glow}, 0 0 50px ${T.glow}40, inset 0 0 30px rgba(0,0,0,0.8)`,
            transition: 'background 0.1s',
            position: 'relative',
          }}>
            {showCombo && combo > 1 && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20, pointerEvents: 'none' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#facc15', textShadow: '0 0 20px #facc15, 0 0 40px #facc15' }}>x{combo} COMBO!</div>
              </div>
            )}
            {gameOver && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.94)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: 12 }}>
                <div style={{ fontSize: 32, marginBottom: 4 }}>💀</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 2 }}>Game Over!</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: T.primary, marginBottom: 4 }}>Score: {score}</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 14 }}>Lines: {totalLines} · Lvl: {level}</div>
                <button onClick={saveScore} disabled={isPending || isConfirming} style={{ background: `linear-gradient(135deg, ${T.primary}, ${T.secondary})`, color: '#fff', padding: '8px 20px', borderRadius: 12, fontWeight: 900, fontSize: 13, marginBottom: 8, border: 'none', cursor: 'pointer', boxShadow: `0 0 15px ${T.glow}`, opacity: isPending || isConfirming ? 0.5 : 1 }}>
                  {isPending ? 'Confirm...' : isConfirming ? 'Saving...' : '💾 Save Score on Base'}
                </button>
                <button onClick={resetGame} style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', padding: '8px 20px', borderRadius: 12, fontWeight: 900, fontSize: 13, border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer' }}>🔄 Play Again</button>
              </div>
            )}
            {paused && !gameOver && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: 12 }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: T.primary }}>⏸ PAUSED</div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: 1, padding: 3 }}>
              {displayBoard.map((row, r) => row.map((cell, c) => (
                <GemCell key={`${r}-${c}`} color={cell === 'ghost' ? null : cell} isGhost={cell === 'ghost'} />
              )))}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={holdPiece} style={{ background: 'linear-gradient(135deg, #5b21b6, #7c3aed)', color: '#fff', fontSize: 11, padding: '9px 13px', borderRadius: 10, fontWeight: 700, border: '1px solid rgba(212,175,55,0.3)', cursor: 'pointer', boxShadow: '0 0 10px rgba(124,58,237,0.5)' }}>HOLD</button>
          <button onClick={rotatePiece} style={{ width: 48, height: 48, borderRadius: '50%', background: `linear-gradient(135deg, ${T.primary}, ${T.secondary})`, color: '#fff', fontSize: 22, fontWeight: 700, border: '2px solid rgba(212,175,55,0.4)', cursor: 'pointer', boxShadow: `0 0 18px ${T.glow}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↺</button>
          <button onClick={hardDrop} style={{ background: 'linear-gradient(135deg, #92400e, #b45309)', color: '#fff', fontSize: 11, padding: '9px 13px', borderRadius: 10, fontWeight: 700, border: '1px solid rgba(212,175,55,0.3)', cursor: 'pointer', boxShadow: '0 0 10px rgba(180,83,9,0.5)' }}>DROP</button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ fn: moveLeft, label: '←' }, { fn: moveDown, label: '↓' }, { fn: moveRight, label: '→' }].map((btn, i) => (
            <button key={i} onClick={btn.fn} style={{ width: 54, height: 48, borderRadius: 12, background: i === 1 ? `linear-gradient(135deg, ${T.primary}, ${T.secondary})` : 'linear-gradient(135deg, #5b21b6, #7c3aed)', color: '#fff', fontSize: 22, fontWeight: 700, border: '1px solid rgba(212,175,55,0.3)', cursor: 'pointer', boxShadow: `0 0 12px ${T.glow}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{btn.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { pausedRef.current = !pausedRef.current; setPaused(x => !x) }} style={{ background: 'rgba(255,255,255,0.06)', color: '#d1d5db', fontSize: 11, padding: '7px 16px', borderRadius: 10, fontWeight: 700, border: '1px solid rgba(212,175,55,0.2)', cursor: 'pointer' }}>{paused ? '▶ Resume' : '⏸ Pause'}</button>
          <button onClick={resetGame} style={{ background: 'rgba(255,255,255,0.06)', color: '#d1d5db', fontSize: 11, padding: '7px 16px', borderRadius: 10, fontWeight: 700, border: '1px solid rgba(212,175,55,0.2)', cursor: 'pointer' }}>🔄 Restart</button>
        </div>
      </div>

      {txHash && <button onClick={() => window.open('https://basescan.org/tx/' + txHash, '_blank')} style={{ display: 'block', width: '100%', textAlign: 'center', fontSize: 11, color: '#60a5fa', marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', position: 'relative', zIndex: 10 }}>View on Basescan ↗</button>}
      <p style={{ textAlign: 'center', fontSize: 10, color: '#374151', marginTop: 6, position: 'relative', zIndex: 10 }}>Tap to rotate · Swipe to move · Swipe down fast to drop</p>
    </div>
  )
}