import { Popup } from 'react-map-gl/mapbox'

import type { PhotoMarker } from '~/types/map'

interface PhotoPopupProps {
  popupInfo: {
    marker: PhotoMarker
    longitude: number
    latitude: number
  }
  onClose: () => void
}

export const PhotoPopup = ({ popupInfo, onClose }: PhotoPopupProps) => {
  return (
    <Popup
      longitude={popupInfo.longitude}
      latitude={popupInfo.latitude}
      anchor="bottom"
      offset={15}
      className="max-w-none overflow-hidden rounded-xl p-0"
      closeButton={false}
      closeOnClick={false}
      onClose={onClose}
    >
      <div className="relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 transition-colors hover:bg-black/70"
        >
          <span className="sr-only">Close</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 text-white"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="w-64 overflow-hidden rounded-lg bg-white dark:bg-gray-800">
          <div className="relative">
            <img
              src={
                popupInfo.marker.photo.thumbnailUrl ||
                popupInfo.marker.photo.originalUrl
              }
              alt={popupInfo.marker.photo.title || popupInfo.marker.photo.id}
              className="h-32 w-full object-cover"
              loading="lazy"
            />
          </div>

          <div className="space-y-2 p-4">
            <h3
              className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100"
              title={popupInfo.marker.photo.title || popupInfo.marker.photo.id}
            >
              {popupInfo.marker.photo.title || popupInfo.marker.photo.id}
            </h3>

            {popupInfo.marker.photo.exif?.DateTimeOriginal && (
              <p className="text-xs text-gray-600 dark:text-gray-400">
                📅{' '}
                {new Date(
                  popupInfo.marker.photo.exif.DateTimeOriginal,
                ).toLocaleDateString()}
              </p>
            )}

            {popupInfo.marker.photo.exif?.Make &&
              popupInfo.marker.photo.exif?.Model && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  📸 {popupInfo.marker.photo.exif.Make}{' '}
                  {popupInfo.marker.photo.exif.Model}
                </p>
              )}

            <p className="text-xs text-gray-500 dark:text-gray-500">
              📍 {popupInfo.latitude.toFixed(6)},{' '}
              {popupInfo.longitude.toFixed(6)}
            </p>
          </div>
        </div>
      </div>
    </Popup>
  )
}
