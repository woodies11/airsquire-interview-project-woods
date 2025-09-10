'use client'

import { useState, useCallback, useEffect } from 'react'
import imageCompression from 'browser-image-compression'
import clsx from 'clsx'
import { BASE_API_URL, PYTHON_SVC_URL } from 'apps/web/configs'
import { base64ToFile } from '@web/utils/files'
import { AnimatePresence, motion } from 'motion/react'

/**
 * Change to true to upload images at original size (slower but good if we want to download the result for later use).
 */
const SHOULD_UPLOAD_ORIGINAL = false

export default function AlignmentPage() {
  const [images, setImages] = useState<
    { name: string; base64: string; file: File; original: File }[]
  >([])
  const [alignedImage, setAlignedImage] = useState<Record<number, string | null>>({})
  const [isAlignmentInProgress, setIsAlignmentInProgress] = useState(false)

  const [refIndex, setRefIndex] = useState<number | null>(null)

  const handleFiles = useCallback(
    async (files: FileList | null) => {
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

          return { name: file.name, base64, file: compressed, original: file }
        } catch (e) {
          console.error('Compression error:', e)
          return null
        }
      })

      const compressedBase64Array = (await Promise.all(compressedBase64Promises)).filter(
        Boolean
      ) as {
        name: string
        base64: string
        file: File
        original: File
      }[]

      setImages(prev => [...prev, ...compressedBase64Array])
    },
    [setImages]
  )

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

  const handleRefSelection = useCallback(
    (index: number) => {
      if (isAlignmentInProgress) return
      setRefIndex(index)
    },
    [setRefIndex, isAlignmentInProgress]
  )

  const handleDownloadAll = useCallback(() => {
    images.forEach((img, idx) => {
      const alignedBase64 = alignedImage[idx] || img.base64
      const file = base64ToFile(alignedBase64, 'aligned_' + img.name)
      const url = URL.createObjectURL(file)
      const a = document.createElement('a')
      a.href = url
      a.download = img.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    })
  }, [images, alignedImage])

  useEffect(() => {
    if (refIndex === null) return
    if (images.length < 2) return

    let isSubscribed = true
    const performAlignment = async () => {
      setIsAlignmentInProgress(true)

      setAlignedImage({})

      // add ref image as is to the aligned set
      setTimeout(() => {
        setAlignedImage({ [refIndex]: images[refIndex].base64 })
      }, 500)

      const alignmentTasks = []

      images.forEach((img, idx) => {
        if (idx === refIndex) return
        alignmentTasks.push(async () => {
          try {
            const formData = new FormData()
            const refImg = SHOULD_UPLOAD_ORIGINAL
              ? images[refIndex].original
              : images[refIndex].file
            const inputImg = SHOULD_UPLOAD_ORIGINAL ? img.original : img.file
            formData.append('ref_img', refImg, images[refIndex].name)
            formData.append('input_img', inputImg, img.name)

            const res = await fetch(`${PYTHON_SVC_URL}/align`, {
              method: 'POST',
              body: formData,
            })
            if (!res.ok) {
              console.error('Alignment failed:', res.statusText)
              return
            }
            const data = await res.blob()
            if (isSubscribed) {
              const reader = new FileReader()
              reader.onloadend = () => {
                const base64img = reader.result as string
                setAlignedImage(prev => ({ ...prev, [idx]: base64img }))
              }
              reader.readAsDataURL(data)
            }
          } catch (error) {
            console.error('Error during alignment:', error)
          }
        })
      })
      await Promise.all(alignmentTasks.map(task => task()))
      if (isSubscribed) setIsAlignmentInProgress(false)
    }
    performAlignment()

    return () => {
      isSubscribed = false
    }
  }, [refIndex])

  useEffect(() => {
    setRefIndex(null)
    setAlignedImage({})
  }, [images])

  const handleClearAll = useCallback(() => {
    if (isAlignmentInProgress) return
    setImages([])
    setAlignedImage({})
    setRefIndex(null)
  }, [isAlignmentInProgress])

  return (
    <div className="w-full min-h-[calc(80vh)] flex flex-col items-center p-4 gap-4">
      <div className="grid grid-cols-1 gap-4 w-full max-w-xl">
        {images.map((img, idx) => (
          <div
            key={idx}
            className={clsx(
              'relative border border-gray-300 bg-white rounded overflow-hidden group hover:shadow-lg',
              refIndex === idx ? 'ring-4 ring-blue-400' : '',
              isAlignmentInProgress ? 'animate-pulse' : 'cursor-pointer'
            )}
            onClick={() => handleRefSelection(idx)}
          >
            <img src={img.base64} alt={img.name} className="w-full object-cover aspect-auto" />
            <AnimatePresence>
              {alignedImage[idx] && (
                <motion.div
                  initial={{
                    opacity: 0,
                    clipPath: 'inset(0 100% 0 0)',
                    filter: 'brightness(4)',
                    transition: { duration: 0.3 },
                  }}
                  animate={{
                    opacity: 1,
                    clipPath: 'inset(0 0% 0 0)',
                    filter: 'brightness(1)',
                    transition: { duration: 3 },
                  }}
                  exit={{
                    opacity: 0,
                    clipPath: 'inset(0 0% 0 0)',
                    filter: 'brightness(1)',
                    transition: { duration: 0.3 },
                  }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0"
                >
                  <img
                    src={alignedImage[idx]}
                    className="hover:opacity-0 duration-300"
                    alt="Aligned"
                  />
                </motion.div>
              )}
            </AnimatePresence>
            <p onClick={() => handleRefSelection(idx)} className="text-xs text-center truncate p-1">
              {img.name}
            </p>
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <div className="flex items-center gap-4">
          <button
            className={clsx(
              'px-4 py-2 bg-asq-primary text-white rounded disabled:opacity-50',
              isAlignmentInProgress ? 'cursor-not-allowed' : 'hover:bg-asq-accent cursor-pointer'
            )}
            disabled={isAlignmentInProgress}
            onClick={handleClearAll}
          >
            Clear All
          </button>
        </div>
      )}
      {SHOULD_UPLOAD_ORIGINAL &&
        !!alignedImage &&
        Object.keys(alignedImage).length === images.length && (
          <div className="flex items-center gap-4">
            <button
              className={clsx(
                'px-4 py-2 bg-asq-primary text-white rounded disabled:opacity-50',
                isAlignmentInProgress ? 'cursor-not-allowed' : 'hover:bg-asq-accent cursor-pointer'
              )}
              disabled={isAlignmentInProgress}
              onClick={handleDownloadAll}
            >
              Download All
            </button>
          </div>
        )}
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
