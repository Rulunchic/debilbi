# Debilbi — Agent Rules

## Branch Rules

- `main` — production. No direct pushes
- Work via feature branches: `feature/<what-we-do>`
- Create Pull Request to merge into `main`

## Before Commit

```bash
npm run lint
npm run typecheck
npm run build
```

## Commit Convention

```
feat: what was done
fix: what was fixed
chore: maintenance task
docs: documentation
```

## CI/CD

- GitHub Actions builds and deploys on push to `main`
- Deploy target: `/opt/debilbi-client/` via rsync over SSH
- Docker build available via `Dockerfile`

## Tech Stack

- React 18, TypeScript, Vite
- matrix-js-sdk (Matrix client)
- vanilla-extract (CSS-in-JS)
- Jotai + Immer (state)
- Cinny fork (Matrix chat UI)
