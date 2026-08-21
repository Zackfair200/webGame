# parchis_front

Frontend React del proyecto Parchís Legendario.

## Stack

- Create React App con `react-scripts`.
- React 18.
- React Router 6.
- Axios.
- Bootstrap y React-Bootstrap.
- `react-dice-complete` para el dado.

## Scripts

- `npm start`: servidor de desarrollo en `http://localhost:3000`.
- `npm run build`: build de producción.
- `npm test`: test runner de CRA.
- `npm test -- --watchAll=false`: ejecución no interactiva de tests.
- `npm run eject`: eject de CRA; evitar salvo decisión explícita.

## Estructura

```text
src/
├─ app/          # App y rutas
├─ api/          # Cliente API existente
├─ auth/         # Login, registro y rutas protegidas
├─ dashboard/    # Dashboard
├─ game/         # Juego, tablero y estado local
├─ styles/       # Estilos globales
├─ index.js
├─ App.test.js
├─ App.css
└─ logo.svg
```

## Comunicación con backend

- Login: `POST http://localhost:3001/auth/login`.
- Registro: `POST http://localhost:3001/auth/register`.
- El JWT se guarda en `localStorage` como `token`.
- `PrivateRoute` solo valida la existencia local del token.

## Notas

- `src/api/authApi.js` conserva el cliente API previo, pero las pantallas actuales siguen haciendo llamadas directas con Axios.
- `App.test.js` todavía es un test heredado de CRA y no representa las rutas actuales.
- `App.css` y `logo.svg` se conservan como restos CRA no conectados.
