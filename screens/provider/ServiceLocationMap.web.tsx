import { createElement, useEffect, useRef } from 'react'
import { View } from 'react-native'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { ServiceLocationMapProps, zoomForRadius } from './locationMapFrame'

function mapDocument(latitude: number, longitude: number, radiusKm: number | null, pinColor: string, areaColor: string, tileUrl: string) {
  const zoom = zoomForRadius(latitude, radiusKm)
  const radius = radiusKm == null ? 0 : radiusKm * 1000
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8" />
<link rel="stylesheet" href="/vendor/leaflet/leaflet.css" />
<style>
html,body,#map{height:100%;margin:0}
.leaflet-container{background:#E7EEF0}
.leaflet-container img{max-width:none!important}
.leaflet-control-attribution{display:none!important}
.mg-pin{background:transparent;border:none}
</style>
</head><body><div id="map"></div>
<script src="/vendor/leaflet/leaflet.js"><\/script>
<script>
const latitude = ${latitude};
const longitude = ${longitude};
const radius = ${radius};
const pin = ${JSON.stringify(pinColor)};
const area = ${JSON.stringify(areaColor)};
const tiles = ${JSON.stringify(tileUrl)};
const map = L.map('map', { zoomControl: true, zoomSnap: 0.25, zoomDelta: 0.5 });
const tilePath = window.devicePixelRatio > 1 ? tiles.replace('.png?', '@2x.png?') : tiles;
L.tileLayer(tilePath, {
  maxZoom: 20,
  attribution: '&copy; <a href="https://www.geoapify.com/">Geoapify</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);
const pinSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36"><path fill="' + pin + '" d="M14 1C7 1 1.5 6.4 1.5 13.2 1.5 22.2 14 35 14 35s12.5-12.8 12.5-21.8C26.5 6.4 21 1 14 1z"/><circle cx="14" cy="13" r="4.5" fill="white"/></svg>';
L.marker([latitude, longitude], {
  interactive: false,
  icon: L.divIcon({ className: 'mg-pin', html: pinSvg, iconSize: [28, 36], iconAnchor: [14, 34] })
}).addTo(map);
if (radius > 0) {
  L.circle([latitude, longitude], { radius: radius, color: area, weight: 2, dashArray: '6 5', fillColor: area, fillOpacity: 0.16, className: 'mg-radius' }).addTo(map);
}
map.setView([latitude, longitude], ${zoom});
map.whenReady(() => parent.postMessage({ type: 'mg-map-zoom', zoom: map.getZoom(), latitude: latitude, longitude: longitude }, '*'));
map.on('click', (event) => parent.postMessage({ type: 'mg-map-pick', latitude: event.latlng.lat, longitude: event.latlng.lng }, '*'));
<\/script></body></html>`
}

export default function ServiceLocationMap({ latitude, longitude, radiusKm, label, tileUrl, onPick }: ServiceLocationMapProps) {
  const { colors, radius } = useMGTheme()
  const frame = useRef<HTMLIFrameElement | null>(null)
  const pick = useRef(onPick)
  pick.current = onPick

  useEffect(() => {
    const node = frame.current
    if (!node) return
    node.dataset.zoom = ''
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string, zoom?: number, latitude?: number, longitude?: number }
      if (!data || typeof data.latitude !== 'number' || typeof data.longitude !== 'number') return
      if (data.type === 'mg-map-zoom') {
        if (data.latitude !== latitude || data.longitude !== longitude) return
        node.dataset.zoom = String(data.zoom)
        return
      }
      if (data.type === 'mg-map-pick') pick.current?.(data.latitude, data.longitude)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [latitude, longitude, radiusKm])

  return (
    <View style={{ height: 240, width: '100%', overflow: 'hidden', borderRadius: radius.lg }}>
      {createElement('iframe', {
        ref: frame,
        title: label,
        srcDoc: mapDocument(latitude, longitude, radiusKm, colors.action.primary, colors.action.secondary, tileUrl),
        style: { border: 'none', width: '100%', height: '100%' },
      })}
    </View>
  )
}
