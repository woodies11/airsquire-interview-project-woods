import express from 'express'
import fileUpload from 'express-fileupload'
import { v4 as uuidv4 } from 'uuid'
import { images } from '../db.js'

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
  console.log('req', req.files)

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
  console.log('File uploaded to:', uploadPath)

  // const doc: ImageMeta = {
  //   originalName: file.originalname,
  //   storedName: file.filename,
  //   path: file.path,
  //   size: file.size,
  //   mimetype: file.mimetype,
  //   bookmarked: false,
  //   uploadedAt: new Date(),
  // }

  // const result = await images.insertOne(doc)
  res.json({ success: true, id: 0 })
})

router.get('/', async (_, res) => {
  const data = await images.find().sort({ uploadedAt: -1 }).toArray()
  res.json(data)
})

export default router
