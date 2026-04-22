import { MapContainer, TileLayer, Polygon, Popup } from "react-leaflet"
import "leaflet/dist/leaflet.css"

// 👇 fake data (later تجي من DB)
const clientData = {
  1: {
    name: "Ahmed Benali",
    zone: [
      [33.5731, -7.5898],
      [33.5780, -7.6000],
      [33.5650, -7.6100],
    ],
  }
}

// simple surface calc (approx)
function calcSurface(coords) {
  let area = 0
  for (let i = 0; i < coords.length; i++) {
    const [x1, y1] = coords[i]
    const [x2, y2] = coords[(i + 1) % coords.length]
    area += x1 * y2 - x2 * y1
  }
  return Math.abs(area * 111 * 111 / 2).toFixed(2)
}

export default function ClientMap() {
  const clientId = 1
  const client = clientData[clientId]

  if (!client) {
    return <h2 style={{ color: "white" }}>Client not found</h2>
  }

  return (
    <div style={styles.container}>
      
      <h1 style={styles.title}>🗺️ My Topographic Zone</h1>

      <div style={styles.mapBox}>
        <MapContainer
          center={client.zone[0]}
          zoom={13}
          style={{ height: "80vh", width: "100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          <Polygon positions={client.zone} pathOptions={{ color: "blue" }}>
            <Popup>
              <b>{client.name}</b>
              <br />
              Surface: {calcSurface(client.zone)} km²
            </Popup>
          </Polygon>

        </MapContainer>
      </div>

    </div>
  )
}

const styles = {
  container: {
    color: "white"
  },
  title: {
    marginBottom: 10
  },
  mapBox: {
    background: "#1e293b",
    padding: 10,
    borderRadius: 10
  }
}