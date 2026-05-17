import { createConfig, http } from 'wagmi'
import { base } from 'wagmi/chains'
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector'
import { coinbaseWallet } from 'wagmi/connectors'
import { Attribution } from 'ox/erc8021'

const DATA_SUFFIX = Attribution.toDataSuffix({
  codes: ['bc_k1f1tmoi'],
})

export const config = createConfig({
  chains: [base],
  connectors: [
    farcasterMiniApp(),
    coinbaseWallet({ appName: 'Base Puzzle', appLogoUrl: 'https://base-puzzle-one.vercel.app/icon.png' }),
  ],
  transports: {
    [base.id]: http(),
  },
  dataSuffix: DATA_SUFFIX,
})