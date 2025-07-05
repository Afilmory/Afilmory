import 'dotenv-expand/config'

import { execSync } from 'node:child_process'
import cluster from 'node:cluster'
import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { builderConfig } from '@builder'
import { $ } from 'execa'

import { defaultBuilder } from './builder/index.js'
import { logger } from './logger/index.js'
import { workdir } from './path.js'
import { runAsWorker } from './runAsWorker.js'

/**
 * 推送更新后的 manifest 到远程仓库
 */
async function pushManifestToRemoteRepo(): Promise<boolean> {
  if (!builderConfig.repo.enable || !builderConfig.repo.token) {
    if (!builderConfig.repo.enable) {
      logger.main.info('🔧 远程仓库未启用，跳过推送')
    } else {
      logger.main.warn('⚠️ 未提供 Git Token，跳过推送到远程仓库')
    }
    return false
  }

  try {
    const assetsGitDir = path.resolve(workdir, 'assets-git')

    if (!existsSync(assetsGitDir)) {
      logger.main.error('❌ assets-git 目录不存在，无法推送')
      return false
    }

    logger.main.info('📤 开始推送更新到远程仓库...')

    // 配置 Git 用户身份（特别是在 CI 环境中）
    try {
      // 检查是否已配置用户身份
      await $({
        cwd: assetsGitDir,
        stdio: 'pipe',
      })`git config user.name`
    } catch {
      // 如果没有配置，则设置默认的 CI 用户身份
      logger.main.info('🔧 配置 Git 用户身份（CI 环境）...')
      await $({
        cwd: assetsGitDir,
        stdio: 'pipe',
      })`git config user.email "ci@afilmory.local"`
      await $({
        cwd: assetsGitDir,
        stdio: 'pipe',
      })`git config user.name "Afilmory CI"`
    }

    // 检查是否有变更
    const status = await $({
      cwd: assetsGitDir,
      stdio: 'pipe',
    })`git status --porcelain`

    if (!status.stdout.trim()) {
      logger.main.info('💡 没有变更需要推送')
      return false
    }

    logger.main.info('📋 检测到以下变更：')
    logger.main.info(status.stdout)

    // 配置 git 凭据
    const repoUrl = builderConfig.repo.url
    const { token } = builderConfig.repo

    // 解析仓库 URL，添加 token
    let authenticatedUrl = repoUrl
    if (repoUrl.startsWith('https://github.com/')) {
      const urlWithoutProtocol = repoUrl.replace('https://', '')
      authenticatedUrl = `https://${token}@${urlWithoutProtocol}`
    }

    // 设置远程仓库 URL（包含 token）
    await $({
      cwd: assetsGitDir,
      stdio: 'pipe',
    })`git remote set-url origin ${authenticatedUrl}`

    // 添加所有变更
    await $({
      cwd: assetsGitDir,
      stdio: 'inherit',
    })`git add .`

    // 提交变更
    const commitMessage = `chore: update photos-manifest.json and thumbnails - ${new Date().toISOString()}`
    await $({
      cwd: assetsGitDir,
      stdio: 'inherit',
    })`git commit -m ${commitMessage}`

    // 推送到远程仓库
    await $({
      cwd: assetsGitDir,
      stdio: 'inherit',
    })`git push origin HEAD`

    logger.main.success('✅ 成功推送更新到远程仓库')
    return true
  } catch (error) {
    logger.main.error('❌ 推送到远程仓库失败：', error)
    return false
  }
}

async function main() {
  // 检查是否作为 cluster worker 运行
  if (
    process.env.CLUSTER_WORKER === 'true' ||
    process.argv.includes('--cluster-worker') ||
    cluster.isWorker
  ) {
    await runAsWorker()
    return
  }

  // 如果配置了远程仓库，则使用远程仓库
  if (builderConfig.repo.enable) {
    // 拉取远程仓库
    logger.main.info('🔄 同步远程仓库...')

    // 解析仓库 URL，添加 token
    let repoUrl = builderConfig.repo.url
    const { token } = builderConfig.repo
    if (token && repoUrl.startsWith('https://github.com/')) {
      const urlWithoutProtocol = repoUrl.replace('https://', '')
      repoUrl = `https://${token}@${urlWithoutProtocol}`
    }

    const hasExist = existsSync(path.resolve(workdir, 'assets-git'))
    if (!hasExist) {
      logger.main.info('📥 克隆远程仓库...')
      await $({
        cwd: workdir,
        stdio: 'inherit',
      })`git clone ${repoUrl} assets-git`
    } else {
      logger.main.info('🔄 拉取远程仓库更新...')
      try {
        await $({
          cwd: path.resolve(workdir, 'assets-git'),
          stdio: 'inherit',
        })`git pull --rebase`
      } catch {
        logger.main.warn('⚠️ git pull 失败，尝试重置远程仓库...')
        logger.main.info('🗑️ 删除现有仓库目录...')
        await $({ cwd: workdir, stdio: 'inherit' })`rm -rf assets-git`
        logger.main.info('📥 重新克隆远程仓库...')
        await $({
          cwd: workdir,
          stdio: 'inherit',
        })`git clone ${repoUrl} assets-git`
      }
    }

    // 确保远程仓库有必要的目录和文件
    const assetsGitDir = path.resolve(workdir, 'assets-git')
    const thumbnailsSourceDir = path.resolve(assetsGitDir, 'thumbnails')
    const manifestSourcePath = path.resolve(
      assetsGitDir,
      'photos-manifest.json',
    )

    // 创建 thumbnails 目录（如果不存在）
    if (!existsSync(thumbnailsSourceDir)) {
      logger.main.info('📁 创建 thumbnails 目录...')
      await $({ cwd: assetsGitDir, stdio: 'inherit' })`mkdir -p thumbnails`
    }

    // 创建空的 manifest 文件（如果不存在）
    if (!existsSync(manifestSourcePath)) {
      logger.main.info('📄 创建初始 manifest 文件...')
      await $({
        cwd: assetsGitDir,
        stdio: 'inherit',
      })`echo '{"version":"v2","data":[]}' > photos-manifest.json`
    }

    // 删除 public/thumbnails 目录，并建立软连接到 assets-git/thumbnails
    const thumbnailsDir = path.resolve(workdir, 'public', 'thumbnails')
    if (existsSync(thumbnailsDir)) {
      await $({ cwd: workdir, stdio: 'inherit' })`rm -rf ${thumbnailsDir}`
    }
    await $({
      cwd: workdir,
      stdio: 'inherit',
    })`ln -s ${thumbnailsSourceDir} ${thumbnailsDir}`

    // 删除 src/data/photos-manifest.json，并建立软连接到 assets-git/photos-manifest.json
    const photosManifestPath = path.resolve(
      workdir,
      'src',
      'data',
      'photos-manifest.json',
    )
    if (existsSync(photosManifestPath)) {
      await $({ cwd: workdir, stdio: 'inherit' })`rm -f ${photosManifestPath}`
    }
    await $({
      cwd: workdir,
      stdio: 'inherit',
    })`ln -s ${manifestSourcePath} ${photosManifestPath}`

    logger.main.success('✅ 远程仓库同步完成')
  }

  process.title = 'photo-gallery-builder-main'

  // 解析命令行参数
  const args = new Set(process.argv.slice(2))
  const isForceMode = args.has('--force')
  const isForceManifest = args.has('--force-manifest')
  const isForceThumbnails = args.has('--force-thumbnails')

  // 显示帮助信息
  if (args.has('--help') || args.has('-h')) {
    logger.main.info(`
照片库构建工具 (新版本 - 使用适配器模式)

用法：tsx src/core/cli.ts [选项]

选项：
  --force              强制重新处理所有照片
  --force-manifest     强制重新生成 manifest
  --force-thumbnails   强制重新生成缩略图
  --config             显示当前配置信息
  --help, -h          显示帮助信息

示例：
  tsx src/core/cli.ts                           # 增量更新
  tsx src/core/cli.ts --force                   # 全量更新
  tsx src/core/cli.ts --force-thumbnails        # 强制重新生成缩略图
  tsx src/core/cli.ts --config                  # 显示配置信息

配置：
  在 builder.config.ts 中设置 performance.worker.useClusterMode = true 
  可启用多进程集群模式，发挥多核心优势。

远程仓库：
  如果启用了远程仓库 (repo.enable = true)，构建完成后会自动推送更新。
  需要配置 repo.token 或设置 GIT_TOKEN 环境变量以提供推送权限。
  如果没有提供 token，将跳过推送步骤。
`)
    return
  }

  // 显示配置信息
  if (args.has('--config')) {
    const config = defaultBuilder.getConfig()
    logger.main.info('🔧 当前配置：')
    logger.main.info(`   存储提供商：${config.storage.provider}`)

    switch (config.storage.provider) {
      case 's3': {
        logger.main.info(`   存储桶：${config.storage.bucket}`)
        logger.main.info(`   区域：${config.storage.region || '未设置'}`)
        logger.main.info(`   端点：${config.storage.endpoint || '默认'}`)
        logger.main.info(
          `   自定义域名：${config.storage.customDomain || '未设置'}`,
        )
        logger.main.info(`   前缀：${config.storage.prefix || '无'}`)
        break
      }
      case 'github': {
        logger.main.info(`   仓库所有者：${config.storage.owner}`)
        logger.main.info(`   仓库名称：${config.storage.repo}`)
        logger.main.info(`   分支：${config.storage.branch || 'main'}`)
        logger.main.info(`   路径：${config.storage.path || '无'}`)
        logger.main.info(`   使用原始 URL：${config.storage.useRawUrl || '否'}`)
        break
      }
    }
    logger.main.info(`   默认并发数：${config.options.defaultConcurrency}`)
    logger.main.info(
      `   Live Photo 检测：${config.options.enableLivePhotoDetection ? '启用' : '禁用'}`,
    )
    logger.main.info(`   Worker 数：${config.performance.worker.workerCount}`)
    logger.main.info(`   Worker 超时：${config.performance.worker.timeout}ms`)
    logger.main.info(
      `   集群模式：${config.performance.worker.useClusterMode ? '启用' : '禁用'}`,
    )
    logger.main.info('')
    logger.main.info('📦 远程仓库配置：')
    logger.main.info(`   启用状态：${config.repo.enable ? '启用' : '禁用'}`)
    if (config.repo.enable) {
      logger.main.info(`   仓库地址：${config.repo.url || '未设置'}`)
      logger.main.info(
        `   推送权限：${config.repo.token ? '已配置' : '未配置'}`,
      )
    }
    return
  }

  // 确定运行模式
  let runMode = '增量更新'
  if (isForceMode) {
    runMode = '全量更新'
  } else if (isForceManifest && isForceThumbnails) {
    runMode = '强制刷新 manifest 和缩略图'
  } else if (isForceManifest) {
    runMode = '强制刷新 manifest'
  } else if (isForceThumbnails) {
    runMode = '强制刷新缩略图'
  }

  const config = defaultBuilder.getConfig()
  const concurrencyLimit = config.performance.worker.workerCount
  const finalConcurrency = concurrencyLimit ?? config.options.defaultConcurrency
  const processingMode = config.performance.worker.useClusterMode
    ? '多进程集群'
    : '并发线程池'

  logger.main.info(`🚀 运行模式：${runMode}`)
  logger.main.info(`⚡ 最大并发数：${finalConcurrency}`)
  logger.main.info(`🔧 处理模式：${processingMode}`)
  logger.main.info(`🏗️ 使用构建器：PhotoGalleryBuilder (适配器模式)`)

  environmentCheck()

  // 启动构建过程
  const buildResult = await defaultBuilder.buildManifest({
    isForceMode,
    isForceManifest,
    isForceThumbnails,
    concurrencyLimit,
  })

  // 如果启用了远程仓库，在构建完成后推送更新
  if (builderConfig.repo.enable) {
    if (buildResult.hasUpdates) {
      logger.main.info('🔄 检测到更新，推送到远程仓库...')
      await pushManifestToRemoteRepo()
    } else {
      logger.main.info('💡 没有更新需要推送到远程仓库')
    }
  }

  // eslint-disable-next-line unicorn/no-process-exit
  process.exit(0)
}

// 运行主函数
main().catch((error) => {
  logger.main.error('构建失败：', error)
  throw error
})

function environmentCheck() {
  try {
    execSync('perl -v', { stdio: 'ignore' })

    logger.main.info('Perl 已安装')
  } catch (err) {
    console.error(err)
    logger.main.error('Perl 未安装，请安装 Perl 并重新运行')
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(1)
  }
}
