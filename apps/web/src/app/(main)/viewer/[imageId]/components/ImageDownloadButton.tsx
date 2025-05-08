'use client'
import { forceDownload } from '@web/utils/downloads'

export function ImageDownloadButton({
  imageUrl,
  imageName,
}: {
  imageUrl: string
  imageName: string
}) {
  return (
    <button
      onClick={() => forceDownload(imageUrl, imageName)}
      className="px-4 py-2 text-md font-semibold bg-asq-primary text-asq-accent rounded-lg cursor-pointer hover:bg-asq-accent-secondary hover:text-asq-foreground-light duration-500 w-full"
    >
      Download
    </button>
  )
}
