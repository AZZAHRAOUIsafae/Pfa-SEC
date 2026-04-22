import { useNavigate } from "react-router-dom"

export default function ClientHome() {
  const navigate = useNavigate()

  return (
    <div style={{ color: "white" }}>
      <h1>👋 Client Dashboard</h1>

      <button onClick={() => navigate("/client/factures")}>
        Go to Factures
      </button>
    </div>
  )
}