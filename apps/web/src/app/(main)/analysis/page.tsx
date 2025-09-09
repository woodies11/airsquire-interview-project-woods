'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import imageCompression from 'browser-image-compression'
import { FaTimes, FaArrowLeft, FaArrowRight } from 'react-icons/fa'
import PanoramicViewer, {
  PanoramicViewerRef,
} from '@web/components/ui/PanoramicViewer/PanoramicViewer'
import clsx from 'clsx'
import { BASE_API_URL, PYTHON_SVC_URL } from 'apps/web/configs'
import { Markdown } from '@web/components/markdown'
import { useFloatingAIPaneContext } from '@web/components/FloatingAIPane/FloatingAIPaneContextProvider'
import { base64ToFile } from '@web/utils/files'
import { AnimatePresence, motion } from 'motion/react'

export default function AnalysisPage() {
  const [images, setImages] = useState<{ name: string; base64: string; file: File }[]>([])

  const [leftIndex, setLeftIndex] = useState<number | null>(0)
  const [rightIndex, setRightIndex] = useState<number | null>(1)

  const leftViewerRef = useRef<PanoramicViewerRef>(null)
  const rightViewerRef = useRef<PanoramicViewerRef>(null)

  const { setAIResponse, openAIPanel } = useFloatingAIPaneContext()

  const [isLoadingAIResponse, setIsLoadingAIResponse] = useState(false)

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

          return { name: file.name, base64, file: compressed }
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
      }[]

      setImages(prev => [...prev, ...compressedBase64Array])
    },
    [setImages]
  )

  useEffect(() => {
    if (images.length === 0) return
    if (leftIndex === null || rightIndex === null || leftIndex === rightIndex) return

    const leftImage = images[leftIndex]
    const rightImage = images[rightIndex]
    if (!leftImage || !rightImage) return

    let isSubscribed = true
    const sendToAI = async () => {
      console.log('Sending images to AI for comparison...')
      setIsLoadingAIResponse(true)
      setAIResponse('')
      openAIPanel()

      const formData = new FormData()
      formData.append('imgA', leftImage.file, leftImage.name)
      formData.append('imgB', rightImage.file, rightImage.name)

      try {
        const res = await fetch(`${BASE_API_URL}/api/enrichment/compare`, {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          throw new Error(`API error: ${res.statusText}`)
        }

        const reader = res.body?.getReader()
        if (!reader) {
          throw new Error('No response body')
        }

        const decoder = new TextDecoder('utf-8')

        if (!isSubscribed) return

        let hasTriggeredScreenshot = false

        while (true) {
          const { done, value } = await reader.read()
          if (!isSubscribed) return
          if (done) break

          if (!leftMask && !rightMask && !hasTriggeredScreenshot) {
            handleScreenshot()
            hasTriggeredScreenshot = true
          }

          const lines = decoder.decode(value).split('$$')

          for (const line of lines) {
            if (line.startsWith('%%DATA%%:')) {
              const desc = line.replace('%%DATA%%:', '')

              setAIResponse(prev => {
                return (prev += desc)
              })

              continue
            } else if (line.startsWith('%%JSON%%:')) {
              continue
            } else {
              console.log(line)
            }
          }
        }
      } catch (err) {
        console.error('AI request error:', err)
        setAIResponse('Error fetching AI response.')
      } finally {
        setIsLoadingAIResponse(false)
      }
    }

    sendToAI()

    return () => {
      isSubscribed = false
    }
  }, [leftIndex, rightIndex, images])

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
    if (leftIndex === index) {
      setLeftIndex(null)
    } else if (leftIndex && leftIndex > index) {
      setLeftIndex(leftIndex - 1)
    }

    if (rightIndex === index) {
      setRightIndex(null)
    } else if (rightIndex && rightIndex > index) {
      setRightIndex(rightIndex - 1)
    }
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

  const [leftMask, setLeftMask] = useState<string | null>(null)
  const [rightMask, setRightMask] = useState<string | null>(null)

  const handleScreenshot = async () => {
    if (!leftViewerRef.current || !rightViewerRef.current) return
    setLeftMask(null)
    const leftImg = leftViewerRef.current.getCanvasScreenshot()
    const rightImg = rightViewerRef.current.getCanvasScreenshot()

    const leftData = new FormData()
    const fileLeft = base64ToFile(leftImg, 'left.jpeg')
    leftData.append('file', fileLeft)

    const rightData = new FormData()
    const fileRight = base64ToFile(rightImg, 'right.jpeg')
    rightData.append('file', fileRight)

    fetch(`${PYTHON_SVC_URL}/images`, {
      method: 'POST',
      body: leftData,
    }).then(async img => {
      const blob = await img.blob()
      const url = URL.createObjectURL(blob)
      setLeftMask(url)
    })

    fetch(`${PYTHON_SVC_URL}/images`, {
      method: 'POST',
      body: rightData,
    }).then(async img => {
      const blob = await img.blob()
      const url = URL.createObjectURL(blob)
      setRightMask(url)
    })
  }

  return (
    <div className="w-full min-h-[calc(100vh+20rem)] flex flex-col items-center p-4 gap-4">
      {images.length > 1 && (
        <div
          className={clsx('my-4 w-full grid gap-1 grid-cols-2 h-[80vh] relative')}
          onMouseDown={() => {
            setLeftMask(null)
            setRightMask(null)
          }}
        >
          <PanoramicViewer
            ref={leftViewerRef}
            publish
            channel="abx"
            imgSrc={images[leftIndex].base64}
          />
          <AnimatePresence>
            {leftMask && (
              <motion.div
                initial={{ opacity: 0, clipPath: 'circle(0% at 100% 100%)' }}
                animate={{ opacity: 1, clipPath: 'circle(200% at 100% 100%)' }}
                exit={{ opacity: 0, clipPath: 'circle(0% at 0% 0%)' }}
                transition={{ duration: 0.8 }}
                className="absolute top-0 left-0 w-1/2 h-full pointer-events-none opacity-80"
              >
                <img src={leftMask} alt="Left Mask" className="object-contain w-full h-full" />
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {rightMask && (
              <motion.div
                initial={{ opacity: 0, clipPath: 'circle(0% at 0% 100%)' }}
                animate={{ opacity: 1, clipPath: 'circle(200% at 100% 0%)' }}
                exit={{ opacity: 0, clipPath: 'circle(0% at 100% 0%)' }}
                transition={{ duration: 0.8 }}
                className="absolute top-0 left-1/2 w-1/2 h-full pointer-events-none opacity-80 z-10"
              >
                <img src={rightMask} alt="Right Mask" className="object-contain w-full h-full" />
              </motion.div>
            )}
          </AnimatePresence>
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
            className="absolute left-1/2 -translate-x-1/2 bottom-2 flex flex-col items-center gap-2 z-20"
          >
            <button
              className="cursor-pointer rounded-full p-2 bg-white shadow-2xl text-sm active:scale-95"
              onClick={handleScreenshot}
            >
              Segment Image
            </button>
            {/* <button
              className="cursor-pointer rounded-full p-2 bg-white shadow-2xl text-sm active:scale-95"
              onClick={() => {
                if (!leftViewerRef.current || !rightViewerRef.current) return
                leftViewerRef.current.togglePublishing()
                rightViewerRef.current.togglePublishing()
              }}
            >
              Toggle Sync
            </button> */}
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
