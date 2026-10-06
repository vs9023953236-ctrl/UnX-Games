/**
 * Unx Games - Centralized Branding Utilities & Constants (Official 4K Vector Definition)
 */

export const OFFICIAL_GAME_HUB_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="100%" height="100%" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">
  <defs>
    <!-- 1. Outer Squircle Glass Rim Gradients -->
    <linearGradient id="rim-glass-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34D399" stop-opacity="0.95" />
      <stop offset="25%" stop-color="#10B981" stop-opacity="0.85" />
      <stop offset="60%" stop-color="#059669" stop-opacity="0.75" />
      <stop offset="85%" stop-color="#10B981" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#6EE7B7" stop-opacity="0.95" />
    </linearGradient>

    <linearGradient id="badge-face-sheen" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="45%" stop-color="#FFFFFF" />
      <stop offset="80%" stop-color="#F8FCF9" />
      <stop offset="100%" stop-color="#F0FDF4" />
    </linearGradient>

    <linearGradient id="glass-reflect-top" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.6" />
      <stop offset="35%" stop-color="#A7F3D0" stop-opacity="0.25" />
      <stop offset="70%" stop-color="#FFFFFF" stop-opacity="0.05" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
    </linearGradient>

    <!-- 2. Main 3D Emerald Ribbon ("G" Swoosh) Gradients -->
    <linearGradient id="swoosh-main-body" x1="15%" y1="10%" x2="85%" y2="90%">
      <stop offset="0%" stop-color="#10B981" />
      <stop offset="25%" stop-color="#059669" />
      <stop offset="55%" stop-color="#047857" />
      <stop offset="85%" stop-color="#10B981" />
      <stop offset="100%" stop-color="#34D399" />
    </linearGradient>

    <linearGradient id="swoosh-top-blade" x1="0%" y1="0%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="#34D399" />
      <stop offset="30%" stop-color="#10B981" />
      <stop offset="70%" stop-color="#059669" />
      <stop offset="100%" stop-color="#047857" />
    </linearGradient>

    <linearGradient id="swoosh-depth-shadow" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#064E3B" />
      <stop offset="50%" stop-color="#022C22" />
      <stop offset="100%" stop-color="#064E3B" />
    </linearGradient>

    <linearGradient id="swoosh-crest-shine" x1="0%" y1="0%" x2="100%" y2="30%">
      <stop offset="0%" stop-color="#A7F3D0" stop-opacity="0.8" />
      <stop offset="50%" stop-color="#6EE7B7" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
    </linearGradient>

    <linearGradient id="swoosh-inner-rim" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#059669" />
      <stop offset="50%" stop-color="#10B981" />
      <stop offset="100%" stop-color="#6EE7B7" />
    </linearGradient>

    <!-- 3. Typography Gradients -->
    <linearGradient id="hub-text-grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#10B981" />
      <stop offset="50%" stop-color="#059669" />
      <stop offset="100%" stop-color="#047857" />
    </linearGradient>

    <!-- 4. Shadow Filters -->
    <filter id="soft-card-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="16" stdDeviation="28" flood-color="#047857" flood-opacity="0.16" />
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#0F172A" flood-opacity="0.08" />
    </filter>

    <filter id="element-3d-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#064E3B" flood-opacity="0.32" />
    </filter>

    <filter id="pad-inner-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#047857" flood-opacity="0.22" />
    </filter>
  </defs>

  <!-- 1. SQUIRCLE BADGE CONTAINER -->
  <g filter="url(#soft-card-shadow)">
    <rect x="36" y="36" width="952" height="952" rx="192" fill="url(#badge-face-sheen)" stroke="url(#rim-glass-grad)" stroke-width="20" />
    <rect x="46" y="46" width="932" height="932" rx="182" fill="none" stroke="#FFFFFF" stroke-width="6" opacity="0.8" />
    <path d="M 64 240 C 64 120 120 64 240 64 L 560 64 C 400 96 160 200 64 380 Z" fill="url(#glass-reflect-top)" />
    <rect x="26" y="26" width="972" height="972" rx="202" fill="none" stroke="#34D399" stroke-width="4" opacity="0.45" />
  </g>

  <!-- 2. CENTRAL EMBLEM: 3D EMERALD SWOOSH -->
  <g filter="url(#element-3d-shadow)">
    <path d="M 270 660 C 370 705 560 705 685 580 C 770 495 770 330 670 240 C 585 160 410 160 315 250 C 230 330 230 460 300 550 C 340 600 395 625 460 625 C 530 625 610 580 650 515 C 670 480 680 435 680 390 L 635 390 C 635 425 625 460 605 490 C 570 540 515 575 460 575 C 410 575 365 555 335 515 C 280 445 280 350 345 285 C 415 215 550 215 620 280 C 695 350 695 470 630 540 C 530 640 375 640 290 605 Z" fill="url(#swoosh-depth-shadow)" />
    <path d="M 260 670 C 380 725 600 700 720 560 C 810 455 800 290 680 200 C 570 120 370 130 265 245 C 160 360 170 520 270 630 C 340 705 435 725 530 710 C 640 690 735 610 765 520 C 770 500 755 480 735 480 L 610 480 C 595 480 585 490 580 505 C 560 550 505 585 450 585 C 385 585 330 550 300 495 C 255 415 265 315 335 255 C 415 185 555 190 630 255 C 690 310 695 395 645 455 C 610 495 555 520 500 515 L 500 445 L 430 445 C 415 445 405 455 405 470 L 405 530 C 405 555 430 575 455 575 C 540 575 620 535 670 470 C 730 390 720 280 645 215 C 550 135 385 135 285 235 C 190 330 185 470 260 565 C 300 615 365 645 440 645 C 500 645 565 620 610 580 L 590 630 C 530 675 450 700 370 695 C 310 690 260 665 220 625 Z" fill="url(#swoosh-main-body)" />
    <path d="M 800 125 C 800 125 680 180 570 180 C 420 180 300 250 240 360 C 220 400 245 420 270 395 C 340 320 440 265 570 260 C 690 255 765 210 800 125 Z" fill="url(#swoosh-top-blade)" />
    <path d="M 790 135 C 730 185 640 215 540 215 C 410 215 310 275 255 375 C 250 370 250 355 265 330 C 320 235 435 180 565 175 C 670 170 755 140 790 135 Z" fill="url(#swoosh-crest-shine)" />
    <path d="M 270 680 C 380 735 550 700 640 620 C 550 670 420 675 320 635 C 275 615 225 570 190 515 C 200 585 230 645 270 680 Z" fill="url(#swoosh-inner-rim)" />
  </g>

  <!-- 3. CENTRAL GAMEPAD CONTROLLER (WHITE) -->
  <g transform="translate(485, 455) scale(0.95)" filter="url(#pad-inner-shadow)">
    <path d="M -155, -45 C -175, -45 -195, -20 -195, 10 C -195, 55 -165, 115 -125, 125 C -95, 130 -75, 100 -65, 65 C -55, 35 -30, 25 0, 25 C 30, 25 55, 35 65, 65 C 75, 100 95, 130 125, 125 C 165, 115 195, 55 195, 10 C 195, -20 175, -45 155, -45 C 115, -45 80, -25 0, -25 C -80, -25 -115, -45 -155, -45 Z" fill="#FFFFFF" stroke="#10B981" stroke-width="7" stroke-linejoin="round" />
    <g transform="translate(-115, 15)">
      <path d="M -9,-32 L 9,-32 C 12,-32 14,-30 14,-27 L 14,-14 L 27,-14 C 30,-14 32,-12 32,-9 L 32,9 C 32,12 30,14 27,14 L 14,14 L 14,27 C 14,30 12,32 9,32 L -9,32 C -12,32 -14,30 -14,27 L -14,14 L -27,14 C -30,14 -32,12 -32,9 L -32,-9 C -32,-12 -30,-14 -27,-14 L -14,-14 L -14,-27 C -14,-30 -12,-32 -9,-32 Z" fill="#10B981" />
      <circle cx="0" cy="0" r="4.5" fill="#047857" />
    </g>
    <circle cx="-42" cy="55" r="22" fill="#FFFFFF" stroke="#10B981" stroke-width="5" />
    <circle cx="-42" cy="55" r="14" fill="#10B981" />
    <circle cx="-42" cy="55" r="7" fill="#047857" />
    <circle cx="42" cy="55" r="22" fill="#FFFFFF" stroke="#10B981" stroke-width="5" />
    <circle cx="42" cy="55" r="14" fill="#10B981" />
    <circle cx="42" cy="55" r="7" fill="#047857" />
    <g transform="translate(115, 15)">
      <circle cx="0" cy="-21" r="9" fill="#10B981" />
      <circle cx="21" cy="0" r="9" fill="#10B981" />
      <circle cx="0" cy="21" r="9" fill="#10B981" />
      <circle cx="-21" cy="0" r="9" fill="#10B981" />
    </g>
  </g>

  <!-- 4. NEPAL NATIONAL FLAG EMBLEM -->
  <g transform="translate(640, 310) scale(1.18)" filter="url(#element-3d-shadow)">
    <path d="M 0, -5 L 115, 75 L 42, 75 L 130, 165 L 0, 165 Z" fill="#059669" stroke="#047857" stroke-width="5" stroke-linejoin="round" />
    <path d="M 6, 4 L 100, 68 L 38, 68 L 115, 153 L 6, 153 Z" fill="#DC2626" />
    <g transform="translate(36, 46) scale(0.62)">
      <path d="M -18,0 C -18,14 18,14 18,0 C 14,8 -14,8 -18,0 Z" fill="#FFFFFF" />
      <circle cx="0" cy="3" r="5" fill="#FFFFFF" />
      <path d="M -12,2 L -8,-4 L -4,0 L 0,-6 L 4,0 L 8,-4 L 12,2 Z" fill="#FFFFFF" />
    </g>
    <g transform="translate(42, 114) scale(0.68)">
      <circle cx="0" cy="0" r="7" fill="#FFFFFF" />
      <path d="M 0,-18 L 3,-9 L 0,-6 L -3,-9 Z" fill="#FFFFFF" />
      <path d="M 9,-15 L 9,-6 L 6,-4 L 5,-9 Z" fill="#FFFFFF" />
      <path d="M 15,-9 L 11,-2 L 7,-3 L 9,-7 Z" fill="#FFFFFF" />
      <path d="M 18,0 L 9,3 L 6,0 L 9,-3 Z" fill="#FFFFFF" />
      <path d="M 15,9 L 7,3 L 6,6 L 11,8 Z" fill="#FFFFFF" />
      <path d="M 9,15 L 5,7 L 2,8 L 3,12 Z" fill="#FFFFFF" />
      <path d="M 0,18 L -3,9 L 0,6 L 3,9 Z" fill="#FFFFFF" />
      <path d="M -9,15 L -5,7 L -2,8 L -3,12 Z" fill="#FFFFFF" />
      <path d="M -15,9 L -7,3 L -6,6 L -11,8 Z" fill="#FFFFFF" />
      <path d="M -18,0 L -9,-3 L -6,0 L -9,3 Z" fill="#FFFFFF" />
      <path d="M -15,-9 L -11,-2 L -7,-3 L -9,-7 Z" fill="#FFFFFF" />
      <path d="M -9,-15 L -9,-6 L -6,-4 L -5,-9 Z" fill="#FFFFFF" />
    </g>
  </g>

  <!-- 5. TYPOGRAPHY: UNX GAMES -->
  <g transform="translate(512, 755)">
    <text x="-15" y="0" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="108" font-weight="900" font-style="italic" letter-spacing="-1px" fill="#0F172A">UNX</text>
    <text x="15" y="0" text-anchor="start" font-family="system-ui, -apple-system, sans-serif" font-size="108" font-weight="900" font-style="italic" letter-spacing="-1px" fill="url(#hub-text-grad)">GAMES</text>
  </g>
  <g transform="translate(512, 825)">
    <line x1="-310" y1="-8" x2="-140" y2="-8" stroke="#10B981" stroke-width="7" stroke-linecap="round" />
    <text x="0" y="0" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="900" letter-spacing="18px" fill="#0F172A">NEPAL</text>
    <line x1="158" y1="-8" x2="328" y2="-8" stroke="#10B981" stroke-width="7" stroke-linecap="round" />
  </g>
  <g transform="translate(512, 878)">
    <text x="0" y="0" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="700" letter-spacing="8px" fill="#334155">PLAY MORE, LIVE BETTER</text>
  </g>
</svg>`;

export const OFFICIAL_R2_LOGO = 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/App%20Logo/unx.png';
export const AUTH_R2_HORIZONTAL_LOGO = 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/App%20Logo/unx.png';
export const OFFICIAL_LOGO_URL = OFFICIAL_R2_LOGO;
export const OFFICIAL_LOGO_LARGE_URL = OFFICIAL_R2_LOGO;
export const OFFICIAL_LOGO_SVG_URL = OFFICIAL_R2_LOGO;
export const OFFICIAL_LOCAL_LOGO = OFFICIAL_R2_LOGO;
export const OFFICIAL_LOGO_DATA_URI = OFFICIAL_R2_LOGO;

/**
 * Validate an uploaded logo image file
 */
export const validateLogoFile = (
  file: File
): Promise<{
  valid: boolean;
  error?: string;
  dataUrl?: string;
  dimensions?: { width: number; height: number };
}> => {
  return new Promise((resolve) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      resolve({
        valid: false,
        error: 'Invalid file format. Please upload a PNG, JPG, WebP, or SVG logo image.',
      });
      return;
    }

    const maxSize = 6 * 1024 * 1024; // 6MB limit
    if (file.size > maxSize) {
      resolve({
        valid: false,
        error: `File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed logo size is 6MB.`,
      });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      if (img.width < 64 || img.height < 64) {
        resolve({
          valid: false,
          error: 'Image resolution is too low. Please upload a logo of at least 64x64 pixels.',
        });
      } else {
        resolve({
          valid: true,
          dataUrl: objectUrl,
          dimensions: { width: img.width, height: img.height },
        });
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        valid: false,
        error: 'Could not parse the uploaded image file.',
      });
    };
    img.src = objectUrl;
  });
};

/**
 * Update browser document favicon links dynamically
 */
export const updateDocumentFavicon = (logoUrl: string | undefined) => {
  if (typeof document === 'undefined') return;

  const targetUrl = logoUrl || OFFICIAL_LOGO_DATA_URI;
  const selectors = ["link[rel='icon']", "link[rel='shortcut icon']", "link[rel='apple-touch-icon']"];

  selectors.forEach((selector) => {
    let link = document.querySelector(selector) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      if (selector.includes('apple')) {
        link.rel = 'apple-touch-icon';
      } else {
        link.rel = 'icon';
      }
      document.head.appendChild(link);
    }
    link.href = targetUrl;
  });
};

export const ESEWA_DEFAULT_QR = 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Esewa.png';
export const KHALTI_DEFAULT_QR = 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Khalti.jpg';

// Official Brand & Legal Company Definitions
export const PRIMARY_BRAND_NAME = 'Unx Games';
export const LEGAL_COMPANY_NAME = 'intraX Pvt Ltd';
export const COPYRIGHT_NOTICE = '© Unx Games By intraX Pvt Ltd';
export const BRAND_COMPANY_LINE = 'Unx Games By intraX Pvt Ltd';
export const EMAIL_FOOTER_NOTICE = 'Unx Games By intraX Pvt Ltd';
