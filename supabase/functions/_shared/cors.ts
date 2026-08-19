// CORS security note: actual access control is enforced by JWT verification in each
// function. CORS is a browser-layer mechanism; server-to-server calls are unaffected.
// We allow any Vercel deployment URL and localhost so preview deployments work.

const PRODUCTION_ORIGINS = [
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
  // Any Vercel deployment (preview & production); security relies on JWT
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
    'Access-Control-Allow-Origin': allowed ? (origin ?? '*') : PRODUCTION_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
};
