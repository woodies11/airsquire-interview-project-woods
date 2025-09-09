import { Container } from '@web/components/ui/Container'
import PanoramicViewer from '@web/components/ui/PanoramicViewer/PanoramicViewer'
import { message } from 'antd'
import { BASE_API_URL } from 'apps/web/configs'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { parseImageEntry } from 'packages/common/src/models'
import { ImageDownloadButton } from './components/ImageDownloadButton'
import BookmarkToggleButton from '@web/components/clients/BookmarkToggleButton'

export default async function Page({ params }: { params: { imageId: string } }) {
  const { imageId } = await params
  const res = await fetch(`${BASE_API_URL}/api/images/${imageId}`)
  if (!res.ok) {
    console.error('Failed to fetch image data:', res.statusText)
    redirect('/')
  }
  const data = await res.json()
  const image = parseImageEntry(data)
  if (!image) {
    message.error('Failed to parse image data')
    redirect('/')
  }

  return (
    <Container className="mt-8">
      <div className="flex flex-col items-center justify-center w-full h-full text-asq-foreground-light gap-4">
        <PanoramicViewer autoPan imgSrc={`${BASE_API_URL}/${image.imageUrl}`} />
        <div className="grid grid-cols-1 gap-4 max-w-4xl w-full">
          <h1 className="text-2xl font-semibold place-self-center items-center justify-center flex gap-2">
            <BookmarkToggleButton imageId={image._id} isBookmarked={image.isBookmarked} />{' '}
            {image.name}
          </h1>
          <div>
            <h2 className="text-xl font-semibold">Description</h2>
            <p className="text-gray-500">{image.description}</p>
          </div>
          <ImageDownloadButton
            imageUrl={`${BASE_API_URL}/${image.imageUrl}`}
            imageName={image.name}
          />
          <h2 className="text-xl font-semibold">Tags</h2>
          <div className="flex flex-wrap w-full gap-2">
            {image.tags?.map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 text-sm font-light text-asq-accent bg-asq-primary rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <h4 className="font-medium">Uploaded at:</h4>
            <p className="text-gray-500">{image.uploadedAt.toLocaleString()}</p>
            <h4 className="font-medium">Last modified:</h4>
            <p className="text-gray-500">{image.lastModified.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </Container>
  )
}
