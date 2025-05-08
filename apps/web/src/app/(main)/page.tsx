import 'server-only'
import { Container } from '@web/components/ui/Container'
import { BASE_API_URL } from 'apps/web/configs'
import { ImageEntryDTO, ImageEntry, parseImageEntries } from '@airsquire/common/src/models'
import BookmarkToggleButton from '@web/components/clients/BookmarkToggleButton'
import Link from 'next/link'
import ClientSearchBox from './components/ClientSearchBox'
import ClientBookmarkViewToggle from './components/ClientBookmarkViewToggle'

export default async function Page({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const { bookmarked, name } = await searchParams

  const params = new URLSearchParams()

  if (bookmarked === '0' || bookmarked === '1') {
    params.set('bookmarked', bookmarked)
  }

  if (name && typeof name === 'string' && name.trim()) {
    params.set('name', name)
  }

  const res = await fetch(`${BASE_API_URL}/api/images?${params.toString()}`, {
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
        <div className="flex flex-col w-full gap-4">
          <ClientSearchBox />
          <ClientBookmarkViewToggle />
        </div>
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
                <span className="w-full h-full hidden md:flex items-center justify-center">
                  <BookmarkToggleButton imageId={image._id} isBookmarked={!!image.isBookmarked} />
                </span>
                <img
                  src={`${BASE_API_URL}/${image.thumbnailUrl}`}
                  alt={image.name}
                  className="w-full max-w-50 mt-4 rounded-lg shadow-lg"
                />
                <div className="flex flex-col justify-center w-full h-full gap-2">
                  <h2 className="text-xl font-semibold flex gap-2">
                    <span className="h-full md:hidden inline translate-y-1">
                      <BookmarkToggleButton
                        imageId={image._id}
                        isBookmarked={!!image.isBookmarked}
                      />
                    </span>
                    {image.name}
                  </h2>
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
