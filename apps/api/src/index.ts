import cors from 'cors'
import * as dotenv from 'dotenv'
import express from 'express'
import path from 'path'
import aiRoutes from './routes/ai.js'
import bookmarksRoutes from './routes/bookmarks.js'
import enrichmentRoutes from './routes/enrichment.js'
import imagesRoutes from './routes/images.js'

dotenv.config()

const app = express()
const PORT = 4000

app.use(cors())
app.use('/uploads', express.static(path.resolve('uploads')))
app.use(express.json())

// log requests to the console
app.use((req, res, next) => {
  console.log(`${new Date().toUTCString()}: ${req.method} ${req.url}`)
  next()
})

app.use('/api/images', imagesRoutes)
app.use('/api/enrichment', enrichmentRoutes)
app.use('/api/bookmarks', bookmarksRoutes)
app.use('/api/ai', aiRoutes)

app.listen(PORT, () => {
  console.log(`Node server running at http://localhost:${PORT}`)
})
