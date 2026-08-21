# AGENTS.md

## Repo Shape
- The root is not an npm workspace and has no root `package.json`.
- Executable code lives in two independent npm apps: `parchis_front` and `parchis-remix`.
- Run npm commands from the app directory, never from the repo root expecting workspace behavior.
- Both apps use `package-lock.json`; use `npm`, not yarn or pnpm.
- The root `README.md` contains current technical notes followed by the original game-design document.

## Frontend: `parchis_front`
- Stack: Create React App, React 18, React Router 6, Axios, Bootstrap, React-Bootstrap, and `react-dice-complete`.
- Dev server: `npm start` from `parchis_front`, served on `http://localhost:3000`.
- Build: `npm run build`.
- One-off tests: `npm test -- --watchAll=false`.
- Focused test example: `npm test -- App.test.js --watchAll=false`.
- `src/App.test.js` is still the CRA starter test for `learn react` and does not match the current routes.

## Frontend Structure
- `src/index.js`: React bootstrap, imports Bootstrap CSS and `src/styles/global.css`.
- `src/app/App.js`: wraps app routes with `BrowserRouter`.
- `src/app/routes.js`: route table for `/`, `/login`, `/register`, `/dashboard`, `/game`, and `/dev_game`.
- `src/auth/`: login page, register page, and `PrivateRoute`.
- `src/dashboard/`: protected dashboard page.
- `src/game/`: routed game page, board, board boxes, home boxes, team-selection modal, local game state, and game assets.
- `src/api/authApi.js`: older API helper retained; current login/register pages still call Axios directly.
- `src/styles/global.css`: global base styles.
- `src/App.css` and `src/logo.svg`: CRA remnants retained and currently not wired into `App`.

## Frontend Behavior Notes
- Auth calls are hardcoded to `http://localhost:3001` inside `src/auth/LoginPage.js` and `src/auth/RegisterPage.js`.
- `src/api/authApi.js` sends `{ username, password }` and is not the source of truth for current login behavior.
- Login stores `response.data.access_token` in `localStorage` under `token`.
- Protected routes only check `localStorage.getItem('token')`; there is no frontend token validation round-trip.
- `/game` is protected by `PrivateRoute`; `/dev_game` renders the same game page without `PrivateRoute`.
- CSS is global. Be careful with selectors targeting `body`, `table`, `td`, `img`, and Bootstrap classes.
- Do not rewrite board/game behavior during structural cleanups; current game state and movement behavior are local frontend prototype code.

## Backend: `parchis-remix`
- Despite the name, this is a NestJS API, not Remix.
- Dev server: `npm run start:dev` from `parchis-remix`, listening on `http://localhost:3001`.
- Build/typecheck: `npm run build`.
- Unit tests: `npm test`.
- Focused unit test example: `npm test -- auth.service.spec.ts`.
- E2E tests: `npm run test:e2e`.
- `npm run lint` runs ESLint with `--fix`, so it can modify files.
- `npm run format` runs Prettier on `src/**/*.ts` and `test/**/*.ts`, so it can modify files.

## Backend Structure
- `src/main.ts`: creates the Nest app, applies `corsConfig`, and listens on port `3001`.
- `src/app.module.ts`: root composition module.
- `src/config/`: extracted config objects for CORS, database, and JWT. Values are intentionally unchanged from the previous hardcoded configuration.
- `src/health/`: root `GET /` endpoint returning `Hello World!`.
- `src/auth/`: auth module, controller, service, and auth DTOs.
- `src/users/`: `User` entity, `GenderEnum`, `UserService`, `UsersModule`, and currently unused `UserRepository`.
- `src/dashboard/`: protected `GET /dashboard` endpoint.
- `src/common/guards/jwt-auth.guard.ts`: manual JWT guard used by dashboard.
- `test/`: Nest e2e tests.

## Backend Config Notes
- PostgreSQL config is in `src/config/database.config.ts` and remains hardcoded: host `localhost`, port `5432`, database `parchis_remix`, username/password `postgres`/`postgres`.
- `synchronize: true` remains enabled.
- CORS is in `src/config/cors.config.ts` and allows only `http://localhost:3000`.
- JWT config is in `src/config/jwt.config.ts` and still uses the hardcoded secret `yourSecretKey` with `expiresIn: '1h'`.
- `main.ts` does not enable Nest `ValidationPipe`, so `class-validator` DTO decorators are not enforced unless added later.

## Known Backend Issues To Preserve Unless Asked
- `AuthService.register()` hashes the password before calling `UserService.createUser()`, and `UserService.createUser()` hashes again.
- `AuthService.login()` does not `await` `UserService.validatePassword()`.
- `CreateUserDto` still declares `surname`, while the current frontend sends `firstName` and the entity has `firstName`.
- `AuthService.register()` returns the created `user` object.
- `JwtAuthGuard` manually reads `Authorization: Bearer <token>` and verifies it; there is no `JwtStrategy`.
- Passport packages are installed but the current JWT guard does not use a full Passport strategy.
- `UserRepository` appears unused but is retained.
- Backend auth specs instantiate `AuthService`/`AuthController` without their required providers, so full `npm test` may fail before unrelated changes.
- Backend e2e tests import `AppModule`, so they require the hardcoded local PostgreSQL connection.

## Editing Rules For Future Agents
- Preserve current behavior unless the task explicitly asks for functional fixes.
- Separate pure moves/reorganization from behavior changes.
- Do not change DTO contracts, auth behavior, PostgreSQL config, `synchronize`, JWT config, or dependencies unless explicitly requested.
- Do not delete suspected obsolete files only because they look old; first prove they are unused and confirm the cleanup scope.
- Treat auth, password hashing, DTO/entity alignment, DB config, `ValidationPipe`, and `synchronize` changes as risky.
