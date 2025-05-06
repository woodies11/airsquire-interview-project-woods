import AntdPatchWrapper from './components/AntdPatchWrapper'
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AntdPatchWrapper>{children}</AntdPatchWrapper>
      </body>
    </html>
  )
}
