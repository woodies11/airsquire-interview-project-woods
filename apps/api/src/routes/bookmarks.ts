import express from 'express'
import { ObjectId } from 'mongodb'
import { dbImagesCollection } from '../db.js'

const router = express.Router()

router.post('/', async (req: any, res: any) => {
  const { imageId, isBookmarked } = req.body
  if (!imageId) {
    return res.status(400).json({ error: 'No imageId provided' })
  }

  const image = await dbImagesCollection.findOne({ _id: new ObjectId(imageId) })

  if (!image) {
    return res.status(404).json({ error: 'Image not found' })
  }

  // if bookmarks is not provided, toggle the current value
  let newIsBookmarked = !image.isBookmarked

  if (isBookmarked !== undefined && isBookmarked !== null) {
    newIsBookmarked = isBookmarked
  }

  await dbImagesCollection.updateOne(
    { _id: new ObjectId(imageId) },
    {
      $set: {
        isBookmarked: newIsBookmarked,
      },
    }
  )

  return res.status(200).json({ success: true, imageId, newIsBookmarked })
})

router.get('/stat', async (_: any, res: any) => {
  // return number of bookmarks and total number of images
  const totalImages = await dbImagesCollection.countDocuments({ entry_status: 'completed' })
  const totalBookmarks = await dbImagesCollection.countDocuments({
    entry_status: 'completed',
    isBookmarked: true,
  })
  return res.status(200).json({ success: true, totalImages, totalBookmarks })
})

export default router
