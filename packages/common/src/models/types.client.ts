import type { ImageEntryDTO } from './types.js'

/**
 * Frontend-only parsed type for use after fetch & conversion
 */
export interface ImageEntry
  extends Omit<ImageEntryDTO, 'lastModified' | 'uploadedAt' | 'dateEnriched'> {
  lastModified: Date
  uploadedAt: Date
  dateEnriched?: Date
}

export const parseImageEntry = (raw: ImageEntryDTO): ImageEntry => ({
  ...raw,
  lastModified: new Date(raw.lastModified),
  uploadedAt: new Date(raw.uploadedAt),
  dateEnriched: raw.dateEnriched ? new Date(raw.dateEnriched) : undefined,
})

export const parseImageEntries = (rawList: ImageEntryDTO[]): ImageEntry[] =>
  rawList.map(parseImageEntry)
