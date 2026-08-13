# Chantier — Déploiement Vercel + Notion

## 1. Notion

1. Crée une intégration sur [notion.so/my-integrations](https://www.notion.so/my-integrations), copie son **Internal Integration Secret** → `NOTION_API_KEY`
2. La base de données « Chantier — Tâches » a été créée dans ton espace Notion. Ouvre-la, clique sur **···** → **Connexions** → connecte ton intégration
3. Copie l'ID de la base (dans son URL : `notion.so/<workspace>/<DATABASE_ID>?v=...`) → `NOTION_DATABASE_ID`

La base est vide au départ : le premier chargement de l'appli la peuple automatiquement avec les tâches par défaut (voir `lib/seedTasks.ts`).

## 2. Variables d'environnement

Copie `.env.local.example` en `.env.local` et remplis :

```
NOTION_API_KEY=secret_xxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
APP_PASSWORD=tonmotdepasse
```

## 3. Lancer en local

```bash
npm install
npm run dev
```

## 4. Déployer sur Vercel

```bash
npx vercel
```

Ajoute les 3 variables d'environnement dans les settings Vercel du projet.

## Authentification

Simple cookie httpOnly côté serveur. Le mot de passe est dans `APP_PASSWORD`.  
Pour changer le mot de passe : modifie `APP_PASSWORD` dans les env vars Vercel et redéploie.  
Le cookie protège aussi les routes `/api/tasks/*`, qui portent la clé Notion côté serveur.
