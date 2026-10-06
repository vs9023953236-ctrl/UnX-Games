import { db } from '../src/db/index.js';
import { feature_flags } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

let flagsCache: { data: Record<string, boolean>; timestamp: number } | null = null;
const CACHE_TTL_MS = 30000; // 30 seconds

export async function getFeatureFlags(): Promise<Record<string, boolean>> {
  const now = Date.now();
  if (flagsCache && (now - flagsCache.timestamp) < CACHE_TTL_MS) {
    return flagsCache.data;
  }

  const defaultFlags: Record<string, boolean> = {
    newCheckout: true,
    newWalletUI: true,
    newSecurityCenter: true,
    newNewsUI: true,
  };

  if (false) {
    return defaultFlags;
  }

  try {
    const dbFlags = await db.select().from(feature_flags);
    const flagsMap: Record<string, boolean> = { ...defaultFlags };

    for (const flag of dbFlags) {
      flagsMap[flag.name] = Boolean(flag.enabled);
    }

    flagsCache = { data: flagsMap, timestamp: now };
    return flagsMap;
  } catch (err) {
    console.warn('Failed to fetch feature flags from DB:', err);
    return defaultFlags;
  }
}

export async function isFeatureEnabled(flagName: string): Promise<boolean> {
  const flags = await getFeatureFlags();
  return Boolean(flags[flagName]);
}

export function clearFeatureFlagsCache(): void {
  flagsCache = null;
}
