'use client'

import { useUpload } from '@web/components/BackgroundUploadOverlay/BackgroundUploadProvider'
import { useEffect } from 'react'

export const useUploadWarning = () => {
  const { pendingUploads } = useUpload()

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (pendingUploads > 0) {
        e.preventDefault()
        e.returnValue = '' // Required for Chrome
      }
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [pendingUploads])
}
