# apps/mobile

Expo (React Native + TypeScript) citizen app for **Nivaran**.

## Run

```bash
# from repo root — API must be up for the splash health check
pnpm --filter @civic/api dev

# in another terminal
cd apps/mobile
pnpm start
```

Set `EXPO_PUBLIC_API_URL` when using a physical device (e.g. `http://192.168.x.x:4000`).

## Screens

| Screen | Figma | API |
| --- | --- | --- |
| Landing / splash | `53:7070` | `GET /health` |
