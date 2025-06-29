import { Marker } from 'react-map-gl/mapbox'

import type { PhotoMarker } from '~/types/map'

interface PhotoMarkerPinProps {
  marker: PhotoMarker
  onClick: (marker: PhotoMarker) => void
}

export const PhotoMarkerPin = ({ marker, onClick }: PhotoMarkerPinProps) => {
  return (
    <Marker
      key={marker.id}
      longitude={marker.longitude}
      latitude={marker.latitude}
      style={{ cursor: 'pointer' }}
      onClick={() => onClick(marker)}
    >
      <div className="group relative">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-blue-500 shadow-lg transition-all hover:scale-110 hover:bg-blue-600">
          <span className="text-xs font-semibold text-white">📷</span>
        </div>
        <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 transform rounded bg-black/75 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
          {marker.photo.title || marker.photo.id}
        </div>
      </div>
    </Marker>
  )
}
