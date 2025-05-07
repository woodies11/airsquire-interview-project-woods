import { NavHeader } from '@web/components/ui/NavHeader/NavHeader'
import AntdPatchWrapper from './components/AntdPatchWrapper'
import './globals.css'
import Link from 'next/link'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AntdPatchWrapper>{children}</AntdPatchWrapper>
      </body>
    </html>
  )
}
