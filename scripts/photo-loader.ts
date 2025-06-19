import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { workdir } from '../packages/builder/src/path.js'

interface PhotoManifest {
  id: string
  title: string
  description: string
  dateTaken: string
  views: number
  tags: string[]
  originalUrl: string
  thumbnailUrl: string
  blurhash: string
  width: number
  height: number
  aspectRatio: number
  s3Key: string
  lastModified: string
  size: number
  exif: any
}

class BuildTimePhotoLoader {
  private photos: PhotoManifest[] = []
  private photoMap: Record<string, PhotoManifest> = {}

  constructor() {
    try {
      const manifestPath = join(workdir, 'src/data/photos-manifest.json')
      const manifestContent = readFileSync(manifestPath, 'utf-8')
      this.photos = JSON.parse(manifestContent).data as PhotoManifest[]

      this.photos.forEach((photo) => {
        this.photoMap[photo.id] = photo
      })

      console.info(`📚 Loaded ${this.photos.length} photos from manifest`)
    } catch (error) {
      console.error('❌ Failed to load photos manifest:', error)
      this.photos = []
    }
  }

  getPhotos() {
    return this.photos
  }

  getPhoto(id: string) {
    return this.photoMap[id]
  }
}

export const buildTimePhotoLoader = new BuildTimePhotoLoader()
