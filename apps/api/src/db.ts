import dotenv from 'dotenv'
import { Collection, Db, MongoClient } from 'mongodb'

dotenv.config()

const client = new MongoClient(process.env.MONGO_URI!)
await client.connect()

export const db: Db = client.db('airsquire')
export const dbImagesCollection: Collection<any> = db.collection('panoramas')
