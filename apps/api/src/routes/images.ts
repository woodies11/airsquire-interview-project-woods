import express from 'express'
import fileUpload from 'express-fileupload'
import fs from 'fs'
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

/**
 * To speed up UX, we can upload and prepare database entries as soon as the user selects an image
// and then update the metadata later using a PATCH request
 */
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

  const md5 = file.md5
  // check if the file already exists in the database
  const existingImage = await dbImagesCollection.findOne({ md5 })
  if (existingImage) {
    if (existingImage.upload_status === 'temp') {
      // if the file already exists but is not completed, we can just return the id
      // and let the user update the metadata
      console.log('File already exists in database:', existingImage._id)
      try {
        // check that the file physically exists on disk as well in case of DB drift
        const filePath = `uploads/${existingImage.imageUrl}`
        fs.accessSync(filePath, fs.constants.F_OK)
        res.json({ success: true, id: existingImage._id.toString() })
        return
      } catch (err) {
        // These are 'temp' status entries so they can be safely deleted; no data should be
        // associated with them yet
        console.log('DB Missmatch: File does not exist on disk but exists in DB, deleting...')
        dbImagesCollection.deleteOne({ _id: existingImage._id })
        console.log('Deleted broken record from DB, proceeding with normal upload flow')
      }
    }
    // if the file already exists and is completed... there might be a legit use case so we do not
    // want to block the user from uploading the same file again - but might want to warn them
    // TODO: Perhaps warn the user that they are uploading a duplicate file
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
    rating: null,
    lastModified: new Date(),
    uploadedAt: new Date(),
    uploadedBy: 'user',
    date: null,
    md5,
    // keep track of orphaned images so we can delete them periodically if the user never fisishes the upload
    upload_status: 'temp',
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
