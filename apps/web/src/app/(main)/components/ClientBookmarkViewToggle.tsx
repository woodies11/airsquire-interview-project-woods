'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function ClientBookmarkViewToggle() {
  const searchParams = useSearchParams()
  const initialState = Number(searchParams.get('bookmarked')) || -1
  const [isBookmarkedState, setIsBookmarkedState] = useState<number>(initialState)
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    console.log('isBookmarkedState', isBookmarkedState)
    if (isBookmarkedState === 1) {
      params.set('bookmarked', '1')
    } else if (isBookmarkedState === 0) {
      params.set('bookmarked', '0')
    } else {
      params.delete('bookmarked')
    }
    router.push(`?${params.toString()}`)
  }, [isBookmarkedState])

  const handleToggle = () => {
    setIsBookmarkedState(prevState => {
      // Cycle through -1, 0, 1, with -1 being no filter
      return ((prevState + 3) % 3) - 1
    })
  }

  const label = ['All', 'Unbookmarked', 'Bookmarked'][isBookmarkedState + 1]

  return (
    <button
      className="flex items-center justify-center gap-2 cursor-pointer"
      onClick={handleToggle}
    >
      <span className="text-gray-500">Display:</span>
      <span className="text-blue-500">{label}</span>
    </button>
  )
}
