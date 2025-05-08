import type { AiEnrichment, ImageEntryDTO } from './types.js'

/**
 * Backend-only type representing the full MongoDB shape
 */
export interface ImageEntryDB
  extends Omit<ImageEntryDTO, '_id' | 'lastModified' | 'uploadedAt' | 'dateEnriched'> {
  _id?: any // MongoDB ObjectId - but let's keep it like this for now, else we need to install mongodb on this common package too
  lastModified?: Date
  uploadedAt?: Date
  dateEnriched?: Date
  aiEnrichment?: AiEnrichment
}
