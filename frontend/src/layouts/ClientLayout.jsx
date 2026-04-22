import { Outlet, useNavigate } from "react-router-dom"

export default function ClientLayout() {
  const nav = useNavigate()

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>

      <div style={{ width: 200, background: "#111827", color: "white", padding: 20 }}>
        <h3>Client</h3>
        <p onClick={() => nav("/client/home")}>Home</p>
        <p onClick={() => nav("/client/factures")}>Factures</p>
        <p onClick={() => nav("/client/documents")}>Documents</p>
        <p onClick={() => nav("/client/map")}>Map</p>
      </div>

      <div style={{ flex: 1, padding: 20 }}>
        <Outlet />
      </div>

    </div>
  )
}