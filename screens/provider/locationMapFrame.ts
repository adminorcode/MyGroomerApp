export type ServiceLocationMapProps = {
  latitude: number
  longitude: number
  radiusKm: number | null
  label: string
  tileUrl: string
}

const metersPerPixelAtEquator = 156543.03392
const mapHeightPx = 240

export function zoomForRadius(latitude: number, radiusKm: number | null) {
  if (radiusKm == null) return 16
  const diameterPx = mapHeightPx * 0.72
  const metersPerPixel = (radiusKm * 1000 * 2) / diameterPx
  const raw = Math.log2(
    (metersPerPixelAtEquator * Math.cos((latitude * Math.PI) / 180)) / metersPerPixel,
  )
  const snapped = Math.round(raw * 4) / 4
  return Math.max(3, Math.min(17, snapped))
}

export function regionForRadius(latitude: number, longitude: number, radiusKm: number | null) {
  const zoom = zoomForRadius(latitude, radiusKm)
  const metersPerPixel = metersPerPixelAtEquator * Math.cos((latitude * Math.PI) / 180) / 2 ** zoom
  const latitudeDelta = (metersPerPixel * mapHeightPx) / 111320
  const longitudeDelta = latitudeDelta / Math.max(0.2, Math.cos((latitude * Math.PI) / 180))
  return { latitude, longitude, latitudeDelta, longitudeDelta }
}
