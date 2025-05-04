import 'server-only'
import PanoramicViewerWithCarouselClient from './components/PanoramicViewerWIthCarouselClient'

export default async function Page() {
  const res = await fetch('http://localhost:3000/api/panoramas')
  const data = await res.json()

  const defaultImageUrl = data[0]?.imageUrl || '/panorama/building.jpg'

  return <PanoramicViewerWithCarouselClient imageData={data} defaultImageUrl={defaultImageUrl} />
}
