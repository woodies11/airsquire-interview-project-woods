import cors from 'cors'
import express from 'express'
import path from 'path'
import uploadRoutes from './routes/uploads.js'

const app = express()
const PORT = 4000

app.use(cors())
app.use('/images', express.static(path.resolve('uploads')))
app.use(express.json())

// log requests to the console
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`)
  next()
})

app.use('/api/uploads', uploadRoutes)

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})
