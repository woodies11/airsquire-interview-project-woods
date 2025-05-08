import AntdPatchWrapper from './components/AntdPatchWrapper'
import './globals.css'
import { BackgroundUploadProvider } from '@web/components/BackgroundUploadOverlay/BackgroundUploadProvider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="vsc-initialized bg-asq-background-light">
        <BackgroundUploadProvider>
          <AntdPatchWrapper>{children}</AntdPatchWrapper>
        </BackgroundUploadProvider>
      </body>
    </html>
  )
}
