import { View } from 'react-native'
import MapView, { Circle, Marker, UrlTile } from 'react-native-maps'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { regionForRadius, ServiceLocationMapProps } from './locationMapFrame'

export default function ServiceLocationMap({ latitude, longitude, radiusKm, label, tileUrl, onPick }: ServiceLocationMapProps) {
  const { colors, radius } = useMGTheme()
  const region = regionForRadius(latitude, longitude, radiusKm)
  return (
    <View style={{ height: 240, width: '100%', borderRadius: radius.lg, overflow: 'hidden' }}>
      <MapView
        style={{ height: 240, width: '100%' }}
        region={region}
        accessibilityLabel={label}
        onPress={onPick ? event => onPick(event.nativeEvent.coordinate.latitude, event.nativeEvent.coordinate.longitude) : undefined}
      >
        <UrlTile urlTemplate={tileUrl} maximumZ={20} />
        <Marker
          coordinate={{ latitude, longitude }}
          pinColor={colors.action.primary}
          draggable={!!onPick}
          onDragEnd={onPick ? event => onPick(event.nativeEvent.coordinate.latitude, event.nativeEvent.coordinate.longitude) : undefined}
        />
        {radiusKm != null ? (
          <Circle
            center={{ latitude, longitude }}
            radius={radiusKm * 1000}
            strokeColor={colors.action.secondary}
            fillColor={`${colors.action.secondary}29`}
          />
        ) : null}
      </MapView>
    </View>
  )
}
