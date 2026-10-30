import MapView, { Circle, Marker, UrlTile } from 'react-native-maps'
import { regionForRadius, ServiceLocationMapProps } from './locationMapFrame'

export default function ServiceLocationMap({ latitude, longitude, radiusKm, label, tileUrl }: ServiceLocationMapProps) {
  const region = regionForRadius(latitude, longitude, radiusKm)
  return (
    <MapView
      style={{ height: 240, width: '100%' }}
      region={region}
      accessibilityLabel={label}
    >
      <UrlTile urlTemplate={tileUrl} maximumZ={20} />
      <Marker coordinate={{ latitude, longitude }} />
      {radiusKm != null ? (
        <Circle center={{ latitude, longitude }} radius={radiusKm * 1000} />
      ) : null}
    </MapView>
  )
}
