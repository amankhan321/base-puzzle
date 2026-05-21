'use client'

import { useEffect, useState } from 'react'
import Game from './components/Game'

export default function Home() {
  const [env, setEnv] = useState<'farcaster' | 'mobile' | null>(null)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const isAppContext = urlParams.get('app') === '1'

    const isInFrame = window.self !== window.top
    const ua = navigator.userAgent || ''
    const ref = document.referrer || ''

    const isFarcasterEnv =
      isAppContext ||
      isInFrame ||
      ua.includes('Farcaster') ||
      ref.includes('warpcast') ||
      ref.includes('farcaster') ||
      ref.includes('farcaster.xyz') ||
      ref.includes('farcaster.xyz')

    const isMobile = /Android|iPhone|iPad|iPod/i.test(ua)

    if (isFarcasterEnv) {
      setEnv('farcaster')
    } else if (isMobile) {
      window.location.href =
        'https://go.cb-w.com/dapp?cb_url=https%3A%2F%2Fbase-puzzle-one.vercel.app%3Fapp%3D1'
      setTimeout(() => setEnv('mobile'), 2500)
    } else {
     window.location.href = 'https://warpcast.com/~/mini-apps/launch?domain=base-puzzle-one.vercel.app'
    }
  }, [])

  if (env === null) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at top, #0f172a 0%, #020617 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧩</div>
          <div style={{ color: '#6b7280' }}>Opening Base Puzzle...</div>
        </div>
      </div>
    )
  }

  if (env === 'farcaster') {
    return <Game />
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #0f172a 0%, #020617 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif',
      color: 'white',
      padding: '2rem',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🧩</div>
      <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>
        <span style={{ color: 'white' }}>BASE </span>
        <span style={{ color: '#60a5fa' }}>PUZZLE</span>
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem', fontSize: '0.875rem' }}>
        Onchain Falling Blocks on Base
      </p>
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '1rem',
        padding: '1.5rem',
        marginBottom: '2rem',
        maxWidth: '320px',
      }}>
        <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: 0 }}>
          Open this game in <strong style={{ color: 'white' }}>Base App</strong> or{' '}
          <strong style={{ color: 'white' }}>Warpcast</strong> to play!
        </p>
      </div>
      <a
        href="https://go.cb-w.com/dapp?cb_url=https%3A%2F%2Fbase-puzzle.vercel.app%3Fapp%3D1"
        style={{
          background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
          color: 'white',
          padding: '1rem 2rem',
          borderRadius: '9999px',
          fontWeight: 700,
          textDecoration: 'none',
          marginBottom: '1rem',
          display: 'block',
          boxShadow: '0 0 20px rgba(99,102,241,0.4)',
        }}
      >
        🔵 Open in Base App
      </a>
      <a
        href="https://warpcast.com/~/mini-apps/launch?domain=base-puzzle-one.vercel.app"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'white',
          padding: '1rem 2rem',
          borderRadius: '9999px',
          fontWeight: 700,
          textDecoration: 'none',
          marginBottom: '1rem',
          display: 'block',
        }}
      >
        🟣 Open in Warpcast
      </a>
      <a
        href="https://play.google.com/store/apps/details?id=org.toshi"
        style={{ color: '#6b7280', fontSize: '0.75rem', textDecoration: 'none', marginBottom: '0.5rem', display: 'block' }}
      >
        Download Base App for Android
      </a>
      <a
        href="https://apps.apple.com/app/id1278383455"
        style={{ color: '#6b7280', fontSize: '0.75rem', textDecoration: 'none', display: 'block' }}
      >
        Download Base App for iOS
      </a>
    </div>
  )
}
