'use client'

import { useState, useCallback, useRef } from 'react'
import imageCompression from 'browser-image-compression'
import { FaTimes, FaArrowLeft, FaArrowRight } from 'react-icons/fa'
import PanoramicViewer, {
  PanoramicViewerRef,
} from '@web/components/ui/PanoramicViewer/PanoramicViewer'
import clsx from 'clsx'

export default function AnalysisPage() {
  const [images, setImages] = useState<{ name: string; base64: string }[]>([])

  const [leftIndex, setLeftIndex] = useState<number | null>(0)
  const [rightIndex, setRightIndex] = useState<number | null>(1)

  const leftViewerRef = useRef<PanoramicViewerRef>(null)
  const rightViewerRef = useRef<PanoramicViewerRef>(null)

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return

    const fileArray = Array.from(files)
    const compressedBase64Promises = fileArray.map(async file => {
      try {
        const compressed = await imageCompression(file, {
          maxSizeMB: 5,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        })

        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(compressed)
        })

        return { name: file.name, base64 }
      } catch (e) {
        console.error('Compression error:', e)
        return null
      }
    })

    const compressedBase64Array = (await Promise.all(compressedBase64Promises)).filter(Boolean) as {
      name: string
      base64: string
    }[]

    setImages(prev => [...prev, ...compressedBase64Array])
  }, [])

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      await handleFiles(event.dataTransfer.files)
    },
    [handleFiles]
  )

  const handleBrowse = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    input.onchange = e => {
      const target = e.target as HTMLInputElement
      handleFiles(target.files)
    }
    input.click()
  }, [handleFiles])

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const moveImage = (index: number, direction: 'up' | 'down') => {
    setImages(prev => {
      const newArr = [...prev]
      const newIndex = direction === 'up' ? index - 1 : index + 1
      if (newIndex < 0 || newIndex >= newArr.length) return prev
      const temp = newArr[index]
      newArr[index] = newArr[newIndex]
      newArr[newIndex] = temp
      return newArr
    })
  }

  return (
    <div className="w-full min-h-[calc(100vh+20rem)] flex flex-col items-center p-4 gap-4">
      {images.length > 1 && (
        <div className={clsx('my-4 w-full grid gap-1 grid-cols-2 h-[80vh] relative')}>
          <PanoramicViewer
            ref={leftViewerRef}
            publish
            channel="abx"
            imgSrc={images[leftIndex].base64}
          />
          {rightIndex !== null && (
            <PanoramicViewer
              ref={rightViewerRef}
              publish
              channel="abx"
              imgSrc={images[rightIndex].base64}
            />
          )}
          <div
            aria-label="panoramic-viewer-controls"
            className="absolute left-1/2 -translate-x-1/2 bottom-2"
          >
            <button
              className="cursor-pointer rounded-full p-2 bg-white shadow-2xl text-sm active:scale-95"
              onClick={() => {
                if (!leftViewerRef.current || !rightViewerRef.current) return
                leftViewerRef.current.togglePublishing()
                rightViewerRef.current.togglePublishing()
              }}
            >
              Toggle Sync
            </button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-4 w-full max-w-4xl">
        {images.map((img, idx) => (
          <div
            key={idx}
            className="relative border border-gray-300 bg-white rounded overflow-hidden group cursor-pointer hover:shadow-lg"
          >
            <img src={img.base64} alt={img.name} className="w-full object-cover aspect-auto" />
            <p className="text-xs text-center truncate p-1">{img.name}</p>

            <div
              className="absolute top-0 left-0 bottom-0 right-1/2 bg-black opacity-0 hover:opacity-50 transition"
              onClick={() => setLeftIndex(idx)}
            >
              <div className="h-full w-full flex items-center justify-center">
                <p className="text-white text-sm opacity-100 p-2">Set as Left View</p>
              </div>
            </div>

            <div
              className="absolute top-0 left-1/2 bottom-0 right-0 bg-black opacity-0 hover:opacity-50 transition"
              onClick={() => setRightIndex(idx)}
            >
              <div className="h-full w-full flex items-center justify-center">
                <p className="text-white text-sm opacity-100 p-2">Set as Right View</p>
              </div>
            </div>

            {/* Controls */}
            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition z-20">
              <button
                onClick={() => removeImage(idx)}
                className="bg-red-500 text-white rounded p-1 hover:bg-red-600"
              >
                <FaTimes size={14} />
              </button>
            </div>
            <div className="absolute bottom-0.5 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition z-20">
              <button
                onClick={() => moveImage(idx, 'up')}
                disabled={idx === 0}
                className="bg-gray-700 text-white rounded p-1 disabled:opacity-30"
              >
                <FaArrowLeft size={14} />
              </button>
              <button
                onClick={() => moveImage(idx, 'down')}
                disabled={idx === images.length - 1}
                className="bg-gray-700 text-white rounded p-1 disabled:opacity-30"
              >
                <FaArrowRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div
        className="w-full max-w-4xl border-2 border-dashed border-gray-400 rounded-lg p-10 text-center cursor-pointer hover:border-blue-500 transition-colors"
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={handleBrowse}
      >
        <p className="text-gray-600">Drag & drop images here, or click to browse</p>
      </div>
    </div>
  )
}
