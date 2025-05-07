import { useEffect } from 'react'

export const useUploadWarning = () => {
  // TODO: Replace with actual value from context store
  const pendingUploads = 1

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
