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
| `EXPO_PUBLIC_API_URL` | Optional. Leave empty in local dev (auto-uses Mac LAN IP from Expo). Do not use `127.0.0.1` on Android. |
| `EXPO_PUBLIC_DEFAULT_CITY_ID` | Required for filing challenges. Use a `City.id` from the DB (Ranchi, Jharkhand is seeded as `cmtcityranchi00000000001` — run `pnpm prisma:seed` in `apps/api`). |

## Screens

| Screen | Figma | API |
| --- | --- | --- |
| Landing | `53:7070` | `GET /health` |
| Login / Signup | `53:7239` | `POST /api/auth/login`, `POST /api/auth/register` |
| Home | `53:7099` | `GET /api/issues` |
| Capture | `53:7291` | camera / gallery → next screen |
| Report Details | `53:7336` | `POST /api/issues` |
| Track Issue | `53:7590` | `GET /api/issues/:id` |
| My Reports | `53:7413` | `GET /api/issues` (client filter: All / Active / Resolved) |
| Nearby | `53:7756` | `GET /api/issues` + `expo-location` (sort by distance; map pins) |
| Verify Resolution | `53:7905` | `GET /api/issues/:id`; confirm stores `@nivaran/verified/:id` (no feedback API) |
| Notifications | `53:8002` | Derived from `GET /api/issues`; read state in `@nivaran/notif-read` |
| Profile | `53:8164` | Auth fields; Log Out opens bottom sheet (`53:8360`) then clears session → Auth |

### Screens 7–11 notes

- **My Reports** — Stats from list counts; cards open Track Issue; resolved + unverified can open Verify Resolution; New Report → Capture.
- **Nearby** — Citizens only see own reports (API scope). Relative lat/lng pin layout; bottom sheet → Track Issue.
- **Verify Resolution** — Before = `photoUrls[0]`; after = `resolutionEvidenceUrls[0]` or asset fallback. Confirm → AsyncStorage + goBack; Still Unresolved → Track Issue.
- **Notifications** — Synthesized status events via `buildNotificationItems`; Read All clears unread locally; Verify CTA → Verify Resolution.
- **Profile** — Links to My Reports / Notifications; Edit Profile is a no-op alert; Log Out calls `logout()` and resets to Auth.
