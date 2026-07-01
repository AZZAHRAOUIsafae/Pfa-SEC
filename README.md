# 🌍 TopoPro Maroc (DataTopoGuard)

<div align="center">
  <img src="[URL_LOGO_A_COMPLETER]" alt="TopoPro Logo" width="200" />
  <h3>Plateforme SaaS de Gestion Avancée pour Cabinets Topographiques</h3>
  <p>Une solution intégrée pour les ingénieurs topographes marocains (ONIGT), centralisant la gestion des projets, devis/factures, communications, et paiements sécurisés.</p>
</div>

---

## 📖 Sommaire
- [Présentation du Projet](#-présentation-du-projet)
- [Contexte et Objectifs](#-contexte-et-objectifs)
- [Fonctionnalités Détaillées (Rôles)](#-fonctionnalités-détaillées-par-rôle)
- [Architecture Technique](#-architecture-technique)
- [Technologies Utilisées](#-technologies-utilisées)
- [Structure du Projet](#-structure-du-projet)
- [Installation Locale](#%EF%B8%8F-installation-locale)
- [Configuration (.env)](#-configuration-des-variables-denvironnement)
- [Configuration Firebase](#-configuration-firebase)
- [Déploiement](#-déploiement)
- [Sécurité & 2FA](#-sécurité)
- [Modules Principaux](#-modules-principaux)
  - [Paiement (Stripe)](#paiement-stripe)
  - [Devis & Factures](#module-devis--factures)
  - [Génération PDF](#génération-pdf)
  - [Signature Électronique](#signature-électronique)
  - [QR Code](#qr-code)
  - [Journal d'Audit](#journal-daudit)
- [Captures d'Écran](#-captures-décran)
- [Guide d'Utilisation](#-guide-dutilisation)
- [Difficultés Rencontrées](#-difficultés-rencontrées)
- [Améliorations Futures](#-améliorations-futures)
- [Conclusion](#-conclusion)

---

## 🎯 Présentation du Projet
**TopoPro Maroc (DataTopoGuard)** est une application web conçue pour digitaliser et sécuriser les workflows des cabinets topographiques. Elle permet une gestion de bout en bout des missions, depuis la demande de devis jusqu'à la facturation, en passant par le partage de plans (PDF, CAD), la signature électronique, et le paiement en ligne sécurisé. Elle est spécifiquement adaptée aux normes de l'Ordre National des Ingénieurs Géomètres-Topographes (ONIGT) au Maroc.

---

## 💡 Contexte et Objectifs
Le métier de topographe nécessite une rigueur technique et une gestion de documents complexes (plans, devis, factures). L'objectif de TopoPro Maroc est de :
1. **Centraliser** la gestion des missions topographiques.
2. **Fluidifier** la communication entre le topographe et son client via une messagerie intégrée et un suivi de projet transparent.
3. **Sécuriser** les données, les paiements, et les accès (Multi-sociétés, 2FA, règles Firestore strictes).
4. **Automatiser** les tâches administratives (génération de PDF, facturation, suivi des acomptes).

---

## 👥 Fonctionnalités Détaillées par Rôle

### 👑 Administrateur (Système / Multi-sociétés)
- Gestion globale du système et accès à un tableau de bord analytique.
- **Isolation Multi-sociétés** : Supervise différentes entreprises / cabinets enregistrés de manière isolée.
- Gestion des utilisateurs (Suspension, modification des rôles, invitations).
- Accès au journal d'audit (`failed_logins`, logs d'activité) pour la sécurité.
- Support et résolution des litiges / supervision des projets sur toute la plateforme.

### 📐 Topographe (Cabinet)
- Gestion du profil du cabinet (Infos ONIGT, ICE, IF, Logo, Adresse).
- Création et suivi de projets topographiques (Bornage, lotissement, levé topo).
- Module complet de création de **Devis & Factures** (avec gestion de la TVA, des acomptes, et restes à payer).
- Génération automatique de documents en format **PDF**.
- Prise de rendez-vous et planification (Interventions).
- Partage sécurisé de fichiers techniques (Map, CAD, PDF).
- Intégration de l'intelligence artificielle (Gemini AI) pour une analyse automatique de l'imagerie spatiale/topographique.

### 👤 Client
- Suivi en temps réel de l'état d'avancement des projets (en attente, en cours, à valider).
- Validation de devis et **Signature Électronique** directement sur la plateforme.
- Paiement de factures en ligne via **Stripe**.
- Espace de messagerie instantanée avec son topographe attitré.
- Visualisation et téléchargement des documents générés.
- Possibilité de noter (`Review`) la prestation du cabinet.

---

## 🏗️ Architecture Technique
L'application repose sur une architecture **Client/Serveur (Frontend React SPA / Backend Express)**, avec **Firebase** agissant comme base de données en temps réel (BaaS) et fournisseur d'authentification.
- **Frontend** : Application React (Vite) gérant l'interface utilisateur, le routage (React Router), la cartographie interactive (Leaflet), et l'état de l'authentification (Firebase Hooks).
- **Backend (API)** : Serveur Node.js/Express qui gère les tâches sensibles non confiées au client (Paiements Stripe, Envoi d'emails OTP via SMTP, proxy pour l'API Gemini).
- **Base de données** : Firestore avec une sécurité stricte basée sur les rôles (`firestore.rules`).

---

## 🛠️ Technologies Utilisées
- **Frontend** : React 19, TypeScript, Vite, Tailwind CSS 4, Framer Motion (Animations), Lucide React (Icônes).
- **Backend** : Node.js, Express.js, TypeScript.
- **BaaS (Backend as a Service)** : Firebase (Authentication, Firestore, Storage).
- **Cartographie** : Leaflet, React-Leaflet, Geoman (Outils de dessin topographique).
- **Paiements** : Stripe (API & Elements).
- **Génération de PDF & Signatures** : jsPDF, jspdf-autotable, react-signature-canvas.
- **Intelligence Artificielle** : Google Gemini API (`@google/genai`).
- **Sécurité & E-mails** : Nodemailer (OTP/2FA), Helmet, Express Rate Limit.

---

## 📂 Structure du Projet
```text
Pfa-SEC/
│
├── src/
│   ├── Backend/            # Serveur Express & Services (Paiement, OTP, PDF, IA)
│   │   ├── lib/            # Utilitaires (Crypto, config Firebase admin, i18n)
│   │   └── services/       # Services métier (aiService, db, otpService, pdfService)
│   │
│   ├── Frontend/           # Application React
│   │   ├── components/     # Composants UI (Modals, Cartes de projet, Maps, Chat)
│   │   ├── pages/          # Vues principales (Dashboards, Login, Profil, Settings)
│   │   ├── index.css       # Styles globaux Tailwind
│   │   ├── main.tsx        # Point d'entrée React
│   │   └── App.tsx         # Routage principal
│
├── firestore.rules         # Règles de sécurité Firestore avancées (500+ lignes)
├── storage.rules           # Règles pour Firebase Storage
├── server.ts               # Point d'entrée du serveur Node.js/Express
├── vite.config.ts          # Configuration Vite
├── package.json            # Dépendances du projet
└── .env.example            # Exemple de variables d'environnement
```

---

## ⚙️ Installation Locale

1. **Cloner le dépôt :**
   ```bash
   git clone https://github.com/AZZAHRAOUIsafae/Pfa-SEC.git
   cd Pfa-SEC
   ```

2. **Installer les dépendances :**
   ```bash
   npm install
   ```

3. **Lancer l'application en développement (Frontend + Backend en parallèle via Vite/Express) :**
   ```bash
   npm run dev
   ```
   *L'application sera accessible sur `http://localhost:3000` (le serveur Vite gère le middleware express).*

---

## 🔐 Configuration des Variables d'Environnement
Créez un fichier `.env` à la racine du projet, basé sur `.env.example` :

```env
# Stripe API Keys (Paiement)
VITE_STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Gemini API Key (Assistant Topographique IA)
GEMINI_API_KEY=votre_cle_gemini

# Firebase Config (Optionnel, utile si non injecté par Firebase Hosting)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# SMTP Configuration (Pour le système OTP / 2FA via email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre_email@gmail.com
SMTP_PASS=votre_mot_de_passe_d_application
```

---

## 🔥 Configuration Firebase
1. Créez un projet sur la console Firebase.
2. Activez l'authentification (Email/Mot de passe).
3. Activez **Firestore Database** et **Storage**.
4. Déployez les règles de sécurité incluses dans le dépôt :
   ```bash
   firebase deploy --only firestore:rules
   firebase deploy --only storage
   ```

---

## 🚀 Déploiement
Le projet est optimisé pour être construit avec **Vite**.
1. Créez le build de production :
   ```bash
   npm run build
   ```
2. Le dossier `dist/` est prêt à être servi par le serveur Node (`server.ts`), ou déployé séparément sur un service d'hébergement statique (Vercel, Firebase Hosting, Netlify) tandis que le backend Node.js peut être hébergé sur Render ou Heroku.

---

## 🛡️ Sécurité

- **Firestore Rules** : Le fichier `firestore.rules` (500+ lignes) implémente une isolation absolue des données. Les accès sont validés selon les rôles, les UIDs, et l'appartenance à une société (Isolation Multi-sociétés).
- **Authentification & 2FA** : Intégration d'un système OTP (One-Time Password) via e-mail envoyé par Nodemailer lors des connexions sensibles pour garantir une double vérification (2FA).
- **Isolation Multi-sociétés** : Chaque administrateur ou topographe de cabinet ne peut interagir qu'avec les données (projets, documents, employés) liées à sa société.

---

## 🧩 Modules Principaux

### Paiement (Stripe)
Intégration de `@stripe/react-stripe-js` pour le règlement sécurisé des factures. Le backend Express génère les `PaymentIntents` selon le montant défini par le topographe.

### Module Devis & Factures
Permet la création détaillée des prestations avec :
- Calcul dynamique du HT, de la TVA (20%), et du TTC.
- Gestion des acomptes (Acompte payé / Reste à payer).

### Génération PDF
Utilisation de `jsPDF` et `jspdf-autotable`. Le module `pdfService.ts` construit esthétiquement des documents aux normes professionnelles avec le cachet/signature, le logo, l'identifiant ONIGT, et les informations réglementaires de l'entreprise.

### Signature Électronique
Mise en place d'un canvas interactif (`react-signature-canvas`) permettant au client d'apposer sa signature sur les devis ou contrats. Cette signature est ensuite intégrée numériquement au fichier PDF généré.

### QR Code
Système de QR Code intégré aux documents (`DocumentViewer`) permettant une vérification rapide d'authenticité et d'accès rapide aux informations du document ou de la plateforme.

### Journal d'Audit
Le système enregistre chaque action de sécurité sensible, notamment dans la collection Firestore `failed_logins`, afin d'alerter les administrateurs en cas de tentatives de connexions infructueuses ou frauduleuses.

---

## 📸 Captures d'Écran

*(Emplacements à compléter avec les URLs de vos captures d'écran :)*

| Tableau de bord Topographe | Espace Client | Modélisation Topo 3D / Cartographie | Devis PDF Généré |
|:---:|:---:|:---:|:---:|
| <img src="[LIEN_IMAGE_DASHBOARD_TOPO]" width="200" alt="Dashboard Topo" /> | <img src="[LIEN_IMAGE_DASHBOARD_CLIENT]" width="200" alt="Dashboard Client" /> | <img src="[LIEN_IMAGE_3D]" width="200" alt="Carte 3D" /> | <img src="[LIEN_IMAGE_DEVIS]" width="200" alt="Exemple Devis" /> |

---

## 📖 Guide d'Utilisation
1. **Création du cabinet** : L'Admin crée un cabinet et assigne un Topographe.
2. **Onboarding Client** : Le topographe ajoute un nouveau client. Le client reçoit ses accès.
3. **Création du Projet** : Le topographe initie un projet, ajoute les plans et définit le périmètre géographique via la carte interactive (Leaflet Geoman).
4. **Devis** : Le topographe génère un devis détaillé. Le client le consulte et le signe électroniquement depuis son espace.
5. **Livraison & Facturation** : Le livrable final est déposé, la facture finale est émise et le client effectue le paiement en ligne par carte bancaire via Stripe.

---

## 🧗 Difficultés Rencontrées
- **Sécurité et Rôles complexes** : Le développement des règles de sécurité Firestore (`firestore.rules`) pour assurer l'isolation entre de multiples sociétés (multi-tenant) tout en gérant les permissions granulaires Client/Topographe/Admin a été un défi majeur.
- **Génération dynamique des PDF** : Le formatage précis des documents (coordonnées ONIGT, calculs des acomptes, insertion de l'image de la signature) afin de correspondre aux normes requises par l'état via `jsPDF`.
- **Mécanisme 2FA hybride** : Mettre en place un système de One-Time Password fiable, en liant les requêtes clients à une configuration SMTP backend ou en utilisant des comptes de secours (Ethereal) pour les environnements de test.

---

## 🚀 Améliorations Futures
- Application mobile native (React Native / Flutter) pour les ingénieurs sur le terrain.
- Intégration et traitement direct de formats de fichiers industriels CAO lourds (ex: import DWG/DXF).
- Synchronisation comptable automatique pour exporter les données de facturation (API Sage, QuickBooks).
- Mode d'utilisation hors-ligne (Offline PWA) pour les levés topographiques dans les zones sans connexion internet.

---

## ✨ Conclusion
Le projet **DataTopoGuard (TopoPro Maroc)** apporte une dimension technologique incontournable au secteur topographique marocain. En regroupant outils cartographiques, messagerie, édition documentaire sécurisée et facturation en un seul espace SaaS, il offre une plateforme robuste et évolutive prête pour le monde professionnel.

---
*Réalisé dans le cadre du PFA par Manal DAHMOUNI   - AZZAHRAOUI Safae - Adil LAFHEL .*
