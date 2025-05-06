export default function Page({ params }: { params: { imageId: string } }) {
  const { imageId } = params
  return (
    <div>
      <h1>Image ID: {imageId}</h1>
      {/* Add your image viewer component here */}
    </div>
  )
}
