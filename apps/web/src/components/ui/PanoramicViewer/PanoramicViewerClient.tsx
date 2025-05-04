'use client'

import dynamic from 'next/dynamic'

// This ensures that nothing is rendered on the server; use this if encountering issues
// with three.js or other lib attempting to access browser only functions during import
const PanoramicViewer = dynamic(() => import('./PanoramicViewer') as any, {
  ssr: false,
})

export default function PanoramicViewerClient() {
  return <PanoramicViewer />
}
