import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, BarElement, ArcElement,
  Title, Tooltip, Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend)

export default function Dashboard() {

  const lineData = {
    labels: ['Jan', 'Fév', 'Mar', 'Avr'],
    datasets: [{
      label: 'Connexions',
      data: [10, 20, 15, 30],
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.2)',
      tension: 0.4,
      fill: true
    }]
  }

  const doughnutData = {
    labels: ['Admin', 'Client', 'Topo'],
    datasets: [{
      data: [1, 3, 2],
      backgroundColor: ['#ef4444', '#10b981', '#3b82f6']
    }]
  }

  return (
    <div style={styles.container}>
      <h1>📊 Dashboard Administrateur</h1>

      <div style={styles.stats}>
        {[
          { label: 'Utilisateurs', value: '6', color: '#3b82f6' },
          { label: 'Documents', value: '18', color: '#8b5cf6' },
          { label: 'Alertes', value: '2', color: '#ef4444' },
        ].map((stat) => (
          <div key={stat.label} style={{ ...styles.statBox, borderColor: stat.color }}>
            <span style={styles.statValue}>{stat.value}</span>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>

      <div style={styles.grid}>
        <div style={styles.box}>
          <Line data={lineData} />
        </div>

        <div style={styles.box}>
          <Doughnut data={doughnutData} />
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: { color: 'white' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  box: { background: '#1e293b', padding: 20, borderRadius: 10 }
}