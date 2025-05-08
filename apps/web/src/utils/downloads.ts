/**
 * Many browsers ignore the `download` attribute on links so we need this trick to force a download
 * instead of opening the file in a new tab.
 */
export const forceDownload = async (url: string, filename: string) => {
  const res = await fetch(url)
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
