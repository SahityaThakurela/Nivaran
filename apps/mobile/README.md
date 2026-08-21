# apps/mobile

Expo (React Native + TypeScript) citizen app for **Nivaran**.

## Run

```bash
# terminal 1 — API
pnpm --filter @civic/api dev

# terminal 2
cd apps/mobile
pnpm start
```

### Env (`apps/mobile/.env`)

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | API base (default `http://127.0.0.1:4000`; use `10.0.2.2` on Android emulator) |
| `EXPO_PUBLIC_DEFAULT_CITY_ID` | Fallback `cityId` for `POST /api/issues` when the user has none |

## Screens

| Screen | Figma | API |
| --- | --- | --- |
| Landing | `53:7070` | `GET /health` |
| Login / Signup | `53:7239` | `POST /api/auth/login`, `POST /api/auth/register` |
| Home | `53:7099` | `GET /api/issues` |
| Capture | `53:7291` | camera / gallery → next screen |
| Report Details | `53:7336` | `POST /api/issues` |
| Track Issue | `53:7590` | `GET /api/issues/:id` |
