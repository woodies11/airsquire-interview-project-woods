'use client'
import { message } from 'antd'
import { createContext, useContext, useState } from 'react'

const BASE_API_URL = process.env.NEXT_PUBLIC_BASE_API_URL || 'http://localhost:4000'

export const BackgroundUploadContext = createContext<{
  pendingUploads: number
  startBackgroundUpload: (file: File, body: { [key: string]: string | Blob }) => void
}>({
  pendingUploads: 0,
  startBackgroundUpload: () => {},
})

export const BackgroundUploadProvider = ({ children }: { children: React.ReactNode }) => {
  const [pendingUploads, setPendingUploads] = useState(0)

  const startBackgroundUpload = async (file: File, body: { [key: string]: string | Blob }) => {
    setPendingUploads(p => p + 1)

    try {
      const formData = new FormData()
      formData.append('file', file)
      Object.entries(body).forEach(([key, value]) => {
        formData.append(key, value)
      })
      const res = await fetch(`${BASE_API_URL}/api/images/originals`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const error = await res.json()
        message.error(`Upload failed: ${error.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setPendingUploads(p => {
        if (p === 1) {
          // TODO: Should debounce this
          message.success('All Uploads Completed!')
        }
        return p - 1
      })
    }
  }

  return (
    <BackgroundUploadContext.Provider value={{ pendingUploads, startBackgroundUpload }}>
      {children}
    </BackgroundUploadContext.Provider>
  )
}

export const useUpload = () => useContext(BackgroundUploadContext)
