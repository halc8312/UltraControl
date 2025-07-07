import './globals.css'

export const metadata = {
  title: 'Devin Clone',
  description: 'AI Software Engineer Assistant',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        {children}
      </body>
    </html>
  )
}