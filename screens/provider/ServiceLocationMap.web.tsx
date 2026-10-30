import { createElement, useEffect, useRef } from 'react'
import { View } from 'react-native'
import { useMGTheme } from '../../design-system/theme/useMGTheme'
import { ServiceLocationMapProps, zoomForRadius } from './locationMapFrame'

function mapDocument(latitude: number, longitude: number, radiusKm: number | null, color: string, tileUrl: string) {
  const zoom = zoomForRadius(latitude, radiusKm)
  const radius = radiusKm == null ? 0 : radiusKm * 1000
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8" />
<link rel="stylesheet" href="/vendor/leaflet/leaflet.css" />
<style>html,body,#map{height:100%;margin:0}.leaflet-container img{max-width:none!important}.leaflet-control-attribution{display:none!important}</style>
</head><body><div id="map"></div>
<script src="/vendor/leaflet/leaflet.js"><\/script>
<script>
const latitude = ${latitude};
const longitude = ${longitude};
const radius = ${radius};
const color = ${JSON.stringify(color)};
const tiles = ${JSON.stringify(tileUrl)};
const map = L.map('map', { zoomControl: true, zoomSnap: 0.25, zoomDelta: 0.5 });
const tilePath = window.devicePixelRatio > 1 ? tiles.replace('.png?', '@2x.png?') : tiles;
L.tileLayer(tilePath, {
  maxZoom: 20,
  attribution: '&copy; <a href="https://www.geoapify.com/">Geoapify</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);
L.circleMarker([latitude, longitude], { radius: 7, color: color, weight: 2, fillColor: color, fillOpacity: 1 }).addTo(map);
if (radius > 0) {
  L.circle([latitude, longitude], { radius: radius, color: color, weight: 2, fillColor: color, fillOpacity: 0.18 }).addTo(map);
}
map.setView([latitude, longitude], ${zoom});
map.whenReady(() => parent.postMessage({ type: 'mg-map-zoom', zoom: map.getZoom(), latitude: latitude, longitude: longitude }, '*'));
<\/script></body></html>`
}

export default function ServiceLocationMap({ latitude, longitude, radiusKm, label, tileUrl }: ServiceLocationMapProps) {
  const { colors, radius } = useMGTheme()
  const frame = useRef<HTMLIFrameElement | null>(null)

  useEffect(() => {
    const node = frame.current
    if (!node) return
    node.dataset.zoom = ''
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string, zoom?: number, latitude?: number, longitude?: number }
      if (!data || data.type !== 'mg-map-zoom') return
      if (data.latitude !== latitude || data.longitude !== longitude) return
      node.dataset.zoom = String(data.zoom)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [latitude, longitude, radiusKm])

  return (
    <View style={{ height: 240, width: '100%', overflow: 'hidden', borderRadius: radius.lg }}>
      {createElement('iframe', {
        ref: frame,
        title: label,
        srcDoc: mapDocument(latitude, longitude, radiusKm, colors.action.primary, tileUrl),
        style: { border: 'none', width: '100%', height: '100%' },
      })}
    </View>
  )
}
