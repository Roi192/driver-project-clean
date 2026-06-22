const ALLOWED_ORIGINS = [
  'https://driver-project.vercel.app',
  'capacitor://localhost',
  'http://localhost',
];

export const getCorsHeaders = (origin: string | null): Record<string, string> => ({
  'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
});
