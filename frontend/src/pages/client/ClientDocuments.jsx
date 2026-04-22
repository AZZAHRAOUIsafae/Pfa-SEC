const documents = [
  { id: 1, name: "Plan_Topo.pdf", size: '2.4 MB' },
  { id: 2, name: "Contrat_Client.pdf", size: '1.1 MB' }
]

export default function ClientDocuments() {
  return (
    <div style={styles.container}>
      <h1>📁 Mes documents</h1>
      <p style={styles.subtitle}>Téléchargez ou visualisez les documents de chantier partagés avec vous.</p>

      {documents.map(d => (
        <div key={d.id} style={styles.card}>
          <div>
            <strong>{d.name}</strong>
            <p style={styles.meta}>{d.size}</p>
          </div>
          <button style={styles.button}>Voir</button>
        </div>
      ))}
    </div>
  )
}

const styles = {
  container: { color: "white" },
  subtitle: { color: '#94a3b8', marginTop: 6, marginBottom: 16 },
  card: {
    background: "#1e293b",
    padding: 14,
    marginTop: 10,
    borderRadius: 8,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  meta: { color: '#94a3b8', marginTop: 4, fontSize: 13 },
  button: {
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    padding: '10px 16px',
    borderRadius: 8,
    cursor: 'pointer'
  }
}
