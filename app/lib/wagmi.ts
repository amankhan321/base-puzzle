import { createConfig, http } from 'wagmi'
import { base } from 'wagmi/chains'
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector'
import { coinbaseWallet } from 'wagmi/connectors'

export const config = createConfig({
  chains: [base],
  connectors: [
    farcasterMiniApp(),
    coinbaseWallet({ appName: 'Base Puzzle', appLogoUrl: 'https://base-puzzle.vercel.app/icon.png' }),
  ],
  transports: {
    [base.id]: http(),
  },
})
