import { photoLoader } from '@afilmory/data'
import { m } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { MapProvider } from 'react-map-gl/mapbox'

import {
  MapBackButton,
  MapInfoPanel,
  MapLoadingState,
} from '~/components/ui/map'
import {
  calculateMapBounds,
  convertPhotosToMarkersFromEXIF,
  getInitialViewStateForMarkers,
} from '~/lib/map-utils'
import type { PhotoMarker } from '~/types/map'

import { MapboxContainer } from './MapboxContainer'

export const MapSection = () => {
  // Photo markers state and loading logic
  const [markers, setMarkers] = useState<PhotoMarker[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Map marker selection state
  const [selectedMarker, setSelectedMarker] = useState<PhotoMarker | null>(null)

  // Load photo markers effect
  useEffect(() => {
    const loadPhotoMarkersData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const photos = photoLoader.getPhotos()
        const photoMarkers = convertPhotosToMarkersFromEXIF(photos)

        setMarkers(photoMarkers)
        console.info(`Found ${photoMarkers.length} photos with GPS coordinates`)
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Failed to load photo markers')
        setError(error)
        console.error('Failed to load photo markers:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadPhotoMarkersData()
  }, [])

  // Map bounds and initial view state
  const bounds = useMemo(() => calculateMapBounds(markers), [markers])
  const initialViewState = useMemo(
    () => getInitialViewStateForMarkers(markers),
    [markers],
  )

  // Marker selection handlers
  const selectMarker = (marker: PhotoMarker) => {
    setSelectedMarker(marker)
    console.info('Selected photo:', marker.photo.title || marker.photo.id)
  }

  const clearSelection = () => {
    setSelectedMarker(null)
  }

  // Show loading state
  if (isLoading) {
    return <MapLoadingState />
  }

  // Show error state
  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">❌</div>
          <div className="text-lg font-medium text-red-900 dark:text-red-100">
            地图加载失败
          </div>
          <p className="text-sm text-red-600 dark:text-red-400">
            请检查网络连接或刷新页面重试
          </p>
        </div>
      </div>
    )
  }

  return (
    <MapProvider>
      <div className="relative h-full w-full">
        {/* Back button */}
        <MapBackButton />

        {/* Map info panel */}
        <MapInfoPanel
          markersCount={markers.length}
          bounds={bounds}
          selectedMarker={selectedMarker}
          onClearSelection={clearSelection}
        />

        {/* Mapbox component */}
        <m.div
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="h-full w-full"
        >
          <MapboxContainer
            markers={markers}
            initialViewState={initialViewState}
            onMarkerClick={selectMarker}
            showGeocoder={true}
            className="h-full w-full"
          />
        </m.div>
      </div>
    </MapProvider>
  )
}
