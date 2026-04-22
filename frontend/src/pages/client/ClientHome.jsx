import { useNavigate } from "react-router-dom"

export default function ClientHome() {
  const navigate = useNavigate()

  return (
    <div style={styles.container}>
      <h1>👋 Bienvenue</h1>
      <p style={styles.text}>Accédez rapidement à vos documents, factures et cartes topographiques.</p>

      <div style={styles.actions}>
        <button style={styles.button} onClick={() => navigate("/client/documents")}>📁 Mes documents</button>
        <button style={styles.button} onClick={() => navigate("/client/factures")}>🧾 Mes factures</button>
        <button style={styles.button} onClick={() => navigate("/client/map")}>🗺️ Ma carte</button>
      </div>
    </div>
  )
}

const styles = {
  container: { color: 'white', padding: 20 },
  text: { color: '#94a3b8', marginBottom: 20 },
  actions: { display: 'flex', flexWrap: 'wrap', gap: 12 },
  button: {
    background: '#3b82f6',
    border: 'none',
    color: '#fff',
    padding: '12px 18px',
    borderRadius: 10,
    cursor: 'pointer'
  }
}
