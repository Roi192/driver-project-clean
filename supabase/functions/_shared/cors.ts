// CORS security note: actual access control is enforced by JWT verification in each
// function. CORS is a browser-layer mechanism; server-to-server calls are unaffected.
// We allow the production domains, any Vercel deployment URL, and localhost so that
// preview deployments and local development work without extra config.
//
// Allowed origins:
//   https://drivers-binyamin.com          ← primary production domain
//   https://www.drivers-binyamin.com       ← www alias
//   https://driver-project.vercel.app      ← Vercel production
//   *.vercel.app                           ← Vercel preview deployments (JWT is the real guard)
//   http(s)://localhost:<any port>         ← local dev
//   http(s)://127.0.0.1:<any port>         ← local dev alternative
//   capacitor://localhost                  ← Capacitor native app

const PRODUCTION_ORIGINS = [
  'https://drivers-binyamin.com',
  'https://www.drivers-binyamin.com',
  'https://driver-project.vercel.app',
  'capacitor://localhost',
];

/** Returns true for any origin that should receive a permissive CORS header. */
const isAllowedOrigin = (origin: string | null): boolean => {
  if (!origin) return true; // server-to-server: no restriction needed
  if (PRODUCTION_ORIGINS.includes(origin)) return true;
  // Any localhost / 127.0.0.1 port (development)
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return true;
  if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return true;
  // Any Vercel deployment (preview & production); security relies on JWT, not origin
  if (/\.vercel\.app$/.test(origin)) return true;
  // Native Capacitor app
  if (origin.startsWith('capacitor://')) return true;
  return false;
};

export const getCorsHeaders = (origin: string | null): Record<string, string> => {
  const allowed = isAllowedOrigin(origin);
  if (!allowed) {
    console.warn('[CORS] rejected origin:', origin);
  }
  return {
    // Echo the exact allowed origin back; fall back to primary production domain when rejected.
    'Access-Control-Allow-Origin': allowed ? (origin ?? PRODUCTION_ORIGINS[0]) : PRODUCTION_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    // Required so shared caches don't serve one user's ACAO to another origin
    'Vary': 'Origin',
  };
};
