import { AnimatePresence, m, useAnimationControls } from 'motion/react'
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'

import { clsxm } from '~/lib/cn'
import { isMobileDevice } from '~/lib/device-viewport'
import type { ImageLoaderManager } from '~/lib/image-loader-manager'

import type { LoadingIndicatorRef } from './LoadingIndicator'

interface LivePhotoProps {
  /** Live Photo 视频 URL */
  videoUrl: string
  /** 图片加载管理器实例 */
  imageLoaderManager: ImageLoaderManager
  /** 加载指示器引用 */
  loadingIndicatorRef: React.RefObject<LoadingIndicatorRef | null>
  /** 是否是当前图片 */
  isCurrentImage: boolean
  /** 自定义样式类名 */
  className?: string
  onPlayingChange?: (isPlaying: boolean) => void
}

export interface LivePhotoHandle {
  play: () => void
  stop: () => void
  getIsVideoLoaded: () => boolean
}

export const LivePhoto = ({
  ref,
  videoUrl,
  imageLoaderManager,
  loadingIndicatorRef,
  isCurrentImage,
  className,
  onPlayingChange,
}: LivePhotoProps & { ref?: React.RefObject<LivePhotoHandle | null> }) => {
  const { t } = useTranslation()
  const [isPlayingLivePhoto, setIsPlayingLivePhoto] = useState(false)
  const [livePhotoVideoLoaded, setLivePhotoVideoLoaded] = useState(false)
  const [isConvertingVideo, setIsConvertingVideo] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const videoAnimateController = useAnimationControls()
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    onPlayingChange?.(isPlayingLivePhoto)
  }, [isPlayingLivePhoto, onPlayingChange])

  useEffect(() => {
    if (
      !isCurrentImage ||
      livePhotoVideoLoaded ||
      isConvertingVideo ||
      !videoRef.current
    ) {
      return
    }
    setIsConvertingVideo(true)
    const processVideo = async () => {
      try {
        await imageLoaderManager.processLivePhotoVideo(
          videoUrl,
          videoRef.current!,
          {
            onLoadingStateUpdate: (state) => {
              loadingIndicatorRef.current?.updateLoadingState(state)
            },
          },
        )

        setLivePhotoVideoLoaded(true)
      } catch (videoError) {
        console.error('Failed to process Live Photo video:', videoError)
      } finally {
        setIsConvertingVideo(false)
      }
    }
    processVideo()
  }, [
    isCurrentImage,
    livePhotoVideoLoaded,
    isConvertingVideo,
    videoUrl,
    imageLoaderManager,
    loadingIndicatorRef,
  ])

  useEffect(() => {
    if (!isCurrentImage) {
      setIsPlayingLivePhoto(false)
      setLivePhotoVideoLoaded(false)
      setIsConvertingVideo(false)

      videoAnimateController.set({ opacity: 0 })
    }
  }, [isCurrentImage, videoAnimateController])

  const play = useCallback(async () => {
    if (!livePhotoVideoLoaded || isPlayingLivePhoto || isConvertingVideo) return
    setIsPlayingLivePhoto(true)
    await videoAnimateController.start({
      opacity: 1,
      transition: { duration: 0.15, ease: 'easeOut' },
    })
    const video = videoRef.current
    if (video) {
      video.currentTime = 0
      video.play()
    }
  }, [
    livePhotoVideoLoaded,
    isPlayingLivePhoto,
    isConvertingVideo,
    videoAnimateController,
  ])

  const stop = useCallback(async () => {
    if (!isPlayingLivePhoto) return
    const video = videoRef.current
    if (video) {
      video.pause()
      video.currentTime = 0
    }
    await videoAnimateController.start({
      opacity: 0,
      transition: { duration: 0.2, ease: 'easeIn' },
    })
    setIsPlayingLivePhoto(false)
  }, [isPlayingLivePhoto, videoAnimateController])

  useImperativeHandle(ref, () => ({
    play,
    stop,
    getIsVideoLoaded: () => livePhotoVideoLoaded,
  }))

  const handleVideoEnded = useCallback(() => {
    stop()
  }, [stop])

  // Desktop hover logic
  const handleBadgeMouseEnter = useCallback(() => {
    if (isMobileDevice) return
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = setTimeout(play, 200)
  }, [play])

  const handleBadgeMouseLeave = useCallback(() => {
    if (isMobileDevice) return
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    stop()
  }, [stop])

  return (
    <>
      <m.video
        ref={videoRef}
        className={clsxm(
          'pointer-events-none absolute inset-0 z-10 h-full w-full object-contain',
          className,
        )}
        style={{
          opacity: isPlayingLivePhoto ? 1 : 0,
          transition: 'opacity 0.2s ease-in-out',
        }}
        muted
        playsInline
        onEnded={handleVideoEnded}
        initial={{ opacity: 0 }}
        animate={videoAnimateController}
      />
      <div
        className={clsxm(
          'absolute z-20 flex items-center space-x-1 rounded-xl bg-black/50 px-1 py-1 text-xs text-white transition-all duration-200',
          !isMobileDevice && 'cursor-pointer hover:bg-black/70',
          import.meta.env.DEV ? 'top-16 right-4' : 'top-12 lg:top-4 left-4',
        )}
        onMouseEnter={handleBadgeMouseEnter}
        onMouseLeave={handleBadgeMouseLeave}
      >
        {isConvertingVideo ? (
          <div className="flex items-center gap-1 px-1">
            <i className="i-mingcute-loading-line animate-spin" />
            <span>{t('photo.live.converting.video')}</span>
          </div>
        ) : (
          <>
            <i className="i-mingcute-live-photo-line size-4" />
            <span className="mr-1">{t('photo.live.badge')}</span>
          </>
        )}
      </div>
      <AnimatePresence>
        {isPlayingLivePhoto && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2"
          >
            <div className="flex items-center gap-2 rounded bg-black/50 px-2 py-1 text-xs text-white">
              <i className="i-mingcute-live-photo-line" />
              <span>{t('photo.live.playing')}</span>
            </div>
          </m.div>
        )}
      </AnimatePresence>
      <div
        className={clsxm(
          'pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded bg-black/50 px-2 py-1 text-xs text-white opacity-0 duration-200 group-hover:opacity-50',
          isPlayingLivePhoto && 'opacity-0!',
        )}
      >
        {isConvertingVideo
          ? t('photo.live.converting.detail')
          : isMobileDevice
            ? t('photo.live.tooltip.mobile.zoom')
            : t('photo.live.tooltip.desktop.zoom')}
      </div>
    </>
  )
}

LivePhoto.displayName = 'LivePhoto'
