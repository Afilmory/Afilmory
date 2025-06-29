import { AnimatePresence, m } from 'motion/react'
import { useTranslation } from 'react-i18next'

import type { MapBounds, PhotoMarker } from '~/types/map'

interface MapInfoPanelProps {
  markersCount: number
  bounds: MapBounds | null
  selectedMarker: PhotoMarker | null
  onClearSelection: () => void
}

export const MapInfoPanel = ({
  markersCount,
  bounds,
  selectedMarker,
  onClearSelection,
}: MapInfoPanelProps) => {
  const { t } = useTranslation()

  return (
    <m.div
      className="absolute top-4 right-4 z-40 max-w-sm rounded-lg bg-white/90 p-4 shadow-lg backdrop-blur-sm dark:bg-gray-800/90"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
    >
      <m.div
        className="flex items-center gap-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.4 }}
      >
        <span className="text-2xl">🗺️</span>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {t('explory.explore.map')}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('explory.found.locations', { count: markersCount })}
          </p>
        </div>
      </m.div>

      {bounds && (
        <m.div
          className="mt-3 rounded-md bg-blue-50 p-2 dark:bg-blue-900/20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.1, delay: 0.5 }}
        >
          <p className="text-xs text-gray-600 dark:text-gray-400">
            <span className="font-medium">{t('explory.shooting.range')}</span>
            <br />
            {bounds.minLat.toFixed(2)}, {bounds.minLng.toFixed(2)} 至<br />
            {bounds.maxLat.toFixed(2)}, {bounds.maxLng.toFixed(2)}
          </p>
        </m.div>
      )}

      {/* Selected photo info */}
      <AnimatePresence>
        {selectedMarker && (
          <m.div
            className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-start gap-2">
              <img
                src={
                  selectedMarker.photo.thumbnailUrl ||
                  selectedMarker.photo.originalUrl
                }
                alt={selectedMarker.photo.title || selectedMarker.photo.id}
                className="h-12 w-12 rounded object-cover"
                loading="lazy"
              />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-medium text-blue-900 dark:text-blue-100">
                  {selectedMarker.photo.title || selectedMarker.photo.id}
                </h3>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  📍 {selectedMarker.latitude.toFixed(4)},{' '}
                  {selectedMarker.longitude.toFixed(4)}
                </p>
                {selectedMarker.photo.exif?.DateTimeOriginal && (
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    📅{' '}
                    {new Date(
                      selectedMarker.photo.exif.DateTimeOriginal,
                    ).toLocaleDateString('zh-CN')}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClearSelection}
              className="mt-2 w-full rounded bg-blue-100 px-2 py-1 text-xs text-blue-800 transition-colors hover:bg-blue-200 dark:bg-blue-800 dark:text-blue-200 dark:hover:bg-blue-700"
            >
              {t('explory.clear.selection')}
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  )
}
