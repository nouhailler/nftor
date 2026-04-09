# CONTEXT.md

## Projet

- Nom du dépôt GitHub: `nouhailler/nftor`
- Branche active de référence: `main`
- Objectif: application de monitoring temps réel pour `nftables`
- Stack backend: Python, FastAPI, asyncio, WebSocket, SQLite
- Stack frontend: React, TypeScript, Vite, Zustand, Recharts

## État actuel

- Le dépôt local a été initialisé puis poussé sur GitHub.
- Le projet applicatif existe à la racine du dépôt.
- Le `README.md` a été créé et adapté à la structure réelle du dépôt.
- Le fichier `AGENTS.md` décrit l’architecture et les conventions de modification.
- Le commit actuellement poussé est:
  - `2e55183` `Add nft-monitor application`

## Structure actuelle

```text
.
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── app/
│   │   ├── monitor.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── websocket.py
│   │   └── utils.py
│   └── Dockerfile
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── components/
│       │   ├── Chart.tsx
│       │   ├── Filters.tsx
│       │   └── StatusBadge.tsx
│       ├── hooks/
│       │   └── useWebSocket.ts
│       └── store/
│           └── useStore.ts
├── .gitignore
├── README.md
├── AGENTS.md
└── CONTEXT.md
```

## Ce qui a été implémenté

### Backend

- Endpoint REST:
  - `GET /health`
  - `GET /api/history?hours=1`
- Endpoint WebSocket:
  - `/ws/nft`
- Polling asynchrone de `nft -j list ruleset`
- Fallback sur `sudo -n nft -j list ruleset`
- Aucun `shell=True`
- Calcul des métriques:
  - `pps = Δpackets / Δtime`
  - `bps = Δbytes / Δtime`
- Persistance SQLite avec:
  - initialisation automatique
  - mode WAL
  - flush par batch
  - utilisation de `asyncio.to_thread` pour ne pas bloquer la boucle
- Diffusion en temps réel des snapshots via WebSocket
- Gestion d’erreur:
  - les erreurs `nft` ne crashent pas le backend
  - un snapshot d’erreur est envoyé côté client

### Frontend

- Application Vite + React + TypeScript
- Store Zustand central
- Connexion WebSocket avec auto-reconnect
- Chargement initial de l’historique via REST
- Dashboard avec:
  - cartes de synthèse `input/output/forward`
  - graphe temps réel Recharts
  - filtres de chaîne
  - filtre texte
  - bouton reset
  - indicateur d’état de connexion
- Limitation mémoire:
  - maximum `120` points côté frontend
- Désactivation des animations du graphe

## Contrats de données importants

### Message WebSocket

```json
{
  "type": "snapshot",
  "timestamp": "2026-04-09T12:00:00+00:00",
  "chains": {
    "input": {
      "chain": "input",
      "packets": 123,
      "bytes": 4567,
      "pps": 20.5,
      "bps": 8120.0
    }
  },
  "source_mode": "direct",
  "status": "ok",
  "error": null
}
```

### Réponse REST historique

```json
{
  "points": [
    {
      "timestamp": "2026-04-09T12:00:00+00:00",
      "chains": {
        "input": {
          "chain": "input",
          "packets": 123,
          "bytes": 4567,
          "pps": 20.5,
          "bps": 8120.0
        }
      }
    }
  ]
}
```

## Décisions et conventions

- Les noms de chaînes sont normalisés en minuscules.
- Le backend reste strictement async-first.
- Les appels externes à `nft` passent uniquement par `backend/app/utils.py`.
- Le frontend suppose principalement les chaînes `input`, `output` et `forward`.
- Le token WebSocket n’est pas utilisé pour l’instant, mais le placeholder `?token=` existe déjà pour une future auth.
- Le démarrage attendu reste:
  - backend: `uvicorn main:app`
  - frontend: `npm run dev`

## Validation déjà faite

- Compilation Python effectuée avec:
  - `python3 -m compileall backend`
- Le projet a été commit puis poussé avec succès sur GitHub.

## Points d’attention pour la reprise

- Le frontend est prêt à fonctionner, mais aucun test automatisé n’a encore été ajouté.
- Aucun proxy Vite n’a été configuré; le frontend parle directement au backend via URL complète.
- L’UI est optimisée pour des chaînes de base `input/output/forward`. Si le ruleset utilise d’autres noms, il faudra potentiellement enrichir l’affichage.
- L’authentification WebSocket n’est qu’un placeholder pour l’instant.
- Le backend dépend des permissions système pour accéder à `nft`:
  - soit via `CAP_NET_ADMIN`
  - soit via `sudo -n nft`

## Prochaines étapes possibles

- Ajouter des tests backend pour le parsing JSON de `nft` et le calcul des deltas.
- Ajouter des tests frontend pour le store Zustand et la logique de filtrage.
- Ajouter une configuration Docker Compose pour lancer backend + frontend ensemble.
- Ajouter une vraie auth WebSocket et des CORS plus stricts.
- Ajouter des vues par table/chaîne/règle si besoin d’un niveau de détail supérieur.
- Ajouter une stratégie de rétention et purge SQLite configurable.

## Instruction pour une prochaine session

Au redémarrage, relire en priorité:

- `CONTEXT.md`
- `README.md`
- `AGENTS.md`

Puis vérifier l’état Git courant avec:

- `git status --short --branch`

Ensuite reprendre à partir des “Points d’attention” ou des “Prochaines étapes possibles” selon le besoin courant.
