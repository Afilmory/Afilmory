import type { GeocoderOptions } from '@mapbox/mapbox-gl-geocoder'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import * as mapboxgl from 'mapbox-gl'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { MapRef } from 'react-map-gl/mapbox'

import { Mapbox } from '~/components/ui/map/Mapbox'
import { useIsDark } from '~/hooks/common'
import type { PhotoMarker } from '~/types/map'

// You need to set VITE_MAPBOX_ACCESS_TOKEN in your environment variables
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

export interface MapboxContainerProps {
  id?: string
  initialViewState?: {
    longitude: number
    latitude: number
    zoom: number
  }
  markers?: PhotoMarker[]
  geoJsonData?: GeoJSON.FeatureCollection
  onMarkerClick?: (marker: PhotoMarker) => void
  onGeoJsonClick?: (feature: GeoJSON.Feature) => void
  showGeocoder?: boolean
  className?: string
  style?: React.CSSProperties
}

export const MapboxContainer = ({
  id,
  initialViewState,
  markers,
  geoJsonData,
  onMarkerClick,
  onGeoJsonClick,
  showGeocoder = false,
  className,
  style,
}: MapboxContainerProps) => {
  const mapRef = useRef<MapRef>(null)
  const isDark = useIsDark()
  const [popupInfo, setPopupInfo] = useState<{
    marker: PhotoMarker
    longitude: number
    latitude: number
  } | null>(null)

  // Add Geocoder control
  useEffect(() => {
    if (!showGeocoder || !mapRef.current || !MAPBOX_TOKEN) return

    const map = mapRef.current
    const geocoderOptions: GeocoderOptions = {
      accessToken: MAPBOX_TOKEN,
      mapboxgl,
    }
    const geocoder = new MapboxGeocoder(geocoderOptions)

    map.getMap().addControl(geocoder)

    return () => {
      if (map) {
        map.getMap().removeControl(geocoder)
      }
    }
  }, [showGeocoder])

  // Handle GeoJSON click
  const handleGeoJsonClick = useCallback(
    (
      event: mapboxgl.MapMouseEvent & {
        features?: mapboxgl.GeoJSONFeature[]
      },
    ) => {
      if (!onGeoJsonClick) return

      const feature = event.features?.[0]
      if (feature) {
        onGeoJsonClick(feature as GeoJSON.Feature)
      }
    },
    [onGeoJsonClick],
  )

  // Fly to location
  const flyToLocation = useCallback((longitude: number, latitude: number) => {
    mapRef.current?.flyTo({
      center: [longitude, latitude],
      duration: 2000,
      zoom: 14,
    })
  }, [])

  // Handle marker click
  const handleMarkerClick = useCallback(
    (marker: PhotoMarker) => {
      if (onMarkerClick) {
        onMarkerClick(marker)
      } else {
        setPopupInfo({
          marker,
          longitude: marker.longitude,
          latitude: marker.latitude,
        })
      }
    },
    [onMarkerClick],
  )

  // Handle popup close
  const handlePopupClose = useCallback(() => {
    setPopupInfo(null)
  }, [])

  // Handle geolocate
  const handleGeolocate = useCallback(
    (longitude: number, latitude: number) => {
      flyToLocation(longitude, latitude)
    },
    [flyToLocation],
  )

  return (
    <Mapbox
      id={id}
      initialViewState={initialViewState}
      markers={markers}
      geoJsonData={geoJsonData}
      onMarkerClick={handleMarkerClick}
      onGeoJsonClick={handleGeoJsonClick}
      onGeolocate={handleGeolocate}
      className={className}
      style={style}
      mapboxToken={MAPBOX_TOKEN || ''}
      mapRef={mapRef}
      popupInfo={popupInfo}
      onPopupClose={handlePopupClose}
      theme={isDark ? 'dark' : 'light'}
    />
  )
}
