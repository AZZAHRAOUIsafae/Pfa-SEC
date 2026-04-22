import { useState } from "react"
import { factures } from "../../data/db"
import { getTotalPaid, getReste, getStatus } from "../../utils/clientUtils"

const clientId = 1

export default function ClientFactures() {
  const [data, setData] = useState(factures)

  const myFactures = data.filter(f => f.clientId === clientId)

  const uploadProof = (factureId, paymentId, file) => {
    const updated = data.map(f => {
      if (f.id !== factureId) return f

      return {
        ...f,
        payments: f.payments.map(p =>
          p.id === paymentId
            ? { ...p, proof: URL.createObjectURL(file) }
            : p
        )
      }
    })

    setData(updated)
  }

  return (
    <div style={{ color: "white" }}>
      <h1>🧾 My Factures</h1>

      {myFactures.map(f => {
        const paid = getTotalPaid(f)
        const reste = getReste(f)
        const status = getStatus(f)

        return (
          <div key={f.id} style={styles.card}>
            <h3>{f.id} - {status}</h3>

            <p>💰 Total: {f.total}</p>
            <p>✅ Paid: {paid}</p>
            <p style={{ color: "red" }}>⏳ Reste: {reste}</p>

            {f.payments.map(p => (
              <div key={p.id} style={styles.pay}>
                <p>{p.method} - {p.amount}</p>

                <input
                  type="file"
                  onChange={(e) =>
                    uploadProof(f.id, p.id, e.target.files[0])
                  }
                />

                {p.proof && (
                  <img src={p.proof} width={80} />
                )}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

const styles = {
  card: {
    background: "#1e293b",
    padding: 15,
    marginTop: 10,
    borderRadius: 10
  },
  pay: {
    background: "#0f172a",
    padding: 10,
    marginTop: 5,
    borderRadius: 8
  }
}