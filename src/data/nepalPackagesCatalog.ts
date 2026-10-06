import { ProductPackage } from '../types';

export const ALL_NEPAL_PACKAGES: Record<string, ProductPackage[]> = {
  // 1. Garena Free Fire Diamonds
  'prod-free-fire': [
    { id: 'ff-25', name: '25 Diamonds (Starter Event)', price: 30, originalPrice: 35, amountValue: '25 💎' },
    { id: 'ff-50', name: '50 Diamonds (Top-up Event)', price: 55, originalPrice: 65, amountValue: '50 💎' },
    { id: 'ff-1', name: '115 Diamonds (100 + 15 Bonus)', price: 95, originalPrice: 110, amountValue: '115 💎' },
    { id: 'ff-2', name: '240 Diamonds (200 + 40 Bonus)', price: 195, originalPrice: 220, amountValue: '240 💎', popular: true },
    { id: 'ff-355', name: '355 Diamonds (300 + 55 Bonus)', price: 285, originalPrice: 320, amountValue: '355 💎' },
    { id: 'ff-480', name: '480 Diamonds (400 + 80 Bonus)', price: 385, originalPrice: 430, amountValue: '480 💎' },
    { id: 'ff-3', name: '610 Diamonds (500 + 110 Bonus)', price: 480, originalPrice: 540, amountValue: '610 💎', popular: true },
    { id: 'ff-850', name: '850 Diamonds (700 + 150 Bonus)', price: 675, originalPrice: 750, amountValue: '850 💎' },
    { id: 'ff-4', name: '1240 Diamonds (1000 + 240 Bonus)', price: 960, originalPrice: 1080, amountValue: '1240 💎' },
    { id: 'ff-1850', name: '1850 Diamonds (1500 + 350 Bonus)', price: 1440, originalPrice: 1600, amountValue: '1850 💎' },
    { id: 'ff-2530', name: '2530 Diamonds (2000 + 530 Bonus)', price: 1920, originalPrice: 2150, amountValue: '2530 💎' },
    { id: 'ff-5060', name: '5060 Diamonds (4000 + 1060 Bonus)', price: 3840, originalPrice: 4250, amountValue: '5060 💎' },
    { id: 'ff-wl', name: 'Weekly Lite Pass', price: 60, originalPrice: 70, amountValue: 'Weekly Lite 🎫' },
    { id: 'ff-5', name: 'Weekly Membership (450 💎 Total)', price: 215, originalPrice: 240, amountValue: 'Weekly Pass 🎫', popular: true },
    { id: 'ff-6', name: 'Monthly Membership (2600 💎 Total)', price: 1050, originalPrice: 1200, amountValue: 'Monthly Pass 👑' },
    { id: 'ff-super', name: 'Super VIP Combo (Weekly + Monthly)', price: 1250, originalPrice: 1440, amountValue: 'VIP Combo 🌟' },
    { id: 'ff-lvl', name: 'Level Up Pass (802 💎 Claim)', price: 210, originalPrice: 235, amountValue: 'Level Up 🚀' },
    { id: 'ff-evo-50', name: 'Evo Gun 50 Token Box', price: 185, originalPrice: 210, amountValue: '50 Evo Tokens 🔫' },
    { id: 'ff-evo-100', name: 'Evo Gun 100 Token Box', price: 360, originalPrice: 400, amountValue: '100 Evo Tokens 🔫' },
  ],

  // 2. PUBG Mobile UC
  'prod-pubg-mobile': [
    { id: 'pubg-1', name: '60 UC', price: 125, originalPrice: 140, amountValue: '60 UC' },
    { id: 'pubg-120', name: '120 UC', price: 245, originalPrice: 275, amountValue: '120 UC' },
    { id: 'pubg-180', name: '180 UC', price: 365, originalPrice: 410, amountValue: '180 UC' },
    { id: 'pubg-2', name: '325 UC + 25 Bonus (355 UC)', price: 620, originalPrice: 690, amountValue: '355 UC', popular: true },
    { id: 'pubg-3', name: '660 UC + 60 Bonus (720 UC)', price: 1220, originalPrice: 1350, amountValue: '720 UC', popular: true },
    { id: 'pubg-960', name: '960 UC (900 + 60 Bonus)', price: 1690, originalPrice: 1850, amountValue: '960 UC' },
    { id: 'pubg-1320', name: '1320 UC (1200 + 120 Bonus)', price: 2350, originalPrice: 2550, amountValue: '1320 UC' },
    { id: 'pubg-4', name: '1800 UC (1500 + 300 Bonus)', price: 3050, originalPrice: 3350, amountValue: '1800 UC' },
    { id: 'pubg-3850', name: '3850 UC (3000 + 850 Bonus)', price: 6100, originalPrice: 6700, amountValue: '3850 UC' },
    { id: 'pubg-8100', name: '8100 UC (6000 + 2100 Bonus)', price: 12200, originalPrice: 13500, amountValue: '8100 UC' },
    { id: 'pubg-16200', name: '16200 UC (Mega Pack)', price: 24200, originalPrice: 26800, amountValue: '16200 UC 🏆' },
    { id: 'pubg-5', name: 'Royale Pass Upgrade (Elite Pass)', price: 780, originalPrice: 870, amountValue: 'Elite Pass 🎖️', popular: true },
    { id: 'pubg-rp-plus', name: 'Elite Pass Plus (Level 25 Unlock)', price: 1950, originalPrice: 2200, amountValue: 'Elite Plus 🛡️' },
    { id: 'pubg-prime-1m', name: 'Prime Subscription (1 Month)', price: 135, originalPrice: 155, amountValue: 'Prime 1M 👑' },
    { id: 'pubg-prime-plus-1m', name: 'Prime Plus Subscription (1 Month)', price: 1150, originalPrice: 1300, amountValue: 'Prime Plus 1M 🌟' },
  ],

  // 3. Google Play Gift Card (US)
  'prod-google-play-usd': [
    { id: 'gp-5', name: '$5 USD Google Play Gift Card', price: 750, originalPrice: 820, amountValue: '$5 USD' },
    { id: 'gp-10', name: '$10 USD Google Play Gift Card', price: 1480, originalPrice: 1620, amountValue: '$10 USD', popular: true },
    { id: 'gp-15', name: '$15 USD Google Play Gift Card', price: 2200, originalPrice: 2420, amountValue: '$15 USD' },
    { id: 'gp-20', name: '$20 USD Google Play Gift Card', price: 2900, originalPrice: 3200, amountValue: '$20 USD' },
    { id: 'gp-25', name: '$25 USD Google Play Gift Card', price: 3650, originalPrice: 3990, amountValue: '$25 USD', popular: true },
    { id: 'gp-50', name: '$50 USD Google Play Gift Card', price: 7200, originalPrice: 7850, amountValue: '$50 USD' },
    { id: 'gp-100', name: '$100 USD Google Play Gift Card', price: 14300, originalPrice: 15600, amountValue: '$100 USD' },
  ],

  // 4. iTunes Gift Card (US)
  'prod-itunes-gift-card': [
    { id: 'it-5', name: '$5 USD Apple App Store & iTunes Card', price: 750, originalPrice: 820, amountValue: '$5 USD' },
    { id: 'it-10', name: '$10 USD Apple App Store & iTunes Card', price: 1480, originalPrice: 1620, amountValue: '$10 USD', popular: true },
    { id: 'it-15', name: '$15 USD Apple App Store & iTunes Card', price: 2200, originalPrice: 2420, amountValue: '$15 USD' },
    { id: 'it-20', name: '$20 USD Apple App Store & iTunes Card', price: 2900, originalPrice: 3200, amountValue: '$20 USD' },
    { id: 'it-25', name: '$25 USD Apple App Store & iTunes Card', price: 3650, originalPrice: 3990, amountValue: '$25 USD', popular: true },
    { id: 'it-50', name: '$50 USD Apple App Store & iTunes Card', price: 7200, originalPrice: 7850, amountValue: '$50 USD' },
    { id: 'it-100', name: '$100 USD Apple App Store & iTunes Card', price: 14300, originalPrice: 15600, amountValue: '$100 USD' },
  ],

  // 5. Xbox Game Pass Ultimate & Cards
  'prod-c2': [
    { id: 'xbox-10', name: '$10 USD Xbox Gift Card', price: 1480, originalPrice: 1620, amountValue: '$10 USD' },
    { id: 'xbox-25', name: '$25 USD Xbox Gift Card', price: 3650, originalPrice: 3990, amountValue: '$25 USD', popular: true },
    { id: 'xbox-50', name: '$50 USD Xbox Gift Card', price: 7200, originalPrice: 7850, amountValue: '$50 USD' },
    { id: 'xbg-core-1m', name: 'Xbox Game Pass Core (1 Month Online)', price: 1350, originalPrice: 1520, amountValue: '1 Month Core' },
    { id: 'xbg-pc-1m', name: 'PC Game Pass (1 Month Subscription)', price: 1250, originalPrice: 1400, amountValue: '1 Month PC Pass' },
    { id: 'xbg-1m', name: 'Xbox Game Pass Ultimate (1 Month Cloud + PC)', price: 1950, originalPrice: 2200, amountValue: '1 Month Ultimate 🏆', popular: true },
    { id: 'xbg-3m', name: 'Xbox Game Pass Ultimate (3 Months)', price: 5500, originalPrice: 6100, amountValue: '3 Months Ultimate' },
  ],

  // 6. Mobile Legends: Bang Bang
  'prod-mobile-legends': [
    { id: 'mlbb-11', name: '11 Diamonds (10+1)', price: 30, originalPrice: 35, amountValue: '11 💎' },
    { id: 'mlbb-22', name: '22 Diamonds (20+2)', price: 55, originalPrice: 65, amountValue: '22 💎' },
    { id: 'mlbb-56', name: '56 Diamonds (50+6)', price: 125, originalPrice: 140, amountValue: '56 💎' },
    { id: 'mlbb-1', name: '86 Diamonds (78+8)', price: 185, originalPrice: 210, amountValue: '86 💎', popular: true },
    { id: 'mlbb-2', name: '172 Diamonds (156+16)', price: 365, originalPrice: 410, amountValue: '172 💎', popular: true },
    { id: 'mlbb-257', name: '257 Diamonds (234+23)', price: 545, originalPrice: 610, amountValue: '257 💎' },
    { id: 'mlbb-343', name: '343 Diamonds (312+31)', price: 725, originalPrice: 810, amountValue: '343 💎' },
    { id: 'mlbb-429', name: '429 Diamonds (390+39)', price: 910, originalPrice: 1010, amountValue: '429 💎' },
    { id: 'mlbb-514', name: '514 Diamonds (468+46)', price: 1090, originalPrice: 1200, amountValue: '514 💎' },
    { id: 'mlbb-4', name: '706 Diamonds (625+81)', price: 1480, originalPrice: 1650, amountValue: '706 💎' },
    { id: 'mlbb-1050', name: '1050 Diamonds (937+113)', price: 2190, originalPrice: 2450, amountValue: '1050 💎' },
    { id: 'mlbb-2195', name: '2195 Diamonds (1860+335)', price: 4390, originalPrice: 4850, amountValue: '2195 💎' },
    { id: 'mlbb-3688', name: '3688 Diamonds (3099+589)', price: 7350, originalPrice: 8100, amountValue: '3688 💎' },
    { id: 'mlbb-5532', name: '5532 Diamonds (4649+883)', price: 10900, originalPrice: 12000, amountValue: '5532 💎' },
    { id: 'mlbb-5', name: 'Weekly Diamond Pass (1x) (490 💎 Total)', price: 240, originalPrice: 280, amountValue: 'Weekly Pass 🎫', popular: true },
    { id: 'mlbb-wdp-2x', name: 'Weekly Diamond Pass (2x Bundle)', price: 475, originalPrice: 550, amountValue: '2x Weekly Pass 🎫' },
    { id: 'mlbb-wdp-3x', name: 'Weekly Diamond Pass (3x Bundle)', price: 710, originalPrice: 820, amountValue: '3x Weekly Pass 🎫' },
    { id: 'mlbb-twilight', name: 'Twilight Pass (Level 99 Exclusive)', price: 1350, originalPrice: 1500, amountValue: 'Twilight Pass 👑' },
    { id: 'mlbb-starlight', name: 'Starlight Member Pass', price: 480, originalPrice: 550, amountValue: 'Starlight 🌟' },
    { id: 'mlbb-starlight-plus', name: 'Starlight Member Plus Pass', price: 990, originalPrice: 1120, amountValue: 'Starlight Plus 🏆' },
  ],

  // 7. Valorant Points (VP)
  'prod-valorant-points': [
    { id: 'vp-1', name: '475 VP', price: 640, originalPrice: 700, amountValue: '475 VP' },
    { id: 'vp-2', name: '1000 VP (Battle Pass Exact)', price: 1280, originalPrice: 1400, amountValue: '1000 VP', popular: true },
    { id: 'vp-1475', name: '1475 VP', price: 1920, originalPrice: 2100, amountValue: '1475 VP' },
    { id: 'vp-3', name: '2050 VP (Select Skin Pack)', price: 2550, originalPrice: 2800, amountValue: '2050 VP', popular: true },
    { id: 'vp-3650', name: '3650 VP (Deluxe Edition)', price: 4450, originalPrice: 4850, amountValue: '3650 VP' },
    { id: 'vp-4', name: '5350 VP (Exclusive Bundle)', price: 6350, originalPrice: 6900, amountValue: '5350 VP' },
    { id: 'vp-11000', name: '11,000 VP (Ultra / Champions Bundle)', price: 12500, originalPrice: 13800, amountValue: '11000 VP 👑' },
  ],

  // 8. Genshin Impact Crystals
  'prod-genshin-impact': [
    { id: 'gi-1', name: '60 Genesis Crystals', price: 145, originalPrice: 165, amountValue: '60 💠' },
    { id: 'gi-2', name: '300 + 30 Genesis Crystals (330 💠)', price: 680, originalPrice: 760, amountValue: '330 💠' },
    { id: 'gi-3', name: '980 + 110 Genesis Crystals (1090 💠)', price: 2050, originalPrice: 2280, amountValue: '1090 💠' },
    { id: 'gi-1980', name: '1980 + 260 Genesis Crystals (2240 💠)', price: 4100, originalPrice: 4500, amountValue: '2240 💠' },
    { id: 'gi-3280', name: '3280 + 600 Genesis Crystals (3880 💠)', price: 6800, originalPrice: 7450, amountValue: '3880 💠' },
    { id: 'gi-6480', name: '6480 + 1600 Genesis Crystals (8080 💠)', price: 13500, originalPrice: 14800, amountValue: '8080 💠' },
    { id: 'gi-4', name: 'Blessing of the Welkin Moon (30 Days)', price: 680, originalPrice: 770, amountValue: 'Welkin Moon 🌙', popular: true },
    { id: 'gi-welkin-2x', name: 'Blessing of the Welkin Moon (2x - 60 Days)', price: 1350, originalPrice: 1500, amountValue: '2x Welkin Moon 🌙' },
    { id: 'gi-battlepass', name: 'Gnostic Hymn (Battle Pass)', price: 1380, originalPrice: 1550, amountValue: 'Battle Pass 🛡️' },
    { id: 'gi-gnostic-chorus', name: 'Gnostic Chorus (Battle Pass + 10 Levels + Namecard)', price: 2650, originalPrice: 2950, amountValue: 'Gnostic Chorus 👑' },
  ],

  // 9. Steam Wallet USD / NPR Gift Card
  'prod-steam-wallet': [
    { id: 'st-5', name: '$5 USD Steam Wallet Code', price: 750, originalPrice: 820, amountValue: '$5 USD' },
    { id: 'st-10', name: '$10 USD Steam Wallet Code', price: 1480, originalPrice: 1600, amountValue: '$10 USD', popular: true },
    { id: 'st-15', name: '$15 USD Steam Wallet Code', price: 2220, originalPrice: 2400, amountValue: '$15 USD' },
    { id: 'st-20', name: '$20 USD Steam Wallet Code', price: 2950, originalPrice: 3200, amountValue: '$20 USD' },
    { id: 'st-25', name: '$25 USD Steam Wallet Code', price: 3680, originalPrice: 3990, amountValue: '$25 USD', popular: true },
    { id: 'st-50', name: '$50 USD Steam Wallet Code', price: 7300, originalPrice: 7900, amountValue: '$50 USD' },
    { id: 'st-100', name: '$100 USD Steam Wallet Code', price: 14500, originalPrice: 15800, amountValue: '$100 USD' },
    { id: 'st-npr-500', name: 'Rs. 500 NPR Steam Direct Code', price: 580, originalPrice: 650, amountValue: 'NPR 500' },
    { id: 'st-npr-1000', name: 'Rs. 1,000 NPR Steam Direct Code', price: 1150, originalPrice: 1280, amountValue: 'NPR 1000', popular: true },
    { id: 'st-npr-2000', name: 'Rs. 2,000 NPR Steam Direct Code', price: 2280, originalPrice: 2500, amountValue: 'NPR 2000' },
    { id: 'st-npr-5000', name: 'Rs. 5,000 NPR Steam Direct Code', price: 5650, originalPrice: 6200, amountValue: 'NPR 5000' },
  ],

  // 10. Roblox Robux & Cards
  'prod-roblox-robux': [
    { id: 'rbx-1', name: '80 Robux', price: 145, originalPrice: 165, amountValue: '80 R$' },
    { id: 'rbx-160', name: '160 Robux', price: 290, originalPrice: 325, amountValue: '160 R$' },
    { id: 'rbx-2', name: '400 Robux', price: 650, originalPrice: 730, amountValue: '400 R$', popular: true },
    { id: 'rbx-3', name: '800 Robux', price: 1290, originalPrice: 1440, amountValue: '800 R$', popular: true },
    { id: 'rbx-1200', name: '1200 Robux', price: 1920, originalPrice: 2150, amountValue: '1200 R$' },
    { id: 'rbx-4', name: '1700 Robux', price: 2590, originalPrice: 2890, amountValue: '1700 R$' },
    { id: 'rbx-2000', name: '2000 Robux', price: 3150, originalPrice: 3450, amountValue: '2000 R$' },
    { id: 'rbx-4500', name: '4500 Robux', price: 6450, originalPrice: 7100, amountValue: '4500 R$' },
    { id: 'rbx-10000', name: '10,000 Robux', price: 13900, originalPrice: 15200, amountValue: '10000 R$' },
    { id: 'rbx-prem-450', name: 'Roblox Premium 450 (1 Month)', price: 750, originalPrice: 850, amountValue: 'Premium 450 🌟' },
    { id: 'rbx-prem-1000', name: 'Roblox Premium 1000 (1 Month)', price: 1480, originalPrice: 1650, amountValue: 'Premium 1000 👑' },
    { id: 'rbx-gc-10', name: 'Roblox $10 Gift Card (800-1000 R$ + Item)', price: 1480, originalPrice: 1600, amountValue: '$10 USD Card 🎁' },
    { id: 'rbx-gc-25', name: 'Roblox $25 Gift Card (2000-2500 R$ + Item)', price: 3650, originalPrice: 3950, amountValue: '$25 USD Card 🎁' },
    { id: 'rbx-gc-50', name: 'Roblox $50 Gift Card (4500-5000 R$ + Item)', price: 7200, originalPrice: 7850, amountValue: '$50 USD Card 🎁' },
  ],

  // 11. Clash of Clans Gems & Passes
  'prod-clash-of-clans': [
    { id: 'coc-1', name: '80 Gems', price: 135, originalPrice: 155, amountValue: '80 💎' },
    { id: 'coc-2', name: '500 Gems', price: 650, originalPrice: 730, amountValue: '500 💎', popular: true },
    { id: 'coc-3', name: '1200 Gems', price: 1320, originalPrice: 1480, amountValue: '1200 💎' },
    { id: 'coc-2500', name: '2500 Gems (Chest of Gems)', price: 2550, originalPrice: 2850, amountValue: '2500 💎' },
    { id: 'coc-6500', name: '6500 Gems (Sack of Gems)', price: 6450, originalPrice: 7100, amountValue: '6500 💎' },
    { id: 'coc-14000', name: '14000 Gems (Mountain of Gems)', price: 13200, originalPrice: 14500, amountValue: '14000 💎' },
    { id: 'coc-4', name: 'Gold Pass (Current Active Season)', price: 920, originalPrice: 1050, amountValue: 'Gold Pass 🛡️', popular: true },
    { id: 'coc-event', name: 'Event Pass (Seasonal Mini-Pass)', price: 480, originalPrice: 550, amountValue: 'Event Pass 🎫' },
  ],

  // 12. Honor of Kings Tokens
  'prod-honor-of-kings': [
    { id: 'hok-80', name: '80 Tokens', price: 140, originalPrice: 160, amountValue: '80 Tokens' },
    { id: 'hok-240', name: '240 + 17 Tokens (257 Tokens)', price: 390, originalPrice: 440, amountValue: '257 Tokens' },
    { id: 'hok-400', name: '400 + 32 Tokens (432 Tokens)', price: 640, originalPrice: 720, amountValue: '432 Tokens', popular: true },
    { id: 'hok-560', name: '560 + 45 Tokens (605 Tokens)', price: 890, originalPrice: 990, amountValue: '605 Tokens' },
    { id: 'hok-800', name: '800 + 95 Tokens (895 Tokens)', price: 1280, originalPrice: 1420, amountValue: '895 Tokens', popular: true },
    { id: 'hok-1200', name: '1200 + 150 Tokens (1350 Tokens)', price: 1890, originalPrice: 2100, amountValue: '1350 Tokens' },
    { id: 'hok-2400', name: '2400 + 324 Tokens (2724 Tokens)', price: 3750, originalPrice: 4150, amountValue: '2724 Tokens' },
    { id: 'hok-4000', name: '4000 + 580 Tokens (4580 Tokens)', price: 6200, originalPrice: 6850, amountValue: '4580 Tokens' },
    { id: 'hok-8000', name: '8000 + 1160 Tokens (9160 Tokens)', price: 12200, originalPrice: 13500, amountValue: '9160 Tokens' },
    { id: 'hok-wk', name: 'Weekly Card (100 Instant + Daily Tokens)', price: 140, originalPrice: 165, amountValue: 'Weekly Card 🃏' },
    { id: 'hok-wk-plus', name: 'Weekly Card Plus (Super Value Tokens & Vouchers)', price: 390, originalPrice: 440, amountValue: 'Card Plus 👑' },
  ],

  // 13. Discord Nitro & Nitro Basic
  'prod-discord-nitro': [
    { id: 'nitro-basic-1m', name: 'Discord Nitro Basic (1 Month)', price: 450, originalPrice: 520, amountValue: '1 Month Basic', popular: true },
    { id: 'nitro-basic-1y', name: 'Discord Nitro Basic (1 Year)', price: 4500, originalPrice: 5200, amountValue: '1 Year Basic' },
    { id: 'nitro-boost-1m', name: 'Discord Nitro Boost (1 Month - 2 Boosts Included)', price: 1350, originalPrice: 1550, amountValue: '1 Month Full 🚀', popular: true },
    { id: 'nitro-boost-3m', name: 'Discord Nitro Boost (3 Months Promo)', price: 1850, originalPrice: 2200, amountValue: '3 Months Promo' },
    { id: 'nitro-boost-1y', name: 'Discord Nitro Boost (1 Year Full)', price: 13500, originalPrice: 15500, amountValue: '1 Year Full 👑' },
    { id: 'nitro-server-2b', name: '2 Server Boosts (1 Month)', price: 650, originalPrice: 750, amountValue: '2 Boosts 🚀' },
    { id: 'nitro-server-14b', name: '14 Server Boosts Level 3 (1 Month)', price: 3850, originalPrice: 4400, amountValue: 'Level 3 Server 🛡️' },
  ],

  // 14. Netflix Nepal Gift Cards & Plans
  'prod-netflix-nepal': [
    { id: 'nfx-mobile-1m', name: '1 Screen Mobile / Tablet Plan (1 Month)', price: 450, originalPrice: 520, amountValue: '1 Screen Mobile' },
    { id: 'nfx-mobile-3m', name: '1 Screen Mobile / Tablet Plan (3 Months)', price: 1250, originalPrice: 1450, amountValue: '3 Months Mobile' },
    { id: 'nfx-uhd-1m', name: '1 Screen Private Ultra HD 4K (1 Month)', price: 750, originalPrice: 850, amountValue: '1 Screen 4K UHD', popular: true },
    { id: 'nfx-uhd-3m', name: '1 Screen Private Ultra HD 4K (3 Months)', price: 2100, originalPrice: 2450, amountValue: '3 Months 4K UHD' },
    { id: 'nfx-2screen-1m', name: '2 Screens Full HD Plan (1 Month)', price: 1200, originalPrice: 1350, amountValue: '2 Screens HD' },
    { id: 'nfx-4screen-1m', name: '4 Screens Ultra HD 4K Private Account (1 Month)', price: 1850, originalPrice: 2100, amountValue: '4 Screens UHD Private', popular: true },
    { id: 'nfx-4screen-3m', name: '4 Screens Ultra HD 4K Private Account (3 Months)', price: 5400, originalPrice: 6100, amountValue: '3 Months Full Account' },
    { id: 'nfx-gc-15', name: 'Netflix $15 USD Official Gift Card Code', price: 2250, originalPrice: 2450, amountValue: '$15 USD Card' },
    { id: 'nfx-gc-30', name: 'Netflix $30 USD Official Gift Card Code', price: 4450, originalPrice: 4850, amountValue: '$30 USD Card' },
    { id: 'nfx-gc-60', name: 'Netflix $60 USD Official Gift Card Code', price: 8800, originalPrice: 9600, amountValue: '$60 USD Card' },
  ],

  // 15. Brawl Stars Gems & Pass
  'prod-brawl-stars': [
    { id: 'brawl-30', name: '30 Gems', price: 260, originalPrice: 295, amountValue: '30 💎' },
    { id: 'brawl-80', name: '80 Gems', price: 650, originalPrice: 730, amountValue: '80 💎', popular: true },
    { id: 'brawl-170', name: '170 Gems (Skin Pack)', price: 1320, originalPrice: 1480, amountValue: '170 💎', popular: true },
    { id: 'brawl-360', name: '360 Gems', price: 2550, originalPrice: 2850, amountValue: '360 💎' },
    { id: 'brawl-950', name: '950 Gems', price: 6450, originalPrice: 7150, amountValue: '950 💎' },
    { id: 'brawl-2000', name: '2000 Gems (Mega Box Pack)', price: 13200, originalPrice: 14500, amountValue: '2000 💎' },
    { id: 'brawl-pass', name: 'Brawl Pass (Current Season)', price: 950, originalPrice: 1080, amountValue: 'Brawl Pass 🌟', popular: true },
    { id: 'brawl-pass-plus', name: 'Brawl Pass Plus (Color Variants + Title + 20% Progression)', price: 1450, originalPrice: 1650, amountValue: 'Pass Plus 👑' },
  ],

  // 16. eFootball PES Coins & Passes
  'prod-efootball': [
    { id: 'ef-1', name: '130 Coins', price: 175, originalPrice: 195, amountValue: '130 Coins' },
    { id: 'ef-300', name: '300 Coins', price: 390, originalPrice: 440, amountValue: '300 Coins' },
    { id: 'ef-2', name: '550 Coins', price: 690, originalPrice: 780, amountValue: '550 Coins', popular: true },
    { id: 'ef-3', name: '1050 Coins', price: 1290, originalPrice: 1440, amountValue: '1050 Coins', popular: true },
    { id: 'ef-4', name: '2130 Coins', price: 2550, originalPrice: 2850, amountValue: '2130 Coins' },
    { id: 'ef-3250', name: '3250 Coins', price: 3850, originalPrice: 4250, amountValue: '3250 Coins' },
    { id: 'ef-5700', name: '5700 Coins', price: 6450, originalPrice: 7150, amountValue: '5700 Coins' },
    { id: 'ef-12800', name: '12,800 Coins (Club Edition Mega Pack)', price: 13900, originalPrice: 15400, amountValue: '12800 Coins 🏆' },
    { id: 'ef-pass-reg', name: 'Regular Match Pass (50% Discount)', price: 350, originalPrice: 400, amountValue: 'Regular Pass ⚽' },
    { id: 'ef-pass-prem', name: 'Premium Match Pass (Epic Player Guaranteed)', price: 690, originalPrice: 780, amountValue: 'Premium Pass 🌟', popular: true },
  ],

  // 17. Blood Strike Gold
  'prod-blood-strike': [
    { id: 'bs-1', name: '100 Gold', price: 125, originalPrice: 145, amountValue: '100 Gold' },
    { id: 'bs-300', name: '300 Gold', price: 370, originalPrice: 420, amountValue: '300 Gold' },
    { id: 'bs-2', name: '500 Gold', price: 590, originalPrice: 670, amountValue: '500 Gold', popular: true },
    { id: 'bs-3', name: '1000 Gold', price: 1150, originalPrice: 1300, amountValue: '1000 Gold', popular: true },
    { id: 'bs-2000', name: '2000 Gold', price: 2250, originalPrice: 2550, amountValue: '2000 Gold' },
    { id: 'bs-5000', name: '5000 Gold', price: 5450, originalPrice: 6100, amountValue: '5000 Gold' },
    { id: 'bs-10000', name: '10,000 Gold (Ultra Pack)', price: 10800, originalPrice: 12000, amountValue: '10000 Gold 🏆' },
    { id: 'bs-4', name: 'Strike Pass Elite', price: 590, originalPrice: 680, amountValue: 'Strike Pass 🎖️', popular: true },
    { id: 'bs-pass-plus', name: 'Strike Pass Elite Plus (+25 Tiers Instantly)', price: 1150, originalPrice: 1300, amountValue: 'Elite Plus 🛡️' },
  ],

  // 18. Call of Duty Mobile CP
  'prod-cod-mobile': [
    { id: 'codm-1', name: '80 CP', price: 135, originalPrice: 155, amountValue: '80 CP' },
    { id: 'codm-240', name: '240 CP', price: 390, originalPrice: 440, amountValue: '240 CP' },
    { id: 'codm-2', name: '420 CP (Battle Pass Exact)', price: 650, originalPrice: 730, amountValue: '420 CP', popular: true },
    { id: 'codm-3', name: '880 CP (800 + 80 Bonus)', price: 1320, originalPrice: 1480, amountValue: '880 CP' },
    { id: 'codm-1760', name: '1760 CP (1600 + 160 Bonus)', price: 2550, originalPrice: 2850, amountValue: '1760 CP' },
    { id: 'codm-2400', name: '2400 CP (Lucky Draw Pack)', price: 3450, originalPrice: 3850, amountValue: '2400 CP', popular: true },
    { id: 'codm-5000', name: '5000 CP (Mythic Draw Pack)', price: 6800, originalPrice: 7500, amountValue: '5000 CP' },
    { id: 'codm-10800', name: '10800 CP (Ultra Mythic Pack)', price: 13500, originalPrice: 14900, amountValue: '10800 CP 🏆' },
    { id: 'codm-4', name: 'Battle Pass Direct Activation', price: 450, originalPrice: 520, amountValue: 'Battle Pass 🎖️', popular: true },
    { id: 'codm-ground-forces', name: 'Ground Forces Monthly Subscription', price: 850, originalPrice: 990, amountValue: 'Ground Forces 👑' },
  ],

  // 19. Minecraft Minecoins & PC Edition
  'prod-minecraft-minecoins': [
    { id: 'mc-320', name: '320 Minecoins', price: 320, originalPrice: 360, amountValue: '320 Coins' },
    { id: 'mc-1020', name: '1020 Minecoins (Starter Pack)', price: 950, originalPrice: 1080, amountValue: '1020 Coins', popular: true },
    { id: 'mc-1720', name: '1720 Minecoins', price: 1550, originalPrice: 1720, amountValue: '1720 Coins' },
    { id: 'mc-3500', name: '3500 Minecoins (Mega Pack)', price: 2900, originalPrice: 3250, amountValue: '3500 Coins', popular: true },
    { id: 'mc-8800', name: '8800 Minecoins (Ultimate Builder Pack)', price: 6900, originalPrice: 7600, amountValue: '8800 Coins 🏰' },
    { id: 'mc-realms', name: 'Minecraft Realms Plus (1 Month Sub)', price: 1150, originalPrice: 1300, amountValue: '1 Month Realms' },
    { id: 'mc-full', name: 'Minecraft Java & Bedrock Edition PC (Full Game Key)', price: 3850, originalPrice: 4250, amountValue: 'Full PC Game 🎮', popular: true },
  ],

  // 20. PlayStation Plus & PSN Wallet Cards
  'prod-c1': [
    { id: 'psn-10', name: '$10 USD PlayStation Network Card', price: 1480, originalPrice: 1620, amountValue: '$10 USD', popular: true },
    { id: 'psn-25', name: '$25 USD PlayStation Network Card', price: 3650, originalPrice: 3990, amountValue: '$25 USD' },
    { id: 'psn-50', name: '$50 USD PlayStation Network Card', price: 7200, originalPrice: 7850, amountValue: '$50 USD', popular: true },
    { id: 'psn-100', name: '$100 USD PlayStation Network Card', price: 14300, originalPrice: 15600, amountValue: '$100 USD' },
    { id: 'psn-1m', name: 'PlayStation Plus Essential (1 Month)', price: 1450, originalPrice: 1650, amountValue: '1 Month Essential' },
    { id: 'psn-extra-1m', name: 'PlayStation Plus Extra (1 Month)', price: 2150, originalPrice: 2400, amountValue: '1 Month Extra 🎮', popular: true },
    { id: 'psn-3m', name: 'PlayStation Plus Extra (3 Months)', price: 5800, originalPrice: 6400, amountValue: '3 Months Extra' },
    { id: 'psn-deluxe-1m', name: 'PlayStation Plus Deluxe / Premium (1 Month)', price: 2550, originalPrice: 2850, amountValue: '1 Month Deluxe 👑' },
    { id: 'psn-deluxe-3m', name: 'PlayStation Plus Deluxe / Premium (3 Months)', price: 6900, originalPrice: 7700, amountValue: '3 Months Deluxe' },
  ],
};
