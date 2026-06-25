// The native app talks to the existing Spontany Express + SQLite backend.
export const BASE_URL = 'https://spontany.up.railway.app';

// Dev-only shortcut. The real magic-link auth flow is Phase 5; until then, paste
// a user's access_token here (or store one via session.setToken) to test the
// calendar against live data. Leave empty and the app runs on the demo fortnight.
export const DEV_TOKEN = '';
