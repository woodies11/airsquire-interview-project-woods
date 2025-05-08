export type UploadStatus = 'temp' | 'completed'
export type EntryStatus = 'pending' | 'completed'

export interface AiEnrichment {
  d: string
  n: string
  t: string
  l: string
  a: string[]
}

/**
 * Common raw shape from database or API responses (shared across FE/BE)
 */
export interface ImageEntryBase {
  _id: string // always stringified in JSON
  imageUrl: string
  thumbnailUrl: string
  name: string
  tags: string[]
  description: string
  lastModified: string
  uploadedAt: string
  uploadedBy: string
  sha256: string
  upload_status: UploadStatus
  entry_status: EntryStatus
  aiEnrichment?: AiEnrichment
  dateEnriched?: string
  model?: string
}
