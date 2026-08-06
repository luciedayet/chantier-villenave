# Chantier — Déploiement Vercel + Supabase

## 1. Supabase

1. Crée un projet sur [supabase.com](https://supabase.com)
2. Dans **SQL Editor**, colle et exécute le contenu de `supabase-schema.sql`
3. Récupère dans **Project Settings > API** :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. Variables d'environnement

Copie `.env.local.example` en `.env.local` et remplis :

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
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
