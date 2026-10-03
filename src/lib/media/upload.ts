import { upload } from '@vercel/blob/client'

export const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov']

export function isVideoPath(pathname: string) {
  const ext = pathname.split('.').pop()?.toLowerCase() ?? ''
  return VIDEO_EXTENSIONS.includes(ext)
}

/** Lädt eine Datei direkt aus dem Browser zu Vercel Blob hoch (auch große Videos). */
export async function uploadMedia(file: File, folder: string, onProgress?: (percent: number) => void) {
  const name = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  return upload(`${folder}/${name}`, file, {
    access: 'public',
    handleUploadUrl: '/api/media/upload',
    multipart: file.size > 10 * 1024 * 1024,
    onUploadProgress: onProgress ? ({ percentage }) => onProgress(Math.round(percentage)) : undefined,
  })
}
