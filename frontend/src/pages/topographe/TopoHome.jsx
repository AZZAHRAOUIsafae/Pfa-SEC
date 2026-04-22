import { useNavigate } from 'react-router-dom'

export default function TopoHome() {
  const navigate = useNavigate()

  return (
    <div style={styles.container}>
      <h1>🗺️ Topographe</h1>
      <p style={styles.subtitle}>
        Accédez aux outils de cartographie et aux plans topographiques.
      </p>

      <div style={styles.cards}>
        <div style={styles.card}>
          <h3>Carte terrain</h3>
          <p>Visualisez les couches géographiques et les points de repère.</p>
        </div>
        <div style={styles.card}>
          <h3>Rapports</h3>
          <p>Créez, explorez et exportez les rapports de levé terrain.</p>
        </div>
      </div>

      <button style={styles.button} onClick={() => navigate('/topo/home')}>
        Actualiser la vue
      </button>
    </div>
  )
}

const styles = {
  container: { color: '#f1f5f9', padding: 24, background: '#0f172a', minHeight: '100vh' },
  subtitle: { color: '#94a3b8', marginTop: 12, marginBottom: 24, maxWidth: 640 },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 },
  card: { background: '#1e293b', padding: 20, borderRadius: 14, border: '1px solid #334155' },
  button: { marginTop: 24, background: '#3b82f6', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: 10, cursor: 'pointer' }
}
