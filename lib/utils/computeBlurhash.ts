import { encode } from 'blurhash'

export async function computeBlurhash(file: File): Promise<{
  blurhash: string | null
  aspect_ratio: number | null
  preview_url: string
}> {
  const preview_url = URL.createObjectURL(file)

  if (!file.type.startsWith('image/')) {
    return { blurhash: null, aspect_ratio: null, preview_url }
  }

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const aspectRatio = img.width / img.height
      
      // Create a small canvas for blurhash encoding
      const canvas = document.createElement('canvas')
      const width = 32
      const height = Math.round(32 / aspectRatio)
      canvas.width = width
      canvas.height = height
      
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve({ blurhash: null, aspect_ratio: aspectRatio, preview_url })
        return
      }

      ctx.drawImage(img, 0, 0, width, height)
      const imageData = ctx.getImageData(0, 0, width, height)
      const blurhash = encode(imageData.data, imageData.width, imageData.height, 4, 4)
      
      resolve({ blurhash, aspect_ratio: aspectRatio, preview_url })
    }
    img.onerror = () => {
      resolve({ blurhash: null, aspect_ratio: null, preview_url })
    }
    img.src = preview_url
  })
}
