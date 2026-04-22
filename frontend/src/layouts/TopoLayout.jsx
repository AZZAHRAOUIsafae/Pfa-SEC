import { Outlet, useNavigate } from 'react-router-dom'

export default function TopoLayout() {
  const navigate = useNavigate()

  const logout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <div style={styles.container}>

      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <h2 style={{ color: 'white' }}>🛰️ Topographe</h2>

        <p onClick={() => navigate('/topo/home')}>🏠 Home</p>
        <p onClick={() => navigate('/topo/map')}>🗺️ Map</p>
        <p onClick={() => navigate('/topo/zones')}>📐 Zones</p>

        <p onClick={logout} style={{ color: 'red', marginTop: 'auto' }}>
          🚪 Logout
        </p>
      </div>

      {/* CONTENT */}
      <div style={styles.content}>
        <Outlet />
      </div>

    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    background: '#0f172a'
  },
  sidebar: {
    width: 220,
    background: '#1e293b',
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    color: '#94a3b8'
  },
  content: {
    flex: 1,
    padding: 20
  }
}