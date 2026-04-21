import { useNavigate } from 'react-router-dom'

const users = [
  { id: 1, nom: 'Ahmed', role: 'Client' },
  { id: 2, nom: 'Sara', role: 'Client' }
]

export default function Users() {
  const navigate = useNavigate()

  return (
    <div style={{ color: 'white' }}>
      <h1>👥 Users</h1>

      {users.map(u => (
        <div key={u.id} style={styles.card}>
          <div>
            <h3>{u.nom}</h3>
            <p>{u.role}</p>
          </div>

          <button onClick={() => navigate(`/users/${u.id}`)}>
            Voir
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
    justifyContent: 'space-between'
  }
}