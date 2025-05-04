import cors from 'cors'
import express from 'express'
import path from 'path'
import uploadRoutes from './routes/upload.js'

const app = express()
const PORT = 4000

app.use(cors())
app.use('/uploads', express.static(path.resolve('uploads')))
app.use(express.json())

app.use('/api/images', uploadRoutes)

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})
