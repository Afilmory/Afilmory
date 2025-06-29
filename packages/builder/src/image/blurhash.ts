import { encode } from 'blurhash'
import sharp from 'sharp'

import { logger } from '../logger/index.js'

// 生成 blurhash（基于缩略图数据，保持长宽比）
export async function generateBlurhash(
  thumbnailBuffer: Buffer,
  originalWidth: number,
  originalHeight: number,
): Promise<string | null> {
  try {
    // 复用缩略图的 Sharp 实例来生成 blurhash
    const { data, info } = await sharp(thumbnailBuffer)
      .ensureAlpha() // 确保有 alpha 通道
      .raw() // 获取原始像素数据
      .toBuffer({
        resolveWithObject: true,
      })

    const xComponents = Math.min(Math.max(Math.round(info.width / 16), 3), 9)
    const yComponents = Math.min(Math.max(Math.round(info.height / 16), 3), 9)

    logger.blurhash.info(
      `生成参数：原始 ${originalWidth}x${originalHeight}, 实际 ${info.width}x${info.height}, 组件 ${xComponents}x${yComponents}`,
    )

    // 生成 blurhash
    const blurhash = encode(
      new Uint8ClampedArray(data),
      info.width,
      info.height,
      xComponents,
      yComponents,
    )

    logger.blurhash.success(`生成成功：${blurhash}`)
    return blurhash
  } catch (error) {
    logger.blurhash.error('生成失败：', error)
    return null
  }
}
