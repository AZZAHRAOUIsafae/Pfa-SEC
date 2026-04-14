import { useNavigate } from 'react-router-dom'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, BarElement, ArcElement,
  Title, Tooltip, Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend)

export default function Dashboard() {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  const lineData = {
    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun'],
    datasets: [{
      label: 'Tentatives de connexion',
      data: [12, 19, 8, 25, 14, 30],
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.1)',
      tension: 0.4, fill: true
    }]
  }

  const barData = {
    labels: ['PDF', 'DWG', 'SHP', 'KML', 'Autres'],
    datasets: [{
      label: 'Documents par type',
      data: [8, 5, 3, 2, 1],
      backgroundColor: ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444']
    }]
  }

  const doughnutData = {
    labels: ['Admin', 'Topographe', 'Client'],
    datasets: [{
      data: [1, 4, 7],
      backgroundColor: ['#ef4444', '#3b82f6', '#10b981']
    }]
  }

  const chartOptions = {
    responsive: true,
    plugins: { legend: { labels: { color: '#94a3b8' } } },
    scales: {
      x: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
      y: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } }
    }
  }

  const doughnutOptions = {
    responsive: true,
    plugins: { legend: { labels: { color: '#94a3b8' } } }
  }

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <h2 style={styles.logo}>🔐 TopoSecure</h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <p style={styles.navActive}>📊 Dashboard</p>
          <p style={styles.navItem} onClick={() => navigate('/documents')}>📁 Documents</p>
          <p style={styles.navItem} onClick={() => navigate('/map')}>🗺️ Carte</p>
          <p style={styles.navItem} onClick={() => navigate('/users')}>👥 Utilisateurs</p>
          <p style={styles.navItem} onClick={() => navigate('/security')}>🛡️ Sécurité</p>
        </nav>
        <p style={styles.logout} onClick={handleLogout}>🚪 Déconnexion</p>
      </div>

      <div style={styles.main}>
        <h1 style={styles.title}>Tableau de bord</h1>

        <div style={styles.cards}>
          {[
            { num: '12', label: 'Documents', color: '#3b82f6' },
            { num: '3', label: 'Utilisateurs', color: '#8b5cf6' },
            { num: '2', label: '⚠️ Alertes', color: '#ef4444' },
            { num: '98%', label: '✅ Sécurité', color: '#10b981' },
          ].map((c, i) => (
            <div key={i} style={{ ...styles.card, borderColor: c.color }}>
              <p style={{ ...styles.cardNum, color: c.color }}>{c.num}</p>
              <p style={styles.cardLabel}>{c.label}</p>
            </div>
          ))}
        </div>

        <div style={styles.charts}>
          <div style={styles.chartBox}>
            <h3 style={styles.chartTitle}>Tentatives de connexion</h3>
            <Line data={lineData} options={chartOptions} />
          </div>
          <div style={styles.chartBox}>
            <h3 style={styles.chartTitle}>Répartition utilisateurs</h3>
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
          <div style={{ ...styles.chartBox, gridColumn: '1 / -1' }}>
            <h3 style={styles.chartTitle}>Documents par type</h3>
            <Bar data={barData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: { display: 'flex', minHeight: '100vh', background: '#0f172a' },
  sidebar: {
    width: '220px', background: '#1e293b', padding: '30px 20px',
    display: 'flex', flexDirection: 'column', gap: '8px'
  },
  logo: { color: '#f1f5f9', fontSize: '18px', marginBottom: '30px' },
  navItem: {
    color: '#94a3b8', padding: '10px 14px', borderRadius: '8px',
    cursor: 'pointer', fontSize: '14px', margin: 0
  },
  navActive: {
    color: '#f1f5f9', padding: '10px 14px', borderRadius: '8px',
    cursor: 'pointer', fontSize: '14px', background: '#0f172a', margin: 0
  },
  logout: {
    color: '#f87171', padding: '10px 14px', borderRadius: '8px',
    cursor: 'pointer', fontSize: '14px', marginTop: 'auto'
  },
  main: { flex: 1, padding: '40px', overflowY: 'auto' },
  title: { color: '#f1f5f9', fontSize: '26px', marginBottom: '24px' },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '30px' },
  card: {
    background: '#1e293b', padding: '24px', borderRadius: '12px',
    border: '1px solid', textAlign: 'center'
  },
  cardNum: { fontSize: '36px', fontWeight: '700', margin: 0 },
  cardLabel: { color: '#94a3b8', fontSize: '13px', marginTop: '6px' },
  charts: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  chartBox: { background: '#1e293b', padding: '24px', borderRadius: '12px' },
  chartTitle: { color: '#f1f5f9', fontSize: '15px', marginBottom: '16px', fontWeight: '500' }
}