import cors from 'cors'
import * as dotenv from 'dotenv'
import express from 'express'
import path from 'path'
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
  console.log(`${req.method} ${req.url}`)
  next()
})

app.use('/api/images', imagesRoutes)
app.use('/api/enrichment', enrichmentRoutes)

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})
