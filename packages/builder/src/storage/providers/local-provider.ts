import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { SUPPORTED_FORMATS } from '../../constants/index.js'
import { logger } from '../../logger/index.js'
import type { StorageObject, StorageProvider } from '../interfaces'

export interface LocalConfig {
  provider: 'local'
  basePath: string // 本地照片存储的基础路径
  baseUrl?: string // 用于生成公共 URL 的基础 URL（可选）
  excludeRegex?: string // 排除文件的正则表达式
  maxFileLimit?: number // 最大文件数量限制
}

export class LocalStorageProvider implements StorageProvider {
  private config: LocalConfig
  private basePath: string

  constructor(config: LocalConfig) {
    this.config = config

    // 处理相对路径和绝对路径
    if (path.isAbsolute(config.basePath)) {
      this.basePath = config.basePath
    } else {
      // 相对于项目根目录
      const __dirname = path.dirname(fileURLToPath(import.meta.url))
      const projectRoot = path.resolve(__dirname, '../../../../../')
      this.basePath = path.resolve(projectRoot, config.basePath)
    }
  }

  async getFile(key: string, logger?: any): Promise<Buffer | null> {
    try {
      logger?.info(`读取本地文件：${key}`)
      const startTime = Date.now()

      const filePath = path.join(this.basePath, key)

      // 安全检查：确保文件路径在基础路径内
      const resolvedPath = path.resolve(filePath)
      const resolvedBasePath = path.resolve(this.basePath)

      if (!resolvedPath.startsWith(resolvedBasePath)) {
        logger?.error(`文件路径不安全：${key}`)
        return null
      }

      // 检查文件是否存在
      try {
        await fs.access(filePath)
      } catch {
        logger?.warn(`文件不存在：${key}`)
        return null
      }

      const buffer = await fs.readFile(filePath)

      const duration = Date.now() - startTime
      const sizeKB = Math.round(buffer.length / 1024)
      logger?.success(`读取完成：${key} (${sizeKB}KB, ${duration}ms)`)

      return buffer
    } catch (error) {
      logger?.error(`读取文件失败：${key}`, error)
      return null
    }
  }

  async listImages(): Promise<StorageObject[]> {
    const allFiles = await this.listAllFiles()

    // 过滤出图片文件
    return allFiles.filter((file) => {
      const ext = path.extname(file.key).toLowerCase()
      return SUPPORTED_FORMATS.has(ext)
    })
  }

  async listAllFiles(): Promise<StorageObject[]> {
    const files: StorageObject[] = []
    const excludeRegex = this.config.excludeRegex
      ? new RegExp(this.config.excludeRegex)
      : null

    await this.scanDirectory(this.basePath, '', files, excludeRegex)

    // 应用文件数量限制
    if (this.config.maxFileLimit && files.length > this.config.maxFileLimit) {
      logger.main.info(
        `文件数量超过限制 ${this.config.maxFileLimit}，截取前 ${this.config.maxFileLimit} 个文件`,
      )
      return files.slice(0, this.config.maxFileLimit)
    }

    return files
  }

  private async scanDirectory(
    dirPath: string,
    relativePath: string,
    files: StorageObject[],
    excludeRegex?: RegExp | null,
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)
        const relativeFilePath = relativePath
          ? path.join(relativePath, entry.name).replaceAll('\\', '/')
          : entry.name

        // 应用排除规则
        if (excludeRegex && excludeRegex.test(relativeFilePath)) {
          continue
        }

        if (entry.isDirectory()) {
          // 递归扫描子目录
          await this.scanDirectory(
            fullPath,
            relativeFilePath,
            files,
            excludeRegex,
          )
        } else if (entry.isFile()) {
          try {
            const stats = await fs.stat(fullPath)

            files.push({
              key: relativeFilePath,
              size: stats.size,
              lastModified: stats.mtime,
              etag: `${stats.mtime.getTime()}-${stats.size}`, // 使用修改时间和大小作为 etag
            })
          } catch (error) {
            logger.main.warn(`获取文件信息失败：${relativeFilePath}`, error)
          }
        }
      }
    } catch (error) {
      logger.main.error(`扫描目录失败：${dirPath}`, error)
    }
  }

  generatePublicUrl(key: string): string {
    if (this.config.baseUrl) {
      // 如果配置了基础 URL，生成完整的 HTTP URL
      return `${this.config.baseUrl.replace(/\/$/, '')}/${key}`
    } else {
      // 否则返回文件系统路径（用于开发环境）
      return `file://${path.join(this.basePath, key)}`
    }
  }

  detectLivePhotos(allObjects: StorageObject[]): Map<string, StorageObject> {
    const livePhotos = new Map<string, StorageObject>()

    // 创建一个映射来快速查找文件
    const fileMap = new Map<string, StorageObject>()
    allObjects.forEach((obj) => {
      fileMap.set(obj.key.toLowerCase(), obj)
    })

    // 查找 Live Photos 配对
    allObjects.forEach((obj) => {
      const ext = path.extname(obj.key).toLowerCase()

      // 如果是图片文件，查找对应的视频文件
      if (SUPPORTED_FORMATS.has(ext)) {
        const baseName = path.basename(obj.key, ext)
        const dirName = path.dirname(obj.key)

        // 查找对应的 .mov 文件
        const videoKey = path
          .join(dirName, `${baseName}.mov`)
          .replaceAll('\\', '/')
        const videoObj = fileMap.get(videoKey.toLowerCase())

        if (videoObj) {
          livePhotos.set(obj.key, videoObj)
        }
      }
    })

    return livePhotos
  }

  /**
   * 获取本地存储的基础路径
   */
  getBasePath(): string {
    return this.basePath
  }

  /**
   * 检查基础路径是否存在
   */
  async checkBasePath(): Promise<boolean> {
    try {
      const stats = await fs.stat(this.basePath)
      return stats.isDirectory()
    } catch {
      return false
    }
  }

  /**
   * 创建基础路径目录（如果不存在）
   */
  async ensureBasePath(): Promise<void> {
    try {
      await fs.mkdir(this.basePath, { recursive: true })
      logger.main.info(`创建本地存储目录：${this.basePath}`)
    } catch (error) {
      logger.main.error(`创建本地存储目录失败：${this.basePath}`, error)
      throw error
    }
  }
}
