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
      tension: 0.4
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
      <h1>📊 Dashboard</h1>

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