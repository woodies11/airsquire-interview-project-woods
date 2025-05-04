import dotenv from 'dotenv'
import { Collection, Db, MongoClient } from 'mongodb'

dotenv.config()

const client = new MongoClient(process.env.MONGO_URI!)
await client.connect()

export const db: Db = client.db('airsquire')
export const images: Collection<ImageMeta> = db.collection('panoramas')

export interface ImageMeta {
  _id?: string
  originalName: string
  storedName: string
  path: string
  size: number
  mimetype: string
  bookmarked: boolean
  uploadedAt: Date
}
