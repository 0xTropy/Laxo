import { DM_Sans, Outfit } from 'next/font/google'
import './globals.css'
import Nav from './Nav'
import Footer from './Footer'
import { WalletProvider } from '../contexts/WalletContext'
import { WagmiWrapper } from '../lib/wagmi/provider'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
})

export const metadata = {
  title: 'Laxo — Currencies, on Arc',
  description: 'Laxo — Move between currencies. Stablecoin FX, cross-border, and 24/7 settlement.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${outfit.variable}`}>
      <body>
        <WagmiWrapper>
          <WalletProvider>
            <Nav />
            <main>{children}</main>
            <Footer />
          </WalletProvider>
        </WagmiWrapper>
      </body>
    </html>
  )
}
