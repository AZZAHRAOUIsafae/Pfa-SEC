import { MapContainer, TileLayer, Polygon, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const clients = [
  {
    id: 1,
    name: 'Ahmed',
    zone: [
      [33.57, -7.58],
      [33.58, -7.60],
      [33.56, -7.61]
    ]
  }
]

export default function Map() {
  return (
    <div style={{ height: '80vh' }}>
      <MapContainer center={[33.58, -7.60]} zoom={12} style={{ height: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {clients.map(c => (
          <Polygon key={c.id} positions={c.zone}>
            <Popup>{c.name}</Popup>
          </Polygon>
        ))}
      </MapContainer>
    </div>
  )
}