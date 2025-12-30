import './globals.css'

export const metadata = {
  title: 'The Palace',
  description: 'Your Living Command Center',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400;600&family=Archivo:wght@400;600;800&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, fontFamily: 'Crimson Pro, serif' }}>{children}</body>
    </html>
  )
}
