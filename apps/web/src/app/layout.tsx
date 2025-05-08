import AntdPatchWrapper from './components/AntdPatchWrapper'
import ClientBackgroundUploadOverlay from './components/ClientBackgroundUploadOverlay'
import './globals.css'
import { BackgroundUploadProvider } from '@web/components/BackgroundUploadOverlay/BackgroundUploadProvider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="vsc-initialized bg-asq-background-light">
        <BackgroundUploadProvider>
          <AntdPatchWrapper>{children}</AntdPatchWrapper>
          <ClientBackgroundUploadOverlay />
        </BackgroundUploadProvider>
      </body>
    </html>
  )
}
