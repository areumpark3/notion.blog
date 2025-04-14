import './global.css'
import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { Navbar } from '@/components/nav'
import Footer from '@/components/footer'
import { baseUrl } from './sitemap'
import { ThemeProvider } from 'next-themes'

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: 'Notionpresso Portfolio Starter',
  description: 'This is my portfolio',
  openGraph: {
    images: '/profile.png'
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.className} antialiased max-w-xl mx-4 mt-8 sm:mx-auto`}>
        <ThemeProvider attribute='class' defaultTheme='light'>
          <main className="flex-auto min-w-0 mt-6 flex flex-col px-2 md:px-0">
            <Navbar />
            {children}
            <Footer />
          </main>
        </ThemeProvider>
      </body>
    </html>
  )
}

