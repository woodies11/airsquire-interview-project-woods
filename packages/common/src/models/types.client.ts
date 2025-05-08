import type { ImageEntryBase } from './types.js'

/**
 * Frontend-only parsed type for use after fetch & conversion
 */
export interface ImageEntry
  extends Omit<ImageEntryBase, 'lastModified' | 'uploadedAt' | 'dateEnriched'> {
  lastModified: Date
  uploadedAt: Date
  dateEnriched?: Date
}

export const parseImageEntry = (raw: ImageEntryBase): ImageEntry => ({
  ...raw,
  lastModified: new Date(raw.lastModified),
  uploadedAt: new Date(raw.uploadedAt),
  dateEnriched: raw.dateEnriched ? new Date(raw.dateEnriched) : undefined,
})

export const parseImageEntries = (rawList: ImageEntryBase[]): ImageEntry[] =>
  rawList.map(parseImageEntry)
