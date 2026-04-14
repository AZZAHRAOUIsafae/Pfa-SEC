# Pfa-SEC — Secure Topography Web Application (PFA, 3rd Year, ESISA)

Project PFA (end-of-studies project) for 3rd year students at ESISA.

Summary
-------
This project is a secure web application for managing and protecting sensitive topography data (maps, coordinates, technical documents). It combines web development, cybersecurity best practices, and AI-assisted features (chatbot and anomaly detection) to deliver a hardened document management and visualization platform for surveyors, administrators, and clients.

Contexte / Problematique
-------------------------
De nos jours de nombreuses applications qui stockent des données sensibles manquent de protections adéquates, ce qui les rend vulnérables aux attaques telles que SQL Injection, Cross-Site Scripting (XSS), et les fuites de données. Dans le domaine de la topographie, les artefacts sensibles incluent : cartes, coordonnées, et documents techniques. Ce projet vise à concevoir une application web qui sécurise ces données et protège le système contre les attaques courantes.

Objectifs
---------
- Sécurité des données : chiffrement, contrôle d'accès, stockage sécurisé.
- Sécurité de l'application web : prévention des injections SQL, XSS, attaques d'authentification ; hashing des mots de passe ; validation des entrées ; système d'authentification sécurisé (JWT, 2FA).
- Développement d'une application web complète : frontend réactif (React), backend robuste (Node.js / Django / Laravel optionnel), base Oracle.

Fonctionnalités principales
---------------------------
- Gestion des utilisateurs : inscription, authentification, gestion des rôles (Admin, Topographe, Client).
- Gestion des documents topographiques : upload sécurisé, stockage chiffré, métadonnées, visualisation des cartes.
- Protection des données : chiffrement côté serveur, contrôle d'accès basé sur les rôles, enregistrement des activités (logs).
- Module AI : chatbot assistant pour l'aide utilisateur, et module de détection d'anomalies (fraud detection) pour repérer comportements suspects.
- Dashboard de sécurité : statistiques (tentatives de login, uploads, alertes) et visualisations (charts).

Architecture du système
-----------------------
Utilisateur (Browser)
	-> Frontend (React)
		-> Backend API (Node.js / Express suggested)
			-> Security Layer (auth, validation, encryption)
				-> Database (Oracle)
			-> AI Module (chatbot, anomaly detection)

Composants UML recommandés
-------------------------
- Use Case Diagram : acteurs (Admin, Topographe, Client) et cas d'utilisation (login, upload, view map, manage users).
- Activity Diagram : parcours typique (login -> upload document -> verification AI -> stockage sécurisé).
- Class Diagram : entités principales (`User`, `Document`, `SecurityLog`, `ChatMessage`).

Technologies proposées
----------------------
- Frontend : React, React Router, Axios, Tailwind CSS / Bootstrap, Chart.js, Leaflet (ou Mapbox) pour visualisation cartographique.
- Backend : Node.js + Express (ou Django / Laravel selon préférence). Utiliser ORM (TypeORM / Sequelize / Prisma / Django ORM) pour éviter injections SQL.
- Database : Oracle Database (schéma avec tables `users`, `documents`, `security_logs`, `chat_messages`).
- Auth & Security : JWT, bcrypt / argon2 for hashing, TLS/HTTPS, input validation libraries (Joi, express-validator), helmet middleware, CSP headers, rate limiting.
- AI : Chatbot integration (RASA / OpenAI API), anomaly detection (simple ML model or rules-based alerts).

Mesures de sécurité (pratiques recommandées)
-----------------------------------------
- Passwords : stocker avec `bcrypt` ou `argon2` et salage unique.
- Authentication : JWT avec expiration, refresh tokens, et 2FA (TOTP ou SMS/Email second factor).
- Transport : forcer HTTPS, HSTS.
- Input Validation & Output Encoding : valider tous les inputs côté serveur et encoder la sortie pour éviter XSS.
- DB Access : utiliser des requêtes paramétrées / ORM, principe du moindre privilège pour les comptes DB.
- File Storage : chiffrer fichiers sensibles au repos (AES-256), contrôler l'accès via ACLs.
- Logging & Monitoring : centraliser les logs, surveiller tentatives anormales, alerting pour thresholds.
- Secure Headers : `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`.

Base de données (schéma exemple)
-------------------------------
- `users` (id, username, email, password_hash, role, created_at)
- `documents` (id, owner_id, filename, storage_path, metadata, encrypted_key, created_at)
- `security_logs` (id, user_id, action, ip, user_agent, created_at)
- `chat_messages` (id, user_id, role, message, response, created_at)

Installation & Développement (exemple Node.js + React)
-----------------------------------------------------
Prerequisites
- Node.js (>=16), npm/yarn
- Oracle Instant Client (if using direct Oracle connections) or use a DB proxy/ORM with Oracle driver

Backend (Node.js example)
1. cd backend
2. npm install
3. Create `.env` with database and JWT secrets (see `.env.example`)
4. npm run dev

Frontend (React example)
1. cd frontend
2. npm install
3. npm start

Notes pour Oracle
- Configurez les variables d'environnement pour la connexion Oracle (TNS_ADMIN, ORACLE_HOME) ou utilisez un conteneur Docker pour Oracle.
- Si Oracle n'est pas disponible pour le développement local, utilisez une base SQLite/Postgres pour prototypage, puis migrez vers Oracle.

Structure de répertoire (suggestion)
----------------------------------
```
Pfa-SEC/
	├─ backend/        # API server (Express or Django)
	├─ frontend/       # React app
	├─ docs/           # UML diagrams, specs
	├─ infra/          # deployment, docker-compose, oracle configs
	└─ README.md
```

Déploiement & Production
------------------------
- Utiliser TLS termination (reverse proxy, e.g., Nginx).
- Stockage des secrets : Vault or environment variables managed by CI/CD.
- Backups réguliers pour la base et les fichiers chiffrés.

Tests & Validation
------------------
- Tests unitaires pour backend logic et validation.
- Integration tests for auth flows and file uploads.
- Security testing: automated SAST/DAST scans, dependency vulnerability checks.

Fonctionnalités futures (roadmap)
--------------------------------
1. Secure login with 2FA
2. AI fraud detection (anomaly detection on user behaviour)
3. Chatbot assistant integrated into the frontend
4. Security dashboard with realtime charts and alerts

Contributing
------------
1. Fork the repository
2. Create a feature branch
3. Open a pull request with a clear description

Contact
-------
Project supervisors / authors: add names and contact emails here.

Licence
-------
State the project licence (e.g., MIT) or your institution's rules.

--
This README summarizes the PFA project goals, architecture, security requirements, and development notes. If you want, I can also:
- generate `docs/` with UML diagram templates,
- scaffold a minimal `backend/` and `frontend/` starter project,
- add `.env.example` and `infra/docker-compose.yml` prototypes.

