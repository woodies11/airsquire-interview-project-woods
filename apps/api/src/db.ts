import { ImageMeta } from '@airsquire/common/src/models/ImageMeta.js'
import dotenv from 'dotenv'
import { Collection, Db, MongoClient } from 'mongodb'

dotenv.config()

const client = new MongoClient(process.env.MONGO_URI!)
await client.connect()

export const db: Db = client.db('airsquire')
export const images: Collection<ImageMeta> = db.collection('panoramas')
