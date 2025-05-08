import 'server-only'
import { Container } from '@web/components/Container'
import { BASE_API_URL } from 'apps/web/configs'
import { ImageEntryBase } from '@airsquire/common/src/models/types.js'
import { ImageEntry, parseImageEntries } from '@airsquire/common/src/models/types.client.js'

export default async function Page() {
  const res = await fetch(`${BASE_API_URL}/api/images/`, {
    method: 'GET',
  })
  if (!res.ok) {
    throw new Error('Failed to fetch data')
  }
  const data: ImageEntryBase[] = await res.json()
  const images: ImageEntry[] = parseImageEntries(data)

  return (
    <Container>
      <div className="flex flex-col items-center justify-center w-full h-full py-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        {images?.length > 0 &&
          images.map(image => (
            <div
              key={image._id}
              className="grid grid-cols-1 justify-items-center md:justify-items-start md:grid-cols-[12rem_1fr] gap-4 md:gap-8 items-center justify-center w-full p-4 border-b"
            >
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
                      className="px-2 py-1 text-sm font-semibold text-gray-700 bg-gray-200 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
      </div>
    </Container>
  )
}
