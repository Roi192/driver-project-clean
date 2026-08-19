const PRODUCTION_ORIGINS = [
  'https://driver-project.vercel.app',
  'capacitor://localhost',
];

/** Returns true for any allowed request origin. */
const isAllowedOrigin = (origin: string | null): boolean => {
  if (!origin) return false;
  if (PRODUCTION_ORIGINS.includes(origin)) return true;
  // Any localhost / 127.0.0.1 port (development)
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return true;
  if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return true;
  // Vercel preview deployments (driver-project-*.vercel.app)
  if (/^https:\/\/driver-project(-[a-z0-9]+)*\.vercel\.app$/.test(origin)) return true;
  return false;
};

export const getCorsHeaders = (origin: string | null): Record<string, string> => ({
  'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin! : PRODUCTION_ORIGINS[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
});
