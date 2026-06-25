# Debilbi

Matrix-powered voice and chat client. Fork of Cinny.

- **GitHub**: https://github.com/Rulunchic/debilbi
- **Clone**: `git clone https://github.com/Rulunchic/debilbi.git`
- **Branch `main`** — production. Push to `main` triggers GitHub Actions deploy to server.

## Commands

```bash
npm ci              # install dependencies (always use ci, not install)
npm start           # dev server at 0.0.0.0:8080
npm run build       # build to dist/
npm run lint        # eslint + prettier check
npm run typecheck   # TypeScript check
```

## Workflow

1. Branch from `main`: `git checkout -b feature/my-feature`
2. Make changes
3. Verify: `npm run lint && npm run typecheck && npm run build`
4. Commit: `git add . && git commit -m "feat: description"`
5. Push: `git push origin feature/my-feature`
6. Open Pull Request on GitHub to `main`

Husky runs eslint+prettier on commit via `lint-staged`.

**Never push directly to `main`**. Branch + PR only.

After PR merge by owner (`Rulunchic`), deploy runs automatically via GitHub Actions.

## Project structure

```
debilbi/
├── src/                  # React/TypeScript (Cinny fork)
├── public/               # Static assets
├── scripts/              # Build scripts
├── contrib/              # nginx/caddy config examples
├── .github/workflows/    # CI/CD (deploy.yml)
├── .husky/               # Git hooks
├── vite.config.js        # Vite config
├── package.json          # Dependencies and scripts
├── Dockerfile            # Docker build
└── config.json           # Matrix homeserver config
```

## Constraints

- No SSH deploy keys — cannot trigger deploy workflow
- Deploy happens only after PR merge to `main` (owner does merge)
- Allowed: clone, create branches, commit, push, open PRs, review code
