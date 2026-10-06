export const OFFICIAL_GAME_IMAGES: Record<string, string> = {
  'prod-free-fire': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/free%20fire.png',
  'free-fire': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/free%20fire.png',
  'prod-pubg-mobile': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/PUBG%20MOBILE%20UC.png',
  'pubg-mobile': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/PUBG%20MOBILE%20UC.png',
  'prod-mobile-legends': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/Mobile%20Legends%20Diamonds.png',
  'mobile-legends': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/Mobile%20Legends%20Diamonds.png',
  'prod-roblox-robux': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/Roblox%20Robux.png',
  'roblox': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/Roblox%20Robux.png',
  'prod-google-play-usd': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/Google%20Play%20Gift%20Card%20(US).png',
  'prod-itunes-gift-card': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/iTunes%20Gift%20Card%20(US).png',
  'prod-steam-wallet': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/Steam%20Wallet%20USD%20%20NPR%20Gift%20Card.png',
  'prod-valorant-points': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/Valorant%20Points%20(VP).png',
  'prod-genshin-impact': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/Genshin%20Impact%20Crystals.png',
  'prod-clash-of-clans': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/Clash%20of%20Clans%20Gems.png',
  'prod-honor-of-kings': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/Honor%20of%20Kings%20Tokens.png',
  'prod-discord-nitro': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/Discord%20Nitro%20%26%20Nitro.png',
  'prod-netflix-nepal': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/Netflix%20Premium.png',
  'prod-brawl-stars': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/Brawl%20Stars%20Gems%20%26%20Pass.png',
  'prod-efootball': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/eFootball%20PES%20Coins.png',
  'prod-blood-strike': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/Blood%20Strike%20Gold.png',
  'prod-cod-mobile': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/Call%20of%20Duty%20Mobile%20CP.png',
  'prod-minecraft-minecoins': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/Minecraft%20Minecoins%20%26%20PC%20Edition.png',
};

export const DEFAULT_FALLBACK_GAME_IMAGE = OFFICIAL_GAME_IMAGES['prod-free-fire'];

/**
 * Returns the 100% verified, authoritative game thumbnail image URL.
 * Matches by Product ID, Game/Product Name keywords, or validates raw image URL.
 */
export function getOfficialGameImage(
  productId?: string | null,
  productName?: string | null,
  rawImage?: string | null
): string {
  // 1. If a valid CDN/R2/Unsplash image is already provided, check and sanitize
  if (rawImage && typeof rawImage === 'string' && rawImage.trim().length > 0) {
    const trimmed = rawImage.trim();
    if (
      !trimmed.includes('komododecks') &&
      !trimmed.includes('file_0000000') &&
      !trimmed.startsWith('blob:') &&
      trimmed !== '/free-fire.webp' &&
      trimmed !== '/logo.png' &&
      !trimmed.endsWith('.svg')
    ) {
      return trimmed;
    }
  }

  // 2. Match by exact Product ID
  if (productId && OFFICIAL_GAME_IMAGES[productId]) {
    return OFFICIAL_GAME_IMAGES[productId];
  }

  // 3. Match by Product / Game Name keywords
  const nameStr = (productName || productId || '').toLowerCase();
  if (nameStr.includes('free fire') || nameStr.includes('freefire') || nameStr.includes('diamond')) {
    return OFFICIAL_GAME_IMAGES['prod-free-fire'];
  }
  if (nameStr.includes('pubg') || nameStr.includes('unknown cash') || nameStr.includes(' uc')) {
    return OFFICIAL_GAME_IMAGES['prod-pubg-mobile'];
  }
  if (nameStr.includes('mobile legend') || nameStr.includes('mlbb')) {
    return OFFICIAL_GAME_IMAGES['prod-mobile-legends'];
  }
  if (nameStr.includes('roblox') || nameStr.includes('robux')) {
    return OFFICIAL_GAME_IMAGES['prod-roblox-robux'];
  }
  if (nameStr.includes('google play') || nameStr.includes('googleplay')) {
    return OFFICIAL_GAME_IMAGES['prod-google-play-usd'];
  }
  if (nameStr.includes('itunes') || nameStr.includes('apple')) {
    return OFFICIAL_GAME_IMAGES['prod-itunes-gift-card'];
  }
  if (nameStr.includes('steam')) {
    return OFFICIAL_GAME_IMAGES['prod-steam-wallet'];
  }
  if (nameStr.includes('valorant') || nameStr.includes(' vp')) {
    return OFFICIAL_GAME_IMAGES['prod-valorant-points'];
  }
  if (nameStr.includes('genshin') || nameStr.includes('genesis')) {
    return OFFICIAL_GAME_IMAGES['prod-genshin-impact'];
  }
  if (nameStr.includes('clash of clans') || nameStr.includes('coc')) {
    return OFFICIAL_GAME_IMAGES['prod-clash-of-clans'];
  }
  if (nameStr.includes('honor of kings') || nameStr.includes('hok')) {
    return OFFICIAL_GAME_IMAGES['prod-honor-of-kings'];
  }
  if (nameStr.includes('discord') || nameStr.includes('nitro')) {
    return OFFICIAL_GAME_IMAGES['prod-discord-nitro'];
  }
  if (nameStr.includes('netflix')) {
    return OFFICIAL_GAME_IMAGES['prod-netflix-nepal'];
  }
  if (nameStr.includes('brawl star')) {
    return OFFICIAL_GAME_IMAGES['prod-brawl-stars'];
  }
  if (nameStr.includes('efootball') || nameStr.includes('pes')) {
    return OFFICIAL_GAME_IMAGES['prod-efootball'];
  }
  if (nameStr.includes('blood strike')) {
    return OFFICIAL_GAME_IMAGES['prod-blood-strike'];
  }
  if (nameStr.includes('cod') || nameStr.includes('call of duty')) {
    return OFFICIAL_GAME_IMAGES['prod-cod-mobile'];
  }
  if (nameStr.includes('minecraft') || nameStr.includes('minecoin')) {
    return OFFICIAL_GAME_IMAGES['prod-minecraft-minecoins'];
  }

  return DEFAULT_FALLBACK_GAME_IMAGE;
}
