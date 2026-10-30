# RÉPUBLIQUE DÉMOCRATIQUE DU CONGO
## ENSEIGNEMENT SUPÉRIEUR ET UNIVERSITAIRE
### FACULTÉ DES SCIENCES ET TECHNOLOGIES / DÉPARTEMENT DE MATHÉMATIQUES ET INFORMATIQUE

---

<br/>

# 🎓 MÉMOIRE DE FIN D'ÉTUDES DE LICENCE (BAC +3)
### Filière : Génie Logiciel & Systèmes d'Information

<br/>

## **CONCEPTION ET RÉALISATION D'UNE PLATEFORME INTÉGRÉE DE GESTION COMMERCIALE ET FINANCIÈRE DES PME AVEC DÉTECTION INTELLIGENTE DES ANOMALIES ET SUPERVISION À DISTANCE**
### *Cas d'application : Smart PME Finance (Kinshasa / RDC)*

<br/>

---

**Présenté par :** 
**Candidat Finaliste au grade de Licencié en Sciences Informatiques**

**Directeur de Mémoire :**
**Professeur Docteur en Informatique / Génie Logiciel**

**Codirecteur :**
**Chef de Travaux / Ingénieur Civil en Informatique**

---

### **ANNÉE ACADÉMIQUE 2025 – 2026**

<div style="page-break-after: always;"></div>

---

## ÉPIGRAPHE

> *"Les systèmes d'information ne valent que par la fidélité avec laquelle ils traduisent la réalité du terrain et la vigilance avec laquelle ils protègent la valeur créée contre les faiblesses humaines et organisationnelles."*
> 
> — **Bertrand Meyer**, *Object-Oriented Software Construction*

<div style="page-break-after: always;"></div>

---

## DÉDICACE

À l'Éternel Dieu Tout-Puissant, source infinie de toute sagesse, de toute intelligence et de toute persévérance, qui m'a accordé la santé, la lucidité et la grâce d'accomplir ce cursus universitaire ;

À mes très chers parents, pour leurs sacrifices inestimables, leur amour inconditionnel, leurs prières constantes et leur investissement sans faille dans mon éducation ;

À mes frères, sœurs, compagnons de promotion et amis, qui ont partagé mes moments de labeur, de doute et de triomphe intellectuel ;

À tous les entrepreneurs, gérants et artisans des Petites et Moyennes Entreprises de la République Démocratique du Congo, qui bâtissent quotidiennement notre économie avec résilience et courage face aux défis opérationnels ;

*Je dédie affectueusement ce travail.*

<div style="page-break-after: always;"></div>

---

## REMERCIEMENTS

Au terme de ce travail de fin de cycle de Licence en Sciences Informatiques, nous tenons à exprimer notre profonde gratitude à tous ceux qui ont contribué de près ou de loin à son aboutissement fructueux.

Nos remerciements s'adressent particulièrement :

1. **Aux autorités académiques et au corps professoral** du Département d'Informatique, pour la rigueur scientifique, l'excellence de l'enseignement dispensé et le sens du devoir transmis tout au long de notre parcours académique.
2. **À notre Directeur de mémoire et notre Codirecteur**, pour leur encadrement minutieux, leur disponibilité permanente, leurs critiques constructives et leurs orientations méthodologiques déterminantes qui ont permis de donner une haute valeur scientifique à cette recherche.
3. **Aux dirigeants et comptables des PME de Kinshasa** qui ont généreusement accepté de nous ouvrir leurs portes, de répondre à nos questionnaires et de nous faire part de leurs difficultés quotidiennes de gestion, nous offrant ainsi une vision précise et authentique des réalités du terrain.
4. **À l'ensemble de nos collègues étudiants et amis** de la promotion pour la solidarité intellectuelle, l'esprit d'émulation et l'entraide constante durant les sessions d'études et de programmation.

Que tous trouvent ici l'expression de notre sincère et profonde reconnaissance.

<div style="page-break-after: always;"></div>

---

## RÉSUMÉ

En République Démocratique du Congo (RDC), les Petites et Moyennes Entreprises (PME) représentent l'épine dorsale de l'économie formelle et informelle, générant l'essentiel des emplois urbains. Néanmoins, leur pérennité est lourdement compromise par des contraintes structurelles majeures : un environnement bimonétaire marqué par la cohabitation quotidienne du Franc Congolais (CDF) et du Dollar Américain (USD), des variations de change permanentes, des méthodes de gestion archaïques basées sur des registres papier ou des tableurs vulnérables, ainsi que des pertes financières considérables consécutives aux fraudes internes, aux erreurs de caisse et aux remises non autorisées.

La présente recherche aborde cette problématique par la conception et la mise en œuvre d'une solution logicielle intégrée nommée **Smart PME Finance**. Structurée selon une architecture modulaire N-Tiers, la plateforme conjugue :
1. Une **API Centrale NestJS** sécurisée sous protocole JWT et contrôle d'accès basé sur les rôles (RBAC) garantissant une isolation multi-entreprises stricte ;
2. Une **base de données relationnelle PostgreSQL 17** sous **Prisma ORM** assurant l'intégrité transactionnelle ACID et l'historisation des taux de change ;
3. Une **application Web interactive React / Vite** dotée d'une ergonomie moderne adaptée aux postes tactiles et d'un visualiseur de factures conforme à la réglementation fiscale congolaise (NIF, RCCM, TVA 16%) ;
4. Un **client Desktop autonome Windows développé en PyQt6** doté d'un moteur de synchronisation hors-ligne local (IndexedDB / SQLite) et d'un support d'impression ticket de caisse direct ;
5. Un **moteur déterministe d'inspection intelligente des anomalies** capable de déceler instantanément les écarts de caisse, les ruptures de stock, les remises suspectes et les décaissements atypiques.

Les tests de validation conduits sur des jeux de données d'entreprises congolaises démontrent une élimination totale des risques de perte de données, une réduction de plus de 85% du temps consacré à la clôture journalière des caisses et une traçabilité intégrale de chaque flux monétaire.

**Mots-clés :** *Système d'Information, PME, RDC, Multi-devises (CDF/USD), Détection d'Anomalies, NestJS, React, PostgreSQL, PyQt6, Architecture N-Tiers, RBAC, Trésorerie.*

<div style="page-break-after: always;"></div>

---

## ABSTRACT

In the Democratic Republic of Congo (DRC), Small and Medium-sized Enterprises (SMEs) form the backbone of the national economic landscape, accounting for the vast majority of urban employment. However, their operational efficiency and survival are critically hindered by systemic obstacles: a persistent dual-currency reality with the daily coexistence of the Congolese Franc (CDF) and US Dollar (USD), volatile foreign exchange fluctuations, fragmented record-keeping reliant on paper ledgers or easily falsified spreadsheets, and recurrent financial leakage resulting from cashier discrepancies, undocumented expenses, and unauthorized sales discounts.

This academic thesis tackles this core problem through the design, implementation, and deployment of an integrated enterprise software solution named **Smart PME Finance**. Built upon an enterprise-grade N-Tier decoupled architecture, the system combines:
1. A robust **NestJS Core REST API** featuring JWT authentication, granular Role-Based Access Control (RBAC), and strict multi-tenant isolation;
2. A high-performance **PostgreSQL 17 relational database** managed via **Prisma ORM**, ensuring strict ACID transaction guarantees and auditability;
3. A responsive **React / Vite Web Single Page Application** featuring an intuitive POS register and compliant commercial invoicing (incorporating VAT 16%, Tax Identification Number NIF, Trade Registry RCCM, and National ID);
4. A native **Windows Desktop Client developed using PyQt6**, providing local offline queuing mechanisms and high-speed local thermal receipt printing;
5. An **explainable intelligent anomaly detection engine** capable of pinpointing cashier balancing errors, inventory stockouts, anomalous discounts, and unapproved abnormal expenditures in real time.

Rigorous evaluation using real-world Congolese SME business simulations confirmed complete data safety, over 85% time savings during daily cash drawer reconciliation, and comprehensive end-to-end traceability of operational and financial cash flows.

**Keywords:** *Information Systems, SMEs, DRC, Dual-Currency (CDF/USD), Anomaly Detection, NestJS, React, PostgreSQL, PyQt6, N-Tier Architecture, RBAC, Financial Reconciliation.*

<div style="page-break-after: always;"></div>

---

## LISTE DES SIGLES ET ABBRÉVIATIONS

| Sigle | Signification |
|---|---|
| **ACID** | Atomicity, Consistency, Isolation, Durability (Atomicité, Cohérence, Isolation, Durabilité) |
| **API** | Application Programming Interface (Interface de Programmation d'Application) |
| **BCC** | Banque Centrale du Congo |
| **CDF** | Franc Congolais (Code ISO 4217) |
| **CRUD** | Create, Read, Update, Delete |
| **CSS** | Cascading Style Sheets |
| **DDL** | Data Definition Language |
| **DGI** | Direction Générale des Impôts (RDC) |
| **DTO** | Data Transfer Object |
| **ERP** | Enterprise Resource Planning (Progiciel de Gestion Intégré) |
| **HTML** | HyperText Markup Language |
| **HTTP / HTTPS**| HyperText Transfer Protocol (Secure) |
| **ID NAT** | Numéro d'Identification Nationale |
| **JSON** | JavaScript Object Notation |
| **JWT** | JSON Web Token |
| **MCD** | Modèle Conceptuel des Données (Méthode Merise) |
| **MLD** | Modèle Logique des Données |
| **MPD** | Modèle Physique des Données |
| **NIF** | Numéro d'Impôt / Numéro d'Identification Fiscale |
| **OHADA** | Organisation pour l'Harmonisation en Afrique du Droit des Affaires |
| **ORM** | Object-Relational Mapping |
| **PME** | Petite et Moyenne Entreprise |
| **POS** | Point of Sale (Point de Vente / Caisse Comptoir) |
| **RBAC** | Role-Based Access Control (Contrôle d'Accès Basé sur les Rôles) |
| **RCCM** | Registre du Commerce et du Crédit Mobilier |
| **RDC** | République Démocratique du Congo |
| **REST** | Representational State Transfer |
| **SPA** | Single Page Application |
| **SQL** | Structured Query Language |
| **TVA** | Taxe sur la Valeur Ajoutée (16% en RDC) |
| **UML** | Unified Modeling Language |
| **USD** | United States Dollar (Dollar Américain) |
| **UUID** | Universally Unique Identifier |

<div style="page-break-after: always;"></div>

---

## TABLE DES MATIÈRES

- [ÉPIGRAPHE](#épigraphe)
- [DÉDICACE](#dédicace)
- [REMERCIEMENTS](#remerciements)
- [RÉSUMÉ](#résumé)
- [ABSTRACT](#abstract)
- [LISTE DES SIGLES ET ABBRÉVIATIONS](#liste-des-sigles-et-abbréviations)
- [INTRODUCTION GÉNÉRALE](#introduction-générale)
  - [0.1. État de la question](#01-état-de-la-question)
  - [0.2. Problématique](#02-problématique)
  - [0.3. Hypothèses de recherche](#03-hypothèses-de-recherche)
  - [0.4. Objectifs poursuivis](#04-objectifs-poursuivis)
  - [0.5. Choix et intérêt du sujet](#05-choix-et-intérêt-du-sujet)
  - [0.6. Délimitation spatio-temporelle](#06-délimitation-spatio-temporelle)
  - [0.7. Méthodes et techniques utilisées](#07-méthodes-et-techniques-utilisées)
  - [0.8. Subdivision du travail](#08-subdivision-du-travail)
- [CHAPITRE I : CADRE CONCEPTUEL ET REVUE DE LA LITTÉRATURE](#chapitre-i--cadre-conceptuel-et-revue-de-la-littérature)
  - [1.1. Définition des concepts fondamentaux](#11-définition-des-concepts-fondamentaux)
  - [1.2. Contexte économique, bancaire et fiscal des PME en RDC](#12-contexte-économique-bancaire-et-fiscal-des-pme-en-rdc)
  - [1.3. Typologie des risques de gestion et coulages financiers](#13-typologie-des-risques-de-gestion-et-coulages-financiers)
  - [1.4. État de l'art technologique](#14-état-de-lart-technologique)
- [CHAPITRE II : ANALYSE PRÉALABLE ET ÉTUDE DE L'EXISTANT](#chapitre-ii--analyse-préalable-et-étude-de-lexistant)
  - [2.1. Présentation du cadre d'étude](#21-présentation-du-cadre-détude)
  - [2.2. Description et analyse des processus actuels](#22-description-et-analyse-des-processus-actuels)
  - [2.3. Diagnostic critique de l'existant (Matrice SWOT)](#23-diagnostic-critique-de-lexistant-matrice-swot)
  - [2.4. Spécification fonctionnelle et exigences de la solution cible](#24-spécification-fonctionnelle-et-exigences-de-la-solution-cible)
- [CHAPITRE III : MODÉLISATION DU SYSTÈME (UML ET MERISE)](#chapitre-iii--modélisation-du-système-uml-et-merise)
  - [3.1. Modélisation fonctionnelle et comportementale (UML)](#31-modélisation-fonctionnelle-et-comportementale-uml)
    - [3.1.1. Diagramme global des cas d'utilisation](#311-diagramme-global-des-cas-dutilisation)
    - [3.1.2. Diagrammes de séquence dynamiques](#312-diagrammes-de-séquence-dynamiques)
    - [3.1.3. Diagramme d'activités : Cycle de vente et caisse](#313-diagramme-dactivités--cycle-de-vente-et-caisse)
  - [3.2. Modélisation conceptuelle, logique et physique des données](#32-modélisation-conceptuelle-logique-et-physique-des-données)
    - [3.2.1. Règles de gestion des données](#321-règles-de-gestion-des-données)
    - [3.2.2. Modèle Conceptuel des Données (MCD)](#322-modèle-conceptuel-des-données-mcd)
    - [3.2.3. Modèle Logique des Données (MLD)](#323-modèle-logique-des-données-mld)
    - [3.2.4. Dictionnaire des données exhaustif](#324-dictionnaire-des-données-exhaustif)
- [CHAPITRE IV : ARCHITECTURE LOGICIELLE ET MOTEUR INTELLIGENT](#chapitre-iv--architecture-logicielle-et-moteur-intelligent)
  - [4.1. Architecture globale N-Tiers distribuée](#41-architecture-globale-n-tiers-distribuée)
  - [4.2. Sécurité, authentification et matrice RBAC](#42-sécurité-authentification-et-matrice-rbac)
  - [4.3. Gestion multi-devises et intégrité transactionnelle ACID](#43-gestion-multi-devises-et-intégrité-transactionnelle-acid)
  - [4.4. Spécification formelle du moteur de détection d'anomalies](#44-spécification-formelle-du-moteur-de-détection-danomalies)
- [CHAPITRE V : IMPLÉMENTATION, EXPÉRIMENTATION ET RÉSULTATS](#chapitre-v--implémentation-expérimentation-et-résultats)
  - [5.1. Environnement de développement et outillage](#51-environnement-de-développement-et-outillage)
  - [5.2. Présentation détaillée des interfaces et flux utilisateurs](#52-présentation-détaillée-des-interfaces-et-flux-utilisateurs)
  - [5.3. Déploiement desktop autonome et synchronisation hors-ligne](#53-déploiement-desktop-autonome-et-synchronisation-hors-ligne)
  - [5.4. Évaluation, tests de validation et analyse des performances](#54-évaluation-tests-de-validation-et-analyse-des-performances)
- [CONCLUSION GÉNÉRALE ET PERSPECTIVES](#conclusion-générale-et-perspectives)
  - [Bilan des réalisations](#bilan-des-réalisations)
  - [Difficultés rencontrées](#difficultés-rencontrées)
  - [Perspectives d'avenir](#perspectives-davenir)
- [BIBLIOGRAPHIE ET WEBOGRAPHIE](#bibliographie-et-webographie)
- [ANNEXES](#annexes)

<div style="page-break-after: always;"></div>

---

# INTRODUCTION GÉNÉRALE

## 0.1. État de la question

L'informatisation des processus de gestion commerciale et financière a fait l'objet de nombreuses investigations scientifiques et industrielles au cours de la dernière décennie. Sur la scène internationale, des solutions d'envergure telles que **SAP**, **Microsoft Dynamics 365**, **Oracle NetSuite** ou **Odoo** dominent le marché des progiciels de gestion intégrés (ERP). Cependant, une analyse critique de leur applicabilité dans le tissu économique congolais et subsaharien révèle de profondes divergences :

1. **La lourdeur des modèles de coûts et licences :** Les ERP propriétaires imposent des redevances par utilisateur prohibitives pour les PME locales (fréquemment plusieurs centaines de dollars mensuels), ainsi que des frais d'implémentation et de formation exorbitants.
2. **L'inadéquation structurelle au bimonétarisme congolais :** La quasi-totalité des progiciels occidentaux présuppose une monnaie fonctionnelle stable avec des taux de change fixes périodiques. En RDC, la pratique quotidienne exige de pouvoir facturer en USD et d'encaisser en CDF (ou vice-versa) avec conversion instantanée au taux du jour fixé par l'entreprise tout en respectant les mercuriales de la Banque Centrale du Congo (BCC).
3. **L'inadaptation aux coupures d'infrastructure :** Les applications SaaS hébergées exclusivement dans le Cloud deviennent totalement inopérantes lors des coupures fréquentes de fibre optique ou d'électricité à Kinshasa et dans les provinces, immobilisant ainsi la caisse comptoir.
4. **L'absence d'outils proactifs d'audit interne :** Les logiciels standards enregistrent passivement les flux sans évaluer la cohérence immédiate des actes posés (remises abusives, variations de caisse, anomalies d'inventaire).

Sur le plan académique local, plusieurs travaux ont abordé l'informatisation des PME congolaises. Citons notamment les recherches de *Mbuyi et al. (2022)* sur *"L'impact de l'informatisation de la gestion des stocks dans les entreprises commerciales de Kinshasa"*, qui concluaient sur la persistance des coulages financiers en l'absence de corrélation directe et temps réel entre l'encaissement de caisse et la décrémentation des dépôts. De même, *Kabasele (2023)* a mis en lumière dans *"La problématique de la gestion multi-devises en milieu commercial congolais"* la source continue d'erreurs comptables découlant de la saisie manuelle différée des taux journaliers.

Notre travail se démarque fondamentalement de ces réalisations antérieures en proposant non pas un simple module isolé de facturation ou de stock, mais une **plateforme intégrée hybride (Web & Windows Desktop autonome)**, conçue spécifiquement pour la réglementation congolaise, conjuguant la gestion multi-devises temps réel, la résilience hors-ligne et un **moteur déterministe d'inspection intelligente des anomalies de gestion**.

---

## 0.2. Problématique

Les PME de la République Démocratique du Congo évoluent au sein d'un environnement caractérisé par une forte incertitude économique et opérationnelle :
- **Un bimonétarisme contraignant :** La double circulation permanente du Franc Congolais (CDF) et du Dollar Américain (USD) oblige les gérants à recalculer constamment leurs prix, marges et soldes. Une transaction initiée en devise étrangère peut être acquittée en monnaie nationale avec rendu de monnaie fractionné.
- **Le coulage financier chronique :** Les écarts de caisse constatés en fin de journée (déficits non justifiés), les remises commerciales complaisantes accordées à des clients sans autorisation formelle du propriétaire, ainsi que les sorties de caisse pour dépenses informelles constituent la cause principale de faillite précoce des PME kinoises.
- **La fracture numérique et énergétique :** L'instabilité de la connexion Internet et les délestages électriques empêchent l'adoption d'outils 100% connectés au cloud pour la caisse de comptoir, exigeant un fonctionnement local pérenne sans blocage de l'activité commerciale.
- **La gestion manuelle chronophage :** Le recours aux reçus papier et aux registres physiques empêche les propriétaires, souvent mobiles ou absents de la boutique, d'obtenir une supervision consolidée et instantanée de leurs affaires.

Dès lors, la question centrale de notre recherche se formule ainsi :

> **« Comment concevoir et déployer une plateforme logicielle intégrée, multi-plateforme (Web et Desktop Windows), capable de centraliser les flux commerciaux et financiers d'une PME congolaise, tout en garantissant la résilience hors-ligne, l'exactitude de la double conversion CDF/USD, la stricte conformité fiscale et la détection intelligente des anomalies de gestion ? »**

De cette question principale découlent les interrogations secondaires suivantes :
1. Quels modèles conceptuels de données et d'architecture permettent de garantir l'atomicité transactionnelle (ACID) entre la vente au comptoir, l'enregistrement en caisse et le déstockage physique ?
2. Quels algorithmes déterministes et explicables peuvent être formalisés pour scanner en continu les opérations et alerter la direction sur les remises excessives, les déficits de caisse et les ruptures critiques de stock ?
3. Comment assurer la continuité des encaissements en cas de rupture de connectivité Internet sur le poste de travail tout en garantissant la synchronisation ascendante sans conflit dès le rétablissement de la liaison ?

---

## 0.3. Hypothèses de recherche

Pour répondre à cette problématique, nous formulons les hypothèses suivantes :

1. **Hypothèse 1 (Intégration et intégrité) :** La mise en place d'une architecture N-Tiers découplée, articulée autour d'une API REST NestJS et d'une base relationnelle PostgreSQL gérée par Prisma ORM, permettrait de garantir l'isolation stricte des données et l'atomicité des transactions financières et commerciales.
2. **Hypothèse 2 (Détection et conformité) :** L'intégration d'un moteur d'inspection exploitant des règles métier explicables (Explainable AI déterministe) permettrait de détecter en temps réel les fraudes et coulages de trésorerie (écarts de caisse, remises abusives, décaissements non plafonnés) et de fournir des preuves auditables aux gestionnaires.
3. **Hypothèse 3 (Résilience et ergonomie locale) :** L'association d'une application Web responsive et d'un client autonome Windows en PyQt6 avec moteur de persistance locale temporaire permettrait d'assurer la continuité des ventes et l'impression thermique instantanée même en cas de coupure réseau, éliminant ainsi le recours aux registres papier.

---

## 0.4. Objectifs poursuivis

### 0.4.1. Objectif Général
Concevoir, implémenter et valider une plateforme intégrée de gestion commerciale et financière pour les PME en RDC, munie d'une supervision à distance temps réel et d'un moteur de détection intelligente des anomalies de gestion.

### 0.4.2. Objectifs Spécifiques
Pour concrétiser cet objectif général, notre étude vise à :
1. Réaliser une étude approfondie de l'écosystème de gestion des PME en RDC et modéliser les processus via les méthodes **Merise** et **UML** ;
2. Développer un backend robuste sous **NestJS** exposant une API RESTful versionnée, sécurisée par jetons **JWT** et contrôle d'accès granulaire **RBAC** (7 rôles distincts) ;
3. Structurer la persistance sous **PostgreSQL 17** avec isolation multi-entreprises et gestion dynamique de la double devise (CDF/USD) ;
4. Créer une interface utilisateur moderne et réactive sous **React 18 / Vite** respectant les standards d'accessibilité et de glassmorphism ;
5. Développer un client natif de bureau Windows sous **PyQt6** assurant le fonctionnement local, l'impression directe des factures et reçus, et le cache hors-ligne ;
6. Concevoir et implémenter le **moteur de détection d'anomalies**, capable d'identifier les écarts de caisse, les ruptures de stock, les marges négatives et les remises suspectes ;
7. Rédiger les procédures d'installation, de sauvegarde automatisée de la base de données et de compilation de l'exécutable autonome `.exe`.

---

## 0.5. Choix et intérêt du sujet

Le choix de cette thématique repose sur une triple motivation :

- **Intérêt personnel et professionnel :** En tant que futur ingénieur logiciel, ce projet constitue une opportunité d'appliquer les méthodologies avancées d'ingénierie logicielle (architecture microservices/N-Tiers, DevOps, typage statique TypeScript, frameworks récents) à la résolution d'un problème concret et complexe.
- **Intérêt académique et scientifique :** Ce travail enrichit la littérature informatique en formalisant un patron d'architecture logicielle alliant persistance relationnelle stricte, synchronisation asynchrone hors-ligne et moteur déterministe de surveillance des anomalies pour les marchés émergents.
- **Intérêt socio-économique :** En dotant les PME congolaises d'un outil moderne, abordable et parfaitement adapté à leur cadre fiscal et monétaire, ce système contribue directement à la réduction des faillites, à la bancarisation progressive et à la transparence financière nécessaire à l'accès au crédit.

---

## 0.6. Délimitation spatio-temporelle

- **Délimitation spatiale :** Le modèle a été conçu et calibré pour les PME opérant sur le territoire de la République Démocratique du Congo, en prenant comme champ d'expérimentation des entreprises commerciales et prestataires de services implantées dans la ville-province de Kinshasa (communes de la Gombe, Limete et Kasa-Vubu).
- **Délimitation temporelle :** Les observations empiriques, les relevés de taux de change et l'implémentation logicielle couvrent la période académique allant d'octobre 2024 à octobre 2026.

---

## 0.7. Méthodes et techniques utilisées

### 0.7.1. Méthodes scientifiques
1. **La méthode analytique :** A permis de décomposer le fonctionnement global d'une PME en sous-systèmes fonctionnels (ventes, achats, trésorerie, stock, RH) afin d'en saisir les interactions critiques.
2. **La méthode Merise :** Utilisée pour la formalisation rigoureuse des données (MCD, MLD, MPD) et des règles d'intégrité relationnelles.
3. **Le langage UML (Unified Modeling Language) :** Utilisé pour la modélisation objet, la capture des besoins fonctionnels par les diagrammes de cas d'utilisation, et la dynamique des traitements par les diagrammes de séquence et d'activités.
4. **La méthode Agile (Scrum/Kanban) :** Adoptée pour le cycle de vie du projet logiciel, favorisant des itérations courtes avec tests continus des composants.

### 0.7.2. Techniques de collecte et d'investigation
- **La technique documentaire :** Consultation d'ouvrages spécialisés, de mémoires académiques, de codes de commerce (OHADA) et des bulletins de la Banque Centrale du Congo.
- **L'interview semi-directive :** Entretiens menés auprès de gérants de boutiques, caissiers et experts-comptables de la place kinoise pour identifier les points de fuite financière.
- **L'observation directe participante :** Immersion au sein de points de vente pour observer le rythme des encaissements aux heures de pointe et les manipulations de caisse.

---

## 0.8. Subdivision du travail

Hormis l'introduction générale et la conclusion générale, le présent mémoire est articulé autour de cinq chapitres :

- **Chapitre I : Cadre conceptuel et revue de la littérature** – Définition des concepts opératoires, exposé du contexte économique et fiscal en RDC et état de l'art technologique.
- **Chapitre II : Analyse préalable et étude de l'existant** – Étude du cas pratique, modélisation des processus manuels, diagnostic SWOT et formulation du cahier des charges de la solution cible.
- **Chapitre III : Modélisation du système (UML et Merise)** – Élaboration des diagrammes de cas d'utilisation, de séquences, d'activités, du modèle conceptuel des données (MCD) et du dictionnaire exhaustif des données.
- **Chapitre IV : Architecture logicielle et moteur intelligent** – Présentation de l'architecture distribuée, des mécanismes de sécurité RBAC/JWT, de la gestion multi-devises et de la formalisation mathématique des règles du moteur d'anomalies.
- **Chapitre V : Implémentation, expérimentation et résultats** – Démonstration visuelle des interfaces développées, présentation des résultats de tests, déploiement desktop Windows et analyse des performances obtenues.

<div style="page-break-after: always;"></div>

---

# CHAPITRE I : CADRE CONCEPTUEL ET REVUE DE LA LITTÉRATURE

## 1.1. Définition des concepts fondamentaux

### 1.1.1. Système d'Information (SI)
Un système d'information est un ensemble organisé de ressources (matériels, logiciels, personnel, données, procédures) permettant de collecter, stocker, traiter et diffuser l'information nécessaire au fonctionnement et à la prise de décision au sein d'une organisation (*Reix et al., 2018*). Dans le cadre de notre projet, le SI doit être transactionnel, garantissant que chaque vente ou dépense modifie fidèlement l'état comptable de l'entreprise.

### 1.1.2. Petite et Moyenne Entreprise (PME)
Selon la législation congolaise (Loi n° 01/020 portant statut des PME en RDC), une PME est toute entité économique juridiquement autonome, dont l'effectif permanent se situe entre 5 et 100 salariés et dont le chiffre d'affaires annuel n'excède pas les seuils fixés par le Ministère des PME. Elles se caractérisent par une centralisation fréquente du pouvoir de décision entre les mains du promoteur et par des ressources d'encadrement limitées.

### 1.1.3. Progiciel de Gestion Intégré (ERP)
Un ERP (Enterprise Resource Planning) est une application modulaire unifiant les fonctions métier fondamentales (gestion commerciale, stocks, finance, paie) autour d'une base de données unique et cohérente. Notre solution emprunte les principes modulaires d'un ERP tout en allégeant son empreinte pour correspondre au gabarit d'une PME.

### 1.1.4. Point of Sale (POS) ou Caisse Enregistreuse
Le POS désigne le terminal physique et logiciel où le client s'acquitte du montant de ses achats. Il doit être doté d'une réactivité extrême (moins de 200 ms par scan d'article), d'une ergonomie simplifiée et d'un mécanisme de validation inviolable.

### 1.1.5. Détection d'anomalies (Anomaly Detection)
Discipline consistant à identifier des éléments, événements ou comportements qui ne se conforment pas au schéma attendu au sein d'un jeu de données (*Chandola et al., 2009*). Dans notre architecture, nous privilégions une approche **déterministe explicable** basée sur des règles métier et des seuils statistiques ajustables, éliminant l'effet « boîte noire » des réseaux de neurones opaques pour le chef d'entreprise.

---

## 1.2. Contexte économique, bancaire et fiscal des PME en RDC

### 1.2.1. Le bimonétarisme et la régulation de la Banque Centrale du Congo (BCC)
L'économie de la RDC est l'une des plus dollarisées au monde. Les dépôts bancaires et les transactions de valeur intermédiaire ou élevée s'effectuent majoritairement en Dollars Américains (USD), tandis que les dépenses courantes et le petit commerce s'appuient sur le Franc Congolais (CDF). La Banque Centrale du Congo publie un taux de change indicatif quotidien, mais le marché parallèle applique des taux négociés. Le système d'information doit par conséquent :
- Permettre la définition d'un taux de référence interne par PME ;
- Conserver l'historique de chaque transaction dans les deux devises avec le taux appliqué au moment précis de l'opération ;
- Autoriser les règlements mixtes (ex: acompte en USD, solde en CDF).

### 1.2.2. Le cadre fiscal congolais (DGI / DGRK)
Toute facture commerciale émise en RDC par une entreprise assujettie doit comporter des mentions obligatoires édictées par la Direction Générale des Impôts (DGI) :
- Le Numéro d'Identification Fiscale (**NIF**) ;
- Le Numéro du Registre du Commerce et du Crédit Mobilier (**RCCM**) ;
- Le Numéro d'Identification Nationale (**ID NAT**) ;
- Le taux de **Taxe sur la Valeur Ajoutée (TVA)** standard fixé à **16%** ;
- La désignation détaillée des biens et services vendus, le montant Hors Taxe (HT), le montant de la TVA et le Total Toutes Taxes Comprises (TTC).

---

## 1.3. Typologie des risques de gestion et coulages financiers

Les audits de terrain révèlent quatre vecteurs majeurs d'érosion des marges dans les PME :
1. **Les remises complaisantes :** Pratique courante où un vendeur accorde une remise substantielle à une connaissance sans que la marge brute minimale ne soit respectée.
2. **Le coulage physique de stock :** Sortie d'articles non consignée au terminal, fausses déclarations d'avaries ou décalage entre les réceptions fournisseurs et les entrées en magasin.
3. **Le déficit de caisse non compensé :** Lors de la clôture journalière, le montant total des espèces physically comptées dans le tiroir-caisse s'avère inférieur au cumul théorique calculé par les ventes enregistrées.
4. **La dépense de fonctionnement sans pièce justificative :** Décaissements anarchiques pour des motifs personnels ou des charges d'exploitation improvisées, non validées par un responsable habilité.

---

## 1.4. État de l'art technologique

Le choix technologique de notre solution a été guidé par des critères d'efficience, de maintenabilité et de modernité :

| Composant | Technologie Choisie | Justification Comparative |
|---|---|---|
| **Runtime Backend** | **Node.js v24 (LTS)** | Modèle événementiel asynchrone non-bloquant, ultra-rapide pour les I/O concurrentes des terminaux POS. |
| **Framework Serveur** | **NestJS 11** | Architecture modulaire d'entreprise fortement inspirée d'Angular, typage strict TypeScript, injection de dépendances et support natif OpenAPI Swagger. |
| **Persistance / ORM** | **PostgreSQL 17 + Prisma ORM 6** | Fiabilité relationnelle éprouvée, conformité ACID totale, requêtes typées à la compilation, migrations reproductibles et sécurité contre les injections SQL. |
| **Interface Web** | **React 18 + Vite 6** | Rendu ultra-rapide par Virtual DOM, écosystème de composants riche, bundle compact optimisé et grande réactivité sur écrans tactiles. |
| **Client Desktop** | **PyQt6 (Qt WebEngine)** | Moteur Chromium intégré natif C++, accès matériel bas niveau (ports série, imprimantes thermiques ESC/POS), absence de surconsommation mémoire comparativement à Electron lourd. |

<div style="page-break-after: always;"></div>

---

# CHAPITRE II : ANALYSE PRÉALABLE ET ÉTUDE DE L'EXISTANT

## 2.1. Présentation du cadre d'étude

Afin d'ancrer notre recherche dans une réalité opérationnelle tangible, nous avons sélectionné comme modèle d'étude une PME commerciale multiservices de Kinshasa : **« GLOBAL BUSINESS SOLUTIONS SARL »**, spécialisée dans la vente de matériel informatique, de consommables de bureau et la prestation de services de maintenance et de connectivité.

L'entreprise emploie 12 collaborateurs répartis comme suit :
- 1 Directeur Général / Associé gérant ;
- 1 Responsable Administratif et Financier (Comptable) ;
- 1 Gestionnaire de stock ;
- 3 Caissiers / Vendeurs au comptoir ;
- 4 Techniciens de maintenance ;
- 2 Agents de sécurité / logistique.

---

## 2.2. Description et analyse des processus actuels

### 2.2.1. Processus de vente et encaissement
Actuellement, lors de l'arrivée d'un client au comptoir :
1. Le vendeur note les articles sur un bordereau volant ou un bon de commande manuel ;
2. Le client se rend à la caisse physique avec ce bon ;
3. Le caissier saisit manuellement les montants sur une calculatrice de bureau, convertit mentalement les USD en CDF en appliquant un taux approximatif ;
4. Le caissier remplit un carnet de reçus à souche autocopiante, appose un cachet « PAYÉ » et remet l'exemplaire au client ;
5. En fin de journée, le caissier compte les billets physiques et reporte le total sur un cahier de caisse.

### 2.2.2. Processus de gestion de stock
Les entrées de marchandises sont consignées dans un grand livre de stock tenu par le magasinier. Les sorties sont supposées être reportées chaque soir à partir des souches de reçus de caisse. En pratique, ce recoupement n'est effectué qu'une fois par mois, entraînant des disparités majeures entre le stock théorique et le stock physique lors des inventaires trimestriels.

---

## 2.3. Diagnostic critique de l'existant (Matrice SWOT)

L'évaluation des forces, faiblesses, opportunités et menaces du système actuel se résume dans le tableau suivant :

```text
┌───────────────────────────────────────────────┬───────────────────────────────────────────────┐
│                  FORCES (S)                   │                FAIBLESSES (W)                 │
├───────────────────────────────────────────────┼───────────────────────────────────────────────┤
│ - Flexibilité immédiate des accords verbaux.  │ - Coulage financier récurrent (écarts caisse).│
│ - Faiblesse des coûts d'investissement        │ - Erreurs massives de calcul de change CDF/USD│
│   matériel initiaux (papier, stylos).         │ - Absence de contrôle sur les remises vendeurs│
│ - Simplicité apparente pour le personnel non  │ - Aucune visibilité pour le gérant à distance.│
│   initié à l'informatique.                    │ - Factures non conformes aux normes DGI/TVA.  │
├───────────────────────────────────────────────┼───────────────────────────────────────────────┤
│               OPPORTUNITÉS (O)                │                 MENACES (T)                   │
├───────────────────────────────────────────────┼───────────────────────────────────────────────┤
│ - Disponibilité de matériel informatique      │ - Redressements fiscaux pour non-tenue de     │
│   accessible (PC portables, imprimantes POS). │   factures normalisées avec mentions légales. │
│ - Généralisation de la connectivité 4G/Fibre. │ - Faillite progressive par érosion invisible  │
│ - Hausse de la bancarisation et Mobile Money. │   des marges brutes de vente.                 │
│ - Volonté d'expansion vers d'autres villes.   │ - Perte définitive des archives en cas d'eau  │
│                                               │   ou d'incendie dans les locaux.              │
└───────────────────────────────────────────────┴───────────────────────────────────────────────┘
```

---

## 2.4. Spécification fonctionnelle et exigences de la solution cible

Face à ces limites, la plateforme **Smart PME Finance** doit répondre aux exigences suivantes :

### 2.4.1. Exigences Fonctionnelles (EF)
- **EF01 - Gestion des Utilisateurs et Sécurité :** Authentification sécurisée, hachage des mots de passe en SHA-256/bcrypt, attribution stricte d'un rôle parmi 7 profils RBAC (`SUPER_ADMIN`, `ORG_OWNER`, `MANAGER`, `ACCOUNTANT`, `CASHIER`, `INVENTORY_MANAGER`, `AUDITOR`).
- **EF02 - Gestion Commerciale & Catalogue :** Enregistrement des produits et services, gestion des catégories, prix d'achat, prix de vente, seuil d'alerte de stock minimal.
- **EF03 - Terminal de Vente (POS) Ultra-Rapide :** Sélection d'articles par clic ou code-barres, application contrôlée des remises, sélection de la devise d'encaissement, validation atomique et génération instantanée du reçu.
- **EF04 - Facturation Proforma et Définitive :** Génération de factures normalisées avec calcul automatique de la TVA 16%, statut des règlements (`ISSUED`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`) et visualiseur d'impression officiel.
- **EF05 - Gestion de Trésorerie & Sessions de Caisse :** Ouverture obligatoire d'une session avec fond de caisse, enregistrement automatique de tous les encaissements, clôture avec comptage physique et calcul immédiat de l'écart.
- **EF06 - Moteur de Détection d'Anomalies :** Analyse en temps réel des transactions et création d'alertes hiérarchisées (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) avec workflow de résolution signé.
- **EF07 - Tableau de Bord Exécutif :** Indicateurs financiers consolidés (Chiffre d'affaires, Marge brute, Créances clients, Dettes fournisseurs, Solde disponible).

### 2.4.2. Exigences Non-Fonctionnelles (ENF)
- **ENF01 - Performance :** Temps de réponse moyen de l'API inférieur à 100 ms sur réseau local ; affichage du catalogue en moins de 500 ms.
- **ENF02 - Disponibilité & Résilience :** Fonctionnement autonome du poste de caisse en cas d'interruption temporaire d'Internet avec synchronisation dès reprise.
- **ENF03 - Intégrité et Traçabilité :** Enregistrement de chaque opération sensible dans un journal d'audit immuable (`audit_logs`).
- **ENF04 - Portabilité :** Compatibilité native Windows 10/11 pour le client Desktop et tous navigateurs modernes (Chrome, Edge, Firefox) pour le portail Web.

<div style="page-break-after: always;"></div>

---

# CHAPITRE III : MODÉLISATION DU SYSTÈME (UML ET MERISE)

## 3.1. Modélisation fonctionnelle et comportementale (UML)

### 3.1.1. Diagramme global des cas d'utilisation

Le diagramme ci-après synthétise les interactions entre les acteurs clés du système et les paquetages fonctionnels de Smart PME Finance :

```mermaid
flowchart LR
    subgraph Acteurs
        direction TB
        C[👤 Caissier]
        G[👤 Gestionnaire Stock]
        CPT[👤 Comptable]
        DIR[👔 Propriétaire / Gérant]
        ADM[🛡️ Super Admin]
    end

    subgraph "Smart PME Finance Platform"
        UC1([Ouvrir / Clôturer Caisse])
        UC2([Effectuer Vente Comptoir POS])
        UC3([Gérer Entrées / Sorties Stock])
        UC4([Établir Factures & Règlements])
        UC5([Enregistrer Dépenses])
        UC6([Consulter Journal Anomalies & Régulariser])
        UC7([Superviser Tableau de Bord Financier])
        UC8([Gérer Configuration & Taux Change])
    end

    C --> UC1
    C --> UC2
    G --> UC3
    CPT --> UC4
    CPT --> UC5
    CPT --> UC1
    DIR --> UC6
    DIR --> UC7
    DIR --> UC8
    ADM --> UC8
```

---

### 3.1.2. Diagrammes de séquence dynamiques

#### A. Scénario de vente au comptoir POS avec décrémentation atomique
Ce scénario décrit la succession temporelle des messages lors d'un encaissement :

```mermaid
sequenceDiagram
    autonumber
    actor Client
    actor Caissier
    participant POS as Terminal POS (Web/Desktop)
    participant API as API NestJS (SalesService)
    participant DB as PostgreSQL (Prisma Tx)

    Client->>Caissier: Présente les articles et choisit la devise (CDF/USD)
    Caissier->>POS: Ajoute articles au panier & saisit la remise éventuelle
    Caissier->>POS: Clique sur "Encaisser la vente"
    POS->>API: POST /api/v1/sales (items, customerId, paymentMethod, currency)
    activate API
    API->>DB: Démarrer Transaction ACID
    activate DB
    DB->>DB: Vérifier solde session de caisse active
    DB->>DB: Vérifier disponibilité des stocks physiques
    DB->>DB: Décrémenter stock (warehouse_stocks)
    DB->>DB: Créer mouvement traçable (stock_movements)
    DB->>DB: Créer enregistrement Vente & VenteItems (sales)
    DB->>DB: Créer Facture automatique & Paiement (invoices, payments)
    DB->>DB: Scanner règles anomalies (High Discount, Low Stock)
    DB-->>API: Valider Commit Transaction
    deactivate DB
    API-->>POS: HTTP 201 Created (SaleDTO + InvoiceID)
    deactivate API
    POS->>POS: Déclencher impression ticket / reçu thermique
    POS-->>Caissier: Reçu imprimé avec succès
    Caissier-->>Client: Remet la marchandise et le reçu fiscalisé
```

#### B. Scénario de clôture de caisse et détection d'écart
Ce processus illustre la détection instantanée d'un écart de trésorerie par le moteur d'inspection :

```mermaid
sequenceDiagram
    autonumber
    actor Caissier
    participant UI as Module Trésorerie
    participant API as CashSessionService
    participant Engine as AnomalyEngine
    participant DB as PostgreSQL

    Caissier->>UI: Déclenche "Clôturer la session de caisse"
    Caissier->>UI: Saisit le montant physiquement compté en espèces (ex: 450,000 CDF)
    UI->>API: POST /api/v1/cash-sessions/:id/close { countedBalance: 450000 }
    activate API
    API->>DB: Récupérer Fond Initial + Somme des encaissements espèces
    DB-->>API: Solde théorique calculé = 485,000 CDF
    API->>API: Écart = |450,000 - 485,000| = -35,000 CDF (Déficit)
    API->>Engine: Évaluer condition écart (Seuil configuré = 5,000 CDF)
    activate Engine
    Engine->>DB: Créer Alerte Anomalie HIGH (CASH_DISCREPANCY, -35,000 CDF)
    deactivate Engine
    API->>DB: Mettre à jour CashSession (status: CLOSED, difference: -35000)
    API-->>UI: HTTP 200 OK { message: "Caisse clôturée avec anomalie détectée" }
    deactivate API
    UI-->>Caissier: Notification visuelle d'écart transmise à la Direction
```

---

### 3.1.3. Diagramme d'activités : Cycle de vente et caisse

Le flux décisionnel garantit qu'aucune vente ne peut être validée si le tiroir-caisse n'a pas été préalablement ouvert pour la journée :

```mermaid
stateDiagram-v2
    [*] --> VérifierSessionCaisse
    VérifierSessionCaisse --> OuvrirSession : Aucune session ouverte
    OuvrirSession --> SaisirFondCaisse
    SaisirFondCaisse --> PrêtPourVente
    VérifierSessionCaisse --> PrêtPourVente : Session déjà active

    PrêtPourVente --> ComposerPanier
    ComposerPanier --> VérifierStockDisponible
    VérifierStockDisponible --> AlerteStockInsuffisant : Stock < Quantité
    AlerteStockInsuffisant --> ComposerPanier : Ajuster quantité
    VérifierStockDisponible --> SaisirRèglement : Stock suffisant

    SaisirRèglement --> CalculerMonnaieÀRendre
    CalculerMonnaieÀRendre --> EnregistrerTransactionACID
    EnregistrerTransactionACID --> ImprimerReçu
    ImprimerReçu --> AutreClient
    AutreClient --> ComposerPanier : Oui
    AutreClient --> ClôtureFinJournée : Non (Fin de service)
    ClôtureFinJournée --> CompterBilletsPhysiques
    CompterBilletsPhysiques --> ÉvaluerÉcart
    ÉvaluerÉcart --> [*]
```

---

## 3.2. Modélisation conceptuelle, logique et physique des données

### 3.2.1. Règles de gestion des données
1. **RG01 :** Une entreprise (`Organization`) possède un et un seul paramétrage financier (`OrganizationSettings`).
2. **RG02 :** Tout utilisateur (`User`) appartient obligatoirement à une entreprise et se voit attribuer un rôle unique au sein de celle-ci.
3. **RG03 :** Un produit (`Product`) appartient à une catégorie, possède une référence unique (code-barres/SKU), un prix d'achat, un prix de vente et un seuil d'alerte de stock.
4. **RG04 :** Une vente (`Sale`) comprend un ou plusieurs articles vendus (`SaleItem`), est liée à une session de caisse active (`CashSession`) et génère systématiquement une facture (`Invoice`).
5. **RG05 :** Un mouvement de stock (`StockMovement`) est généré à chaque entrée (achat fournisseur), sortie (vente au comptoir) ou ajustement manuel suite à un inventaire physique.
6. **RG06 :** Toute anomalie constatée (`AnomalyAlert`) conserve sa trace immuable jusqu'à sa régularisation signée par un gérant ou propriétaire.

---

### 3.2.2. Modèle Conceptuel des Données (MCD)

Le modèle entité-association est structuré comme suit :

```text
┌──────────────────────┐                  ┌────────────────────────┐
│     ORGANIZATION     │1,1 ───────── 1,1 │  ORGANIZATION_SETTINGS │
├──────────────────────┤  Possède         ├────────────────────────┤
│ id (PK)              │                  │ id (PK)                │
│ name, nif, rccm...   │                  │ defaultCurrency...     │
└──────────┬───────────┘                  └────────────────────────┘
           │
           │1,N
           │Appartient
           ▼
┌──────────────────────┐                  ┌────────────────────────┐
│        USERS         │1,N ───────── 0,N │     CASH_SESSIONS      │
├──────────────────────┤  Ouvre           ├────────────────────────┤
│ id (PK)              │                  │ id (PK)                │
│ email, password, role│                  │ openingBalance, status │
└──────────┬───────────┘                  └───────────┬────────────┘
           │                                          │
           │1,N                                       │1,N
           │Enregistre                                │Effectuée durant
           ▼                                          ▼
┌──────────────────────┐1,N ───────── 1,1 ┌────────────────────────┐
│        SALES         │  Se compose de   │       SALE_ITEMS       │
├──────────────────────┤                  ├────────────────────────┤
│ id (PK)              │                  │ id (PK)                │
│ totalAmount, currency│                  │ quantity, unitPrice... │
└──────────┬───────────┘                  └───────────┬────────────┘
           │                                          │
           │1,1 Correspond à                          │0,N Concerne
           ▼                                          ▼
┌──────────────────────┐                  ┌────────────────────────┐
│       INVOICES       │                  │        PRODUCTS        │
├──────────────────────┤                  ├────────────────────────┤
│ id (PK)              │                  │ id (PK)                │
│ invoiceNumber, status│                  │ name, sku, salePrice...│
└──────────┬───────────┘                  └───────────┬────────────┘
           │                                          │
           │1,N Reçoit                                │1,N Subit
           ▼                                          ▼
┌──────────────────────┐                  ┌────────────────────────┐
│       PAYMENTS       │                  │    STOCK_MOVEMENTS     │
├──────────────────────┤                  ├────────────────────────┤
│ id (PK)              │                  │ id (PK)                │
│ amount, paymentMethod│                  │ quantity, type, reason │
└──────────────────────┘                  └────────────────────────┘
```

---

### 3.2.3. Modèle Logique des Données (MLD)

Sous forme relationnelle normalisée en 3FN :

- **ORGANIZATIONS** (<u>id</u>, name, legalName, nif, rccm, idNat, email, phone, address, currency, active, createdAt, updatedAt)
- **ORGANIZATION_SETTINGS** (<u>id</u>, <u>organizationId</u>*, defaultCurrency, exchangeRateUsdToCdf, taxRate, alertCashDiscrepancyThreshold, alertMaxDiscountPercent, alertLargeExpenseThreshold)
- **USERS** (<u>id</u>, <u>organizationId</u>*, email, password, fullName, role, phone, active, createdAt, updatedAt)
- **CUSTOMERS** (<u>id</u>, <u>organizationId</u>*, name, customerType, email, phone, address, nif, balanceDue, active, createdAt)
- **SUPPLIERS** (<u>id</u>, <u>organizationId</u>*, name, contactName, email, phone, address, balanceDue, active, createdAt)
- **PRODUCT_CATEGORIES** (<u>id</u>, <u>organizationId</u>*, name, description, active)
- **PRODUCTS** (<u>id</u>, <u>organizationId</u>*, <u>categoryId</u>*, name, sku, barcode, description, purchasePrice, salePrice, currency, minStockLevel, currentStock, active, createdAt)
- **STOCK_MOVEMENTS** (<u>id</u>, <u>organizationId</u>*, <u>productId</u>*, <u>userId</u>*, type, quantity, previousStock, newStock, unitCost, reason, referenceNumber, createdAt)
- **CASH_SESSIONS** (<u>id</u>, <u>organizationId</u>*, <u>userId</u>*, sessionCode, openingBalance, closingBalance, countedBalance, difference, currency, status, openedAt, closedAt)
- **SALES** (<u>id</u>, <u>organizationId</u>*, <u>customerId</u>*, <u>userId</u>*, <u>cashSessionId</u>*, saleNumber, subtotal, taxAmount, discountAmount, totalAmount, currency, exchangeRate, paymentMethod, status, createdAt)
- **SALE_ITEMS** (<u>id</u>, <u>saleId</u>*, <u>productId</u>*, quantity, unitPrice, discountPercent, taxRate, totalLine)
- **INVOICES** (<u>id</u>, <u>organizationId</u>*, <u>customerId</u>*, <u>saleId</u>*, invoiceNumber, invoiceDate, dueDate, subtotal, taxAmount, totalAmount, paidAmount, balance, currency, status, createdAt)
- **PAYMENTS** (<u>id</u>, <u>organizationId</u>*, <u>invoiceId</u>*, <u>customerId</u>*, <u>cashSessionId</u>*, paymentNumber, amount, currency, exchangeRate, paymentMethod, referenceNumber, paymentDate, createdAt)
- **EXPENSES** (<u>id</u>, <u>organizationId</u>*, <u>userId</u>*, <u>cashSessionId</u>*, expenseCategory, description, amount, currency, exchangeRate, paymentMethod, receiptUrl, status, approvedBy, createdAt)
- **ANOMALY_ALERTS** (<u>id</u>, <u>organizationId</u>*, alertType, severity, title, description, details, status, resolvedBy, resolutionNotes, createdAt, resolvedAt)
- **AUDIT_LOGS** (<u>id</u>, <u>organizationId</u>*, <u>userId</u>*, action, entityName, entityId, previousState, newState, ipAddress, userAgent, createdAt)

*(NB : Les clés primaires sont soulignées <u>id</u>, les clés étrangères portent un astérisque \*).*

---

### 3.2.4. Dictionnaire des données exhaustif

Le tableau ci-dessous explicite les entités et attributs cruciaux de la base de données :

| Table | Attribut | Type SQL | Contrainte | Description & Rôle Métier |
|---|---|---|---|---|
| `organizations` | `id` | UUID | PK, Not Null | Identifiant universel unique de la PME |
| `organizations` | `nif` | VARCHAR(50) | Unique | Numéro d'impôt DGI officiel |
| `organization_settings`| `exchangeRateUsdToCdf` | DECIMAL(12,2) | Not Null, Def: 2850 | Taux de change officiel interne (ex: 1 USD = 2850 CDF) |
| `organization_settings`| `taxRate` | DECIMAL(5,2) | Not Null, Def: 16.0 | Taux de la TVA en vigueur en RDC (16%) |
| `users` | `role` | VARCHAR(30) | Not Null | Rôle RBAC (`SUPER_ADMIN`, `ORG_OWNER`, `CASHIER`...) |
| `products` | `currentStock` | DECIMAL(12,2) | Not Null, Def: 0 | Quantité physique courante en magasin |
| `products` | `minStockLevel` | DECIMAL(12,2) | Not Null, Def: 5 | Seuil critique déclenchant l'alerte de réapprovisionnement |
| `sales` | `paymentMethod` | VARCHAR(30) | Not Null | `CASH`, `BANK_TRANSFER`, `MOBILE_MONEY`, `CREDIT` |
| `cash_sessions`| `difference` | DECIMAL(14,2) | Nullable | Écart constaté (`countedBalance - closingBalance`) |
| `anomaly_alerts`| `severity` | VARCHAR(20) | Not Null | Niveau de criticité (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) |

<div style="page-break-after: always;"></div>

---

# CHAPITRE IV : ARCHITECTURE LOGICIELLE ET MOTEUR INTELLIGENT

## 4.1. Architecture globale N-Tiers distribuée

Smart PME Finance repose sur une architecture découplée assurant la séparation stricte des responsabilités (Separation of Concerns - SoC) :

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│                         COUCHE PRÉSENTATION / CLIENTS                          │
├────────────────────────────────────────┬───────────────────────────────────────┤
│        Application Web React 18        │     Application Desktop Windows       │
│  - Vite 6 + TypeScript                 │  - PyQt6 (moteur Chromium WebEngine)  │
│  - Lucide Icons + Design System CSS    │  - Accès aux imprimantes thermiques   │
│  - Responsive Desktop, Tablette, POS   │  - Stockage local de synchronisation  │
└───────────────────────────────────┬────┴───────────────────────────────────┬───┘
                                    │                                        │
                                    │ HTTPS / REST JSON                      │
                                    ▼                                        ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                       COUCHE LOGIQUE MÉTIER & SERVICES                         │
├────────────────────────────────────────────────────────────────────────────────┤
│                              API CENTRALE NESTJS                               │
│  ┌─────────────────────────┬─────────────────────────┬──────────────────────┐  │
│  │ Module Authentification │ Module Ventes & Stocks  │ Module Facturation   │  │
│  │ (JWT, Passport, RBAC)   │ (Catalogue, POS, Mvts)  │ (TVA 16%, Décharges) │  │
│  ├─────────────────────────┼─────────────────────────┼──────────────────────┤  │
│  │ Module Trésorerie       │ Moteur d'Anomalies      │ Module Rapports      │  │
│  │ (Sessions, Dépenses)    │ (Scanner Temps Réel)    │ (KPIs, Export Excel) │  │
│  └─────────────────────────┴─────────────────────────┴──────────────────────┘  │
└───────────────────────────────────┬────────────────────────────────────────────┘
                                    │
                                    │ Prisma ORM 6 (Requêtes Typées & Transactions)
                                    ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                        COUCHE PERSISTANCE DE DONNÉES                           │
├────────────────────────────────────────────────────────────────────────────────┤
│                           POSTGRESQL 17 RELATIONNEL                            │
│  - Clés primaires UUID v4            - Index B-Tree sur organizationId         │
│  - Intégrité référentielle en cascade - Isolation multi-entreprises stricte     │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4.2. Sécurité, authentification et matrice RBAC

### 4.2.1. Protocole d'authentification par jeton JWT
Lorsqu'un utilisateur initie une connexion :
1. Le client transmet les identifiants via `POST /api/v1/auth/login` ;
2. Le service vérifie le compte actif et le mot de passe avec bcrypt; les anciens hachages SHA-256 sont mis à niveau au prochain succès de connexion ;
3. Le serveur émet un jeton d'accès JWT de courte durée (15 minutes) et un jeton opaque de renouvellement stocké sous forme hachée et transmis dans un cookie HttpOnly ;
4. Chaque requête authentifiée inclut le jeton d'accès dans l'en-tête `Authorization: Bearer <jeton>` ; le renouvellement fait tourner le cookie de session ;
5. Le garde NestJS (`JwtAuthGuard`) valide la signature, l'expiration et l'état de la session en base avant d'injecter le contexte utilisateur.

### 4.2.2. Matrice des droits d'accès basée sur les rôles (RBAC)

La granularité des autorisations est synthétisée ci-dessous :

| Rôle | Ventes (POS) | Stocks & Mouvements | Factures & Devis | Clôture Caisse | Dépenses | Alertes Anomalies | Paramètres PME |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **SUPER_ADMIN** | Consultation | Consultation | Consultation | Non | Consultation | Total | Total |
| **ORG_OWNER** | Total | Total | Total | Validation | Approbation | Résolution | Total |
| **MANAGER** | Total | Total | Total | Validation | Enregistrement | Gestion | Gestion |
| **ACCOUNTANT** | Consultation | Consultation | Total | Validation | Total | Consultation | Non |
| **CASHIER** | Émission | Consultation | Émission | Clôture propre | Non | Non | Non |
| **INVENTORY_MANAGER**| Non | Total | Non | Non | Non | Consultation | Non |
| **AUDITOR** | Lecture | Lecture | Lecture | Lecture | Lecture | Lecture | Lecture |

---

## 4.3. Gestion multi-devises et intégrité transactionnelle ACID

### 4.3.1. Mécanisme de conversion dynamique (CDF / USD)
Soit $R$ le taux de change officiel de l'entreprise (ex: $R = 2850 \text{ CDF/USD}$). Le système offre deux modes de valorisation :
- **Conversion d'une valeur en USD vers CDF :**
  $$\text{Montant}_{\text{CDF}} = \text{Montant}_{\text{USD}} \times R$$
- **Conversion d'une valeur en CDF vers USD :**
  $$\text{Montant}_{\text{USD}} = \frac{\text{Montant}_{\text{CDF}}}{R}$$

Chaque ligne de vente ou de dépense stocke le montant brut, la devise utilisée et le taux $R$ en vigueur à la seconde de validation, immunisant les états financiers rétrospectifs contre les fluctuations ultérieures de devises.

### 4.3.2. Garantie d'atomicité transactionnelle
Pour prévenir toute incohérence (par exemple une vente enregistrée sans déduction effective de stock ou un encaissement sans facture), chaque enregistrement transactionnel est encapsulé dans une clause `prisma.$transaction(async (tx) => { ... })`. En cas d'exception sur un des sous-traitements, un `ROLLBACK` automatique restaure la base à son état initial rigoureux.

---

## 4.4. Spécification formelle du moteur de détection d'anomalies

Le moteur d'inspection intelligent repose sur cinq règles déterministes formalisées :

### 1. Règle R1 : Détection d'Écart de Caisse Inacceptable (`CASH_DISCREPANCY`)
- Soit $S_{\text{théorique}} = S_{\text{ouverture}} + \sum \text{Encaissements}_{\text{espèces}} - \sum \text{Décaissements}_{\text{espèces}}$
- Soit $S_{\text{compté}}$ le montant physiquement dénombré par le caissier lors de la clôture.
- L'écart absolu est calculé par : $\Delta = |S_{\text{compté}} - S_{\text{théorique}}|$
- **Condition de déclenchement :**
  $$\Delta > \theta_{\text{caisse}}$$
  *(où $\theta_{\text{caisse}}$ est le seuil de tolérance paramétré, par exemple 5 000 CDF).*
- **Gravité assignée :** `HIGH` si $\Delta \le 50\,000 \text{ CDF}$, `CRITICAL` si $\Delta > 50\,000 \text{ CDF}$.

### 2. Règle R2 : Remise Commerciale Anormale (`HIGH_DISCOUNT`)
- Soit $D$ le pourcentage de réduction consenti sur une ligne de vente ou sur le total du panier.
- Soit $\theta_{\text{remise}}$ le seuil maximal autorisé pour les caissiers (par défaut 15%).
- **Condition de déclenchement :**
  $$D > \theta_{\text{remise}}$$
- **Gravité assignée :** `MEDIUM`.

### 3. Règle R3 : Alerte de Stock Critique ou Négatif (`STOCK_CRITIQUE`)
- Soit $Q_{\text{actuelle}}$ le stock physique disponible pour un produit donné.
- Soit $Q_{\text{min}}$ le niveau de réapprovisionnement configuré.
- **Condition de déclenchement :**
  $$Q_{\text{actuelle}} \le Q_{\text{min}} \quad \text{ou} \quad Q_{\text{actuelle}} < 0$$
- **Gravité assignée :** `CRITICAL` si $Q_{\text{actuelle}} \le 0$, `HIGH` si $0 < Q_{\text{actuelle}} \le Q_{\text{min}}$.

### 4. Règle R4 : Décaissement Exceptionnel Non Visé (`ABNORMAL_EXPENSE`)
- Soit $M_{\text{dépense}}$ le montant d'un décaissement unitaire.
- Soit $\theta_{\text{dépense}}$ le plafond de dépense directe autorisé sans double validation (par défaut 2 000 000 CDF).
- **Condition de déclenchement :**
  $$M_{\text{dépense}} \ge \theta_{\text{dépense}}$$
- **Gravité assignée :** `HIGH`.

### 5. Règle R5 : Facture en Souffrance / Créance Douteuse (`OVERDUE_INVOICES`)
- Soit $T_{\text{échéance}}$ la date limite de règlement et $T_{\text{actuel}}$ la date du jour.
- Soit $S_{\text{dû}}$ le solde restant à payer sur la facture.
- **Condition de déclenchement :**
  $$T_{\text{actuel}} > T_{\text{échéance}} \quad \text{et} \quad S_{\text{dû}} > 0$$
- **Gravité assignée :** Échelonnée de `LOW` à `HIGH` en fonction de l'ancienneté du retard (15, 30 ou 60 jours).

<div style="page-break-after: always;"></div>

---

# CHAPITRE V : IMPLÉMENTATION, EXPÉRIMENTATION ET RÉSULTATS

## 5.1. Environnement de développement et outillage

Le développement et les bancs d'essai de la solution ont été menés avec les outils suivants :
- **Système d'exploitation :** Microsoft Windows 11 Professionnel (x64) ;
- **Environnement d'exécution :** Node.js v24.12.0 avec gestionnaire de paquets NPM 10.9.0 ;
- **Compilateur & Langage :** TypeScript 5.7.3 pour le backend et le frontend web, Python 3.12 pour le client natif ;
- **Serveur de base de données :** PostgreSQL 17.2 configuré sur port local 5432 ;
- **IDE et éditeur de code :** Visual Studio Code avec extensions ESLint, Prisma et GitLens ;
- **Client Windows Desktop :** application native Python avec PyQt6 et QtWebEngine ;
- **Outil de compilation autonome :** PyInstaller 6.11.1 pour la génération de l'exécutable `.exe`.

---

## 5.2. Présentation détaillée des interfaces et flux utilisateurs

### 5.2.1. Écran de Connexion et Sécurité
L'interface de connexion propose une authentification épurée avec sélection rapide de profils de test pour la soutenance (Boutons instantanés pour Administrateur, Gérant, Comptable et Caissier), permettant aux examinateurs d'apprécier la reconfiguration dynamique du menu en fonction du rôle.

### 5.2.2. Tableau de Bord Exécutif (Dashboard)
Le tableau de bord consolide les métriques financières capitales :
- **Chiffre d'Affaires Journalier et Mensuel** converti en devise choisie (CDF ou USD) ;
- **Taux de marge brute moyen** dégagé sur les ventes de la période ;
- **Valeur marchande totale des stocks** en magasin ;
- **Compteur d'alertes actives non résolues** classées par couleur de sévérité.

### 5.2.3. Terminal de Vente au Comptoir (POS)
Le module de caisse présente une grille tactile d'articles avec recherche instantanée par nom ou code-barres. Le panier calcule en temps réel le sous-total HT, la TVA 16% et le total TTC. Un sélecteur de devise permet d'afficher simultanément l'équivalent dans l'autre monnaie au taux officiel du jour.

### 5.2.4. Module Facturier et Visualiseur Conforme DGI
La fenêtre de facturation permet l'émission de factures au format officiel congolais :
- En-tête avec nom juridique de l'entreprise, adresse, NIF, RCCM et ID NAT ;
- Numérotation séquentielle inviolable (`FAC-2026-XXXX`) ;
- Décompte de la TVA et indication claire du mode de paiement ;
- Impression directe ou export vectoriel PDF.

### 5.2.5. Console d'Audit et de Résolution des Anomalies
Cette interface réservée aux propriétaires et gérants répertorie l'historique complet des alertes générées par le moteur. Pour chaque alerte (ex: déficit de caisse de 35 000 CDF), le dirigeant peut :
1. Consulter les détails de l'incident et l'utilisateur concerné ;
2. Rédiger une note de justification (ex: *"Erreur de comptage régularisée par le caissier"* ou *"Retenue sur salaire accordée"*) ;
3. Signer électroniquement la résolution de l'anomalie, qui passe alors au statut `RESOLVED`.

---

## 5.3. Déploiement desktop autonome et synchronisation hors-ligne

Pour répondre aux contraintes de connectivité des PME, deux scripts essentiels ont été produits :
1. **`run_desktop.bat` :** Fichier de commandes Windows permettant de démarrer le client de caisse local PyQt6 en un clic sans ligne de commande.
2. **`scripts/build_exe.py` :** Script de compilation PyInstaller générant le paquetage complet `SmartPME_Finance.exe` prêt pour le déploiement sur les postes de travail des caissiers sans prérequis d'installation de Node.js ou Python.

Le client Desktop intègre un mécanisme de détection automatique d'état de l'API (`/api/v1/health`) vérifié toutes les 15 secondes avec bascule transparente sur le cache local en cas de rupture de signal.

---

## 5.4. Coupe-circuit distant bidirectionnel

Chaque poste est enrôlé pour une entreprise et reçoit un jeton spécifique, distinct des jetons des utilisateurs. L'API ne conserve que le hachage du jeton; le desktop le stocke chiffré par DPAPI dans le profil Windows. L'état `ACTIVE` ou `LOCKED`, le motif, l'auteur, la version de commande et les accusés de réception sont persistés. Les transitions sont consignées dans le journal d'audit avec l'adresse IP et l'utilisateur manager.

Le desktop transmet un heartbeat toutes les 15 secondes par défaut. Une transition verrouillée bloque l'interface et les requêtes des sessions liées au poste. Le client garde localement l'état verrouillé hors ligne; un poste actif dispose d'une période de grâce configurable de 24 heures par défaut. À la reconnexion, le statut serveur fait autorité et le client applique puis acquitte la nouvelle version. L'écran se déverrouille sans redémarrage du processus.

```mermaid
sequenceDiagram
    actor Gerant
    participant Web as Interface web
    participant API as API NestJS
    participant DB as PostgreSQL
    participant PC as Desktop PyQt6

    Gerant->>Web: Verrouiller / motif
    Web->>API: POST /remote-control/terminals/:id/lock
    API->>API: Vérifier session, rôle et entreprise
    API->>DB: Persister LOCKED, version + 1, audit
    API-->>Web: Commande envoyée / acquittement en attente
    loop toutes les 10 à 30 secondes
        PC->>API: Heartbeat signé + dernière version acquittée
        API->>DB: Lire statut et enregistrer présence
        API-->>PC: LOCKED ou ACTIVE, version et heure serveur
        PC->>PC: Appliquer l'état et sauvegarder sous DPAPI
    end
    PC->>API: Heartbeat avec version appliquée
    API->>DB: Enregistrer l'accusé
    Web->>API: GET /remote-control/terminals
    API-->>Web: Présence et état acquitté/en attente
    Gerant->>Web: Déverrouiller / motif
    Web->>API: POST /remote-control/terminals/:id/unlock
    API->>DB: Persister ACTIVE, version + 1, audit
    PC->>API: Heartbeat suivant
    API-->>PC: ACTIVE
    PC->>PC: Fermer l'écran de verrouillage
```

Cette protection n'est pas un mécanisme de gestion de périphérique (MDM) : un administrateur local Windows peut arrêter le processus ou modifier l'environnement de la machine. Les contrôles côté API empêchent cependant une session desktop verrouillée ou révoquée d'exécuter des opérations serveur.

---

## 5.5. Évaluation, tests de validation et analyse des performances

Des campagnes d'évaluation ont été conduites sur un jeu d'essai simulant une semaine d'activité intense d'une PME kinoise (1 200 articles au catalogue, 3 caisses simultanées, 250 transactions par jour) :

| Métrique Évaluée | Objectif Fixé | Résultat Obtenu | Appréciation |
|---|---|---|---|
| Temps de réponse moyen API | $< 150 \text{ ms}$ | **42 ms** | Excellent |
| Temps de génération d'un reçu POS | $< 1 \text{ s}$ | **180 ms** | Validation immédiate |
| Exactitude calcul écart caisse | $100\%$ | **100% (zéro divergence)** | Fiabilité totale |
| Temps de clôture journalière de caisse | $< 5 \text{ min}$ | **1 min 30 s** (vs 35 min manuel) | Réduction de 95% |
| Taux de détection fausses remises | $100\%$ | **100% alertes levées** | Sécurisation totale |

<div style="page-break-after: always;"></div>

---

# CONCLUSION GÉNÉRALE ET PERSPECTIVES

## Bilan des réalisations
Arrivé au terme de notre travail de fin de cycle de Licence en Sciences Informatiques, portant sur la **« Conception et réalisation d'une plateforme intégrée de gestion commerciale et financière des PME avec détection intelligente des anomalies et supervision à distance »**, nous pouvons affirmer avec satisfaction que les objectifs assignés ont été pleinement atteints.

Sur le plan technique et scientifique, nous avons relevé les défis majeurs identifiés dans notre problématique :
1. **L'unification commerciale et financière :** L'intégration au sein d'une même plateforme de la gestion du catalogue, de la caisse comptoir, des mouvements de stock et de la facturation normalisée garantit l'intégrité absolue des flux et élimine la double saisie génératrice d'erreurs.
2. **La maîtrise du bimonétarisme congolais :** Le système traite avec rigueur et fluidité la coexistence du Franc Congolais et du Dollar Américain, historisant les taux de change et permettant des conversions instantanées transparentes pour les clients et caissiers.
3. **La lutte active contre le coulage financier :** Grâce au moteur déterministe d'inspection intelligente des anomalies, les propriétaires de PME ne subissent plus passivement les déficits en fin de mois : chaque écart de caisse, remise disproportionnée ou dépense atypique est capturé et soumis à régularisation formelle.
4. **La résilience opérationnelle :** La double déclinaison Web responsive et Desktop Windows autonome garantit la continuité de service des points de vente, même dans un environnement sujet aux instabilités de réseau.

Nos trois hypothèses de départ se trouvent ainsi intégralement validées par les résultats expérimentaux obtenus.

---

## Difficultés rencontrées
La réalisation de ce projet d'envergure n'a pas été exempte d'obstacles :
- La complexité de modélisation mathématique des règles de conversion multi-devises lors des règlements partiels et des remboursements d'articles ;
- L'optimisation des temps de réponse lors de la synchronisation asynchrone pour éviter tout blocage du thread principal de l'interface graphique utilisateur ;
- Le manque de standardisation préalable des mentions légales parmi les PME interrogées lors de notre étude d'existant, qui a nécessité une analyse approfondie des textes légaux de la DGI et de l'OHADA pour établir un modèle de facture unifié et irréprochable.

---

## Perspectives d'avenir
Ce travail ouvre la voie à plusieurs extensions scientifiques et industrielles prometteuses :
1. **Intégration directe des passerelles Mobile Money :** Raccordement direct aux API officielles de paiement mobile (Vodacom M-Pesa Open API, Airtel Money Gateway, Orange Money) pour l'encaissement automatisé par QR Code au comptoir sans manipulation manuelle de numéros de référence.
2. **Prévision de trésorerie par Machine Learning :** Intégration d'un module d'analyse prédictive (basé sur des séries temporelles ARIMA ou LSTM) capable d'anticiper les tensions de liquidités à 30 jours à partir des tendances historiques d'encaissement et de saisonnalité.
3. **Synchronisation Peer-to-Peer (P2P) décentralisée :** Déploiement d'un protocole de synchronisation maillée locale permettant à plusieurs postes de caisse de continuer à échanger leurs états de stock en réseau local ad-hoc même en cas de coupure totale de la liaison montante vers le serveur central.

Nous espérons vivement que **Smart PME Finance** servira de référence académique et de levier technologique efficace pour propulser les Petites et Moyennes Entreprises de la République Démocratique du Congo vers une gouvernance financière moderne, transparente et prospère.

<div style="page-break-after: always;"></div>

---

# BIBLIOGRAPHIE ET WEBOGRAPHIE

## I. Ouvrages méthodologiques et scientifiques
1. **CHANDOLA, V., BANERJEE, A., & KUMAR, V.** (2009). *Anomaly detection: A survey*. ACM Computing Surveys (CSUR), 41(3), 1-58.
2. **GAMMA, E., HELM, R., JOHNSON, R., & VLISSIDES, J.** (1994). *Design Patterns: Elements of Reusable Object-Oriented Software*. Addison-Wesley Professional.
3. **MEYER, B.** (2000). *Object-Oriented Software Construction* (2nd Edition). Prentice Hall PTR.
4. **NANCI, D., & ESPINASSE, B.** (2001). *Ingénierie des systèmes d'information : Merise deuxième génération* (4ème édition). Vuibert, Paris.
5. **PRESSMAN, R. S., & MAXIM, B. R.** (2020). *Software Engineering: A Practitioner's Approach* (9th Edition). McGraw-Hill Education.
6. **REIX, R., FALKNER, B., ROWE, F., & FIMBEL, É.** (2018). *Systèmes d'information et management* (8ème édition). Vuibert, Paris.
7. **ROQUES, P.** (2021). *UML 2 par la pratique : Études de cas et exercices corrigés* (8ème édition). Eyrolles, Paris.
8. **SOMMERVILLE, I.** (2016). *Software Engineering* (10th Edition). Pearson Higher Ed.

## II. Lois, Décrets et Rapports Institutionnels de la RDC
9. **BANQUE CENTRALE DU CONGO (BCC)** (2024). *Rapport annuel sur la politique monétaire et la stabilité financière en RDC*. Kinshasa.
10. **DIRECTION GÉNÉRALE DES IMPÔTS (DGI - RDC)** (2012). *Ordonnance-Loi n° 10/001 du 20 août 2010 portant institution de la Taxe sur la Valeur Ajoutée (TVA) et ses mesures d'application*. Journal Officiel de la RDC.
11. **MINISTÈRE DES PME ET CLASSE MOYENNE** (2001). *Loi n° 01/020 portant statut des Petites et Moyennes Entreprises en République Démocratique du Congo*.
12. **SECRÉTARIAT PERMANENT DE L'OHADA** (2017). *Acte uniforme relatif au droit comptable et à l'information financière (AUDCIF)*. Journal Officiel de l'OHADA.

## III. Documentations techniques et Webographie
13. **NESTJS FRAMEWORK** (2025). *NestJS Documentation - A progressive Node.js framework for building efficient, reliable and scalable server-side applications*. [En ligne] https://docs.nestjs.com
14. **POSTGRESQL GLOBAL DEVELOPMENT GROUP** (2025). *PostgreSQL 17 Documentation: The World's Most Advanced Open Source Relational Database*. [En ligne] https://www.postgresql.org/docs/17/
15. **PRISMA ORM** (2025). *Next-generation ORM for Node.js & TypeScript*. [En ligne] https://www.prisma.io/docs
16. **REACT CORE TEAM** (2025). *React - The library for web and native user interfaces*. [En ligne] https://react.dev
17. **RIVERBANK COMPUTING** (2025). *PyQt6 Reference Guide and Qt WebEngine Widgets*. [En ligne] https://www.riverbankcomputing.com/static/Docs/PyQt6/

<div style="page-break-after: always;"></div>

---

# ANNEXES

## Annexe 1 : Matrice des Endpoints API REST v1

| Méthode | Route API | Rôles Autorisés | Description Métier |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Public | Authentification et délivrance du JWT |
| `GET` | `/api/v1/products` | Tous | Consultation du catalogue des articles |
| `POST` | `/api/v1/products` | OWNER, MANAGER, INVENTORY | Création d'un nouvel article avec stock initial |
| `POST` | `/api/v1/sales` | CASHIER, OWNER, MANAGER | Validation atomique d'une vente au comptoir POS |
| `GET` | `/api/v1/sales` | Tous sauf INVENTORY | Historique des ventes avec filtres par date et caisse |
| `POST` | `/api/v1/cash-sessions/open`| CASHIER, OWNER, MANAGER | Ouverture de caisse avec saisie du fond initial |
| `POST` | `/api/v1/cash-sessions/close`| CASHIER, OWNER, MANAGER | Clôture de caisse avec calcul automatique d'écart |
| `GET` | `/api/v1/invoices/:id` | Tous sauf INVENTORY | Visualisation de la facture officielle imprimable |
| `GET` | `/api/v1/anomalies` | OWNER, MANAGER, AUDITOR | Consultation du journal d'alertes du moteur intelligent |
| `PATCH`| `/api/v1/anomalies/:id/resolve`| OWNER, MANAGER | Régularisation et signature formelle d'une anomalie |
| `GET` | `/api/v1/reports/kpis` | OWNER, MANAGER, ACCOUNTANT| Tableau de bord consolidé des indicateurs financiers |

## Annexe 2 : Comptes et Rôles de Démonstration (Jeu d'Essai)

| Rôle RBAC | Compte de test |
|---|---|
| **Administrateur / Propriétaire** | Généré par le seed local |
| **Gérant / Manager** | Généré par le seed local |
| **Comptable** | Généré par le seed local |
| **Caissier Principal** | Généré par le seed local |
| **Gestionnaire de Stock / Auditeur Interne** | À créer dans le jeu d'essai local si nécessaire |

Les comptes de démonstration et mots de passe générés par le seed sont réservés au développement local et ne sont pas des identifiants de production.
