import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"

import AdminLayout from "../layouts/AdminLayout.jsx"
import ClientLayout from "../layouts/ClientLayout.jsx"

import Login from "../pages/auth/Login.jsx"

import Dashboard from "../pages/admin/Dashboard.jsx"
import Users from "../pages/admin/Users.jsx"
import UserProfile from "../pages/admin/UserProfile.jsx"
import Factures from "../pages/admin/Factures.jsx"
import Documents from "../pages/admin/Documents.jsx"
import Map from "../pages/admin/Map.jsx"

import ClientHome from "../pages/client/ClientHome.jsx"
import ClientFactures from "../pages/client/ClientFactures.jsx"
import ClientDocument from "../pages/client/ClientDocument.jsx"
import ClientMap from "../pages/client/ClientMap.jsx"

export default function RoutesApp() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/login" element={<Login />} />

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="user/:id" element={<UserProfile />} />
          <Route path="factures" element={<Factures />} />
          <Route path="documents" element={<Documents />} />
          <Route path="map" element={<Map />} />
        </Route>

        <Route path="/client" element={<ClientLayout />}>
          <Route index element={<Navigate to="home" />} />
          <Route path="home" element={<ClientHome />} />
          <Route path="factures" element={<ClientFactures />} />
          <Route path="documents" element={<ClientDocument />} />
          <Route path="map" element={<ClientMap />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" />} />

      </Routes>
    </BrowserRouter>
  )
}