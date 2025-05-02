'use client'

import Image from 'next/image'
import { Container } from '../../../components/Container'
import PanoramicViewer from '../../../components/ui/PanoramicViewer/PanoramicViewer'
import { useState } from 'react'

export interface PanoramicViewerWithCarouselProps {
  defaultImageUrl: string
  imageData: {
    id: number
    name: string
    imageUrl: string
  }[]
}

export default function PanoramicViewerWithCarousel({
  defaultImageUrl,
  imageData,
}: PanoramicViewerWithCarouselProps) {
  const [selectedImageUrl, setSelectedImageUrl] = useState(defaultImageUrl)
  const handleImageClick = (imageUrl: string) => {
    setSelectedImageUrl(imageUrl)
  }

  return (
    <Container className="pt-4">
      <PanoramicViewer imageUrl={selectedImageUrl} />
      <div className="mt-4 flex w-full gap-4">
        {imageData.map((item: any) => {
          const { name, imageUrl } = item

          return (
            <div
              key={name}
              onClick={() => handleImageClick(imageUrl)}
              className="aspect-square relative cursor-pointer overflow-hidden rounded-lg shadow-lg min-w-[200px]"
            >
              <Image src={imageUrl} alt={name} fill sizes="200px" className="object-cover" />
              <h2 className="absolute bottom-2 left-2 text-white text-lg font-semibold bg-black/50 px-2 py-1 rounded">
                {name}
              </h2>
            </div>
          )
        })}
      </div>
    </Container>
  )
}
