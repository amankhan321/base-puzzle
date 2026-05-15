import type { Metadata } from 'next'
import { Providers } from './components/Providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Base Puzzle',
  description: 'Onchain falling blocks puzzle on Base — a Farcaster Mini App',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="fc:miniapp" content={JSON.stringify({
          version: '1',
          imageUrl: 'https://base-puzzle.vercel.app/og-image.png',
          button: {
            title: 'Play Base Puzzle',
            action: {
              type: 'launch_miniapp',
              name: 'Base Puzzle',
              url: 'https://base-puzzle.vercel.app',
              splashImageUrl: 'https://base-puzzle.vercel.app/splash.png',
              splashBackgroundColor: '#111827',
            },
          },
        })} />
      </head>
      <body className="bg-gray-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
