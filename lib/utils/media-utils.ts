export async function getVideoMetadata(file: File): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    
    video.onloadedmetadata = () => {
      const { videoWidth, videoHeight, duration } = video
      URL.revokeObjectURL(url)
      resolve({ width: videoWidth, height: videoHeight, duration })
    }
    
    video.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({ width: 0, height: 0, duration: 0 })
    }
    
    video.src = url
  })
}
