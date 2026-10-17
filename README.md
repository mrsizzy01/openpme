# 💼 Smart PME Finance

> **Plateforme intégrée de gestion commerciale et financière des PME avec détection intelligente des anomalies et supervision à distance**
> *Projet et réalisation pour mémoire de Licence / Bac 3 en Sciences Informatiques*

---

## 🌟 Présentation

**Smart PME Finance** est une solution logicielle d'entreprise moderne et complète, conçue sur mesure pour les réalités opérationnelles des PME, notamment en République démocratique du Congo (RDC).

Elle unifie au sein d'une même architecture :
1. **Une API Centrale NestJS** versionnée (`/api/v1`) avec documentation Swagger interactive (`/api/docs`).
2. **Une base relationnelle PostgreSQL** gérée par Prisma ORM avec isolation stricte multi-entreprises.
3. **Une application Web moderne React + Vite** avec design system midnight blue/slate et glassmorphism.
4. **Une application Windows Desktop native PyQt6** intégrant le moteur Chromium, le heartbeat de présence et le killswitch distant.
5. **Un moteur intelligent de détection des anomalies de gestion** (remises anormales, écarts de caisse, ruptures de stocks, dépenses excessives).

---

## 🛠️ Stack Technologique

- **Backend :** Node.js v24, NestJS 11, TypeScript 5, Prisma ORM 6, JWT, Class-Validator, Swagger OpenAPI.
- **Base de données :** PostgreSQL 17 (service local `postgresql-x64-17` port 5432).
- **Frontend Web :** React 18, TypeScript, Vite 6, Lucide Icons, Vanilla CSS Design System.
- **Desktop Windows :** Client natif PyQt6 (Chromium WebEngine) avec Kill Switch distant, surveillance de heartbeat et verrouillage immédiat.
- **Packages partagés :** `@smart-pme/shared` (calculs monétaires, DTOs, énumérations).
- **Tests automatisés :** Suite de validation comptable et d’anomalies (`npm test`).

---

## 🚀 Démarrage Rapide

### 1. Variables d'environnement
Le fichier `.env` est configuré à la racine :
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smart_pme_finance?schema=public"
PORT=3001
JWT_SECRET=smart_pme_finance_super_secure_jwt_secret_key_prod_2026_xyz
```

### 2. Déploiement de la base & Seed
```bash
npm run prisma:push
npm run prisma:seed
```

### 3. Démarrer les services
- **API NestJS :**
  ```bash
  npm run dev:api
  ```
  Accessible sur `http://localhost:3001/api/v1` (Swagger sur `http://localhost:3001/api/docs`).

- **Application Web React :**
  ```bash
  npm run dev:web
  ```
  Accessible sur `http://localhost:5173`.

---

## 👥 Comptes de Démonstration (RDC)

| Rôle | Email | Mot de passe |
|---|---|---|
| **Administrateur / Propriétaire** | `admin@smartpme.cd` | `Admin@2026!` |
| **Gérant / Manager** | `manager@smartpme.cd` | `Manager@2026!` |
| **Comptable** | `comptable@smartpme.cd` | `Comptable@2026!` |
| **Caissier** | `caissier@smartpme.cd` | `Caissier@2026!` |

---

## 📚 Documentation Académique

Le mémoire technique complet est disponible sous :
👉 [`docs/MEMOIRE_SMART_PME_FINANCE.md`](docs/MEMOIRE_SMART_PME_FINANCE.md)
