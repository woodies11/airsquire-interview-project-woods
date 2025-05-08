import { NavHeader } from '@web/components/ui/NavHeader/NavHeader'
import AntdPatchWrapper from './components/AntdPatchWrapper'
import './globals.css'
import Link from 'next/link'
import { BackgroundUploadProvider } from '@web/components/BackgroundUploadOverlay/BackgroundUploadProvider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="vsc-initialized">
        <BackgroundUploadProvider>
          <AntdPatchWrapper>{children}</AntdPatchWrapper>
        </BackgroundUploadProvider>
      </body>
    </html>
  )
}
