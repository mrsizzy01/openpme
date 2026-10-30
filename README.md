# Smart PME Finance

Plateforme de gestion commerciale et financière des PME en RDC : ventes, facturation, stocks, trésorerie, supervision et détection d'anomalies.

## Architecture

- **API** : NestJS 11, TypeScript, Prisma, PostgreSQL, JWT, Swagger et contrôle RBAC.
- **Web** : React 18, TypeScript, Vite et `@smart-pme/shared`.
- **Desktop Windows** : client natif Python/PyQt6 + QtWebEngine qui affiche l'application web. Le dépôt ne contient pas d'application Electron.
- **Monorepo** : packages npm workspaces.

## Démarrage local

### 1. Configurer l'environnement

Copiez `.env.example` vers `.env`, configurez PostgreSQL et définissez un secret JWT aléatoire d'au moins 32 caractères. Ne partagez jamais `.env`.

Sous PowerShell :

```powershell
Copy-Item .env.example .env
$secret = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
(Get-Content .env) -replace '^JWT_SECRET=.*$', "JWT_SECRET=$secret" | Set-Content .env
```

Le compte PostgreSQL et la base indiqués par `DATABASE_URL` doivent déjà exister. Pour Docker Compose, renseignez aussi les variables `POSTGRES_*` et utilisez un secret JWT différent.

### 2. Installer et initialiser

```powershell
npm ci
npm run build:shared
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Le seed contient des comptes de démonstration **réservés au développement local**; il refuse l'environnement production. Les mots de passe sont générés aléatoirement et affichés dans le terminal au moment du seed. Aucun mot de passe de démonstration n'est publié dans la documentation.

Pour une base existante déjà créée avant l'ajout des migrations, sauvegardez-la, marquez le baseline déjà présent comme appliqué (`npx prisma migrate resolve --applied 20261029000000_init`), puis lancez `npm run prisma:migrate` pour appliquer toutes les migrations en attente, notamment celles des sessions et des terminaux distants. Ne marquez le baseline qu'après avoir vérifié que la base correspond au schéma existant.

### Devises et caisse

Les prix produits ont une devise de référence (CDF ou USD). Le taux USD/CDF est enregistré par entreprise et par jour; chaque vente, paiement et dépense conserve le taux appliqué afin que les rapports ne changent pas rétroactivement. Les calculs de montant sont effectués avec des décimales, avec arrondi CDF à l’unité et USD au centime.

Une vente peut être facturée en CDF ou USD et réglée en espèces dans l’une ou les deux devises. Pour chaque devise remise en espèces, le caissier doit avoir sa propre session ouverte; un rendu de monnaie est enregistré comme sortie de la session CDF. Les dépenses payées en espèces sont également enregistrées comme sorties de la session correspondante. Le tableau de bord permet de choisir la devise d’affichage.

### Dossier Banque

Depuis le tableau de bord, un gérant, propriétaire, comptable ou auditeur peut télécharger un dossier PDF couvrant les 6 ou 12 derniers mois. Le document présente séparément les montants CDF et USD, les ventes hors TVA, les marges brutes disponibles, les encaissements, les dépenses, le flux net, les écarts de caisse et la régularité des paiements. Il porte le logo bouclier-coche Smart PME Finance et la mention « généré par Smart PME Finance ».

Les marges utilisent le coût d’achat conservé lors de chaque vente. Les ventes antérieures à la migration ou les prestations sans coût enregistré restent incluses dans les ventes, mais leur marge est indiquée comme indisponible plutôt que devinée. Après mise à jour, appliquez la migration avant d’utiliser le rapport :

```powershell
npm run prisma:generate
npm run prisma:migrate
```

Après récupération des changements, appliquez les migrations avant de redémarrer l’API :

```powershell
npm run prisma:generate
npm run prisma:migrate
npm test
```

### 3. Démarrer les services

Dans des terminaux distincts :

```powershell
npm run dev:api
npm run dev:web
```

- Web : <http://localhost:5173>
- API : <http://localhost:3001/api/v1>
- Swagger : <http://localhost:3001/api/docs>

Le client desktop Windows est lancé avec `npm run dev:desktop` ou `LANCER_DESKTOP.bat`. Il nécessite Python et les dépendances PyQt6/QtWebEngine.

### Contrôle distant des postes desktop

Le verrouillage repose sur l'état persistant en base de données (par entreprise), et non sur la mémoire du serveur. Le heartbeat utilise un jeton de terminal distinct, haché côté API et conservé sous DPAPI dans le profil Windows. Chaque verrouillage/déverrouillage est audité et reste en attente jusqu'à l'accusé du poste. Les actions effectuées dans le desktop sont également refusées par l'API pendant le verrouillage.

1. Définissez `DESKTOP_ENROLLMENT_SECRET` dans `.env` avec une valeur aléatoire forte, puis redémarrez l'API.
2. Dans le terminal PowerShell servant à lancer le desktop, indiquez l'identifiant exact de l'entreprise et le même secret d'enrôlement :

```powershell
$env:ORGANIZATION_ID = "<identifiant-de-l-entreprise>"
$env:DESKTOP_ENROLLMENT_SECRET = "<même-secret-que-dans-.env>"
$env:DESKTOP_DISPLAY_NAME = "Caisse principale"
$env:DESKTOP_HEARTBEAT_SECONDS = "15"
npm run dev:desktop
```

Le premier lancement enrôle le poste; son jeton est ensuite stocké chiffré par DPAPI. Le client démarre automatiquement à l'ouverture de session Windows, reste dans la zone de notification quand sa fenêtre est fermée et vérifie le serveur toutes les 10 à 30 secondes (15 secondes par défaut). Le délai de grâce hors ligne est de 24 heures par défaut; `DESKTOP_OFFLINE_GRACE_HOURS` peut être défini sur le poste, de 0 à 168 heures. Le heartbeat conserve l'état verrouillé même si le réseau est coupé et déverrouille le poste dès qu'il reçoit le nouvel état actif.

Les anciennes bases doivent appliquer les migrations avant le démarrage de l'API :

```powershell
npm run prisma:generate
npm run prisma:migrate
```

Une application locale ne peut pas empêcher un administrateur Windows de tuer son processus, restaurer le système ou modifier le poste. La protection de référence reste côté serveur (refus des sessions/API du terminal verrouillé ou révoqué); DPAPI protège les données locales contre une modification non privilégiée, pas contre l'administrateur local.

## Authentification et sessions

Les mots de passe sont hachés avec bcrypt; les anciens hachages de développement sont mis à niveau au prochain login réussi. Les jetons d'accès expirent après 15 minutes et restent en mémoire côté web. Un jeton de renouvellement rotatif est placé dans un cookie HttpOnly et la session est suivie côté serveur. Les managers voient l'état « en ligne » et le nombre de sessions actives dans la gestion d'équipe.

Les comptes propriétaire et super-admin sont protégés. Un mot de passe existant n'est jamais consultable; un manager peut générer un mot de passe temporaire aléatoire affiché une seule fois.

## Validation

```powershell
npm run build:shared
npm run build:api
npm run build:web
npm test
```

## Documentation académique

Le mémoire se trouve dans [`docs/MEMOIRE_SMART_PME_FINANCE.md`](docs/MEMOIRE_SMART_PME_FINANCE.md).
