import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Read my blog.',
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
