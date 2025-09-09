import AntdPatchWrapper from './components/AntdPatchWrapper'
import ClientBackgroundUploadOverlay from './components/ClientBackgroundUploadOverlay'
import ClientProviders from './components/ClientProviders'
import './globals.css'
import { BackgroundUploadProvider } from '@web/components/BackgroundUploadOverlay/BackgroundUploadProvider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="vsc-initialized bg-asq-background-light">
        <BackgroundUploadProvider>
          <ClientProviders>
            <AntdPatchWrapper>{children}</AntdPatchWrapper>
            <ClientBackgroundUploadOverlay />
          </ClientProviders>
        </BackgroundUploadProvider>
      </body>
    </html>
  )
}
