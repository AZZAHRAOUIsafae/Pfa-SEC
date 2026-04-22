import { useNavigate } from 'react-router-dom'

const users = [
  { id: 1, nom: 'Ahmed', role: 'Client' },
  { id: 2, nom: 'Sara', role: 'Client' }
]

export default function Users() {
  const navigate = useNavigate()

  return (
    <div style={{ color: 'white' }}>
      <h1>👥 Utilisateurs</h1>

      {users.map(u => (
        <div key={u.id} style={styles.card}>
          <div>
            <h3>{u.nom}</h3>
            <p style={styles.role}>{u.role}</p>
          </div>

          <button style={styles.button} onClick={() => navigate(`/users/${u.id}`)}>
            Voir le profil
          </button>
        </div>
      ))}
    </div>
  )
}

const styles = {
  card: {
    background: '#1e293b',
    padding: 15,
    marginTop: 10,
    borderRadius: 10,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  role: { color: '#94a3b8' },
  button: {
    background: '#3b82f6',
    border: 'none',
    padding: '10px 16px',
    color: '#fff',
    borderRadius: 8,
    cursor: 'pointer'
  }
}

const styles = {
  card: {
    background: '#1e293b',
    padding: 15,
    marginTop: 10,
    borderRadius: 10,
    display: 'flex',
    justifyContent: 'space-between'
  }
}