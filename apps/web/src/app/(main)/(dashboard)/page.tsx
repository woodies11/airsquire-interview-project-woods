import 'server-only'
import { Container } from '@web/components/ui/Container'
import { BASE_API_URL } from 'apps/web/configs'
import { ImageEntryDTO, ImageEntry, parseImageEntries } from '@airsquire/common/src/models'
import BookmarkToggleButton from '@web/components/clients/BookmarkToggleButton'
import Link from 'next/link'

export default async function Page() {
  const res = await fetch(`${BASE_API_URL}/api/images/`, {
    method: 'GET',
  })
  if (!res.ok) {
    throw new Error('Failed to fetch data')
  }
  const data: ImageEntryDTO[] = await res.json()
  const images: ImageEntry[] = parseImageEntries(data)

  return (
    <Container>
      <div className="flex flex-col items-center justify-center w-full h-full py-8 text-asq-foreground-light">
        <h1 className="text-4xl font-bold mb-8">Dashboard</h1>
        {images?.length > 0 &&
          images.map(image => (
            <Link
              key={image._id}
              href={`/viewer/${image._id}`}
              className="w-full odd:bg-asq-background-light hover:bg-asq-accent-secondary duration-500 cursor-pointer"
            >
              <div
                className={
                  `grid grid-cols-1 md:grid-cols-[2rem_12rem_1fr] justify-items-center md:justify-items-start` +
                  ` gap-4 md:gap-8 items-center justify-center w-full p-4`
                }
              >
                <BookmarkToggleButton imageId={image._id} isBookmarked={!!image.isBookmarked} />
                <img
                  src={`${BASE_API_URL}/${image.thumbnailUrl}`}
                  alt={image.name}
                  className="w-full max-w-50 mt-4 rounded-lg shadow-lg"
                />
                <div className="flex flex-col justify-center w-full h-full gap-2">
                  <h2 className="text-xl font-semibold">{image.name}</h2>
                  <p className="text-gray-500">Uploaded at: {image.uploadedAt.toLocaleString()}</p>
                  <p className="text-gray-500">
                    Last modified: {image.lastModified.toLocaleString()}
                  </p>
                  <div className="flex flex-wrap w-full gap-2">
                    <span className="font-semibold">Tags: </span>
                    {image.tags?.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 text-sm font-light text-asq-accent bg-asq-primary rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
      </div>
    </Container>
  )
}
