# AGENTS.md

## Repo Shape
- The root README is a game-design document; the executable code is two separate npm apps, not the Unity/C# stack described there.
- There is no root workspace or root `package.json`. Run npm commands inside `parchis_front` or `parchis-remix`.
- Both apps use `package-lock.json`; prefer `npm install`/`npm` commands, not yarn/pnpm.

## Frontend: `parchis_front`
- Create React App frontend. Dev server: `npm start` from `parchis_front`, served on `http://localhost:3000`.
- One-off frontend tests: `npm test -- --watchAll=false`. Focus a file with `npm test -- App.test.js --watchAll=false`.
- `src/App.test.js` is still the CRA starter test for "learn react" and does not match the current routes.
- Auth calls are mostly direct `axios` calls to `http://localhost:3001` inside components; `src/api.js` is not the sole API client and its `login` payload differs from `Login.js`.
- Protected routes only check `localStorage.getItem('token')`; there is no frontend token validation round-trip.

## Backend: `parchis-remix`
- Despite the name, this is a NestJS API. Main entrypoint is `src/main.ts`; app modules are wired from `src/app.module.ts`.
- Dev server: `npm run start:dev` from `parchis-remix`, listening on `http://localhost:3001`.
- Build/typecheck: `npm run build`. Unit tests: `npm test`; focused test: `npm test -- auth.service.spec.ts`. E2E: `npm run test:e2e`.
- `npm run lint` runs ESLint with `--fix`, so it can modify files. `npm run format` runs Prettier only on `src/**/*.ts` and `test/**/*.ts`.
- Backend DB config is hardcoded in `AppModule`: Postgres on `localhost:5432`, database `parchis_remix`, user/password `postgres`/`postgres`, with `synchronize: true`; no `.env` loading is configured.
- CORS is hardcoded to allow only `http://localhost:3000`.
- JWT config uses the hardcoded secret `yourSecretKey`; `JwtAuthGuard` manually reads `Authorization: Bearer <token>` and verifies it.
- `main.ts` does not enable Nest `ValidationPipe`, so `class-validator` DTO decorators are not enforced unless added.

## Current Test Gotchas
- Backend auth specs instantiate `AuthService`/`AuthController` without their required providers, so full `npm test` may fail before unrelated changes.
- Backend e2e tests import `AppModule`, so they require the hardcoded local Postgres connection.
