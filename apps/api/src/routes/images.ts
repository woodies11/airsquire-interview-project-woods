import express from 'express'
import fileUpload from 'express-fileupload'
import { ObjectId } from 'mongodb'
import OpenAI from 'openai'
import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'
import { dbImagesCollection } from '../db.js'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const router = express.Router()

router.use(
  fileUpload({
    createParentPath: true,
    useTempFiles: true,
    tempFileDir: 'tmp/',
  })
)

router.post('/originals', async (req: any, res: any) => {
  const { sha256, id } = req.body
  if (!sha256 && !id) {
    return res.status(400).json({ error: 'No sha256 or id provided' })
  }

  if (!req.files || !req.files.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }
  const file = req.files.file
  const ext = file.name.split('.').pop().toLowerCase()
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff']
  if (!allowedExtensions.includes(ext)) {
    return res.status(400).json({ error: 'Invalid file type' })
  }

  // entry from database either by sha256
  // TODO: allow get by id as well
  const existingImage = await dbImagesCollection.findOne({ sha256 })
  if (!existingImage) {
    return res.status(404).json({ error: 'Image not found in database' })
  }
  const imageUrl = existingImage.imageUrl

  // replace the file with full size image
  const filePath = `${imageUrl}`
  await file.mv(filePath, (err: any) => {
    if (err) {
      console.error('Error moving file:', err)
      return res.status(500).json({ error: 'Error moving file' })
    }
  })
  console.log('File uploaded to:', filePath)

  dbImagesCollection.updateOne(
    { _id: new ObjectId(existingImage._id) },
    {
      $set: {
        lastModified: new Date(),
        upload_status: 'completed',
      },
    }
  )

  res.json({ success: true, id: existingImage._id.toString() })
})

/**
 * To speed up UX, we can upload and prepare database entries as soon as the user selects an image
// and then update the metadata later using a PATCH request
 */
router.post('/', async (req: any, res: any) => {
  console.log('req', req.body)

  const { sha256 } = req.body

  if (!req.files || !req.files.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }

  const file = req.files.file
  const ext = file.name.split('.').pop().toLowerCase()
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff']
  if (!allowedExtensions.includes(ext)) {
    return res.status(400).json({ error: 'Invalid file type' })
  }

  const uploadPath = `uploads/${uuidv4()}.${ext}`
  await file.mv(uploadPath, (err: any) => {
    if (err) {
      console.error('Error moving file:', err)
      return res.status(500).json({ error: 'Error moving file' })
    }
  })

  // also generatge a thumbnail by cutteing the center and resizing it to 512x512
  const thumbnailPath = `uploads/${uuidv4()}_thumb.${ext}`
  await sharp(uploadPath)
    .resize(512, 512, {
      fit: 'cover',
      position: 'center',
    })
    .toFile(thumbnailPath, (err: any) => {
      if (err) {
        console.error('Error creating thumbnail:', err)
        return res.status(500).json({ error: 'Error creating thumbnail' })
      }
    })

  console.log('File uploaded to:', uploadPath)

  // insert into db with placeholder values
  const imageMeta = {
    imageUrl: uploadPath,
    thumbnailUrl: thumbnailPath,
    name: '',
    description: '',
    lastModified: new Date(),
    uploadedAt: new Date(),
    uploadedBy: 'user',
    sha256,
    // keep track of orphaned images so we can delete them periodically if the user never fisishes the upload
    upload_status: 'temp',
    entry_status: 'pending',
  }

  const result = await dbImagesCollection.insertOne(imageMeta)

  if (!result.acknowledged) {
    return res.status(500).json({ error: 'Error saving to database' })
  }
  console.log('Image saved to database:', result.insertedId)

  res.json({ success: true, id: result.insertedId.toString() })
})

/**
 * Update the image metadata - cannot and will not update the image itself
 */
router.patch('/', async (req: any, res: any) => {
  console.log('req', req.body)
  const { id, name, description, rating, date } = req.body
  if (!id) {
    return res.status(400).json({ error: 'No id provided' })
  }
  const imageMeta = {
    name,
    description,
    entry_status: 'completed',
    lastModified: new Date(),
  }
  const result = await dbImagesCollection.updateOne({ _id: new ObjectId(id) }, { $set: imageMeta })
  if (!result.acknowledged) {
    return res.status(500).json({ error: 'Error saving to database' })
  }
  console.log('Image updated in database:', result.modifiedCount)
  res.json({ success: true })
})

router.get('/', async (_, res) => {
  const data = await dbImagesCollection.find().sort({ uploadedAt: -1 }).toArray()
  res.json(data)
})

export default router
