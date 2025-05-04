import { ImageMeta } from '@airsquire/common/src/models/ImageMeta.js'
import express from 'express'
import fileUpload from 'express-fileupload'
import { images } from '../db.js'

const router = express.Router()

router.use(
  fileUpload({
    createParentPath: true,
    useTempFiles: true,
    tempFileDir: 'uploads/',
  })
)

// TODO: Type the handler correctly
router.post('/', async (req: any, res: any) => {
  const file = req.file
  if (!file) return res.status(400).send('No file uploaded')

  const doc: ImageMeta = {
    originalName: file.originalname,
    storedName: file.filename,
    path: file.path,
    size: file.size,
    mimetype: file.mimetype,
    bookmarked: false,
    uploadedAt: new Date(),
  }

  const result = await images.insertOne(doc)
  res.json({ success: true, id: result.insertedId })
})

router.get('/', async (_, res) => {
  const data = await images.find().sort({ uploadedAt: -1 }).toArray()
  res.json(data)
})

export default router
