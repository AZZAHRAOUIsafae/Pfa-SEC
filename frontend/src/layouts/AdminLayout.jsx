import { Outlet, useNavigate } from "react-router-dom"

export default function AdminLayout() {
  const nav = useNavigate()

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>

      <div style={{ width: 220, background: "#1e293b", color: "white", padding: 20 }}>
        <h2>Admin</h2>
        <p onClick={() => nav("/admin/dashboard")}>Dashboard</p>
        <p onClick={() => nav("/admin/users")}>Users</p>
        <p onClick={() => nav("/admin/factures")}>Factures</p>
        <p onClick={() => nav("/admin/documents")}>Documents</p>
        <p onClick={() => nav("/admin/map")}>Map</p>
        <p onClick={() => nav("/login")} style={{ color: "red" }}>Logout</p>
      </div>

      <div style={{ flex: 1, padding: 20, background: "#0f172a", color: "white" }}>
        <Outlet />
      </div>

    </div>
  )
}