import { useParams } from 'react-router-dom'
import { useState } from 'react'
import { Pie } from 'react-chartjs-2'
import 'chart.js/auto'

/* =======================
   DATA (REAL STRUCTURE)
======================= */

const users = [
  { id: 1, name: "Ahmed", role: "client" }
]

const factures = [
  { id: 1, userId: 1, total: 10000 }
]

const paymentsData = [
  { id: 1, factureId: 1, amount: 500, method: "cash", proof: null },
  { id: 2, factureId: 1, amount: 2000, method: "cheque", proof: null }
]

const documents = [
  { id: 1, userId: 1, name: "plan.pdf" }
]

/* =======================
   COMPONENT
======================= */

export default function UserProfile() {
  const { id } = useParams()

  const user = users.find(u => u.id === Number(id))

  if (!user) {
    return <h2 style={{ color: 'white' }}>User not found</h2>
  }

  /* =======================
     RELATIONS (IMPORTANT)
  ======================= */

  const userFactures = factures.filter(f => f.userId === user.id)

  const userPaymentsInit = paymentsData.filter(p =>
    userFactures.some(f => f.id === p.factureId)
  )

  const [payments, setPayments] = useState(userPaymentsInit)

  const factureTotal = userFactures.reduce((s, f) => s + f.total, 0)
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0)
  const reste = factureTotal - totalPaid

  /* =======================
     CHART
  ======================= */

  const chartData = {
    labels: ['Payé', 'Reste'],
    datasets: [
      {
        data: [totalPaid, reste],
        backgroundColor: ['#10b981', '#ef4444']
      }
    ]
  }

  /* =======================
     UPLOAD PROOF
  ======================= */

  const handleUpload = (index, file) => {
    const copy = [...payments]
    copy[index].proof = URL.createObjectURL(file)
    setPayments(copy)
  }

  return (
    <div style={styles.container}>

      <h1 style={styles.title}>👤 {user.name}</h1>

      {/* SMALL CHART */}
      <div style={styles.chartBox}>
        <Pie data={chartData} />
      </div>

      <p>💰 Total payé: {totalPaid} DH</p>
      <p style={{ color: '#f87171' }}>⏳ Reste: {reste} DH</p>

      {/* PAYMENTS LIST */}
      {payments.map((p, i) => (
        <div key={p.id} style={styles.card}>

          <p>
            {p.method === 'cash' && '💵 Cash'}
            {p.method === 'cheque' && '🧾 Cheque'}
            {p.method === 'virement' && '🏦 Virement'}
          </p>

          <p>{p.amount} DH</p>

          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleUpload(i, e.target.files[0])}
          />

          {p.proof && (
            <img src={p.proof} alt="proof" style={styles.img} />
          )}
        </div>
      ))}

      {/* DOCUMENTS (BON BONUS RELATION) */}
      <div style={{ marginTop: 20 }}>
        <h3>📁 Documents</h3>
        {documents
          .filter(d => d.userId === user.id)
          .map(d => (
            <p key={d.id}>📄 {d.name}</p>
          ))}
      </div>

    </div>
  )
}

/* =======================
   STYLES
======================= */

const styles = {
  container: {
    padding: 20,
    background: '#0f172a',
    minHeight: '100vh',
    color: 'white'
  },

  title: {
    marginBottom: 20
  },

  chartBox: {
    width: 150,
    height: 150,
    marginBottom: 20
  },

  card: {
    background: '#1e293b',
    padding: 12,
    marginTop: 10,
    borderRadius: 10
  },

  img: {
    width: 80,
    marginTop: 8,
    borderRadius: 6
  }
}