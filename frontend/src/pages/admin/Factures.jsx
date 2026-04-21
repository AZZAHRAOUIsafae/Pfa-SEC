import { useState } from "react"
import { users, factures as initialFactures, payments as initialPayments } from "../../data/db"

export default function Factures() {

  const [factures] = useState(initialFactures)
  const [payments, setPayments] = useState(initialPayments)

  // ADD PAYMENT
  const addPayment = (factureId, amount, method, file) => {
    const newPayment = {
      id: payments.length + 1,
      factureId,
      amount: Number(amount),
      method,
      proof: file ? URL.createObjectURL(file) : null
    }

    setPayments([...payments, newPayment])
  }

  // GET PAYMENTS BY FACTURE
  const getPaymentsByFacture = (id) =>
    payments.filter(p => p.factureId === id)

  // TOTAL PAID
  const getPaid = (id) =>
    getPaymentsByFacture(id).reduce((sum, p) => sum + p.amount, 0)

  return (
    <div style={styles.container}>

      <h1>🧾 Factures PRO++</h1>

      {factures.map(f => {

        const user = users.find(u => u.id === f.userId)

        const paid = getPaid(f.id)
        const reste = f.total - paid

        return (
          <div key={f.id} style={styles.card}>

            <h3>{f.title}</h3>
            <p>👤 Client: {user?.name}</p>

            <p>💰 Total: {f.total} DH</p>
            <p>✅ Paid: {paid} DH</p>

            <p style={{ color: reste > 0 ? "red" : "green" }}>
              ⏳ Reste: {reste} DH
            </p>

            <hr style={{ margin: "10px 0", opacity: 0.2 }} />

            <PaymentForm factureId={f.id} onAdd={addPayment} />

            {/* PAYMENTS LIST */}
            {getPaymentsByFacture(f.id).map(p => (
              <div key={p.id} style={styles.payment}>

                <p>
                  {p.method === "cash" && "💵 Cash"}
                  {p.method === "cheque" && "🧾 Cheque"}
                  {p.method === "virement" && "🏦 Virement"}
                </p>

                <p>{p.amount} DH</p>

                {p.proof && (
                  <img src={p.proof} alt="proof" style={styles.img} />
                )}

              </div>
            ))}

          </div>
        )
      })}

    </div>
  )
}

/* ================= PAYMENT FORM ================= */

function PaymentForm({ factureId, onAdd }) {

  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("cash")
  const [file, setFile] = useState(null)

  return (
    <div style={styles.form}>

      <input
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={styles.input}
      />

      <select
        value={method}
        onChange={(e) => setMethod(e.target.value)}
        style={styles.input}
      >
        <option value="cash">Cash</option>
        <option value="cheque">Cheque</option>
        <option value="virement">Virement</option>
      </select>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <button
        style={styles.btn}
        onClick={() => {
          if (!amount) return

          onAdd(factureId, amount, method, file)

          setAmount("")
          setFile(null)
        }}
      >
        ➕ Add payment
      </button>

    </div>
  )
}

/* ================= STYLES ================= */

const styles = {

  container: {
    color: "white",
    padding: 20
  },

  card: {
    background: "#1e293b",
    padding: 15,
    marginTop: 15,
    borderRadius: 10
  },

  payment: {
    background: "#0f172a",
    padding: 8,
    marginTop: 5,
    borderRadius: 6
  },

  form: {
    marginTop: 10
  },

  input: {
    display: "block",
    width: "100%",
    padding: 8,
    marginBottom: 8,
    borderRadius: 5,
    border: "none"
  },

  btn: {
    background: "#3b82f6",
    border: "none",
    padding: 10,
    color: "white",
    borderRadius: 6,
    cursor: "pointer"
  },

  img: {
    width: 80,
    marginTop: 5,
    borderRadius: 5
  }
}