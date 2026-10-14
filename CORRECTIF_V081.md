# EURACONNECT V0.8.1 — Correctif de compilation Netlify

## Cause confirmée

Le fichier `app/page.tsx` de la V0.8 utilise le composant `<Plus />` sans l'importer depuis `lucide-react`. Le build Next.js s'arrête pendant la vérification TypeScript avec :

`./app/page.tsx:171:90 Type error: Cannot find name 'Plus'`.

## Correctif minimal (recommandé)

Remplacer **uniquement** `app/page.tsx` par le fichier fourni dans `EURACONNECT_V081_PATCH_GITHUB.zip`, ou éditer l'import existant :

```tsx
import {ArrowRight,Bell,BookOpen,BriefcaseBusiness,Building2,CalendarDays,
 ClipboardList,Handshake,LayoutDashboard,LogOut,Menu,Plus,Search,ShieldCheck,
 Sparkles,UserRound,UsersRound,X} from 'lucide-react';
```

Puis `Commit changes` dans GitHub (`main` si c'est la branche de déploiement), et laisser Netlify reconstruire le site.

**Aucune migration SQL, aucune variable d'environnement ni manipulation Supabase n'est requise.**

## Vérification

Le changement résout l'erreur signalée sur `Plus`. Les scripts `verify:structure`, `verify:v07` et `verify:v08`, ainsi que l'analyse syntaxique TypeScript ont été exécutés localement.

Le build complet `npm run build` n'a pas pu être réalisé localement faute de téléchargement des dépendances npm; il doit être validé dans les journaux Netlify. S'il reste une erreur, envoyer les premières lignes marquées `Type error`.

## Archives

- `EURACONNECT_V081_PATCH_GITHUB.zip` : uniquement la correction de `app/page.tsx` et ce guide.
- `EURACONNECT_V081_COMPLET.zip` : copie complète du projet avec correctif et version 0.8.1.
