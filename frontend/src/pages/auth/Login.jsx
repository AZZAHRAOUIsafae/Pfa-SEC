import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError("❌ Remplir tous les champs");
      return;
    }

    // fake auth (frontend only)
    localStorage.setItem("token", "demo-token");

    // redirect to admin
    navigate("/admin");
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>

        <h2 style={styles.title}>🔐 TopoSecure</h2>
        <p style={styles.subtitle}>Connexion sécurisée</p>

        {error && <p style={styles.error}>{error}</p>}

        <form onSubmit={handleLogin} style={styles.form}>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />

          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />

          <button type="submit" style={styles.button}>
            Se connecter
          </button>

        </form>

      </div>
    </div>
  );
}

/* ===== STYLE ===== */
const styles = {
  container: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#0f172a",
  },

  card: {
    width: "360px",
    background: "#1e293b",
    padding: "30px",
    borderRadius: "12px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
    textAlign: "center",
  },

  title: {
    color: "#fff",
    marginBottom: "6px",
    fontSize: "24px",
  },

  subtitle: {
    color: "#94a3b8",
    marginBottom: "20px",
    fontSize: "13px",
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  input: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #334155",
    background: "#0f172a",
    color: "white",
    outline: "none",
  },

  button: {
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    background: "#3b82f6",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
  },

  error: {
    color: "#f87171",
    fontSize: "13px",
    marginBottom: "10px",
  },
};