/**
 * Unx Games - Pure Cloudflare R2 & Database Image Engine
 * Uses ONLY real database images and direct Cloudflare R2 storage URLs.
 * Zero SVGs, zero placeholders.
 */

// Official Cloudflare R2 CDN Base Domain
export const R2_BASE_URL = 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev';

// Default Master R2 Assets
export const DEFAULT_R2_PRODUCT_IMAGE = `${R2_BASE_URL}/Product%20Images/free%20fire.png`;
export const DEFAULT_R2_BANNER_IMAGE = `${R2_BASE_URL}/Banners/free%20fire%20Banner.png`;

// High-Resolution Cloudflare R2 Database Mappings for All Games
export const VERIFIED_GAME_IMAGES: Record<string, { image: string; banner: string }> = {
  'prod-free-fire': {
    image: `${R2_BASE_URL}/Product%20Images/free%20fire.png`,
    banner: `${R2_BASE_URL}/Banners/free%20fire%20Banner.png`,
  },
  'prod-pubg-mobile': {
    image: `${R2_BASE_URL}/Product%20Images/PUBG%20MOBILE%20UC.png`,
    banner: `${R2_BASE_URL}/Banners/Pubg%20banner.png`,
  },
  'prod-roblox-robux': {
    image: `${R2_BASE_URL}/Product%20Images/Roblox%20Robux.png`,
    banner: `${R2_BASE_URL}/Banners/Roblox%20banner.png`,
  },
  'prod-mobile-legends': {
    image: `${R2_BASE_URL}/Product%20Images/Mobile%20Legends%20Diamonds.png`,
    banner: `${R2_BASE_URL}/Banners/Mobile%20legend%20banner.png`,
  },
  'prod-steam-wallet': {
    image: `${R2_BASE_URL}/Product%20Images/Steam%20Wallet%20USD%20%20NPR%20Gift%20Card.png`,
    banner: `${R2_BASE_URL}/Banners/Stem%20Wallte%20banner.png`,
  },
  'prod-google-play-usd': {
    image: `${R2_BASE_URL}/Product%20Images/Google%20Play%20Gift%20Card%20(US).png`,
    banner: `${R2_BASE_URL}/Banners/free%20fire%20Banner.png`,
  },
  'prod-itunes-gift-card': {
    image: `${R2_BASE_URL}/Product%20Images/iTunes%20Gift%20Card%20(US).png`,
    banner: `${R2_BASE_URL}/Banners/free%20fire%20Banner.png`,
  },
  'prod-valorant-points': {
    image: `${R2_BASE_URL}/Product%20Images/Valorant%20Points%20(VP).png`,
    banner: `${R2_BASE_URL}/Banners/free%20fire%20Banner.png`,
  },
  'prod-genshin-impact': {
    image: `${R2_BASE_URL}/Product%20Images/Genshin%20Impact%20Crystals.png`,
    banner: `${R2_BASE_URL}/Banners/free%20fire%20Banner.png`,
  },
  'prod-c2': {
    image: `${R2_BASE_URL}/Product%20Images/Xbox%20Game%20Pass%20Ultimate.png`,
    banner: `${R2_BASE_URL}/Banners/free%20fire%20Banner.png`,
  },
  'prod-clash-of-clans': {
    image: `${R2_BASE_URL}/Product%20Images/Clash%20of%20Clans%20Gems.png`,
    banner: `${R2_BASE_URL}/Banners/free%20fire%20Banner.png`,
  },
  'prod-honor-of-kings': {
    image: `${R2_BASE_URL}/Product%20Images/Honor%20of%20Kings%20Tokens.png`,
    banner: `${R2_BASE_URL}/Banners/free%20fire%20Banner.png`,
  },
  'prod-discord-nitro': {
    image: `${R2_BASE_URL}/Product%20Images/Discord%20Nitro%20%26%20Nitro.png`,
    banner: `${R2_BASE_URL}/Banners/free%20fire%20Banner.png`,
  },
  'prod-netflix-nepal': {
    image: `${R2_BASE_URL}/Product%20Images/Netflix%20Premium.png`,
    banner: `${R2_BASE_URL}/Banners/free%20fire%20Banner.png`,
  },
  'prod-brawl-stars': {
    image: `${R2_BASE_URL}/Product%20Images/Brawl%20Stars%20Gems%20%26%20Pass.png`,
    banner: `${R2_BASE_URL}/Banners/free%20fire%20Banner.png`,
  },
  'prod-efootball': {
    image: `${R2_BASE_URL}/Product%20Images/eFootball%20PES%20Coins.png`,
    banner: `${R2_BASE_URL}/Banners/free%20fire%20Banner.png`,
  },
  'prod-blood-strike': {
    image: `${R2_BASE_URL}/Product%20Images/Blood%20Strike%20Gold.png`,
    banner: `${R2_BASE_URL}/Banners/free%20fire%20Banner.png`,
  },
  'prod-cod-mobile': {
    image: `${R2_BASE_URL}/Product%20Images/Call%20of%20Duty%20Mobile%20CP.png`,
    banner: `${R2_BASE_URL}/Banners/free%20fire%20Banner.png`,
  },
  'prod-minecraft-minecoins': {
    image: `${R2_BASE_URL}/Product%20Images/Minecraft%20Minecoins%20%26%20PC%20Edition.png`,
    banner: `${R2_BASE_URL}/Banners/free%20fire%20Banner.png`,
  },
};

export const DEFAULT_FALLBACK_IMAGE = DEFAULT_R2_PRODUCT_IMAGE;

/**
 * Returns database image or official Cloudflare R2 link
 */
export const getSafeGameImage = (product: { id?: string; name?: string; gameName?: string; image?: string; image_url?: string; imageUrl?: string }): string => {
  if (!product) return DEFAULT_R2_PRODUCT_IMAGE;

  // 1. Direct database image if present and clean
  const existing = (product.image || product.imageUrl || product.image_url || '').trim();
  if (existing && !existing.includes('komododecks') && !existing.includes('file_0000000') && !existing.startsWith('data:image/svg')) {
    return existing;
  }

  // 2. Direct matched ID from Cloudflare R2
  if (product.id && VERIFIED_GAME_IMAGES[product.id]?.image) {
    return VERIFIED_GAME_IMAGES[product.id].image;
  }

  // 3. Name-based match from Cloudflare R2
  const name = (product.name || product.gameName || '').toLowerCase();
  for (const [id, data] of Object.entries(VERIFIED_GAME_IMAGES)) {
    const keyWord = id.replace('prod-', '').replace(/-/g, ' ');
    if (name.includes(keyWord)) {
      return data.image;
    }
  }

  // 4. Default Official Cloudflare R2 Product Image
  return DEFAULT_R2_PRODUCT_IMAGE;
};

/**
 * Safe Image onError handler that falls back directly to official R2 asset
 */
export const handleImageError = (
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  _fallbackTitle?: string
) => {
  const target = e.currentTarget;
  if (!target) return;

  const alreadyFailed = target.getAttribute('data-has-failed') === 'true';
  if (alreadyFailed) return;

  target.setAttribute('data-has-failed', 'true');
  target.src = DEFAULT_R2_PRODUCT_IMAGE;
};
