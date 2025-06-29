import { GeolocateControl, NavigationControl } from 'react-map-gl/mapbox'

interface MapControlsProps {
  onGeolocate?: (longitude: number, latitude: number) => void
}

export const MapControls = ({ onGeolocate }: MapControlsProps) => {
  return (
    <>
      <NavigationControl position="bottom-left" />
      <GeolocateControl
        position="bottom-left"
        trackUserLocation
        onGeolocate={(e) => {
          onGeolocate?.(e.coords.longitude, e.coords.latitude)
        }}
      />
    </>
  )
}
