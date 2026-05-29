import { ensureImageCached } from '../store'

const MIME_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export interface DownloadImagesResult {
  successCount: number
  failCount: number
}

export function formatExportFileTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`
}

export async function downloadImageIds(imageIds: string[], fileNameBase = 'images'): Promise<DownloadImagesResult> {
  if (imageIds.length === 0) return { successCount: 0, failCount: 0 }

  let successCount = 0
  let failCount = 0
  const multiple = imageIds.length > 1

  for (let index = 0; index < imageIds.length; index++) {
    try {
      const blob = await getImageBlob(imageIds[index])
      const order = String(index + 1).padStart(2, '0')
      const fileName = multiple
        ? `${fileNameBase}-${order}.${getBlobExtension(blob)}`
        : `${fileNameBase}.${getBlobExtension(blob)}`
      triggerDownload(blob, fileName)
      successCount++
      if (multiple) await delay(100)
    } catch (err) {
      console.error(err)
      failCount++
    }
  }

  return { successCount, failCount }
}

async function getImageBlob(imageIdOrUrl: string): Promise<Blob> {
  let src = imageIdOrUrl
  if (!imageIdOrUrl.startsWith('data:') && !imageIdOrUrl.startsWith('http://') && !imageIdOrUrl.startsWith('https://')) {
    src = await ensureImageCached(imageIdOrUrl) ?? imageIdOrUrl
  }

  if (src.startsWith('data:')) return dataUrlToBlob(src)

  const res = await fetch(src)
  if (!res.ok) throw new Error(`读取图片失败：${imageIdOrUrl}`)
  return await res.blob()
}

function dataUrlToBlob(dataUrl: string): Blob {
  const commaIndex = dataUrl.indexOf(',')
  if (commaIndex < 0) throw new Error('图片 data URL 格式无效')

  const meta = dataUrl.slice(5, commaIndex)
  const payload = dataUrl.slice(commaIndex + 1)
  const mime = meta.split(';')[0] || 'application/octet-stream'
  const isBase64 = meta.split(';').some((part) => part.toLowerCase() === 'base64')

  if (!isBase64) {
    return new Blob([decodeURIComponent(payload)], { type: mime })
  }

  const binary = atob(payload)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mime })
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function getBlobExtension(blob: Blob): string {
  return MIME_EXTENSIONS[blob.type.toLowerCase()] ?? blob.type.split('/')[1] ?? 'png'
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}
