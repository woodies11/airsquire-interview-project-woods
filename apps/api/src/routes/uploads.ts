import express from 'express'
import fileUpload from 'express-fileupload'
import { ObjectId } from 'mongodb'
import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'
import { dbImagesCollection } from '../db.js'

const router = express.Router()

router.use(
  fileUpload({
    createParentPath: true,
    useTempFiles: true,
    tempFileDir: 'tmp/',
  })
)

// TODO: Type the handler correctly
router.post('/', async (req: any, res: any) => {
  console.log('req', req.body)

  if (!req.files || !req.files.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }

  const file = req.files.file

  // write the file to uploads directory
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
    name: '',
    description: '',
    rating: -1,
    lastModified: new Date(),
    uploadedAt: new Date(),
    uploadedBy: 'user',
    date: null,
    upload_status: 'temp', // keep track of orphaned images so we can delete them periodically if the user never fisishes the upload
  }

  const result = await dbImagesCollection.insertOne(imageMeta)

  if (!result.acknowledged) {
    return res.status(500).json({ error: 'Error saving to database' })
  }
  console.log('Image saved to database:', result.insertedId)

  res.json({ success: true, id: result.insertedId.toString() })
})

router.patch('/', async (req: any, res: any) => {
  console.log('req', req.body)
  const { id, name, description, rating, date } = req.body
  if (!id) {
    return res.status(400).json({ error: 'No id provided' })
  }
  const imageMeta = {
    name,
    description,
    rating,
    date,
    upload_status: 'completed',
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
