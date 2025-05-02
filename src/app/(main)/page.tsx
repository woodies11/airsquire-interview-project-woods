import 'server-only'
import PanoramicViewerWithCarousel from './components/PanoramicViewerWIthCarousel'

export default async function Page() {
  const res = await fetch('http://localhost:3000/api/panoramas')
  const data = await res.json()

  const defaultImageUrl = data[0]?.imageUrl || '/panorama/building.jpg'

  return <PanoramicViewerWithCarousel imageData={data} defaultImageUrl={defaultImageUrl} />
}
