'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDebounce } from '@web/hooks/useDebounce'

export default function ClientSearchBox() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('name') || ''
  const [text, setText] = useState(initialQuery)
  const debouncedText = useDebounce(text, 500)
  const router = useRouter()

  const updateURLQuery = useCallback(
    (text: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (!text) {
        params.delete('name')
        router.push(`?${params.toString()}`)
        return
      }

      params.set('name', text)
      router.push(`?${params.toString()}`)
      return
    },
    [searchParams, router]
  )

  // Sync debounced value to URL
  useEffect(() => {
    updateURLQuery(debouncedText)
  }, [debouncedText])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      updateURLQuery(text)
      e.preventDefault()
      e.stopPropagation()
    }
  }

  return (
    <div className="flex items-center justify-center w-full h-full">
      <input
        type="text"
        placeholder="Search..."
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="w-full p-2 border border-gray-300 rounded"
      />
    </div>
  )
}
