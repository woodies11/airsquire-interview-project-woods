'use client'

import { BASE_API_URL } from 'apps/web/configs'
import BookmarkIcon from '../ui/BookmarkIcon'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function BookmarkToggleButton({
  imageId,
  isBookmarked,
  onToggle,
  ...props
}: {
  imageId: string
  isBookmarked: boolean
  onToggle?: (imageId: string, isBookmarked: boolean) => void
  [key: string]: any
}) {
  const [_isBookmarked, setIsBookmarked] = useState(isBookmarked)
  const router = useRouter()
  const handleClick = async () => {
    try {
      // Optimistically update the UI before the server responds - improves UX
      setIsBookmarked(prev => !prev)
      const response = await fetch(BASE_API_URL + '/api/bookmarks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageId }),
      })

      if (!response.ok) {
        throw new Error('Network response was not ok')
      }

      const data = await response.json()
      onToggle?.(data.imageId, data.newIsBookmarked)
    } catch (error) {
      console.error('Error toggling bookmark:', error)
    }

    // Notify Next.js that data has changed and let SSR re-render the page (this ensure UI is fully in sync)
    router.refresh()
  }

  return (
    <button onClick={handleClick} {...props}>
      <BookmarkIcon isBookmarked={_isBookmarked} />
    </button>
  )
}
