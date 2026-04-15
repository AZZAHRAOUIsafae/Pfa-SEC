import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const categories = [
  {
    id: 'admin', icon: '📋', label: 'Administratifs & Légaux',
    docs: ['Statuts de la société', 'Registre de commerce (RC)', 'ICE', 'Patente / taxe professionnelle', 'Affiliation CNSS', 'Assurance RC professionnelle']
  },
  {
    id: 'gestion', icon: '📊', label: 'Gestion Interne',
    docs: ['Bon de commande', 'Bon de livraison', 'Fiche de chantier', 'Rapport journalier', 'Planning équipes terrain', 'Suivi des projets']
  },
  {
    id: 'technique', icon: '🗺️', label: 'Documents Techniques',
    docs: ['Plan topographique (DWG/PDF)', 'Plan de bornage', 'Plan d\'implantation', 'Levé terrain GNSS', 'Rapport technique', 'Fichiers SIG (QGIS/ArcGIS)']
  },
  {
    id: 'finance', icon: '💰', label: 'Comptabilité & Finance',
    docs: ['Journal des ventes', 'Journal des achats', 'Livre de caisse', 'Relevés bancaires', 'Déclarations TVA', 'Fiches de paie']
  },
  {
    id: 'commercial', icon: '🧑‍💼', label: 'Documents Commerciaux',
    docs: ['Catalogue des services', 'Grille de prix', 'Contrats clients', 'Offres techniques', 'Portfolio projets']
  },
  {
    id: 'terrain', icon: '🚧', label: 'Terrain & Sécurité',
    docs: ['Autorisations d\'accès chantiers', 'Plan de sécurité', 'Fiche matériel', 'Check-list terrain']
  },
  {
    id: 'numerique', icon: '📡', label: 'Données Numériques',
    docs: ['Base de données clients', 'Archivage des plans', 'Backup cloud', 'Modèles AutoCAD/SIG', 'Bibliothèque coordonnées']
  },
]

const mockDocs = [
  { id: 1, name: 'Plan_Topo_2024.pdf', cat: 'technique', date: '12/04/2026', size: '2.4 MB' },
  { id: 2, name: 'RC_Societe.pdf', cat: 'admin', date: '10/04/2026', size: '1.1 MB' },
  { id: 3, name: 'Contrat_Client_A.pdf', cat: 'commercial', date: '08/04/2026', size: '0.8 MB' },
  { id: 4, name: 'Levé_GNSS_Zone_B.dwg', cat: 'technique', date: '05/04/2026', size: '5.2 MB' },
  { id: 5, name: 'Journal_Ventes_Q1.xlsx', cat: 'finance', date: '01/04/2026', size: '0.5 MB' },
]

export default function Documents() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [showUpload, setShowUpload] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  const filtered = mockDocs.filter(d =>
    (activeTab === 'all' || d.cat === activeTab) &&
    d.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <h2 style={styles.logo}>🔐 TopoSecure</h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <p style={styles.navItem} onClick={() => navigate('/dashboard')}>📊 Dashboard</p>
          <p style={styles.navActive}>📁 Documents</p>
          <p style={styles.navItem} onClick={() => navigate('/map')}>🗺️ Carte</p>
          <p style={styles.navItem} onClick={() => navigate('/users')}>👥 Utilisateurs</p>
          <p style={styles.navItem} onClick={() => navigate('/security')}>🛡️ Sécurité</p>
        </nav>
        <p style={styles.logout} onClick={handleLogout}>🚪 Déconnexion</p>
      </div>

      <div style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.title}>📁 Documents Topographiques</h1>
          <button style={styles.uploadBtn} onClick={() => setShowUpload(!showUpload)}>
            + Upload Document
          </button>
        </div>

        {showUpload && (
          <div style={styles.uploadBox}>
            <p style={{ color: '#94a3b8', marginBottom: '12px' }}>Sélectionner un fichier (PDF, DWG, SHP, KML...)</p>
            <input type="file" accept=".pdf,.dwg,.shp,.kml,.xlsx" style={{ color: '#f1f5f9' }} />
            <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
              <select style={styles.select}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
              <button style={styles.uploadBtn}>📤 Envoyer</button>
            </div>
          </div>
        )}

        <input
          style={styles.search}
          placeholder="🔍 Rechercher un document..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div style={styles.tabs}>
          <button style={activeTab === 'all' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('all')}>
            Tous
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              style={activeTab === c.id ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab(c.id)}
            >
              {c.icon} {c.label.split(' ')[0]}
            </button>
          ))}
        </div>

        <table style={styles.table}>
          <thead>
            <tr>
              {['Nom', 'Catégorie', 'Date', 'Taille', 'Statut', 'Actions'].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(doc => {
              const cat = categories.find(c => c.id === doc.cat)
              return (
                <tr key={doc.id} style={styles.tr}>
                  <td style={styles.td}>📄 {doc.name}</td>
                  <td style={styles.td}>{cat?.icon} {cat?.label}</td>
                  <td style={styles.td}>{doc.date}</td>
                  <td style={styles.td}>{doc.size}</td>
                  <td style={styles.td}><span style={styles.badge}>🔒 Chiffré</span></td>
                  <td style={styles.td}>
                    <button style={styles.btnView}>👁 Voir</button>
                    <button style={styles.btnDelete}>🗑</button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: '#94a3b8' }}>Aucun document trouvé</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const styles = {
  container: { display: 'flex', minHeight: '100vh', background: '#0f172a' },
  sidebar: { width: '220px', background: '#1e293b', padding: '30px 20px', display: 'flex', flexDirection: 'column', gap: '8px' },
  logo: { color: '#f1f5f9', fontSize: '18px', marginBottom: '30px' },
  navItem: { color: '#94a3b8', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', margin: 0 },
  navActive: { color: '#f1f5f9', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', background: '#0f172a', margin: 0 },
  logout: { color: '#f87171', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', marginTop: 'auto' },
  main: { flex: 1, padding: '40px', overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  title: { color: '#f1f5f9', fontSize: '24px' },
  uploadBtn: { background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
  uploadBox: { background: '#1e293b', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px dashed #334155' },
  search: { width: '100%', padding: '10px 16px', borderRadius: '8px', border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box' },
  tabs: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' },
  tab: { background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px' },
  tabActive: { background: '#3b82f6', color: '#fff', border: '1px solid #3b82f6', padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { color: '#94a3b8', textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #334155', fontSize: '13px' },
  tr: { borderBottom: '1px solid #1e293b' },
  td: { color: '#f1f5f9', padding: '14px 16px', fontSize: '14px' },
  badge: { background: '#064e3b', color: '#34d399', padding: '3px 10px', borderRadius: '20px', fontSize: '12px' },
  btnView: { background: '#1d4ed8', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', marginRight: '6px' },
  btnDelete: { background: '#7f1d1d', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
  select: { background: '#0f172a', color: '#f1f5f9', border: '1px solid #334155', padding: '8px 12px', borderRadius: '8px', fontSize: '13px' }
}