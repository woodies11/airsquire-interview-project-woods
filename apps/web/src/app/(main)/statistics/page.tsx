import { BASE_API_URL } from 'apps/web/configs'
import { redirect } from 'next/navigation'
import ClientStatisticChart from './components/ClientStatisticChart'

export default async function StatisticsPage() {
  const res = await fetch(BASE_API_URL + '/api/bookmarks/stat')
  if (!res.ok) {
    console.error('Failed to fetch statistics')
    redirect('/')
  }

  const data = await res.json()
  if (!data.success) {
    console.error('Failed to fetch statistics')
    redirect('/')
  }
  const { totalImages, totalBookmarks } = data

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <h1 className="text-2xl font-semibold mt-8 text-asq-foreground-light">Statistics</h1>
      <ClientStatisticChart totalBookmarks={totalBookmarks} totalImages={totalImages} />
      <div className="grid grid-cols-3 justify-center items-center p-4 gap-4">
        <span>
          <span className="font-medium">Total:</span> {totalImages}
        </span>
        <span>
          <span className="font-medium">Bookmark:</span> {totalBookmarks}
        </span>
        <span>
          <span className="font-medium">Unbookmark:</span> {totalImages - totalBookmarks}
        </span>
      </div>
    </div>
  )
}
