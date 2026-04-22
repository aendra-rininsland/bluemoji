# hatk starter template

A starter project for building an AT Protocol AppView with [hatk](https://github.com/hatk-dev/hatk).

## Prerequisites

- [Vite+](https://viteplus.dev/guide/) — `curl -fsSL https://vite.plus | bash`
- [Docker](https://docs.docker.com/get-docker/) — for the local PDS

## Create a project

```bash
vp create github:hatk-dev/hatk-template-starter
cd <your-project>
npx svelte-kit sync
vp dev
```

Open http://127.0.0.1:3000

## Commands

| Command                       | Description                               |
| ----------------------------- | ----------------------------------------- |
| `vp dev`                      | Start dev server (PDS + hatk + SvelteKit) |
| `vp build`                    | Build for production                      |
| `vp check`                    | Lint and type-check                       |
| `vp test`                     | Run tests                                 |
| `hatk generate types`         | Regenerate types from lexicons            |
| `hatk generate record <nsid>` | Scaffold a new record lexicon             |
| `hatk generate feed <name>`   | Scaffold a feed handler                   |
| `hatk seed`                   | Re-run seed data                          |
| `hatk reset`                  | Wipe database and PDS                     |

## Login

The seed data creates test accounts you can use locally:

- **Handle:** `alice.test`
- **Password:** `password`

## Deploy to Railway

This template includes a `Dockerfile` and `railway.toml`. Install the [Railway CLI](https://docs.railway.com/cli) first.

```bash
railway init
railway link
railway up -d
```

After the first deploy:

1. Go to **Settings -> Generate Domain** in the Railway dashboard
2. Redeploy to pick up the domain for the OAuth issuer

## Docs

https://hatk.dev
