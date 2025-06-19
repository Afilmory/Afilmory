import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Plugin } from 'vite'

import type { SiteConfig } from '../../site.config'

interface PhotoData {
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
  exif?: any
  isLivePhoto: boolean
}

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export function createFeedSitemapPlugin(siteConfig: SiteConfig): Plugin {
  return {
    name: 'feed-sitemap-generator',
    apply: 'build',
    generateBundle() {
      try {
        // Read photos manifest
        const manifestPath = resolve(
          __dirname,
          '../../packages/data/src/photos-manifest.json',
        )
        const photosData: PhotoData[] = (JSON.parse(
          readFileSync(manifestPath, 'utf-8'),).data
        )

        // Sort photos by date taken (newest first)
        const sortedPhotos = photosData.sort(
          (a, b) =>
            new Date(b.dateTaken).getTime() - new Date(a.dateTaken).getTime(),
        )

        // Generate RSS feed
        const rssXml = generateRSSFeed(sortedPhotos, siteConfig)

        // Generate sitemap
        const sitemapXml = generateSitemap(sortedPhotos, siteConfig)

        // Emit RSS feed
        this.emitFile({
          type: 'asset',
          fileName: 'feed.xml',
          source: rssXml,
        })

        // Emit sitemap
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: sitemapXml,
        })

        console.info(`Generated RSS feed with ${sortedPhotos.length} photos`)
        console.info(`Generated sitemap with ${sortedPhotos.length + 1} URLs`)
      } catch (error) {
        console.error('Error generating RSS feed and sitemap:', error)
      }
    },
  }
}

function generateRSSFeed(photos: PhotoData[], config: SiteConfig): string {
  const now = new Date().toUTCString()
  const latestPhoto = photos[0]
  const lastBuildDate = latestPhoto
    ? new Date(latestPhoto.dateTaken).toUTCString()
    : now

  // Take latest 20 photos for RSS feed
  const recentPhotos = photos.slice(0, 20)

  const rssItems = recentPhotos
    .map((photo) => {
      const photoUrl = `${config.url}/${photo.id}`
      const pubDate = new Date(photo.dateTaken).toUTCString()
      const tags = photo.tags.join(', ')

      let description = photo.description || photo.title
      if (tags) {
        description += ` | Tags: ${tags}`
      }

      // Extract EXIF data for custom tags
      const exifTags = generateExifTags(photo.exif, photo)

      return `    <item>
      <title><![CDATA[${photo.title}]]></title>
      <link>${photoUrl}</link>
      <guid isPermaLink="true">${photoUrl}</guid>
      <description><![CDATA[${description}]]></description>
      <pubDate>${pubDate}</pubDate>
      ${photo.tags.map((tag) => `<category><![CDATA[${tag}]]></category>`).join('\n      ')}
      <enclosure url="${photo.thumbnailUrl.startsWith('http') ? photo.thumbnailUrl : config.url + photo.thumbnailUrl}" type="image/webp" length="${photo.size}" />
${exifTags}
    </item>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:exif="https://afilmory.com/rss/exif/1.1">
  <channel>
    <title><![CDATA[${config.title}]]></title>
    <link>${config.url}</link>
    <description><![CDATA[${config.description}]]></description>
    <language>zh-CN</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <pubDate>${now}</pubDate>
    <ttl>60</ttl>
    <copyright>Copyright ${config.author.name}</copyright>
    
    <!-- Afilmory RSS EXIF Extension Protocol Metadata -->
    <exif:version>1.1</exif:version>
    <exif:protocol>afilmory-rss-exif</exif:protocol>
${
  config.feed?.folo?.challenge
    ? `
    <follow_challenge>
    <feedId>${config.feed?.folo?.challenge.feedId}</feedId>
    <userId>${config.feed?.folo?.challenge.userId}</userId>
</follow_challenge>
`
    : ''
}
    <atom:link href="${config.url}/feed.xml" rel="self" type="application/rss+xml" />
    <managingEditor>${config.author.name}</managingEditor>
    <webMaster>${config.author.name}</webMaster>
    <generator>Vite RSS Generator</generator>
    <image>
      <url>${config.author.avatar || `${config.url}/favicon.ico`}</url>
      <title><![CDATA[${config.title}]]></title>
      <link>${config.url}</link>
    </image>
${rssItems}
  </channel>
</rss>`
}

function generateExifTags(exif: any, photo: PhotoData): string {
  if (!exif) {
    return ''
  }

  const tags: string[] = []

  // === 基础相机设置参数 (basic) ===

  // Aperture (光圈)
  if (exif.Photo?.FNumber) {
    tags.push(`      <exif:aperture>f/${exif.Photo.FNumber}</exif:aperture>`)
  }

  // Shutter Speed (快门)
  if (exif.Photo?.ExposureTime) {
    const shutterSpeed =
      exif.Photo.ExposureTime >= 1
        ? `${exif.Photo.ExposureTime}s`
        : `1/${Math.round(1 / exif.Photo.ExposureTime)}s`
    tags.push(`      <exif:shutterSpeed>${shutterSpeed}</exif:shutterSpeed>`)
  }

  // ISO
  if (exif.Photo?.ISOSpeedRatings) {
    tags.push(`      <exif:iso>${exif.Photo.ISOSpeedRatings}</exif:iso>`)
  }

  // Exposure Compensation (曝光补偿)
  if (exif.Photo?.ExposureBiasValue !== undefined) {
    const ev = exif.Photo.ExposureBiasValue
    const evString = ev > 0 ? `+${ev}` : `${ev}`
    tags.push(
      `      <exif:exposureCompensation>${evString} EV</exif:exposureCompensation>`,
    )
  }

  // === 图像属性 (basic) ===

  // Image Dimensions (图片宽度, 高度)
  tags.push(
    `      <exif:imageWidth>${photo.width}</exif:imageWidth>`,
    `      <exif:imageHeight>${photo.height}</exif:imageHeight>`,
  )

  // Date Taken (拍摄时间) - 转换为ISO 8601格式
  if (exif.Photo?.DateTimeOriginal) {
    try {
      // 尝试解析EXIF日期格式 (YYYY:MM:DD HH:mm:ss)
      const exifDate = exif.Photo.DateTimeOriginal.replaceAll(':', '-').replace(
        /-(\d{2}:\d{2}:\d{2})/,
        ' $1',
      )
      const isoDate = new Date(exifDate).toISOString()
      tags.push(`      <exif:dateTaken>${isoDate}</exif:dateTaken>`)
    } catch {
      // 如果解析失败，使用photo.dateTaken
      const isoDate = new Date(photo.dateTaken).toISOString()
      tags.push(`      <exif:dateTaken>${isoDate}</exif:dateTaken>`)
    }
  } else {
    const isoDate = new Date(photo.dateTaken).toISOString()
    tags.push(`      <exif:dateTaken>${isoDate}</exif:dateTaken>`)
  }

  // Camera Model (机型)
  if (exif.Image?.Make && exif.Image?.Model) {
    tags.push(
      `      <exif:camera><![CDATA[${exif.Image.Make} ${exif.Image.Model}]]></exif:camera>`,
    )
  }

  // Orientation (图像方向)
  if (exif.Image?.Orientation) {
    tags.push(
      `      <exif:orientation>${exif.Image.Orientation}</exif:orientation>`,
    )
  }

  // === 镜头参数 (lens) ===

  // Lens Model (镜头)
  if (exif.Photo?.LensModel) {
    tags.push(
      `      <exif:lens><![CDATA[${exif.Photo.LensModel}]]></exif:lens>`,
    )
  }

  // Focal Length (焦段)
  if (exif.Photo?.FocalLength) {
    tags.push(
      `      <exif:focalLength>${exif.Photo.FocalLength}mm</exif:focalLength>`,
    )
  }

  // Focal Length in 35mm equivalent (等效35mm焦距)
  if (exif.Photo?.FocalLengthIn35mmFilm) {
    tags.push(
      `      <exif:focalLength35mm>${exif.Photo.FocalLengthIn35mmFilm}mm</exif:focalLength35mm>`,
    )
  }

  // Max Aperture (镜头最大光圈)
  if (exif.Photo?.MaxApertureValue) {
    const maxAperture = Math.pow(2, exif.Photo.MaxApertureValue / 2)
    tags.push(
      `      <exif:maxAperture>f/${maxAperture.toFixed(1)}</exif:maxAperture>`,
    )
  }

  // === 位置信息 (location) ===

  // GPS Coordinates
  if (exif.GPS?.GPSLatitude && exif.GPS?.GPSLongitude) {
    const lat = convertDMSToDD(exif.GPS.GPSLatitude, exif.GPS.GPSLatitudeRef)
    const lng = convertDMSToDD(exif.GPS.GPSLongitude, exif.GPS.GPSLongitudeRef)
    if (lat !== null && lng !== null) {
      tags.push(
        `      <exif:gpsLatitude>${lat}</exif:gpsLatitude>`,
        `      <exif:gpsLongitude>${lng}</exif:gpsLongitude>`,
      )
    }
  }

  // Altitude (海拔)
  if (exif.GPS?.GPSAltitude) {
    const altitude =
      exif.GPS.GPSAltitudeRef === 1
        ? -exif.GPS.GPSAltitude
        : exif.GPS.GPSAltitude
    tags.push(`      <exif:altitude>${altitude}m</exif:altitude>`)
  }

  // === 技术参数 (technical) ===

  // White Balance (白平衡)
  if (exif.Photo?.WhiteBalance !== undefined) {
    const whiteBalanceMap = { 0: 'Auto', 1: 'Manual' }
    const wb =
      whiteBalanceMap[
        exif.Photo.WhiteBalance as keyof typeof whiteBalanceMap
      ] || 'Auto'
    tags.push(`      <exif:whiteBalance>${wb}</exif:whiteBalance>`)
  }

  // Metering Mode (测光模式)
  if (exif.Photo?.MeteringMode !== undefined) {
    const meteringModeMap = {
      0: 'Unknown',
      1: 'Average',
      2: 'Center-weighted',
      3: 'Spot',
      4: 'Multi-spot',
      5: 'Pattern',
      6: 'Partial',
    }
    const mode =
      meteringModeMap[exif.Photo.MeteringMode as keyof typeof meteringModeMap]
    if (mode && mode !== 'Unknown') {
      tags.push(`      <exif:meteringMode>${mode}</exif:meteringMode>`)
    }
  }

  // Flash Mode (闪光灯模式)
  if (exif.Photo?.Flash !== undefined) {
    const flashFired = (exif.Photo.Flash & 0x01) !== 0
    const flashMode = flashFired ? 'On' : 'Off'
    tags.push(`      <exif:flashMode>${flashMode}</exif:flashMode>`)
  }

  // Color Space (色彩空间)
  if (exif.Photo?.ColorSpace !== undefined) {
    const colorSpaceMap = { 1: 'sRGB', 65535: 'Uncalibrated' }
    const colorSpace =
      colorSpaceMap[exif.Photo.ColorSpace as keyof typeof colorSpaceMap] ||
      'sRGB'
    tags.push(`      <exif:colorSpace>${colorSpace}</exif:colorSpace>`)
  }

  // === 高级参数 (advanced) ===

  // Exposure Program (曝光程序)
  if (exif.Photo?.ExposureProgram !== undefined) {
    const exposureProgramMap = {
      0: 'Not defined',
      1: 'Manual',
      2: 'Program',
      3: 'Aperture Priority',
      4: 'Shutter Priority',
      5: 'Creative',
      6: 'Action',
      7: 'Portrait',
      8: 'Landscape',
    }
    const program =
      exposureProgramMap[
        exif.Photo.ExposureProgram as keyof typeof exposureProgramMap
      ]
    if (program && program !== 'Not defined') {
      tags.push(`      <exif:exposureProgram>${program}</exif:exposureProgram>`)
    }
  }

  // Scene Mode (场景模式)
  if (exif.Photo?.SceneCaptureType !== undefined) {
    const sceneModeMap = {
      0: 'Standard',
      1: 'Landscape',
      2: 'Portrait',
      3: 'Night',
    }
    const scene =
      sceneModeMap[exif.Photo.SceneCaptureType as keyof typeof sceneModeMap]
    if (scene) {
      tags.push(`      <exif:sceneMode><![CDATA[${scene}]]></exif:sceneMode>`)
    }
  }

  // Contrast (对比度)
  if (exif.Photo?.Contrast !== undefined) {
    const contrastMap = { 0: 'Normal', 1: 'Low', 2: 'High' }
    const contrast =
      contrastMap[exif.Photo.Contrast as keyof typeof contrastMap]
    if (contrast) {
      tags.push(`      <exif:contrast>${contrast}</exif:contrast>`)
    }
  }

  // Saturation (饱和度)
  if (exif.Photo?.Saturation !== undefined) {
    const saturationMap = { 0: 'Normal', 1: 'Low', 2: 'High' }
    const saturation =
      saturationMap[exif.Photo.Saturation as keyof typeof saturationMap]
    if (saturation) {
      tags.push(`      <exif:saturation>${saturation}</exif:saturation>`)
    }
  }

  // Sharpness (锐度)
  if (exif.Photo?.Sharpness !== undefined) {
    const sharpnessMap = { 0: 'Normal', 1: 'Soft', 2: 'Hard' }
    const sharpness =
      sharpnessMap[exif.Photo.Sharpness as keyof typeof sharpnessMap]
    if (sharpness) {
      tags.push(`      <exif:sharpness>${sharpness}</exif:sharpness>`)
    }
  }

  return tags.join('\n')
}

// Helper function to convert DMS (Degrees, Minutes, Seconds) to DD (Decimal Degrees)
function convertDMSToDD(dms: number[], ref: string): number | null {
  if (!dms || dms.length !== 3) return null

  const degrees = dms[0]
  const minutes = dms[1]
  const seconds = dms[2]

  let dd = degrees + minutes / 60 + seconds / 3600

  if (ref === 'S' || ref === 'W') {
    dd = dd * -1
  }

  return Math.round(dd * 1000000) / 1000000 // 保留6位小数
}

function generateSitemap(photos: PhotoData[], config: SiteConfig): string {
  const now = new Date().toISOString()

  // Main page
  const mainPageXml = `  <url>
    <loc>${config.url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`

  // Photo pages
  const photoUrls = photos
    .map((photo) => {
      const lastmod = new Date(
        photo.lastModified || photo.dateTaken,
      ).toISOString()
      return `  <url>
    <loc>${config.url}/${photo.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${mainPageXml}
${photoUrls}
</urlset>`
}
