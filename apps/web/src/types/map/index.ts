import type { PhotoManifestItem } from '@afilmory/builder'

/**
 * Photo marker interface for map display
 */
export interface PhotoMarker {
  id: string
  longitude: number
  latitude: number
  photo: PhotoManifestItem
}

/**
 * GPS coordinates interface
 */
export interface GPSCoordinates {
  latitude: number
  longitude: number
}

/**
 * Map bounds interface
 */
export interface MapBounds {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
  centerLat: number
  centerLng: number
  bounds: [[number, number], [number, number]]
}

/**
 * Map view state interface
 */
export interface MapViewState {
  longitude: number
  latitude: number
  zoom: number
}

/**
 * Legacy Mapbox component props (deprecated)
 * @deprecated Use PureMapboxProps or MapboxContainerProps instead
 */
export interface MapboxProps {
  id?: string
  initialViewState?: MapViewState
  markers?: PhotoMarker[]
  geoJsonData?: GeoJSON.FeatureCollection
  onMarkerClick?: (marker: PhotoMarker) => void
  onGeoJsonClick?: (feature: GeoJSON.Feature) => void
  showGeocoder?: boolean
  className?: string
  style?: React.CSSProperties
}
