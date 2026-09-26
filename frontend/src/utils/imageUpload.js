import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth, storage } from '../firebase'

// Images are downscaled and re-encoded as JPEG in the browser, then uploaded to
// Firebase Storage under users/<firebase uid>/<kind>/<random id>.jpg. Only the
// resulting download URL is sent to the API (#45) — never the image bytes.
// storage.rules and backend/src/utils/imageSource.js both expect exactly this
// layout, so keep all three in step.

export const IMAGE_SIZES = {
  avatar: { maxW: 400,  maxH: 533  },
  banner: { maxW: 1500, maxH: 500  },
  board:  { maxW: 900,  maxH: 1400 },
}
const QUALITY = 0.88

// Downscale an image file to fit maxW x maxH and re-encode it as a JPEG Blob.
export function compressImage(file, maxW, maxH, quality = QUALITY) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxW) { height = Math.round(height * maxW / width); width = maxW }
      if (height > maxH) { width = Math.round(width * maxH / height); height = maxH }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Could not process image')),
        'image/jpeg',
        quality,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')) }
    img.src = url
  })
}

// For guests only: their avatar/banner stays in this browser's localStorage.
export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// Upload an already-compressed image for the signed-in user; returns its URL.
export async function uploadImage(blob, kind) {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Sign in to upload images')
  if (!IMAGE_SIZES[kind]) throw new Error(`Unknown image kind: ${kind}`)
  const fileRef = ref(storage, `users/${uid}/${kind}/${crypto.randomUUID()}.jpg`)
  await uploadBytes(fileRef, blob, {
    contentType: 'image/jpeg',
    // Every upload gets a new name and is never overwritten, so it can be cached for good.
    cacheControl: 'public, max-age=31536000, immutable',
  })
  return getDownloadURL(fileRef)
}

// Compress + upload in one step.
export async function uploadImageFile(file, kind) {
  const { maxW, maxH } = IMAGE_SIZES[kind]
  return uploadImage(await compressImage(file, maxW, maxH), kind)
}
