import { useState } from 'react'

const categories = [
  { id: 'tech', label: '🗺️ Technique' },
  { id: 'admin', label: '📋 Administratif' },
  { id: 'finance', label: '💰 Finance' }
]

export default function Documents() {
  const [docs, setDocs] = useState([])
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('all')

  const handleUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const newDoc = {
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB',
      date: new Date().toLocaleDateString(),
      category: 'tech'
    }

    setDocs([...docs, newDoc])
  }

  const filtered = docs.filter(d =>
    (cat === 'all' || d.category === cat) &&
    d.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={styles.container}>
      <h1>📁 Documents</h1>

      {/* UPLOAD */}
      <div style={styles.uploadBox}>
        <input type="file" onChange={handleUpload} />
      </div>

      {/* FILTER */}
      <input
        style={styles.input}
        placeholder="🔍 Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div style={styles.tabs}>
        <button onClick={() => setCat('all')}>All</button>
        {categories.map(c => (
          <button key={c.id} onClick={() => setCat(c.id)}>
            {c.label}
          </button>
        ))}
      </div>

      {/* TABLE */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Date</th>
            <th>Taille</th>
          </tr>
        </thead>

        <tbody>
          {filtered.map((d, i) => (
            <tr key={i}>
              <td>{d.name}</td>
              <td>{d.date}</td>
              <td>{d.size}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const styles = {
  container: { color: 'white' },
  uploadBox: {
    background: '#1e293b',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10
  },
  input: {
    padding: 10,
    width: '100%',
    marginBottom: 10,
    background: '#1e293b',
    border: 'none',
    color: 'white'
  },
  tabs: { display: 'flex', gap: 10, marginBottom: 10 },
  table: {
    width: '100%',
    background: '#1e293b',
    borderRadius: 10
  }
}