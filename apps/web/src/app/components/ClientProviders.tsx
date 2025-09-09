'use client'
import ParanomicViewersSyncContextProvider from '@web/components/ui/PanoramicViewer/providers/ParanomicViewersSyncContextProvider'

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return <ParanomicViewersSyncContextProvider>{children}</ParanomicViewersSyncContextProvider>
}
