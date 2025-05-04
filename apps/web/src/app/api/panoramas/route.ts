/**
 * Return a list of all panoramas
 * @param request
 */
export async function GET(request: Request) {
  // for now, we will just return a static list of panoramas
  const panoramas = [
    {
      id: 1,
      name: 'Building',
      imageUrl: '/panorama/building.jpg',
    },
    {
      id: 2,
      name: 'Indoor',
      imageUrl: '/panorama/indoor.jpg',
    },
    {
      id: 3,
      name: 'Sea',
      imageUrl: '/panorama/sea.jpg',
    },
  ]
  return new Response(JSON.stringify(panoramas), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
