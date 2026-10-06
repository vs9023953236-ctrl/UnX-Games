const productionAllowedOrigins = new Set([
  'https://www.intrax.in',
  'https://intrax.in',
  'https://gamehubnepal.vercel.app',
  'https://main-game-hub-nepal.vercel.app',
]);

export function isAllowedOrigin(origin: string | undefined, isProduction: boolean): boolean {
  if (!origin) return false;
  if (productionAllowedOrigins.has(origin)) return true;
  if (isProduction) return false;

  try {
    const parsedOrigin = new URL(origin);
    return parsedOrigin.protocol === 'http:' &&
      ['localhost', '127.0.0.1'].includes(parsedOrigin.hostname);
  } catch {
    return false;
  }
}
