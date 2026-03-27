import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PulseQueue - Patient Portal',
  description: 'AI-powered triage and queue management for patients',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body>{children}</body>
    </html>
  )
}
