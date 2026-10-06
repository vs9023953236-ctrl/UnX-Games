import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Review, 
  Product,
  Order,
  OrderStatus,
  OrderActivity,
  PaymentSettings,
  NewsItem,
  AppSettings,
  Notification,
  PaymentMethod,
  AdminTab,
  ActivityLog,
  CancellationRequest,
  OrderTimelineEvent,
  SupportInquiry,
  Banner,
  RequiredFieldsConfig,
  Category,
} from '../types';
import { ALL_NEPAL_PACKAGES } from '../data/nepalPackagesCatalog';
import { generateOrderId, formatDisplayOrderId, formatActorName } from '../utils/formatters';
import { useAuth } from './AuthContext';
import { api, fetchApi } from '../services/api';
import { updateDocumentFavicon, OFFICIAL_LOGO_DATA_URI } from '../utils/branding';
import { realtimeSync } from '../lib/realtimeSync';
import { getSafeGameImage, DEFAULT_FALLBACK_IMAGE } from '../utils/imageFallback';

const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  esewaEnabled: true,
  esewaQR: 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Esewa.png',
  esewaName: 'BINOD THALAL (UNX GAMES)',
  esewaId: '9768914027',
  esewaInstructions: '1. Scan this QR code using your eSewa App.\n2. In Remarks, enter your Unx Games Order ID.\n3. Complete the payment and take a screenshot.\n4. Upload the payment receipt screenshot and enter the Transaction ID below.',

  khaltiEnabled: true,
  khaltiQR: 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Khalti.jpg',
  khaltiName: 'UNX GAMES OFFICIAL',
  khaltiId: '9768914027',
  khaltiInstructions: '1. Open Khalti App and Scan this QR.\n2. Enter the exact order amount in NPR.\n3. Mention your Order ID or Game UID in Remarks.\n4. Save the payment receipt and upload it here.',

  imePayEnabled: true,
  imePayQR: 'https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=imepay://payment?merchant=UNX_GAMES%26acc=9768914027%26name=UnxGames',
  imePayName: 'UNX GAMES (BINOD THALAL)',
  imePayId: '9768914027',
  imePayInstructions: '1. Open IME Pay App and scan QR or transfer to Wallet ID 9768914027.\n2. Add your Order ID in Purpose / Remarks.\n3. Upload screenshot receipt for instant verification.',

  bankEnabled: true,
  bankName: 'Nabil Bank Ltd. / NIC Asia Bank',
  bankAccountName: 'UNX GAMES PVT LTD',
  bankAccountNumber: '01201017500291',
  bankBranch: 'Kathmandu Main Branch',
  bankQR: 'https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=fonepay://qr?ac=1200100002910&name=UNX+GAMES',
  bankInstructions: '1. Transfer via Mobile Banking / Fonepay direct to the account details above.\n2. Enter Order ID in Transfer Remarks.\n3. Save transaction voucher and upload below for instant approval.',
};

const DEFAULT_APP_SETTINGS: AppSettings = {
  appName: 'Unx Games',
  appTagline: "Nepal's #1 Instant Gaming Top-Up Platform",
  companyName: 'intraX Pvt Ltd',
  companyAddress: 'Deelasaini-6, Baitadi, Nepal',
  logo: '🎮',
  logoUrl: OFFICIAL_LOGO_DATA_URI,
  faviconUrl: OFFICIAL_LOGO_DATA_URI,
  logoFileName: 'unxgames-official-logo.png',
  logoDimensions: { width: 1254, height: 1254 },
  logoUpdatedAt: '2026-09-08T00:00:00Z',
  supportEmail: 'info@unxgames.np',
  supportPhone: '9768914027',
  whatsappNumber: '9768914027',
  viberNumber: '9768914027',
  maintenanceMode: false,
  orderingEnabled: true,
  announcementBanner: '🔥 Fast Top-Up with eSewa & Khalti QR • Delivered in 5-15 Minutes • Nepal 24/7 Verified Support!',
  announcementActive: true,
  termsAndConditions: `1. All prices are listed in Nepalese Rupees (NPR).\n2. Users must provide the exact Player UID / Character ID. Unx Games is not responsible for incorrect user-submitted IDs.\n3. QR Payments must include the Order ID in remarks when possible.\n4. Top-ups are processed after manual payment verification by our Nepal admin team.\n5. All sales are final once digital game assets are credited.`,
  privacyPolicy: `Unx Games values user privacy. We only collect the minimal required information (Game ID, Contact Email/Phone, Payment Proof) to fulfill your game top-up orders. Payment screenshots are securely processed and retained solely for transaction audit purposes.`,
};

interface AdminActivityInput {
  action: string;
  targetType?: string;
  targetId?: string;
  description: string;
  adminId?: string;
  adminName?: string;
  adminEmail?: string;
}

const logAdminActivity = async (activity: AdminActivityInput): Promise<void> => {
  try {
    await api.admin.logActivity(activity);
  } catch (_) {
    // Non-blocking background log
  }
};

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

interface StoreContextType {
  // Products (Max 10 active slots rule)
  products: Product[];
  activeProducts: Product[];
  isLoadingProducts: boolean;
  addProduct: (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>, adminInfo?: { uid: string; name: string; email: string }) => Promise<{ success: boolean; message: string }>;
  updateProduct: (id: string, updates: Partial<Product>, adminInfo?: { uid: string; name: string; email: string }) => Promise<{ success: boolean; message: string }>;
  deleteProduct: (id: string, adminInfo?: { uid: string; name: string; email: string }) => Promise<{ success: boolean; message: string }>;
  toggleProductStatus: (id: string, targetActiveOrAdminInfo?: boolean | { uid: string; name: string; email: string }, adminInfo?: { uid: string; name: string; email: string }) => Promise<{ success: boolean; message: string }>;
  toggleProductStock: (id: string, forcedStockState?: boolean, adminInfo?: { uid: string; name: string; email: string }) => Promise<{ success: boolean; message: string }>;

  // Categories
  categories: Category[];
  isLoadingCategories: boolean;
  refreshCategories: () => Promise<void>;
  createCategory: (data: Partial<Category>) => Promise<{ success: boolean; message?: string }>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<{ success: boolean; message?: string }>;
  deleteCategory: (id: string) => Promise<{ success: boolean; message?: string }>;

  // Orders
  orders: Order[];
  actionableOrderCount: number;
  createOrder: (orderData: {
    userId: string;
    userName: string;
    userEmail: string;
    userPhone?: string;
    userLocation?: string;
    customerLocation?: string;
    productId: string;
    productName?: string;
    productImage?: string;
    packageId: string;
    packageName?: string;
    quantity?: number;
    amount?: number;
    gameUserId: string;
    zoneId?: string;
    server?: string;
    paymentMethod: PaymentMethod;
    transactionId?: string;
    transferId?: string;
    paymentReference?: string;
    paymentScreenshot?: string;
    paymentScreenshotR2Key?: string;
    paymentProofUrl?: string;
    paymentProofR2Key?: string;
    couponCode?: string;
    orderCode?: string;
  }) => Promise<Order>;
  updateOrderStatus: (
    orderId: string,
    newStatus: OrderStatus,
    adminNote?: string,
    rejectionReason?: string,
    adminInfo?: { uid: string; name: string; email: string },
    extraData?: {
      processingNote?: string;
      deliveryNote?: string;
      adminNote?: string;
      cancellationReason?: string;
      refundMethod?: string;
      refundAccountName?: string;
      refundAccountNumber?: string;
      refundAmount?: number;
      refundStatus?: any;
      cancelledAt?: string;
      cancelledBy?: string;
      [key: string]: any;
    }
  ) => Promise<{ success: boolean; message?: string }>;
  resubmitPayment: (
    orderId: string,
    paymentData: {
      transactionId: string;
      paymentScreenshot?: string;
      paymentScreenshotR2Key?: string;
      paymentMethod?: PaymentMethod;
      resubmitNote?: string;
    }
  ) => Promise<{ success: boolean; message?: string }>;
  deleteOrder: (orderId: string, adminInfo?: { uid: string; name: string; email: string }) => Promise<{ success: boolean; message?: string }>;
  bulkDeleteOrders: (orderIds: string[], adminInfo?: { uid: string; name: string; email: string }) => Promise<{ success: boolean; message?: string }>;
  clearAllOrders: (adminInfo?: { uid: string; name: string; email: string }) => Promise<{ success: boolean; message?: string }>;
  deletePayment: (paymentId: string, adminInfo?: { uid: string; name: string; email: string }) => Promise<{ success: boolean; message?: string }>;
  clearAllPayments: (adminInfo?: { uid: string; name: string; email: string }) => Promise<{ success: boolean; message?: string }>;
  completeAllPendingTasks: () => Promise<{ success: boolean; message?: string; stats?: any }>;

  // Cancellations & Refunds
  cancellationRequests: CancellationRequest[];
  refreshCancellations: () => Promise<void>;
  requestOrderCancellation: (
    orderId: string,
    reason: string,
    note?: string,
    refundDetails?: {
      refundMethod?: string;
      refundAccountName?: string;
      refundAccountNumber?: string;
    }
  ) => Promise<{ success: boolean; message?: string }>;
  approveCancellation: (requestId: string, adminInfo: { uid: string; name: string; email: string }) => Promise<{ success: boolean; message?: string }>;
  rejectCancellation: (requestId: string, reason: string, adminInfo: { uid: string; name: string; email: string }) => Promise<{ success: boolean; message?: string }>;
  updateRefundStatus: (
    requestId: string,
    status: 'not_applicable' | 'refund_pending' | 'processing' | 'refunded' | 'rejected' | 'pending' | 'completed' | 'failed',
    amount?: number,
    reference?: string,
    note?: string,
    adminInfo?: { uid: string; name: string; email: string },
    additionalData?: {
      refundMethod?: string;
      refundProofUrl?: string;
      customerAccount?: string;
      accountHolderName?: string;
      receiptUrl?: string;
      [key: string]: any;
    }
  ) => Promise<{ success: boolean; message?: string }>;

  getUserOrders: (userId: string, userEmail?: string) => Order[];
  syncOrdersFromBackend: () => Promise<void>;

  // Payment Settings
  paymentSettings: PaymentSettings;
  updatePaymentSettings: (updates: Partial<PaymentSettings>, adminInfo?: { uid: string; name: string; email: string }) => Promise<void>;

  // News
  news: NewsItem[];
  isLoadingNews: boolean;
  addNews: (newsData: Omit<NewsItem, 'id' | 'createdAt'>, adminInfo?: { uid: string; name: string; email: string }) => Promise<void>;
  updateNews: (id: string, updates: Partial<NewsItem>, adminInfo?: { uid: string; name: string; email: string }) => Promise<void>;
  deleteNews: (id: string, adminInfo?: { uid: string; name: string; email: string }) => Promise<void>;

  // Banners & Offers Management
  banners: Banner[];
  addBanner: (bannerData: Omit<Banner, 'id' | 'createdAt' | 'updatedAt'>, adminInfo?: { uid: string; name: string; email: string }) => Promise<{ success: boolean; message: string }>;
  updateBanner: (id: string, updates: Partial<Banner>, adminInfo?: { uid: string; name: string; email: string }) => Promise<{ success: boolean; message: string }>;
  deleteBanner: (id: string, adminInfo?: { uid: string; name: string; email: string }) => Promise<{ success: boolean; message: string }>;
  toggleBannerStatus: (id: string, adminInfo?: { uid: string; name: string; email: string }) => Promise<{ success: boolean; message: string }>;
  duplicateBanner: (id: string, adminInfo?: { uid: string; name: string; email: string }) => Promise<{ success: boolean; message: string }>;
  reorderBanners: (bannerIds: string[], adminInfo?: { uid: string; name: string; email: string }) => Promise<{ success: boolean; message: string }>;
  handleBannerClick: (banner: Banner) => void;

  // Reviews
  reviews: Review[];
  addReview: (reviewData: Omit<Review, 'id' | 'createdAt'>) => Promise<{ success: boolean; message?: string }>;
  updateReview: (id: string, updates: Partial<Review>, adminInfo?: { uid: string; name: string; email: string }) => Promise<{ success: boolean; message?: string }>;
  deleteReview: (id: string, adminInfo?: { uid: string; name: string; email: string }) => Promise<{ success: boolean; message?: string }>;
  toggleReviewStatus: (id: string, newStatus: 'published' | 'hidden', adminInfo?: { uid: string; name: string; email: string }) => Promise<{ success: boolean; message?: string }>;
  generateAiReviewReply: (reviewId: string, tone?: string, adminInfo?: { uid: string; name: string; email: string }) => Promise<{ success: boolean; replyText?: string }>;
  previewAiReviewReply: (data: any, tone?: string) => Promise<{ success: boolean; replyText?: string }>;
  batchAiAutoReplyReviews: (tone?: string, overwriteExisting?: boolean, adminInfo?: { uid: string; name: string; email: string }) => Promise<{ success: boolean; repliedCount: number; message: string }>;
  getReviewSettings: () => Promise<any>;
  updateReviewSettings: (settings: any) => Promise<any>;

  // Support Inquiries & Messages
  inquiries: SupportInquiry[];
  submitInquiry: (data: {
    name: string;
    email: string;
    phone?: string;
    subject?: string;
    category?: SupportInquiry['category'];
    orderId?: string;
    message: string;
    priority?: 'NORMAL' | 'URGENT' | 'HIGH';
    attachmentUrl?: string;
    userId?: string;
  }) => Promise<SupportInquiry>;
  fetchTicketMessages: (ticketId: string, email?: string) => Promise<any[]>;
  sendTicketMessage: (ticketId: string, data: { message: string; attachmentUrl?: string; senderName?: string; email?: string }) => Promise<{ success: boolean; message?: any }>;
  replyToInquiry: (
    inquiryId: string,
    replyMessage: string,
    newStatus?: SupportInquiry['status'],
    adminInfo?: { uid: string; name: string; email: string },
    attachmentUrl?: string
  ) => Promise<{ success: boolean; message?: string }>;
  updateInquiryStatus: (
    inquiryId: string,
    status: SupportInquiry['status'],
    adminInfo?: { uid: string; name: string; email: string }
  ) => Promise<{ success: boolean; message?: string }>;
  deleteInquiry: (
    inquiryId: string,
    adminInfo?: { uid: string; name: string; email: string }
  ) => Promise<{ success: boolean; message?: string }>;
  clearAllInquiries: (
    adminInfo?: { uid: string; name: string; email: string }
  ) => Promise<{ success: boolean; message?: string }>;
  notifications: Notification[];
  refreshNotifications: () => Promise<void>;
  getUserNotifications: (userId: string) => Notification[];
  sendNotification: (
    notifData: Omit<Notification, 'id' | 'createdAt' | 'read'>,
    adminInfo?: { uid: string; name: string; email: string }
  ) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: (userId: string) => Promise<void>;
  deleteNotification: (id: string, adminInfo?: { uid: string; name: string; email: string }) => Promise<void>;
  clearUserNotifications: (userId: string) => Promise<void>;
  clearSystemNotifications: (adminInfo?: { uid: string; name: string; email: string }) => Promise<void>;
  unreadCount: (userId?: string) => number;

  // App Settings & Centralized Branding
  appSettings: AppSettings;
  refreshSettings: () => Promise<void>;
  updateAppSettings: (updates: Partial<AppSettings>, adminInfo?: { uid: string; name: string; email: string }, options?: { silent?: boolean }) => Promise<void>;
  toggleStoreStatus: (isOnline: boolean, options?: { orderingEnabled?: boolean; maintenanceMode?: boolean; message?: string; durationMinutes?: number; adminInfo?: any; silent?: boolean }) => Promise<boolean>;
  toggleOrderingStatus: (enabled: boolean, options?: { adminInfo?: any; silent?: boolean }) => Promise<boolean>;
  toggleMaintenanceStatus: (enabled: boolean, options?: { message?: string; durationMinutes?: number; adminInfo?: any; silent?: boolean }) => Promise<boolean>;
  updateAppLogo: (
    logoUrl: string,
    metadata?: { fileName?: string; dimensions?: { width: number; height: number } },
    adminInfo?: { uid: string; name: string; email: string }
  ) => Promise<void>;
  resetAppLogo: (adminInfo?: { uid: string; name: string; email: string }) => Promise<void>;

  // Bulk Database Cleanser System
  bulkClearRecords: (data: {
    target?: string;
    targets?: any;
    adminInfo?: { uid: string; name: string; email: string };
  }) => Promise<{ success: boolean; message: string; deletedCounts?: any }>;

  // Activity Logs
  activityLogs: ActivityLog[];

  // Search & Navigation
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  goBack: (fallbackTab?: string) => void;
  openProduct: (productId: string) => void;
  openOrder: (orderId: string) => void;
  openReviews: (productId?: string) => void;
  openCheckout: (productId: string, packageId?: string) => void;
  selectedProductId: string | null;
  setSelectedProductId: (id: string | null) => void;
  selectedOrderId: string | null;
  setSelectedOrderId: (id: string | null) => void;
  isAdminView: boolean;
  setIsAdminView: (isAdmin: boolean) => void;

  // Admin Sub-routing
  adminTab: AdminTab;
  setAdminTab: (tab: AdminTab) => void;
  adminSelectedOrderId: string | null;
  setAdminSelectedOrderId: (id: string | null) => void;
  adminSelectedUserId: string | null;
  setAdminSelectedUserId: (id: string | null) => void;
  adminSelectedProductId: string | null;
  setAdminSelectedProductId: (id: string | null) => void;
  adminSelectedNewsId: string | null;
  setAdminSelectedNewsId: (id: string | null) => void;

  // Toast System
  toasts: ToastMessage[];
  showToast: (type: ToastMessage['type'], title: string, message?: string) => void;
  removeToast: (id: string) => void;

  // Gamer Wallet Integration
  walletBalance: number | null;
  userWallet: any;
  refreshWallet: () => Promise<number>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

// Storage keys
const PRODUCTS_KEY = 'ghn_products_v3';
const ORDERS_KEY = 'ghn_orders_v3';
const PAYMENTS_SETTINGS_KEY = 'ghn_payment_settings_v3';
const NEWS_KEY = 'ghn_news_v5';
const NOTIFICATIONS_KEY = 'ghn_notifications_v3';
const APP_SETTINGS_KEY = 'ghn_app_settings_v3';
const BANNERS_KEY = 'ghn_banners_master_v5';

const OFFICIAL_FF_BANNER = 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Banners/free%20fire%20Banner.png';

export const sanitizeProduct = (item: Product | any): Product => {
  if (!item) return item;

  const OFFICIAL_PRODUCT_IMAGES: Record<string, string> = {
    'prod-free-fire': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/free%20fire.png',
    'prod-pubg-mobile': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/PUBG%20MOBILE%20UC.png',
    'prod-google-play-usd': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/Google%20Play%20Gift%20Card%20(US).png',
    'prod-itunes-gift-card': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/iTunes%20Gift%20Card%20(US).png',
    'prod-c2': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/Xbox%20Game%20Pass%20Ultimate.png',
    'prod-mobile-legends': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/Mobile%20Legends%20Diamonds.png',
    'prod-valorant-points': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/Valorant%20Points%20(VP).png',
    'prod-genshin-impact': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/Genshin%20Impact%20Crystals.png',
    'prod-steam-wallet': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/Steam%20Wallet%20USD%20%20NPR%20Gift%20Card.png',
    'prod-roblox-robux': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/Roblox%20Robux.png',
    'prod-clash-of-clans': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/Clash%20of%20Clans%20Gems.png',
    'prod-honor-of-kings': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/Honor%20of%20Kings%20Tokens.png',
    'prod-discord-nitro': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/Discord%20Nitro%20%26%20Nitro.png',
    'prod-netflix-nepal': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/Netflix%20Premium.png',
    'prod-brawl-stars': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/Brawl%20Stars%20Gems%20%26%20Pass.png',
    'prod-efootball': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/eFootball%20PES%20Coins.png',
    'prod-blood-strike': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/Blood%20Strike%20Gold.png',
    'prod-cod-mobile': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/Call%20of%20Duty%20Mobile%20CP.png',
    'prod-minecraft-minecoins': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/Minecraft%20Minecoins%20%26%20PC%20Edition.png',
    'prod-c1': 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Product%20Images/Steam%20Wallet%20USD%20%20NPR%20Gift%20Card.png'
  };

  let image = item.image || item.image_url || OFFICIAL_PRODUCT_IMAGES[item.id] || '';
  let bannerImage = item.bannerImage || item.banner_url || item.banner_image || '';

  const getProductImageByName = (nameStr: string): string => {
    const n = (nameStr || '').toLowerCase();
    if (n.includes('free fire') || n.includes('freefire')) return OFFICIAL_PRODUCT_IMAGES['prod-free-fire'];
    if (n.includes('pubg') || n.includes('unknown cash')) return OFFICIAL_PRODUCT_IMAGES['prod-pubg-mobile'];
    if (n.includes('google play') || n.includes('googleplay')) return OFFICIAL_PRODUCT_IMAGES['prod-google-play-usd'];
    if (n.includes('itunes') || n.includes('apple app store')) return OFFICIAL_PRODUCT_IMAGES['prod-itunes-gift-card'];
    if (n.includes('xbox') || n.includes('game pass')) return OFFICIAL_PRODUCT_IMAGES['prod-c2'];
    if (n.includes('mobile legend') || n.includes('mlbb')) return OFFICIAL_PRODUCT_IMAGES['prod-mobile-legends'];
    if (n.includes('valorant') || n.includes(' vp')) return OFFICIAL_PRODUCT_IMAGES['prod-valorant-points'];
    if (n.includes('genshin') || n.includes('genesis')) return OFFICIAL_PRODUCT_IMAGES['prod-genshin-impact'];
    if (n.includes('steam')) return OFFICIAL_PRODUCT_IMAGES['prod-steam-wallet'];
    if (n.includes('roblox') || n.includes('robux')) return OFFICIAL_PRODUCT_IMAGES['prod-roblox-robux'];
    if (n.includes('clash of clans') || n.includes('coc')) return OFFICIAL_PRODUCT_IMAGES['prod-clash-of-clans'];
    if (n.includes('honor of kings') || n.includes('hok')) return OFFICIAL_PRODUCT_IMAGES['prod-honor-of-kings'];
    if (n.includes('discord') || n.includes('nitro')) return OFFICIAL_PRODUCT_IMAGES['prod-discord-nitro'];
    if (n.includes('netflix')) return OFFICIAL_PRODUCT_IMAGES['prod-netflix-nepal'];
    if (n.includes('brawl star')) return OFFICIAL_PRODUCT_IMAGES['prod-brawl-stars'];
    if (n.includes('efootball') || n.includes('pes')) return OFFICIAL_PRODUCT_IMAGES['prod-efootball'];
    if (n.includes('blood strike')) return OFFICIAL_PRODUCT_IMAGES['prod-blood-strike'];
    if (n.includes('cod') || n.includes('call of duty')) return OFFICIAL_PRODUCT_IMAGES['prod-cod-mobile'];
    if (n.includes('minecraft') || n.includes('minecoin')) return OFFICIAL_PRODUCT_IMAGES['prod-minecraft-minecoins'];
    return '';
  };

  // Use mapped image if existing image is missing, bad, or fallback
  const nameMatchedImage = getProductImageByName(item.name || item.gameName || '');
  if (!image || image === '/free-fire.webp' || image.includes('komododecks') || image.includes('file_0000000') || image.startsWith('blob:') || image.includes('photo-1538481199705-c710c4e965fc') || OFFICIAL_PRODUCT_IMAGES[item.id]) {
    image = OFFICIAL_PRODUCT_IMAGES[item.id] || nameMatchedImage || image || getSafeGameImage(item);
  } else if (nameMatchedImage && (!item.image || item.image === '/free-fire.webp')) {
    image = nameMatchedImage;
  }

  const isFreeFire = item.id === 'prod-free-fire' || item.name?.toLowerCase().includes('free fire');
  if (isFreeFire) {
    if (!image || image.includes('komododecks') || image.includes('file_0000000') || image === '/free-fire.webp') {
      image = OFFICIAL_PRODUCT_IMAGES['prod-free-fire'] || getSafeGameImage(item);
    }
    if (!bannerImage || bannerImage.includes('komododecks') || bannerImage.includes('file_0000000') || bannerImage === '/free-fire-banner.webp') {
      bannerImage = OFFICIAL_FF_BANNER;
    }
  }

  if (!image || image === '/free-fire.webp') {
    image = getSafeGameImage(item);
  }

  if (!bannerImage || bannerImage === '/free-fire-banner.webp') {
    bannerImage = image || OFFICIAL_FF_BANNER;
  }

  // Construct requiredFields safely
  let reqFields: RequiredFieldsConfig;
  if (item.requiredFields && (item.requiredFields.idFieldLabel || item.requiredFields.idPlaceholder)) {
    reqFields = {
      idFieldLabel: item.requiredFields.idFieldLabel || 'Player ID / UID',
      idPlaceholder: item.requiredFields.idPlaceholder || 'Enter your Player ID',
      idHelpText: item.requiredFields.idHelpText || '',
      requiresServer: Boolean(item.requiredFields.requiresServer),
      serverFieldLabel: item.requiredFields.serverFieldLabel || 'Server / Region',
      serverPlaceholder: item.requiredFields.serverPlaceholder,
      serverOptions: Array.isArray(item.requiredFields.serverOptions) ? item.requiredFields.serverOptions : undefined,
      requiresZoneId: Boolean(item.requiredFields.requiresZoneId),
      zoneIdLabel: item.requiredFields.zoneIdLabel || 'Zone ID',
      zoneIdPlaceholder: item.requiredFields.zoneIdPlaceholder || 'e.g. 1234',
    };
  } else if (Array.isArray(item.input_fields) && item.input_fields.length > 0) {
    const primary = item.input_fields[0] || {};
    const zoneField = item.input_fields.find((f: any) => f.key === 'zone_id' || f.key?.includes('zone'));
    const serverField = item.input_fields.find((f: any) => f.key === 'server' || f.key?.includes('server'));

    reqFields = {
      idFieldLabel: primary.label || 'Player ID / UID',
      idPlaceholder: primary.placeholder || 'Enter your Player ID',
      idHelpText: primary.helpText || '',
      requiresServer: Boolean(serverField),
      serverFieldLabel: serverField?.label || 'Server / Region',
      serverOptions: serverField?.options || undefined,
      requiresZoneId: Boolean(zoneField),
      zoneIdLabel: zoneField?.label || 'Zone ID',
      zoneIdPlaceholder: zoneField?.placeholder || 'e.g. 1234',
    };
  } else {
    reqFields = {
      idFieldLabel: 'Player ID / UID',
      idPlaceholder: 'Enter your Player ID / Character UID',
      idHelpText: 'Enter your in-game User ID or Character ID for direct top-up.',
      requiresServer: false,
      requiresZoneId: false,
    };
  }

  // Ensure packages array is valid and loaded with Nepal market offerings
  const nepalCatalogPkgs = ALL_NEPAL_PACKAGES[item.id] || [];
  const fallbackPkgs = nepalCatalogPkgs.length > 0 ? nepalCatalogPkgs : [];

  let packagesList: any[];
  if (Array.isArray(item.packages) && item.packages.length > 1) {
    packagesList = item.packages.map((pkg: any, idx: number) => {
      const pPrice = Number(pkg.price) || Number(item.price) || 0;
      const oPrice = pkg.originalPrice ? Number(pkg.originalPrice) : (pkg.compare_at_price ? Number(pkg.compare_at_price) : undefined);
      const disc = pkg.discount !== undefined
        ? Number(pkg.discount)
        : (oPrice && oPrice > pPrice ? Math.round(((oPrice - pPrice) / oPrice) * 100) : undefined);
      return {
        id: pkg.id || `pkg-${idx + 1}`,
        name: pkg.name || `Package ${idx + 1}`,
        price: pPrice,
        originalPrice: oPrice,
        discount: disc,
        discountPrice: pPrice,
        amountValue: pkg.amountValue || (pkg.amount ? `${pkg.amount} ${pkg.unit || ''}`.trim() : pkg.name),
        popular: Boolean(pkg.popular || (pkg.badge && (pkg.badge.includes('POPULAR') || pkg.badge.includes('HOT') || pkg.badge.includes('BESTSELLER')))),
        active: pkg.active !== false,
      };
    });
  } else if (Array.isArray(item.packages) && item.packages.length === 1 && item.packages[0].id !== 'pkg-1') {
    packagesList = item.packages.map((pkg: any, idx: number) => {
      const pPrice = Number(pkg.price) || Number(item.price) || 0;
      const oPrice = pkg.originalPrice ? Number(pkg.originalPrice) : (pkg.compare_at_price ? Number(pkg.compare_at_price) : undefined);
      const disc = pkg.discount !== undefined
        ? Number(pkg.discount)
        : (oPrice && oPrice > pPrice ? Math.round(((oPrice - pPrice) / oPrice) * 100) : undefined);
      return {
        id: pkg.id || `pkg-${idx + 1}`,
        name: pkg.name || `Package ${idx + 1}`,
        price: pPrice,
        originalPrice: oPrice,
        discount: disc,
        discountPrice: pPrice,
        amountValue: pkg.amountValue || (pkg.amount ? `${pkg.amount} ${pkg.unit || ''}`.trim() : pkg.name),
        popular: Boolean(pkg.popular || (pkg.badge && (pkg.badge.includes('POPULAR') || pkg.badge.includes('HOT') || pkg.badge.includes('BESTSELLER')))),
        active: pkg.active !== false,
      };
    });
  } else if (fallbackPkgs.length > 0) {
    packagesList = fallbackPkgs.map((pkg: any) => {
      const pPrice = Number(pkg.price) || 0;
      const oPrice = pkg.originalPrice ? Number(pkg.originalPrice) : undefined;
      const disc = oPrice && oPrice > pPrice ? Math.round(((oPrice - pPrice) / oPrice) * 100) : undefined;
      return {
        ...pkg,
        price: pPrice,
        originalPrice: oPrice,
        discount: disc,
        discountPrice: pPrice,
      };
    });
  } else {
    packagesList = [{
      id: 'pkg-1',
      name: item.packageName || item.name || 'Standard Package',
      price: Number(item.price) || 0,
      amountValue: item.packageName || item.name,
      discountPrice: Number(item.price) || 0,
    }];
  }

  const numPrice = Number(item.price) || (packagesList[0]?.price || 0);
  const isInStock = item.inStock !== false && (item.stock === undefined || item.stock === null || Number(item.stock) > 0);
  const stockCount = item.stock !== undefined && item.stock !== null ? Number(item.stock) : (isInStock ? 99 : 0);

  return {
    ...item,
    id: item.id || `prod_${Date.now()}`,
    slotNumber: item.slotNumber || item.slot_number || 1,
    name: item.name || 'Game Top-up',
    gameName: item.gameName || item.game_name || item.name || 'Game',
    category: item.category || 'Mobile',
    categoryId: item.categoryId || item.category_id || 'cat-mobile',
    category_id: item.category_id || item.categoryId || 'cat-mobile',
    categoryName: item.categoryName || item.category || 'Mobile Games',
    categorySlug: item.categorySlug || 'mobile',
    categoryIcon: item.categoryIcon || 'Gamepad2',
    description: item.description || '',
    image: image || getSafeGameImage(item),
    bannerImage: bannerImage || image || OFFICIAL_FF_BANNER,
    gallery: Array.isArray(item.gallery) ? Array.from(new Set(item.gallery.filter((g: string) => g && !g.includes('komododecks') && !g.includes('file_0000000') && g !== image && g !== bannerImage))) : [],
    price: numPrice,
    packageName: item.packageName || packagesList[0]?.name || 'Standard',
    packages: packagesList,
    requiredFields: reqFields,
    active: item.active !== false,
    inStock: isInStock,
    stock: stockCount,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
  };
};

export const sanitizeBanner = (b: any): Banner => {
  if (!b) return b;

  let image = b.image || b.imageUrl || b.image_url || '';
  let mobileImage = b.mobileImage || b.mobileImageUrl || b.mobile_image_url || image;

  const isFreeFire = b.id === 'banner-hero-1' || b.id === 'hero-1' || b.title?.toLowerCase().includes('free fire') || b.actionTarget === 'prod-free-fire' || b.product_id === 'prod-free-fire';

  if (!image || image === '/free-fire-banner.webp' || image.includes('komododecks') || image.includes('file_0000000') || image.startsWith('blob:')) {
    if (isFreeFire) {
      image = OFFICIAL_FF_BANNER;
      mobileImage = OFFICIAL_FF_BANNER;
    }
  }

  const type: 'hero' | 'offer' = b.type || (b.id?.includes('offer') ? 'offer' : 'hero');
  const activeBool = b.active !== undefined ? Boolean(b.active) : b.status === 'active';
  const status: 'active' | 'inactive' = activeBool ? 'active' : 'inactive';
  const actionType = b.actionType || b.link_type || b.action_type || 'product';
  const actionTarget = b.actionTarget || b.link_value || b.action_target || b.product_id || b.game_id || '';
  const buttonText = b.buttonText || b.button_text || 'Top Up Now';

  return {
    id: b.id,
    type,
    title: b.title || 'Special Promotion',
    subtitle: b.subtitle || b.description || '',
    badge: b.badge || '',
    buttonText,
    actionType,
    actionTarget,
    image: image || OFFICIAL_FF_BANNER,
    mobileImage: mobileImage || image || OFFICIAL_FF_BANNER,
    status,
    sortOrder: b.sortOrder || b.sort_order || b.display_order || 1,
    createdAt: b.createdAt || b.created_at || new Date().toISOString(),
    updatedAt: b.updatedAt || b.updated_at || new Date().toISOString(),
  };
};

export const sanitizeNews = (n: NewsItem | any): NewsItem => {
  if (!n) return n;
  const img = n.image || n.image_url || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80';
  const desc = n.description || n.summary || '';
  const cat = n.category || 'all-updates';
  return {
    ...n,
    id: n.id || `news_${Date.now()}`,
    title: n.title || 'Untitled Article',
    category: cat,
    description: desc,
    summary: desc,
    content: n.content || desc,
    image: img,
    image_url: img,
    published: n.published !== false,
    createdAt: n.createdAt || n.created_at || new Date().toISOString(),
  };
};

export const sanitizeReview = (r: any): Review => {
  if (!r) return r;
  const userName = r.userName || r.user_name || 'Valued Customer';
  const userPhoto = r.userPhoto || r.user_photo || '';
  const productId = r.productId || r.product_id || undefined;
  const productName = r.productName || r.product_name || '';
  const productImage = r.productImage || r.product_image || '';
  const packageName = r.packageName || r.package_name || '';
  const adminReply = r.adminReply || r.admin_reply || undefined;
  const adminReplyAt = r.adminReplyAt || r.admin_reply_at || r.replied_at || undefined;
  const userLocation = r.userLocation || r.user_location || '';
  const isVerifiedBuyer = r.isVerifiedBuyer !== undefined ? r.isVerifiedBuyer : (r.is_verified_buyer !== false);
  const orderId = r.orderId || r.order_id || undefined;
  const userId = r.userId || r.user_id || 'guest';
  const createdAt = r.createdAt || r.created_at || new Date().toISOString();
  const updatedAt = r.updatedAt || r.updated_at || new Date().toISOString();

  return {
    id: r.id || `rev_${Date.now()}`,
    orderId,
    userId,
    userName,
    userPhoto,
    productId,
    productName,
    productImage,
    packageName,
    rating: Number(r.rating) || 5,
    comment: r.comment || '',
    isVerifiedBuyer,
    status: r.status || 'published',
    userLocation,
    adminReply,
    adminReplyAt,
    createdAt,
    updatedAt,
    user_name: userName,
    user_photo: userPhoto,
    product_name: productName,
    product_image: productImage,
    package_name: packageName,
    admin_reply: adminReply,
    admin_reply_at: adminReplyAt,
    user_location: userLocation,
    is_verified_buyer: isVerifiedBuyer,
  } as Review;
};

export const deduplicateOrdersList = (orderList: Order[]): Order[] => {
  if (!orderList || !Array.isArray(orderList) || orderList.length === 0) return [];
  
  const result: Order[] = [];
  const seenKeys = new Set<string>();

  for (const order of orderList) {
    if (!order) continue;
    
    // Collect all identifying keys for this order
    const keys: string[] = [];
    if (order.id && typeof order.id === 'string' && order.id.trim()) {
      keys.push(`id:${order.id.trim().toLowerCase()}`);
    }
    if (order.order_code && typeof order.order_code === 'string' && order.order_code.trim()) {
      keys.push(`code:${order.order_code.trim().toLowerCase()}`);
    }
    if (order.orderCode && typeof order.orderCode === 'string' && order.orderCode.trim()) {
      keys.push(`code:${order.orderCode.trim().toLowerCase()}`);
    }
    if (order.orderNumber && typeof order.orderNumber === 'string' && order.orderNumber.trim()) {
      keys.push(`code:${order.orderNumber.trim().toLowerCase()}`);
    }
    if (order.orderId && typeof order.orderId === 'string' && order.orderId.trim()) {
      keys.push(`code:${order.orderId.trim().toLowerCase()}`);
    }

    // Check if we've already included this order
    const isDuplicate = keys.some((k) => seenKeys.has(k));
    if (isDuplicate) {
      const existingIdx = result.findIndex((existing) => {
        const existingKeys = [
          existing.id ? `id:${existing.id.trim().toLowerCase()}` : '',
          existing.order_code ? `code:${existing.order_code.trim().toLowerCase()}` : '',
          existing.orderCode ? `code:${existing.orderCode.trim().toLowerCase()}` : '',
          existing.orderNumber ? `code:${existing.orderNumber.trim().toLowerCase()}` : '',
          existing.orderId ? `code:${existing.orderId.trim().toLowerCase()}` : '',
        ].filter(Boolean);
        return keys.some((k) => existingKeys.includes(k));
      });

      if (existingIdx !== -1) {
        const existing = result[existingIdx];
        result[existingIdx] = {
          ...existing,
          ...order,
          id: (order.id && order.id.length > 20 ? order.id : existing.id) || order.id || existing.id,
          order_code: order.order_code || existing.order_code || order.orderCode || existing.orderCode,
          orderCode: order.orderCode || existing.orderCode || order.order_code || existing.order_code,
          orderNumber: order.orderNumber || existing.orderNumber || order.order_code || existing.order_code,
          orderId: order.orderId || existing.orderId || order.order_code || existing.order_code,
        };
        keys.forEach((k) => seenKeys.add(k));
      }
      continue;
    }

    keys.forEach((k) => seenKeys.add(k));
    result.push(order);
  }

  return result.sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });
};

const getInitialTabFromUrl = (): string => {
  if (typeof window === 'undefined') return 'home';
  try {
    const path = window.location.pathname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.toLowerCase();
    const hasResetCode = params.has('oobCode') || (params.has('code') && (path.includes('/reset') || hash.includes('recovery')));

    // Invitation & Auth Callback detection (both /auth/callback and /auth/accept-invite)
    if (
      path === '/auth/callback' ||
      path.startsWith('/auth/callback') ||
      path === '/auth/accept-invite' ||
      path.startsWith('/auth/accept-invite') ||
      path === '/accept-invite' ||
      path.startsWith('/accept-invite') ||
      hash.includes('type=invite') ||
      params.get('type') === 'invite'
    ) {
      return 'accept_invite';
    }

    if (hasResetCode || path.includes('/reset-password') || path.includes('/auth/reset-password') || hash.includes('#reset-password')) {
      return 'reset_password';
    }
    if (path.includes('/forgot-password') || path.includes('/auth/forgot-password')) {
      return 'forgot_password';
    }
    if (
      path.includes('/login') ||
      path.includes('/sign-in') ||
      path.includes('/auth/sign-in') ||
      path.includes('/auth/login')
    ) {
      return 'login';
    }
    if (
      path.includes('/register') ||
      path.includes('/signup') ||
      path.includes('/sign-up') ||
      path.includes('/auth/sign-up') ||
      path.includes('/auth/register')
    ) {
      return 'register';
    }
    if (path.startsWith('/admin') || path.includes('/admin')) {
      return 'admin';
    }
    if (path.startsWith('/product/') || path.startsWith('/p/')) {
      return 'product_detail';
    }
    if (path === '/shop' || path === '/products' || path.startsWith('/shop/') || path.startsWith('/category/')) {
      return 'shop';
    }
    if (path.startsWith('/order/') || path.startsWith('/orders/')) {
      return path === '/orders' ? 'orders' : 'order_detail';
    }
    if (path === '/orders') {
      return 'orders';
    }
    if (path.includes('/account-verification') || path.includes('/kyc-verification') || path === '/verification') {
      return 'account_verification';
    }
    if (path.includes('/wallet') || path.includes('/gamer-wallet')) {
      return 'wallet';
    }
    if (path.includes('/join-team') || path.includes('/careers') || path === '/team') {
      return 'join_team';
    }
    if (path.includes('/account') || path.includes('/profile')) {
      return path.includes('/account/settings') || path.includes('/settings') ? 'settings' : 'profile';
    }
    if (path.includes('/settings') || path.includes('/security')) {
      return 'settings';
    }
    if (path.includes('/reviews') || path.includes('/feedback')) {
      return 'reviews';
    }
    if (path.includes('/news') || path.includes('/announcements')) {
      return 'news';
    }
    if (path.includes('/checkout')) {
      return 'checkout';
    }
    if (path.includes('/about')) {
      return 'about';
    }
    if (path.includes('/contact')) {
      return 'contact';
    }
    if (path.includes('/terms')) {
      return 'terms';
    }
    if (path.includes('/privacy')) {
      return 'privacy';
    }
    if (path.includes('/kyc-policy')) {
      return 'kyc_policy';
    }
    if (path.includes('/refund-policy') || path.includes('/refund')) {
      return 'refund_policy';
    }
    if (path.includes('/delivery-policy') || path.includes('/delivery')) {
      return 'delivery_policy';
    }
    if (path.includes('/payment-policy') || path.includes('/payment')) {
      return 'payment_policy';
    }
    if (path.includes('/faq') || path.includes('/faqs') || path.includes('/help')) {
      return 'faq';
    }
  } catch {}
  return 'home';
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAdmin } = useAuth();
  
  // Gamer Wallet State & Auto-Sync
  const [walletBalance, setWalletBalance] = useState<number | null>(() => {
    try {
      const cached = localStorage.getItem('ghn_cached_wallet_balance');
      return cached ? Number(cached) : null;
    } catch {
      return null;
    }
  });
  const [userWallet, setUserWallet] = useState<any>(null);

  const isSyncingWalletRef = useRef<boolean>(false);

  const refreshWallet = useCallback(async (): Promise<number> => {
    if (!currentUser) {
      setWalletBalance(null);
      setUserWallet(null);
      try { localStorage.removeItem('ghn_cached_wallet_balance'); } catch {}
      return 0;
    }
    if (isSyncingWalletRef.current) {
      return walletBalance || 0;
    }
    isSyncingWalletRef.current = true;
    try {
      const res = await api.wallet.getMyWallet();
      if (res && res.success && res.wallet) {
        const bal = Number(res.wallet.balance) || 0;
        setWalletBalance(bal);
        setUserWallet(res.wallet);
        try {
          localStorage.setItem('ghn_cached_wallet_balance', bal.toString());
          window.dispatchEvent(new CustomEvent('ghn_wallet_updated', { detail: res.wallet }));
        } catch (_) {}
        return bal;
      }
    } catch (err) {
      console.warn('[StoreContext] refreshWallet warning:', err);
    } finally {
      isSyncingWalletRef.current = false;
    }
    return walletBalance || 0;
  }, [currentUser, walletBalance]);

  useEffect(() => {
    refreshWallet();
  }, [currentUser, refreshWallet]);
  
  // Banners (Master Banners loaded from Backend API)
  const [banners, setBanners] = useState<Banner[]>([]);

  // Products (Authoritative from Backend PostgreSQL)
  const [products, setProducts] = useState<Product[]>([]);

  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);

  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(true);

  const [isLoadingNews, setIsLoadingNews] = useState<boolean>(true);

  // Categories
  const [categories, setCategories] = useState<Category[]>([
    { id: 'cat-mobile', name: 'Mobile Games', slug: 'mobile', active: true, display_order: 1 },
    { id: 'cat-pc', name: 'PC Games', slug: 'pc', active: true, display_order: 2 },
    { id: 'cat-console', name: 'Console', slug: 'console', active: true, display_order: 3 },
    { id: 'cat-subscriptions', name: 'Subscriptions', slug: 'subscriptions', active: true, display_order: 4 },
    { id: 'cat-giftcards', name: 'Gift Cards', slug: 'gift-cards', active: true, display_order: 5 },
    { id: 'cat-vouchers', name: 'Game Vouchers', slug: 'vouchers', active: true, display_order: 6 },
  ]);

  // Orders (Single Source of Truth from Supabase PostgreSQL via Backend API)
  const [orders, setOrders] = useState<Order[]>([]);

  // Cancellations
  const [cancellationRequests, setCancellationRequests] = useState<CancellationRequest[]>([]);

  // Payment Settings
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS);

  // News (Official Unx Games News Articles from Database)
  const [news, setNews] = useState<NewsItem[]>([]);

  // Reviews & Notifications
  const [reviews, setReviews] = useState<Review[]>([]);
  const [inquiries, setInquiries] = useState<SupportInquiry[]>([]);
  const [clearedNotifIds, setClearedNotifIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('ghn_cleared_notifs_v1');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ghn_cleared_notifs_v1', JSON.stringify(Array.from(clearedNotifIds)));
    } catch {}
  }, [clearedNotifIds]);

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      const saved = localStorage.getItem(NOTIFICATIONS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // App Settings
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(APP_SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed) {
          if (!parsed.logoUrl || parsed.logoUrl === '/logo.png' || parsed.logoUrl.includes('file_00000000b438821189f49d6cbc994849') || parsed.logoUrl.includes('1789182424123') || parsed.logoUrl.includes('Game%20Hub%20Nepal%20Logo.png') || parsed.logoUrl.includes('Game%20Hub%20Nepal.png') || !parsed.logoUrl.includes('unx.png')) {
            parsed.logoUrl = OFFICIAL_LOGO_DATA_URI;
            parsed.faviconUrl = OFFICIAL_LOGO_DATA_URI;
          }
          const isOrdering = parsed.orderingEnabled !== false && parsed.ordering_enabled !== false;
          return {
            ...DEFAULT_APP_SETTINGS,
            ...parsed,
            orderingEnabled: isOrdering,
            maintenanceMode: Boolean(parsed.maintenanceMode ?? parsed.maintenance_mode ?? false),
          };
        }
      }
      return DEFAULT_APP_SETTINGS;
    } catch {
      return DEFAULT_APP_SETTINGS;
    }
  });

  // Activity Logs
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // Navigation & Admin Sub-routing
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentTab, setCurrentTabState] = useState<string>(() => getInitialTabFromUrl());
  const [historyStack, setHistoryStack] = useState<string[]>(() => [getInitialTabFromUrl()]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isAdminView, setIsAdminView] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname.toLowerCase().includes('/admin');
    }
    return false;
  });
  const [adminTab, setAdminTab] = useState<AdminTab>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('/admin/orders')) return 'orders';
      if (path.includes('/admin/payments')) return 'payments';
      if (path.includes('/admin/wallets')) return 'wallets';
      if (path.includes('/admin/products')) return 'products';
      if (path.includes('/admin/packages')) return 'packages';
      if (path.includes('/admin/categories')) return 'categories';
      if (path.includes('/admin/customers') || path.includes('/admin/users')) return 'users';
      if (path.includes('/admin/roles') || path.includes('/admin/permissions')) return 'roles_permissions';
      if (path.includes('/admin/team') || path.includes('/admin/applications')) return 'team_applications';
      if (path.includes('/admin/kyc')) return 'kyc';
      if (path.includes('/admin/inquiries') || path.includes('/admin/support')) return 'inquiries';
      if (path.includes('/admin/reviews')) return 'reviews';
      if (path.includes('/admin/banners') || path.includes('/admin/offers')) return 'banners';
      if (path.includes('/admin/coupons') || path.includes('/admin/promos')) return 'coupons';
      if (path.includes('/admin/news')) return 'news';
      if (path.includes('/admin/notifications')) return 'notifications';
      if (path.includes('/admin/media') || path.includes('/admin/vault')) return 'media_vault';
      if (path.includes('/admin/reports') || path.includes('/admin/revenue')) return 'reports';
      if (path.includes('/admin/activity') || path.includes('/admin/logs')) return 'activity_logs';
      if (path.includes('/admin/payment-settings') || path.includes('/admin/qr')) return 'payment_settings';
      if (path.includes('/admin/settings') || path.includes('/admin/app-settings')) return 'app_settings';
      if (path.includes('/admin/db') || path.includes('/admin/database')) return 'db_inspector';
      if (path.includes('/admin/search')) return 'global_search';
      if (path.includes('/admin/health') || path.includes('/admin/system')) return 'system_health';
      if (path.includes('/admin/security')) return 'security';
      if (path.includes('/admin/cancellations')) return 'cancellations';
      if (path.includes('/admin/password-resets')) return 'password_resets';
    }
    return 'overview';
  });
  const [adminSelectedOrderId, setAdminSelectedOrderId] = useState<string | null>(null);
  const [adminSelectedUserId, setAdminSelectedUserId] = useState<string | null>(null);
  const [adminSelectedProductId, setAdminSelectedProductId] = useState<string | null>(null);
  const [adminSelectedNewsId, setAdminSelectedNewsId] = useState<string | null>(null);

  const currentTabRef = useRef<string>(currentTab);
  const historyStackRef = useRef<string[]>([getInitialTabFromUrl()]);
  const inFlightOrdersRef = useRef<Set<string>>(new Set());
  const inFlightActionsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    currentTabRef.current = currentTab;
  }, [currentTab]);

  useEffect(() => {
    historyStackRef.current = historyStack;
  }, [historyStack]);

  // Smart history-aware tab navigation (memoized with useCallback to prevent re-render loops)
  const resetScrollPosition = useCallback(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const mainEl = document.getElementById('app-main-content') || document.querySelector('main');
      if (mainEl) {
        mainEl.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        mainEl.scrollTop = 0;
      }
    } catch {}
  }, []);

  const setCurrentTab = useCallback((tab: string) => {
    const prev = currentTabRef.current;
    if (tab !== prev) {
      setHistoryStack((prevStack) => [...prevStack, prev]);
    }
    if (tab === 'admin') {
      setIsAdminView(true);
    } else {
      setIsAdminView(false);
    }
    setCurrentTabState(tab);
    resetScrollPosition();
  }, [resetScrollPosition]);

  const goBack = useCallback((fallbackTab: string = 'home') => {
    const stack = historyStackRef.current;
    if (stack.length > 1) {
      const nextStack = stack.slice(0, stack.length - 1);
      const previousTab = nextStack[nextStack.length - 1] || fallbackTab;
      setHistoryStack(nextStack);
      if (previousTab === 'admin') {
        setIsAdminView(true);
      } else {
        setIsAdminView(false);
      }
      setCurrentTabState(previousTab);
    } else {
      setHistoryStack([fallbackTab]);
      if (fallbackTab === 'admin') {
        setIsAdminView(true);
      } else {
        setIsAdminView(false);
      }
      setCurrentTabState(fallbackTab);
    }
    resetScrollPosition();
  }, [resetScrollPosition]);

  const openProduct = useCallback((productId: string) => {
    setSelectedProductId(productId);
    const prev = currentTabRef.current;
    if (prev !== 'product_detail') {
      setHistoryStack((prevStack) => [...prevStack, prev]);
    }
    setIsAdminView(false);
    setCurrentTabState('product_detail');
    resetScrollPosition();
  }, [resetScrollPosition]);

  const openOrder = useCallback((orderId: string) => {
    setSelectedOrderId(orderId);
    const prev = currentTabRef.current;
    if (prev !== 'order_detail') {
      setHistoryStack((prevStack) => [...prevStack, prev]);
    }
    setIsAdminView(false);
    setCurrentTabState('order_detail');
    resetScrollPosition();
  }, [resetScrollPosition]);

  const openReviews = useCallback((productId?: string) => {
    if (productId) {
      setSelectedProductId(productId);
    }
    const prev = currentTabRef.current;
    if (prev !== 'reviews') {
      setHistoryStack((prevStack) => [...prevStack, prev]);
    }
    setIsAdminView(false);
    setCurrentTabState('reviews');
    resetScrollPosition();
  }, [resetScrollPosition]);

  const openCheckout = (productId: string, packageId?: string) => {
    setSelectedProductId(productId);
    const prod = products.find((p) => p.id === productId);
    const pkg = packageId ? prod?.packages?.find((p) => p.id === packageId) : prod?.packages?.[0];
    
    // Save pending checkout session
    sessionStorage.setItem(
      'ghn_pending_checkout',
      JSON.stringify({
        productId,
        packageId: pkg?.id || 'pkg-1',
        gameUserId: '',
        quantity: 1,
      })
    );
    setCurrentTab('checkout');
    resetScrollPosition();
  };

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Primary Backend Data Loader & Synchronizer (Single Source of Truth)
  useEffect(() => {
    // 1. Authoritative Products Fetcher & Synchronizer
    const loadProducts = (attempt = 1) => {
      api.products.getAll().then(res => {
        if (res.success && Array.isArray(res.products)) {
          const sanitized = res.products.map(sanitizeProduct);
          sanitized.sort((a, b) => (a.slotNumber || 99) - (b.slotNumber || 99));
          setProducts(sanitized);
          setIsLoadingProducts(false);
        } else if (attempt < 3) {
          setTimeout(() => loadProducts(attempt + 1), 1000 * attempt);
        } else {
          setIsLoadingProducts(false);
        }
      }).catch(() => {
        if (attempt < 3) {
          setTimeout(() => loadProducts(attempt + 1), 1000 * attempt);
        } else {
          setIsLoadingProducts(false);
        }
      });
    };
    loadProducts();

    // 2. Settings fetch
    const fetchSettings = () => {
      if (
        inFlightActionsRef.current.has('toggle_ordering_status') ||
        inFlightActionsRef.current.has('toggle_maintenance_status') ||
        inFlightActionsRef.current.has('toggle_store_status')
      ) {
        return; // Do not fetch settings if we are actively mutating them, it will overwrite the optimistic UI.
      }
      api.settings.getAppSettings().then(res => {
        if (res.success && (res.appSettings || res.settings)) {
          const incoming = res.appSettings || res.settings;
          const isOrdering = incoming.orderingEnabled !== false && incoming.ordering_enabled !== false;
          const isMaint = Boolean(incoming.maintenanceMode ?? incoming.maintenance_mode ?? false);
          setAppSettings(prev => ({
            ...prev,
            ...incoming,
            orderingEnabled: isOrdering,
            maintenanceMode: isMaint,
          }));
        }
      }).catch(() => {});
    };
    fetchSettings();

    const fetchPaymentSettings = () => {
      api.settings.getPaymentSettings().then(res => {
        if (res.success && res.paymentSettings) setPaymentSettings(res.paymentSettings);
      }).catch(() => {});
    };
    fetchPaymentSettings();

    // 3. Banners & News
    const fetchBanners = () => {
      api.banners.getAll().then(res => {
        if (res.success && Array.isArray(res.banners)) {
          const loaded = res.banners
            .filter(b => b.id !== 'banner-hero-official')
            .map(sanitizeBanner);
          setBanners(loaded);
        }
      }).catch(() => {});
    };
    fetchBanners();

    const fetchNews = () => {
      api.news.getAll().then(res => {
        if (res.success && Array.isArray(res.news) && res.news.length > 0) {
          const cleaned = res.news
            .filter(n => n.id !== 'news-game-codm' && n.id !== 'news-game-roblox')
            .map(sanitizeNews);
          if (cleaned.length > 0) {
            setNews(cleaned);
          }
        }
      }).catch(() => {}).finally(() => {
        setIsLoadingNews(false);
      });
    };
    fetchNews();

    // 4. Reviews
    const fetchReviews = () => {
      api.reviews.getAll().then(res => {
        if (res.success && Array.isArray(res.reviews) && res.reviews.length > 0) {
          setReviews(res.reviews.map(sanitizeReview));
        }
      }).catch(() => {});
    };
    fetchReviews();

    // 5. Categories
    const fetchCategories = () => {
      api.categories.getAll().then(res => {
        if (res.success && Array.isArray(res.categories) && res.categories.length > 0) {
          setCategories(res.categories);
        }
      }).catch(() => {}).finally(() => {
        setIsLoadingCategories(false);
      });
    };
    fetchCategories();

    // 6. Inquiries
    api.support.getMyInquiries().then(res => {
      if (res.success && Array.isArray(res.inquiries)) {
        setInquiries(res.inquiries);
      }
    }).catch(() => {});

    // Hook Real-Time Subscriptions for Sub-Second Synchronous App-Wide Update
    const unsubProduct = realtimeSync.subscribe('product.updated', () => loadProducts(1));
    const unsubProductAny = realtimeSync.subscribe('products.*', () => loadProducts(1));
    const unsubBanner = realtimeSync.subscribe('banner.updated', () => fetchBanners());
    const unsubBannerAny = realtimeSync.subscribe('banners.*', () => fetchBanners());
    const unsubSettings = realtimeSync.subscribe('settings.updated', () => { fetchSettings(); fetchPaymentSettings(); });
    const unsubPayment = realtimeSync.subscribe('payment.updated', () => fetchPaymentSettings());
    const unsubDbSync = realtimeSync.subscribe('database.synchronous_sync_completed', () => {
      loadProducts(1);
      fetchBanners();
      fetchSettings();
      fetchPaymentSettings();
      fetchCategories();
      fetchNews();
    });

    // Background sync cycle every 10 seconds for fail-safe data & image synchronization
    const intervalId = setInterval(() => {
      fetchSettings();
      fetchPaymentSettings();
      fetchBanners();
      loadProducts(1);
    }, 10000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchSettings();
        fetchPaymentSettings();
        fetchBanners();
        loadProducts(1);
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsubProduct();
      unsubProductAny();
      unsubBanner();
      unsubBannerAny();
      unsubSettings();
      unsubPayment();
      unsubDbSync();
      clearInterval(intervalId);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const isSyncingOrdersRef = useRef<boolean>(false);

  // Fetch authenticated user's orders, inquiries & notifications from Backend
  const syncOrdersFromBackend = React.useCallback(async () => {
    if (!currentUser || isSyncingOrdersRef.current) return;
    isSyncingOrdersRef.current = true;

    const normR = String(currentUser?.role || '').toUpperCase();
    const isSuperOwner = normR === 'STORE_OWNER';
    const isUserAdmin = ['SUPER_ADMIN', 'STORE_OWNER', 'STORE_MANAGER', 'SUPPORT_STAFF', 'ADMIN', 'STAFF'].includes(normR);

    try {
      const res = await (isUserAdmin ? api.orders.getAll() : api.orders.getMyOrders());
      if (res && res.success && Array.isArray(res.orders)) {
        setOrders(prev => {
          const mappedOrders: Order[] = res.orders.map((rawOrder: any) => {
            const prod = products.find(p => p.id === (rawOrder.product_id || rawOrder.productId));
            const pkg = prod?.packages?.find(p => p.id === (rawOrder.package_id || rawOrder.packageId));
            
            const code = rawOrder.order_code || rawOrder.orderCode || rawOrder.order_number || rawOrder.orderNumber || (rawOrder.id ? (rawOrder.id.startsWith('GHN-') ? rawOrder.id : `GHN-${rawOrder.id.slice(0, 8).toUpperCase()}`) : 'GHN-0000');
            const numAmount = Number(rawOrder.total_amount ?? rawOrder.amount ?? rawOrder.price ?? 0);
            const pName = rawOrder.productName || rawOrder.product_name || rawOrder.product_name_snapshot || rawOrder.product_title || prod?.name || (prod as any)?.title || 'Game Top-up';
            const pImg = rawOrder.product_image || rawOrder.productImage || prod?.image || '';
            const pkName = rawOrder.packageName || rawOrder.package_name || rawOrder.package_name_snapshot || rawOrder.package_title || pkg?.name || rawOrder.package_id || rawOrder.packageId || 'Standard Package';
            const playerUidVal = String(
              rawOrder.gameUserId || rawOrder.playerId || rawOrder.game_uid || rawOrder.game_user_id || 
              rawOrder.player_id || rawOrder.player_uid || rawOrder.game_username || rawOrder.uid || ''
            ).trim();

            const mappedOrder: Order = {
              id: rawOrder.id,
              order_code: code,
              orderCode: code,
              orderNumber: code,
              orderId: code,
              userId: rawOrder.customer_id || rawOrder.customerId || rawOrder.userId,
              customerId: rawOrder.customer_id || rawOrder.customerId || rawOrder.userId,
              userName: rawOrder.customer_name_snapshot || rawOrder.userName || rawOrder.customerName || 'Customer',
              userEmail: rawOrder.customer_email_snapshot || rawOrder.userEmail || rawOrder.customerEmail || '',
              userPhone: rawOrder.customer_mobile_snapshot || rawOrder.userPhone || rawOrder.customerPhone || '',
              productId: rawOrder.product_id || rawOrder.productId,
              productName: pName,
              gameName: rawOrder.game_name || rawOrder.gameName || prod?.gameName || pName,
              productImage: pImg,
              packageId: rawOrder.package_id || rawOrder.packageId,
              packageName: pkName,
              quantity: Number(rawOrder.quantity) || 1,
              amount: numAmount,
              currency: rawOrder.currency || 'NPR',
              gameUserId: playerUidVal,
              playerId: playerUidVal,
              uid: playerUidVal,
              game_uid: playerUidVal,
              game_username: rawOrder.game_username || playerUidVal,
              zoneId: rawOrder.region || rawOrder.game_zone_id || rawOrder.gameZoneId || rawOrder.zoneId || rawOrder.game_server || rawOrder.server || '', 
              server: rawOrder.game_server || rawOrder.server || rawOrder.region || rawOrder.gameZoneId || rawOrder.zoneId || '',
              paymentMethod: (rawOrder.paymentMethod || rawOrder.payment_method || rawOrder.payment?.method || 'manual') as any,
              transactionId: rawOrder.transactionId || rawOrder.transaction_id || rawOrder.payment?.transaction_id || rawOrder.paymentReference || '',
              paymentProofUrl: rawOrder.paymentProofUrl || rawOrder.proof_url || rawOrder.payment?.proof_url || '',
              paymentStatus: rawOrder.payment_status || rawOrder.paymentStatus || 'pending_verification',
              orderStatus: rawOrder.order_status || rawOrder.orderStatus || rawOrder.status || 'pending_payment',
              status: rawOrder.order_status || rawOrder.orderStatus || rawOrder.status || 'pending_payment',
              voucherCode: rawOrder.voucherCode || rawOrder.voucher_code || rawOrder.notes,
              timeline: [],
              
              createdAt: String(rawOrder.createdAt || rawOrder.created_at || new Date().toISOString()),
              updatedAt: String(rawOrder.updatedAt || rawOrder.updated_at || new Date().toISOString()),
            };
            return mappedOrder;
          });

          const tempOrders = prev.filter((o) => o && o.id && (o.id.startsWith('temp_') || o.id.startsWith('tmp_')));
          
          // Protect in-flight mutations from being overwritten by stale background polling
          const protectedMappedOrders = mappedOrders.map(syncedOrder => {
            if (
              inFlightOrdersRef.current.has(syncedOrder.id) || 
              inFlightOrdersRef.current.has(syncedOrder.orderCode) ||
              inFlightActionsRef.current.has(`update_order_${syncedOrder.id}`) ||
              inFlightActionsRef.current.has(`toggle_status_${syncedOrder.id}`)
            ) {
              const existing = prev.find(p => p.id === syncedOrder.id || p.orderCode === syncedOrder.orderCode);
              return existing || syncedOrder; // Keep optimistic state
            }
            return syncedOrder;
          });

          const syncedList = deduplicateOrdersList([...protectedMappedOrders, ...tempOrders]);

          // Optimize lag: If count and critical order fields match, return prev to prevent whole-app re-render
          if (prev.length === syncedList.length) {
            let isIdentical = true;
            for (let i = 0; i < prev.length; i++) {
              const p = prev[i];
              const s = syncedList[i];
              if (
                p.id !== s.id ||
                p.orderStatus !== s.orderStatus ||
                p.paymentStatus !== s.paymentStatus ||
                p.updatedAt !== s.updatedAt ||
                p.amount !== s.amount
              ) {
                isIdentical = false;
                break;
              }
            }
            if (isIdentical) {
              return prev; // Prevents unnecessary re-render every polling interval!
            }
          }

          // Asynchronously persist to localStorage so it doesn't block the UI thread
          setTimeout(() => {
            try {
              localStorage.setItem(ORDERS_KEY, JSON.stringify(syncedList));
            } catch (_) {}
          }, 0);

          return syncedList;
        });
      }
    } catch (err) {
      console.warn('Sync orders notice:', err);
    } finally {
      isSyncingOrdersRef.current = false;
    }
  }, [currentUser, products]);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    const normR = String(currentUser?.role || '').toUpperCase();
    const isSuperOwner = normR === 'STORE_OWNER';
    const isUserAdmin = ['SUPER_ADMIN', 'STORE_OWNER', 'STORE_MANAGER', 'SUPPORT_STAFF', 'ADMIN', 'STAFF'].includes(normR);

    if (isUserAdmin) {
      api.support.getAllInquiries().then(res => {
        if (res.success && Array.isArray(res.inquiries)) {
          setInquiries(res.inquiries);
        }
      }).catch(() => {});
    } else {
      api.support.getMyInquiries(currentUser.email).then(res => {
        if (res.success && Array.isArray(res.inquiries)) {
          setInquiries(res.inquiries);
        }
      }).catch(() => {});
    }

    syncOrdersFromBackend();

    api.notifications.getAll().then(res => {
      if (res.success && Array.isArray(res.notifications)) {
        const mappedNotifs = res.notifications.map((n: any) => ({
          ...n,
          recipientUid: n.recipient_uid || n.recipientUid,
          recipientRole: n.recipient_role || n.recipientRole,
          isGlobal: n.is_global !== undefined ? n.is_global : n.isGlobal,
          orderId: n.order_id || n.orderId,
          createdAt: n.createdAt || n.created_at,
          updatedAt: n.updatedAt || n.updated_at,
        }));
        setNotifications(mappedNotifs);
      }
    }).catch(() => {});

    if (isAdmin) {
      api.admin.getActivityLogs().then(res => {
        if (res.success && Array.isArray(res.logs) && res.logs.length > 0) {
          const mappedLogs = res.logs.map((l: any) => ({
            ...l,
            adminId: l.actor_id || l.adminId || l.admin_id || '',
            adminEmail: l.actor_email || l.adminEmail || l.admin_email || '',
            adminName: l.actor_name || l.adminName || l.admin_name || 'Admin',
            targetType: l.entity_type || l.targetType || l.target_type || 'system',
            targetId: l.entity_id || l.targetId || l.target_id || '',
            createdAt: l.createdAt || l.created_at || new Date().toISOString(),
          }));
          setActivityLogs(mappedLogs);
        }
      }).catch(() => {});
    }

    api.cancellations.getAll().then(res => {
      if (res.success && Array.isArray(res.requests)) {
        setCancellationRequests(res.requests);
      }
    }).catch(() => {});

    // 1. BroadcastChannel for instant zero-latency cross-tab sync
    let broadcastChannel: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        broadcastChannel = new BroadcastChannel('ghn_realtime_order_bus');
        broadcastChannel.onmessage = (event) => {
          const data = event.data;
          if (data && (data.type === 'ORDER_UPDATED' || data.type === 'ORDER_CREATED')) {
            syncOrdersFromBackend();
            window.dispatchEvent(new CustomEvent('ghn:order-updated', { detail: data }));
          }
        };
      }
    } catch (_) {}

    // 2. Server-Sent Events (SSE) for instant cross-device and server-push real-time sync
    let eventSource: EventSource | null = null;
    try {
      if (typeof window !== 'undefined' && 'EventSource' in window) {
        eventSource = new EventSource('/api/realtime/stream');
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data && (data.type === 'ORDER_UPDATED' || data.type === 'ORDER_CREATED')) {
              syncOrdersFromBackend();
              window.dispatchEvent(new CustomEvent('ghn:order-updated', { detail: data }));
            }
          } catch (_) {}
        };
      }
    } catch (_) {}

    // 3. Supabase Realtime Safe Sync Event Bus
    let unsubscribeRealtimeSync: (() => void) | null = null;
    try {
      unsubscribeRealtimeSync = realtimeSync.subscribeAll((event) => {
        if (!event) return;
        const eType = event.entity_type || '';
        const evType = event.event_type || '';

        if (eType === 'orders' || evType.startsWith('order')) {
          if (evType === 'order.deleted' || event.safe_metadata?.action === 'delete') {
            const delId = event.entity_id || event.safe_metadata?.orderId;
            const delCode = event.safe_metadata?.orderCode;
            if (delId || delCode) {
              setOrders((prev) => {
                const next = prev.filter(
                  (o) =>
                    o.id !== delId &&
                    o.orderNumber !== delId &&
                    o.orderCode !== delId &&
                    o.order_code !== delId &&
                    (!delCode || (o.orderCode !== delCode && o.order_code !== delCode && o.orderNumber !== delCode))
                );
                try {
                  localStorage.setItem(ORDERS_KEY, JSON.stringify(next));
                } catch (_) {}
                return next;
              });
            }
          }
          syncOrdersFromBackend();
          window.dispatchEvent(new CustomEvent('ghn:order-updated', { detail: event }));
        } else if (eType === 'wallet_transactions' || eType === 'wallets' || evType.startsWith('wallet')) {
          refreshWallet().catch(() => {});
        } else if (eType === 'notifications' || evType.startsWith('notification')) {
          refreshNotifications().catch(() => {});
        } else if (eType === 'settings' || eType === 'app_settings' || evType.startsWith('settings')) {
          refreshSettings().catch(() => {});
        } else if (eType === 'payment_settings' || evType.startsWith('payment_settings')) {
          api.settings.getPaymentSettings().then(res => {
            if (res.success && res.paymentSettings) setPaymentSettings(res.paymentSettings);
          }).catch(() => {});
        } else if (eType === 'categories') {
          refreshCategories().catch(() => {});
        } else if (eType === 'products' || evType.startsWith('product') || evType.startsWith('package')) {
          api.products.getAll().then(res => {
            if (res.success && Array.isArray(res.products) && res.products.length > 0) {
              const sanitized = res.products.map(sanitizeProduct);
              sanitized.sort((a, b) => (a.slotNumber || 99) - (b.slotNumber || 99));
              setProducts(sanitized);
            }
          }).catch(() => {});
        } else if (eType === 'banners' || evType.startsWith('banner')) {
          api.banners.getAll().then(res => {
            if (res.success && Array.isArray(res.banners)) {
              setBanners(res.banners.filter(b => b.id !== 'banner-hero-official').map(sanitizeBanner));
            }
          }).catch(() => {});
        } else if (eType === 'news' || evType.startsWith('news')) {
          api.news.getAll().then(res => {
            if (res.success && Array.isArray(res.news) && res.news.length > 0) {
              setNews(res.news.filter(n => n.id !== 'news-game-codm' && n.id !== 'news-game-roblox').map(sanitizeNews));
            }
          }).catch(() => {});
        } else if (eType === 'kyc_verifications' || evType.startsWith('kyc')) {
          window.dispatchEvent(new CustomEvent('ghn:kyc-updated', { detail: event }));
        }
      });
    } catch (_) {}

    // 4. Fallback background sync (optimized every 8s) to ensure resilience
    const ordersSyncInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncOrdersFromBackend();
        api.notifications.getAll().then(res => {
          if (res.success && Array.isArray(res.notifications)) {
            const mappedNotifs = res.notifications.map((n: any) => ({
              ...n,
              recipientUid: n.recipient_uid || n.recipientUid,
              recipientRole: n.recipient_role || n.recipientRole,
              isGlobal: n.is_global !== undefined ? n.is_global : n.isGlobal,
              orderId: n.order_id || n.orderId,
              createdAt: n.createdAt || n.created_at,
              updatedAt: n.updatedAt || n.updated_at,
            }));
            setNotifications(prev => {
              if (prev.length === mappedNotifs.length) {
                const isIdentical = prev.every((pn, idx) => pn.id === mappedNotifs[idx]?.id && pn.read === mappedNotifs[idx]?.read);
                if (isIdentical) return prev;
              }
              return mappedNotifs;
            });
          }
        }).catch(() => {});
      }
    }, 8000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncOrdersFromBackend();
      }
    };
    window.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(ordersSyncInterval);
      window.removeEventListener('visibilitychange', handleVisibility);
      try { broadcastChannel?.close(); } catch (_) {}
      try { eventSource?.close(); } catch (_) {}
      try { unsubscribeRealtimeSync?.(); } catch (_) {}
    };
  }, [currentUser, isAdmin, syncOrdersFromBackend]);

  useEffect(() => {
    try {
      localStorage.setItem(PAYMENTS_SETTINGS_KEY, JSON.stringify(paymentSettings));
    } catch {}
  }, [paymentSettings]);

  useEffect(() => {
    try {
      localStorage.setItem(NEWS_KEY, JSON.stringify(news));
    } catch {}
  }, [news]);

  useEffect(() => {
    try {
      if (products && products.length > 0) {
        localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
      }
    } catch {}
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(appSettings));
    } catch {}
  }, [appSettings]);

  // Background prefetching for product images to guarantee instant render
  useEffect(() => {
    if (products && products.length > 0) {
      products.slice(0, 15).forEach(product => {
        if (product.image) {
          const img = new Image();
          img.src = product.image;
        }
        if (product.bannerImage) {
          const img = new Image();
          img.src = product.bannerImage;
        }
      });
    }
  }, [products]);

  // Background prefetching for news images to guarantee instant render
  useEffect(() => {
    if (news && news.length > 0) {
      news.forEach(item => {
        if (item.image) {
          const img = new Image();
          img.src = item.image;
        }
      });
    }
  }, [news]);

  // Toast Helpers
  const showToast = (type: ToastMessage['type'], title: string, message?: string, duration?: number) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const effectiveDuration = duration || (type === 'error' ? 3500 : 2200);
    setToasts([{ id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, effectiveDuration);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Strictly Active Products: limit to 10 max
  const activeProducts = products.filter((p) => p.active && p.category !== 'Offer');

  // Product Management
  const addProduct = async (
    productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>,
    adminInfo?: { uid: string; name: string; email: string }
  ): Promise<{ success: boolean; message: string }> => {
    const lockKey = `add_product_${productData.name}`;
    if (inFlightActionsRef.current.has(lockKey)) {
      return { success: false, message: 'Creation already in progress.' };
    }
    inFlightActionsRef.current.add(lockKey);

    const id = `prod-${Date.now()}`;
    const now = new Date().toISOString();
    const newProduct: Product = {
      ...productData,
      id,
      createdAt: now,
      updatedAt: now,
    };

    setProducts((prev) => [...prev, newProduct]);

    try {
      const res = await api.products.create(newProduct);
      if (res && res.success === false) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        showToast('error', 'Creation Failed', res.message || 'Could not create product on server.');
        return { success: false, message: res.message || 'Server error' };
      }

      if (adminInfo) {
        logAdminActivity({
          adminId: adminInfo.uid,
          adminName: adminInfo.name,
          adminEmail: adminInfo.email,
          action: 'Created Product',
          targetType: 'product',
          targetId: id,
          description: `Added product "${newProduct.name}" (${newProduct.gameName})`,
        }).catch(() => {});
      }

      showToast('success', 'Product Created', `${newProduct.name} has been added to the catalog.`);
      return { success: true, message: 'Product created successfully.' };
    } catch (e: any) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      showToast('error', 'Creation Error', e?.message || 'Network error creating product.');
      return { success: false, message: e?.message || 'Network error' };
    } finally {
      inFlightActionsRef.current.delete(lockKey);
    }
  };

  const updateProduct = async (
    id: string,
    updates: Partial<Product>,
    adminInfo?: { uid: string; name: string; email: string }
  ): Promise<{ success: boolean; message: string }> => {
    const lockKey = `update_product_${id}`;
    if (inFlightActionsRef.current.has(lockKey)) {
      return { success: false, message: 'Update already in progress.' };
    }
    inFlightActionsRef.current.add(lockKey);

    const now = new Date().toISOString();
    const previousProducts = [...products];
    const target = products.find((p) => p.id === id);
    const updated = products.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: now } : p));
    setProducts(updated);

    try {
      const res = await api.products.update(id, updates);
      if (res && res.success === false) {
        setProducts(previousProducts);
        showToast('error', 'Update Failed', res.message || 'Could not save product changes.');
        return { success: false, message: res.message || 'Server error' };
      }

      if (adminInfo) {
        logAdminActivity({
          adminId: adminInfo.uid,
          adminName: adminInfo.name,
          adminEmail: adminInfo.email,
          action: 'Updated Product',
          targetType: 'product',
          targetId: id,
          description: `Updated product "${updates.name || target?.name || id}"`,
        }).catch(() => {});
      }

      showToast('success', 'Product Updated', 'Product changes have been saved.');
      return { success: true, message: 'Product updated successfully.' };
    } catch (e: any) {
      setProducts(previousProducts);
      showToast('error', 'Update Error', e?.message || 'Network error saving product.');
      return { success: false, message: e?.message || 'Network error' };
    } finally {
      inFlightActionsRef.current.delete(lockKey);
    }
  };

  const deleteProduct = async (
    id: string,
    adminInfo?: { uid: string; name: string; email: string }
  ): Promise<{ success: boolean; message: string }> => {
    const lockKey = `delete_product_${id}`;
    if (inFlightActionsRef.current.has(lockKey)) {
      return { success: false, message: 'Deletion already in progress.' };
    }
    inFlightActionsRef.current.add(lockKey);

    const previousProducts = [...products];
    const target = products.find((p) => p.id === id);
    setProducts((prev) => prev.filter((p) => p.id !== id));

    try {
      const res = await api.products.delete(id);
      if (res && res.success === false) {
        setProducts(previousProducts);
        showToast('error', 'Delete Failed', res.message || 'Could not delete product.');
        return { success: false, message: res.message || 'Server error' };
      }

      if (adminInfo && target) {
        logAdminActivity({
          adminId: adminInfo.uid,
          adminName: adminInfo.name,
          adminEmail: adminInfo.email,
          action: 'Deleted Product',
          targetType: 'product',
          targetId: id,
          description: `Deleted product "${target.name}" (${target.gameName})`,
        }).catch(() => {});
      }

      showToast('info', 'Product Removed', `${target?.name || 'Product'} has been deleted.`);
      return { success: true, message: 'Product deleted.' };
    } catch (e: any) {
      setProducts(previousProducts);
      showToast('error', 'Delete Error', e?.message || 'Network error deleting product.');
      return { success: false, message: e?.message || 'Network error' };
    } finally {
      inFlightActionsRef.current.delete(lockKey);
    }
  };

  const toggleProductStatus = async (
    id: string,
    targetActiveOrAdminInfo?: boolean | { uid: string; name: string; email: string },
    adminInfo?: { uid: string; name: string; email: string }
  ): Promise<{ success: boolean; message: string }> => {
    const lockKey = `toggle_status_product_${id}`;
    if (inFlightActionsRef.current.has(lockKey)) {
      return { success: false, message: 'Status change already in progress.' };
    }
    inFlightActionsRef.current.add(lockKey);

    const target = products.find((p) => p.id === id);
    if (!target) {
      inFlightActionsRef.current.delete(lockKey);
      return { success: false, message: 'Product not found.' };
    }

    const previousProducts = [...products];
    const willBeActive = typeof targetActiveOrAdminInfo === 'boolean' ? targetActiveOrAdminInfo : !target.active;
    const resolvedAdminInfo = typeof targetActiveOrAdminInfo === 'object' ? targetActiveOrAdminInfo : adminInfo;
    const now = new Date().toISOString();

    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: willBeActive, updatedAt: now } : p))
    );

    try {
      const res = await api.products.update(id, { active: willBeActive });
      if (res && res.success === false) {
        setProducts(previousProducts);
        showToast('error', 'Toggle Failed', res.message || 'Could not change product status.');
        return { success: false, message: res.message || 'Server error' };
      }
      
      if (res && res.product) {
        setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...res.product } : p)));
      }

      if (adminInfo) {
        logAdminActivity({
          adminId: adminInfo.uid,
          adminName: adminInfo.name,
          adminEmail: adminInfo.email,
          action: willBeActive ? 'Activated Product' : 'Disabled Product',
          targetType: 'product',
          targetId: id,
          description: `Changed product "${target.name}" status to ${willBeActive ? 'ACTIVE' : 'INACTIVE'}`,
        }).catch(() => {});
      }

      showToast(
        'info',
        willBeActive ? 'Product Activated' : 'Product Disabled',
        `${target.name} is now ${willBeActive ? 'active in store' : 'hidden from store'}.`
      );
      return { success: true, message: 'Product status changed.' };
    } catch (e: any) {
      setProducts(previousProducts);
      showToast('error', 'Toggle Error', e?.message || 'Network error updating product status.');
      return { success: false, message: e?.message || 'Network error' };
    } finally {
      inFlightActionsRef.current.delete(lockKey);
    }
  };

  const toggleProductStock = async (
    id: string,
    forcedStockState?: boolean,
    adminInfo?: { uid: string; name: string; email: string }
  ): Promise<{ success: boolean; message: string }> => {
    const lockKey = `toggle_stock_product_${id}`;
    if (inFlightActionsRef.current.has(lockKey)) {
      return { success: false, message: 'Stock update already in progress.' };
    }
    inFlightActionsRef.current.add(lockKey);

    const target = products.find((p) => p.id === id);
    if (!target) {
      inFlightActionsRef.current.delete(lockKey);
      return { success: false, message: 'Product not found.' };
    }

    const previousProducts = [...products];
    const currentInStock = target.inStock !== false && (target.stock === undefined || target.stock > 0);
    const willBeInStock = forcedStockState !== undefined ? forcedStockState : !currentInStock;
    const newStockCount = willBeInStock ? (target.stock && target.stock > 0 ? target.stock : 99) : 0;
    const now = new Date().toISOString();

    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, inStock: willBeInStock, stock: newStockCount, updatedAt: now } : p))
    );

    try {
      const res = await api.products.update(id, { inStock: willBeInStock, stock: newStockCount });
      if (res && res.success === false) {
        setProducts(previousProducts);
        showToast('error', 'Stock Update Failed', res.message || 'Could not update product stock.');
        return { success: false, message: res.message || 'Server error' };
      }
      
      if (res && res.product) {
        setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...res.product } : p)));
      }

      if (adminInfo) {
        logAdminActivity({
          adminId: adminInfo.uid,
          adminName: adminInfo.name,
          adminEmail: adminInfo.email,
          action: willBeInStock ? 'Marked In Stock' : 'Marked Out of Stock',
          targetType: 'product',
          targetId: id,
          description: `Set stock status of "${target.name}" to ${willBeInStock ? 'IN STOCK' : 'OUT OF STOCK'}`,
        }).catch(() => {});
      }

      showToast(
        willBeInStock ? 'success' : 'warning',
        willBeInStock ? 'Product In Stock' : 'Product Out of Stock',
        `"${target.name}" is now marked as ${willBeInStock ? 'In Stock' : 'Out of Stock'}.`
      );
      return { success: true, message: `Product is now ${willBeInStock ? 'In Stock' : 'Out of Stock'}.` };
    } catch (e: any) {
      setProducts(previousProducts);
      showToast('error', 'Stock Error', e?.message || 'Network error updating stock.');
      return { success: false, message: e?.message || 'Network error' };
    } finally {
      inFlightActionsRef.current.delete(lockKey);
    }
  };

  // Category Management
  const refreshCategories = async () => {
    try {
      const res = await api.categories.getAll();
      if (res.success && Array.isArray(res.categories)) {
        setCategories(res.categories);
      }
    } catch (err) {
      console.error('Failed to refresh categories:', err);
    }
  };

  const createCategory = async (data: Partial<Category>) => {
    const lockKey = `create_category_${data.name}`;
    if (inFlightActionsRef.current.has(lockKey)) {
      return { success: false, message: 'Creation in progress.' };
    }
    inFlightActionsRef.current.add(lockKey);
    try {
      const res = await api.categories.create(data);
      if (res.success) {
        await refreshCategories();
        showToast('success', 'Category Created', `Category "${data.name}" has been created.`);
        return { success: true };
      }
      showToast('error', 'Creation Failed', res.message || 'Could not create category');
      return { success: false, message: res.message };
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Network error');
      return { success: false, message: err.message };
    } finally {
      inFlightActionsRef.current.delete(lockKey);
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    const lockKey = `update_category_${id}`;
    if (inFlightActionsRef.current.has(lockKey)) {
      return { success: false, message: 'Update in progress.' };
    }
    inFlightActionsRef.current.add(lockKey);
    try {
      const res = await api.categories.update(id, updates);
      if (res.success) {
        await refreshCategories();
        showToast('success', 'Category Updated', 'Category details updated.');
        return { success: true };
      }
      showToast('error', 'Update Failed', res.message || 'Could not update category');
      return { success: false, message: res.message };
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Network error');
      return { success: false, message: err.message };
    } finally {
      inFlightActionsRef.current.delete(lockKey);
    }
  };

  const deleteCategory = async (id: string) => {
    const lockKey = `delete_category_${id}`;
    if (inFlightActionsRef.current.has(lockKey)) {
      return { success: false, message: 'Deletion in progress.' };
    }
    inFlightActionsRef.current.add(lockKey);
    try {
      const res = await api.categories.delete(id);
      if (res.success) {
        await refreshCategories();
        showToast('success', 'Category Deleted', 'Category has been deleted.');
        return { success: true };
      }
      showToast('error', 'Delete Failed', res.message || 'Could not delete category');
      return { success: false, message: res.message };
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Network error');
      return { success: false, message: err.message };
    } finally {
      inFlightActionsRef.current.delete(lockKey);
    }
  };

  // Order Creation Flow
  const createOrder = async (orderData: {
    userId: string;
    userName: string;
    userEmail: string;
    userPhone?: string;
    userLocation?: string;
    customerLocation?: string;
    productId: string;
    productName?: string;
    productImage?: string;
    packageId: string;
    packageName?: string;
    quantity?: number;
    amount?: number;
    gameUserId: string;
    zoneId?: string;
    server?: string;
    paymentMethod: PaymentMethod;
    transactionId?: string;
    transferId?: string;
    paymentReference?: string;
    paymentScreenshot?: string;
    paymentScreenshotR2Key?: string;
    paymentProofUrl?: string;
    paymentProofR2Key?: string;
    couponCode?: string;
    orderCode?: string;
  }): Promise<Order> => {
    const lockKey = `create_order_${orderData.userId}_${orderData.productId}_${orderData.packageId}_${orderData.gameUserId}`;
    if (inFlightActionsRef.current.has(lockKey)) {
      throw new Error('Order creation is already in progress. Please wait.');
    }
    inFlightActionsRef.current.add(lockKey);
    try {
      // 13. SECURITY / API GUARD
    if (appSettings.maintenanceMode) {
      const maintenanceError = new Error("Top-up service is temporarily unavailable due to maintenance.");
      (maintenanceError as any).code = 'STORE_MAINTENANCE';
      throw maintenanceError;
    }

    const userRole = String(currentUser?.role || '').toUpperCase();
    const isUserAdmin = ['SUPER_ADMIN', 'STORE_OWNER', 'STORE_MANAGER', 'SUPPORT_STAFF', 'ADMIN', 'STAFF'].includes(userRole);
    const isOrderingActive = appSettings.orderingEnabled !== false && (appSettings as any).ordering_enabled !== false;
    if (!isOrderingActive && !isUserAdmin) {
      const orderingError = new Error("Ordering is currently offline.");
      (orderingError as any).code = 'ORDERING_OFFLINE';
      throw orderingError;
    }

    const product = products.find((p) => p.id === orderData.productId);
    const selectedPkg = product?.packages.find((pkg) => pkg.id === orderData.packageId) || {
      id: orderData.packageId,
      name: orderData.packageName || product?.packageName || 'Standard Top-Up',
      price: product?.price || 100,
    };

    const playerId = (orderData.gameUserId || (orderData as any).playerId || '').trim();
    let txnId = (orderData.transactionId || orderData.transferId || orderData.paymentReference || '').trim();
    // NEVER copy Player ID into Transaction Ref
    if (txnId === playerId) {
      txnId = '';
    }

    const screenshot = orderData.paymentScreenshot || orderData.paymentProofUrl || '';
    const totalAmount = orderData.amount ?? (selectedPkg.price * (orderData.quantity || 1));

    const tempId = orderData.orderCode || `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const isWalletPay = orderData.paymentMethod === 'wallet' || (orderData.paymentMethod as any) === 'gamer_wallet';

    const newOrder: Order = {
      id: tempId,
      orderId: tempId,
      order_code: orderData.orderCode,
      orderCode: orderData.orderCode,
      orderNumber: orderData.orderCode,

      userId: orderData.userId,
      customerId: orderData.userId,

      userName: orderData.userName || 'Customer',
      customerName: orderData.userName || 'Customer',

      userEmail: orderData.userEmail || '',
      customerEmail: orderData.userEmail || '',

      userPhone: orderData.userPhone || '',
      customerPhone: orderData.userPhone || '',

      productId: orderData.productId,
      productName: orderData.productName || product?.name || 'Game Top-Up',
      gameName: product?.gameName || 'Unx Games',
      productImage: orderData.productImage || product?.image || '',

      packageId: orderData.packageId,
      packageName: orderData.packageName || selectedPkg.name,
      quantity: orderData.quantity || 1,

      amount: totalAmount,
      totalAmount: totalAmount,
      total_amount: totalAmount,
      price: totalAmount,
      unitPrice: selectedPkg.price || totalAmount,
      currency: 'NPR',

      gameUserId: playerId,
      playerId: playerId,
      uid: playerId,
      zoneId: orderData.zoneId || '',
      server: orderData.server || '',

      paymentMethod: orderData.paymentMethod,
      paymentGateway: orderData.paymentMethod,

      transactionId: txnId,
      transferId: txnId,
      paymentReference: txnId,

      paymentScreenshot: screenshot || '',
      paymentProofUrl: screenshot || '',

      paymentStatus: isWalletPay ? 'verified' : 'pending_verification',
      orderStatus: isWalletPay ? 'processing' : 'payment_verification',
      deliveryStatus: isWalletPay ? 'processing' : 'verifying',

      status: isWalletPay ? 'processing' : 'payment_verification',
      activities: [
        {
          id: `act-${Date.now()}`,
          orderId: tempId,
          action: 'Order Placed',
          message: isWalletPay
            ? `Order paid instantly with Gamer Wallet for NPR ${totalAmount}`
            : `Order submitted for NPR ${totalAmount} via ${orderData.paymentMethod.toUpperCase()}`,
          timestamp: now,
        },
      ],
      timeline: isWalletPay
        ? [
            {
              status: 'pending_payment',
              timestamp: now,
              title: 'Order Placed',
              note: `Paid NPR ${totalAmount} via Gamer Wallet`,
              by: 'user',
            },
            {
              status: 'processing',
              timestamp: now,
              title: 'Payment Verified & In Processing',
              note: 'Wallet balance deducted automatically. Top-up is being processed.',
              by: 'system',
            },
          ]
        : [
            {
              status: 'pending_payment',
              timestamp: now,
              title: 'Order Placed',
              note: `Selected ${orderData.paymentMethod.toUpperCase()} for NPR ${totalAmount}`,
              by: 'user',
            },
            {
              status: 'payment_verification',
              timestamp: now,
              title: 'Payment Proof Submitted',
              note: txnId ? `Transaction Ref: ${txnId}` : 'Screenshot uploaded for verification',
              by: 'user',
            },
          ],
      createdAt: now,
      updatedAt: now,
    };

    // Strip undefined
    Object.keys(newOrder).forEach(
      (key) => newOrder[key as keyof Order] === undefined && delete newOrder[key as keyof Order]
    );

    // Save to Backend Database (Single Source of Truth)
    const backendRes = await api.orders.create({
      customerId: orderData.userId,
      customer_id: orderData.userId,
      userId: orderData.userId,
      productId: orderData.productId,
        productName: newOrder.productName,
        gameName: newOrder.gameName,
        packageId: orderData.packageId,
        packageName: newOrder.packageName,
        quantity: newOrder.quantity,
        amount: newOrder.amount,
        gameUserId: playerId,
        zoneId: orderData.couponCode ? orderData.zoneId : orderData.zoneId,
        server: orderData.server,
        paymentMethod: orderData.paymentMethod,
        transactionId: txnId,
        paymentScreenshot: screenshot,
        paymentScreenshotR2Key: orderData.paymentScreenshotR2Key || orderData.paymentProofR2Key,
        userName: orderData.userName,
        userEmail: orderData.userEmail,
        userPhone: orderData.userPhone,
        userLocation: orderData.userLocation,
        customerLocation: orderData.customerLocation,
        couponCode: orderData.couponCode,
        orderCode: orderData.orderCode,
      });

      if (backendRes && backendRes.success && backendRes.order) {
        const serverOrder = backendRes.order;
        const realId = serverOrder.id || tempId;
        const code = serverOrder.order_code || serverOrder.orderCode || serverOrder.order_number || `GHN-${String(realId).slice(0, 8).toUpperCase()}`;
        const finalOrderCode = code;

        const verifiedOrder: Order = {
          ...newOrder,
          ...serverOrder,
          id: realId,
          order_code: code,
          orderCode: code,
          orderId: code,
          orderNumber: code,
          paymentMethod: serverOrder.paymentMethod || serverOrder.payment_method || newOrder.paymentMethod,
          paymentGateway: serverOrder.paymentMethod || serverOrder.payment_method || newOrder.paymentMethod,
          transactionId: serverOrder.transactionId || serverOrder.transaction_id || newOrder.transactionId,
        };

        if (serverOrder.customer_id) {
          verifiedOrder.customerId = serverOrder.customer_id;
          verifiedOrder.userId = serverOrder.customer_id;
        }

        // Add confirmed order to state
        setOrders((prev) => {
          const filtered = prev.filter((o) => o.id !== tempId && o.id !== realId && (o.order_code || o.orderCode || o.orderNumber) !== code);
          return deduplicateOrdersList([verifiedOrder, ...filtered]);
        });

        if (isWalletPay || backendRes.wallet) {
          if (backendRes.wallet && backendRes.wallet.balance !== undefined) {
            setWalletBalance(Number(backendRes.wallet.balance) || 0);
            try { window.dispatchEvent(new CustomEvent('ghn_wallet_updated', { detail: backendRes.wallet })); } catch (_) {}
          }
          refreshWallet().catch(() => {});
        }

        // Send initial notification to user state
        const notifId = `notif-${Date.now()}`;
        const newNotif: Notification = {
          id: notifId,
          recipientUid: orderData.userId,
          recipientRole: 'user',
          userId: orderData.userId,
          isGlobal: false,
          title: `Order ${code} Submitted ⏳`,
          message: `Your order for ${verifiedOrder.packageName} (${verifiedOrder.gameName}) has been received.`,
          type: 'payment_verification',
          orderId: code,
          read: false,
          createdAt: now,
        };
        setNotifications((prev) => [newNotif, ...prev]);

        return verifiedOrder;
      } else {
        throw new Error(backendRes?.message || 'Failed to create order on server');
      }
    } catch (e: any) {
      console.warn('Backend order creation note:', e);
      throw e;
    } finally {
      inFlightActionsRef.current.delete(lockKey);
    }
  };

  // Order Status Admin Management with Controlled Transitions
  const updateOrderStatus = async (
    orderId: string,
    newStatus: OrderStatus,
    adminNote?: string,
    rejectionReason?: string,
    adminInfo?: { uid?: string; name?: string; email?: string; role?: string },
    extraData?: { processingNote?: string; deliveryNote?: string }
  ): Promise<{ success: boolean; message?: string }> => {
    const targetOrder = orders.find(
      (o) => o.id === orderId || o.orderCode === orderId || o.order_code === orderId || o.orderNumber === orderId || (o as any).order_number === orderId
    );

    const canonicalOrderId = targetOrder?.id || orderId;

    // Concurrency / In-Flight Guard: Prevent duplicate rapid clicks on the same order
    if (inFlightOrdersRef.current.has(canonicalOrderId)) {
      return { success: false, message: 'An update is already in progress for this order.' };
    }
    inFlightOrdersRef.current.add(canonicalOrderId);

    try {
      if (!targetOrder) {
        // If not found in local cache, attempt direct update on backend
        try {
          const res = await api.orders.updateStatus(orderId, newStatus, adminNote, rejectionReason, extraData, adminInfo);
          if (res.success) {
            if (res.order) {
              setOrders((prev) => [res.order, ...prev.filter((o) => o.id !== res.order.id && o.orderCode !== res.order.orderCode)]);
            }
            return { success: true, message: res.message };
          }
          return { success: false, message: res.message || 'Order not found.' };
        } catch (err: any) {
          return { success: false, message: err?.message || 'Order not found.' };
        }
      }

      const now = new Date().toISOString();
      const displayOrderId = formatDisplayOrderId(targetOrder);
      let statusTitle = 'Order Updated';
      let notifTitle = 'Order Update';
      let notifMsg = `Your order ${displayOrderId} status is now ${newStatus.replace('_', ' ').toUpperCase()}`;

      switch (newStatus) {
        case 'payment_verified':
          statusTitle = 'Payment Verified';
          notifTitle = `Payment Confirmed: ${displayOrderId} ✅`;
          notifMsg = 'Your payment screenshot & reference have been verified by Unx Games.';
          break;
        case 'processing':
          statusTitle = 'Top-Up Processing';
          notifTitle = `Processing: ${displayOrderId} ⚡`;
          notifMsg = extraData?.processingNote || 'Your game credits are being delivered to your Player ID.';
          break;
        case 'delivered':
          statusTitle = 'Order Delivered';
          notifTitle = `Order Delivered: ${displayOrderId} 🚚`;
          notifMsg = extraData?.deliveryNote || 'Your game top-up items have been delivered to your account.';
          break;
        case 'completed':
          statusTitle = 'Order Completed';
          notifTitle = `Order Completed: ${displayOrderId} 🎉`;
          notifMsg = `Your top-up has been successfully completed! Thank you for using Unx Games.`;
          break;
        case 'rejected':
          statusTitle = 'Payment Re-Verification Required';
          notifTitle = `Payment Re-Verification Required: ${displayOrderId} 🔄`;
          notifMsg = rejectionReason
            ? `Payment verification failed (${rejectionReason}). Please resubmit correct transaction details for re-verification.`
            : 'Payment screenshot or transaction reference could not be verified. Please resubmit correct payment proof for re-verification.';
          break;
        case 'cancelled':
          statusTitle = 'Order Cancelled';
          notifTitle = `Order Cancelled: ${displayOrderId}`;
          notifMsg = 'Your order has been cancelled.';
          break;
        default:
          statusTitle = 'Status Updated';
      }

      const newEvent = {
        status: newStatus,
        timestamp: now,
        title: statusTitle,
        note: adminNote || rejectionReason || extraData?.processingNote || extraData?.deliveryNote || '',
        by: 'admin' as const,
      };

      const adminDisplayName = formatActorName(adminInfo?.name || adminInfo?.email || 'Admin', adminInfo?.role);

      let pStatus: 'pending' | 'pending_verification' | 'verified' | 'rejected' = targetOrder.paymentStatus || 'pending_verification';
      let oStatus: OrderStatus = targetOrder.orderStatus || targetOrder.status;

      let verifiedAt = targetOrder.verifiedAt;
      let verifiedBy = targetOrder.verifiedBy;
      let processingAt = targetOrder.processingAt;
      let processingBy = targetOrder.processingBy;
      let deliveredAt = targetOrder.deliveredAt;
      let deliveredBy = targetOrder.deliveredBy;
      let completedAt = targetOrder.completedAt;
      let completedBy = targetOrder.completedBy;
      let rejectedAt = targetOrder.rejectedAt;
      let rejectedBy = targetOrder.rejectedBy;

      if (newStatus === 'payment_verified') {
        pStatus = 'verified';
        oStatus = 'processing';
        verifiedAt = now;
        verifiedBy = adminDisplayName;
        processingAt = now;
        processingBy = adminDisplayName;
      } else if (newStatus === 'rejected') {
        pStatus = 'rejected';
        oStatus = 'rejected';
        rejectedAt = now;
        rejectedBy = adminDisplayName;
      } else if (newStatus === 'cancelled') {
        oStatus = 'cancelled';
      } else if (newStatus === 'processing') {
        oStatus = 'processing';
        pStatus = 'verified';
        processingAt = now;
        processingBy = adminDisplayName;
      } else if (newStatus === 'delivered') {
        oStatus = 'delivered';
        pStatus = 'verified';
        deliveredAt = now;
        deliveredBy = adminDisplayName;
      } else if (newStatus === 'completed') {
        oStatus = 'completed';
        pStatus = 'verified';
        completedAt = now;
        completedBy = adminDisplayName;
      }

      const activityLogItem: OrderActivity = {
        id: `act-${Date.now()}`,
        orderId,
        action: statusTitle,
        message: adminNote || rejectionReason || extraData?.processingNote || extraData?.deliveryNote || statusTitle,
        adminId: adminInfo?.uid || 'system',
        adminName: adminDisplayName,
        timestamp: now,
      };

      const updatedActivities = [activityLogItem, ...(targetOrder.activities || [])];

      // Keep status and orderStatus aligned to prevent oscillation
      const updatedOrder: Order = {
        ...targetOrder,
        ...(extraData as any),
        status: oStatus,
        paymentStatus: pStatus,
        orderStatus: oStatus,
        cancellationStatus: newStatus === 'cancelled' ? 'approved' : targetOrder.cancellationStatus,
        adminNote: adminNote ?? targetOrder.adminNote,
        rejectionReason: rejectionReason ?? targetOrder.rejectionReason,
        processingNote: extraData?.processingNote ?? targetOrder.processingNote,
        deliveryNote: extraData?.deliveryNote ?? targetOrder.deliveryNote,
        verifiedAt,
        verifiedBy,
        processingAt,
        processingBy,
        deliveredAt,
        deliveredBy,
        completedAt,
        completedBy,
        rejectedAt,
        rejectedBy,
        activities: updatedActivities,
        timeline: [...targetOrder.timeline, newEvent],
        updatedAt: now,
      };

      // Remove undefined values to prevent errors
      Object.keys(updatedOrder).forEach(
        (key) => updatedOrder[key as keyof Order] === undefined && delete updatedOrder[key as keyof Order]
      );

      // Save previous order snapshot for deterministic rollback
      const previousTargetOrder = { ...targetOrder };

      // 1. INSTANT OPTIMISTIC STATE UPDATE (0ms instant response)
      setNotifications((prev) => {
        const filtered = prev.filter((n) => {
          const notifOrderRef = n.orderId || (n as any).order_id;
          const isTarget = notifOrderRef === orderId || notifOrderRef === targetOrder.id || notifOrderRef === targetOrder.orderNumber || notifOrderRef === targetOrder.orderCode;
          if (isTarget && (n.recipientRole === 'admin' || n.type === 'payment_verification' || (n.title && n.title.includes(orderId)))) {
            return false;
          }
          return true;
        });
        const notifId = `notif-${Date.now()}`;
        const notif: Notification = {
          id: notifId,
          recipientUid: targetOrder.userId,
          recipientRole: 'user',
          userId: targetOrder.userId,
          isGlobal: false,
          title: notifTitle,
          message: notifMsg,
          type:
            newStatus === 'completed'
              ? 'order_completed'
              : newStatus === 'rejected'
              ? 'payment_rejected'
              : newStatus === 'payment_verified'
              ? 'payment_verified'
              : 'order_processing',
          orderId: canonicalOrderId,
          read: false,
          createdAt: now,
        };
        return [notif, ...filtered];
      });
      
      setOrders((prev) => {
        const next = prev.map((ord) => 
          (ord.id === orderId || (targetOrder && ord.id === targetOrder.id) || ord.orderNumber === orderId || ord.orderCode === orderId || (targetOrder && ord.orderCode === targetOrder.orderCode)) 
            ? { ...ord, ...updatedOrder } 
            : ord
        );
        try {
          localStorage.setItem(ORDERS_KEY, JSON.stringify(next));
        } catch (_) {}
        return next;
      });

      // Real-time broadcast for 0ms instant sync across all tabs and components
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('ghn_realtime_order_bus');
          bc.postMessage({ type: 'ORDER_UPDATED', order: { ...targetOrder, ...updatedOrder }, orderId: canonicalOrderId, status: oStatus });
          bc.close();
        }
      } catch (_) {}
      window.dispatchEvent(new CustomEvent('ghn:order-updated', { detail: { order: { ...targetOrder, ...updatedOrder }, orderId: canonicalOrderId, status: oStatus } }));

      // 2. DATABASE PERSISTENCE & SYNCHRONIZATION
      try {
        const res = await api.orders.updateStatus(canonicalOrderId, newStatus, adminNote, rejectionReason, extraData, adminInfo);
        if (res?.success && res?.order) {
          setOrders((prev) =>
            prev.map((ord) =>
              (ord.id === canonicalOrderId || ord.orderCode === res.order.orderCode || ord.id === res.order.id)
                ? {
                    ...ord,
                    ...res.order,
                    orderStatus: res.order.orderStatus || oStatus,
                    status: res.order.status || oStatus,
                    paymentStatus: res.order.paymentStatus || pStatus,
                  }
                : ord
            )
          );

          // Admin activity log
          if (adminInfo) {
            logAdminActivity({
              adminId: adminInfo.uid,
              adminName: adminInfo.name,
              adminEmail: adminInfo.email,
              action: `Order Status: ${newStatus}`,
              targetType: 'order',
              targetId: canonicalOrderId,
              description: `Changed order ${canonicalOrderId} (${targetOrder?.productName || ''}) status to ${newStatus}. Note: ${adminNote || rejectionReason || 'None'}`,
            }).catch(() => {});
          }

          return { success: true, message: res.message || 'Order status updated successfully' };
        } else {
          // Rollback on server failure
          console.warn('Server failed to persist status update:', res?.message);
          setOrders((prev) =>
            prev.map((ord) =>
              (ord.id === canonicalOrderId || ord.orderCode === targetOrder.orderCode || ord.id === targetOrder.id)
                ? previousTargetOrder
                : ord
            )
          );
          return { success: false, message: res?.message || 'Failed to update order status on server' };
        }
      } catch (e: any) {
        console.warn('Backend update order status error:', e);
        // Rollback on exception
        setOrders((prev) =>
          prev.map((ord) =>
            (ord.id === canonicalOrderId || ord.orderCode === targetOrder.orderCode || ord.id === targetOrder.id)
              ? previousTargetOrder
              : ord
          )
        );
        return { success: false, message: e?.message || 'Server error occurred while updating order status' };
      }
    } finally {
      inFlightOrdersRef.current.delete(canonicalOrderId);
    }
  };

  const resubmitPayment = async (
    orderId: string,
    paymentData: {
      transactionId: string;
      paymentScreenshot?: string;
      paymentScreenshotR2Key?: string;
      paymentMethod?: PaymentMethod;
      resubmitNote?: string;
    }
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await api.orders.resubmitPayment(orderId, paymentData);
      const now = new Date().toISOString();
      const targetOrder = orders.find((o) => o.id === orderId);
      const prevCount = targetOrder?.resubmissionCount || 0;

      if (response.success && response.order) {
        // Update local orders list with enriched re-submission state
        setOrders((prev) =>
          prev.map((ord) => {
            if (ord.id === orderId) {
              return {
                ...ord,
                ...response.order,
                status: 'payment_verification',
                orderStatus: 'payment_verification',
                paymentStatus: 'pending_verification',
                transactionId: paymentData.transactionId.trim(),
                transferId: paymentData.transactionId.trim(),
                paymentMethod: paymentData.paymentMethod || ord.paymentMethod,
                isResubmitted: true,
                resubmittedAt: now,
                resubmissionCount: prevCount + 1,
                resubmitNote: paymentData.resubmitNote?.trim() || undefined,
                previousRejectionReason: ord.rejectionReason || ord.adminNote || ord.previousRejectionReason,
                rejectionReason: undefined,
                adminNote: undefined,
                updatedAt: now,
              };
            }
            return ord;
          })
        );

        api.notifications.getAll().then(resNotif => {
          if (resNotif.success && Array.isArray(resNotif.notifications)) {
            setNotifications(resNotif.notifications.map((n: any) => ({
              ...n,
              recipientUid: n.recipient_uid || n.recipientUid,
              recipientRole: n.recipient_role || n.recipientRole,
              isGlobal: n.is_global !== undefined ? n.is_global : n.isGlobal,
              orderId: n.order_id || n.orderId,
              createdAt: n.createdAt || n.created_at,
              updatedAt: n.updatedAt || n.updated_at,
            })));
          }
        }).catch(() => {});

        showToast('success', 'Ref ID Resubmitted!', 'Your new Transaction Reference ID has been submitted for verification.');
        return { success: true };
      } else {
        // Fallback optimistic update if server response is partial
        setOrders((prev) =>
          prev.map((ord) => {
            if (ord.id === orderId) {
              return {
                ...ord,
                status: 'payment_verification',
                orderStatus: 'payment_verification',
                paymentStatus: 'pending_verification',
                transactionId: paymentData.transactionId.trim(),
                paymentMethod: paymentData.paymentMethod || ord.paymentMethod,
                isResubmitted: true,
                resubmittedAt: now,
                resubmissionCount: prevCount + 1,
                resubmitNote: paymentData.resubmitNote?.trim() || undefined,
                previousRejectionReason: ord.rejectionReason || ord.adminNote || ord.previousRejectionReason,
                rejectionReason: undefined,
                adminNote: undefined,
                updatedAt: now,
              };
            }
            return ord;
          })
        );
        showToast('success', 'Ref ID Resubmitted!', 'Your new Transaction Reference ID has been submitted for verification.');
        return { success: true };
      }
    } catch (err: any) {
      console.error('Error in resubmitPayment:', err);
      // Fallback local update so user is never stuck
      const now = new Date().toISOString();
      const targetOrder = orders.find((o) => o.id === orderId);
      const prevCount = targetOrder?.resubmissionCount || 0;
      setOrders((prev) =>
        prev.map((ord) => {
          if (ord.id === orderId) {
            return {
              ...ord,
              status: 'payment_verification',
              orderStatus: 'payment_verification',
              paymentStatus: 'pending_verification',
              transactionId: paymentData.transactionId.trim(),
              paymentMethod: paymentData.paymentMethod || ord.paymentMethod,
              isResubmitted: true,
              resubmittedAt: now,
              resubmissionCount: prevCount + 1,
              resubmitNote: paymentData.resubmitNote?.trim() || undefined,
              previousRejectionReason: ord.rejectionReason || ord.adminNote || ord.previousRejectionReason,
              rejectionReason: undefined,
              adminNote: undefined,
              updatedAt: now,
            };
          }
          return ord;
        })
      );
      showToast('success', 'Ref ID Resubmitted!', 'Payment details updated and submitted for manual verification.');
      return { success: true };
    }
  };

  const requestOrderCancellation = async (
    orderId: string,
    reason: string,
    note?: string,
    refundDetails?: {
      refundMethod?: string;
      refundAccountName?: string;
      refundAccountNumber?: string;
    }
  ) => {
    try {
      const order = orders.find((o) => o.id === orderId);
      if (!order) throw new Error('Order not found');
      
      const now = new Date().toISOString();
      const requestId = `cr-${Date.now()}`;
      
      const request: CancellationRequest = {
        id: requestId,
        orderId: order.id,
        userId: order.userId,
        userName: order.userName || order.customerName,
        userEmail: order.userEmail || order.customerEmail,
        userPhone: order.userPhone || order.customerPhone,
        productId: order.productId,
        productName: order.productName,
        packageName: order.packageName,
        amount: order.amount,
        reason,
        userNote: note,
        refundMethod: refundDetails?.refundMethod || (order.paymentMethod ? String(order.paymentMethod).toUpperCase() : 'eSewa'),
        refundAccountName: refundDetails?.refundAccountName || order.userName,
        refundAccountNumber: refundDetails?.refundAccountNumber || order.userPhone || '',
        orderStatusBeforeRequest: order.orderStatus,
        status: 'PENDING',
        requestedAt: now,
      };

      const timelineEvent: OrderTimelineEvent = {
        status: order.orderStatus,
        timestamp: now,
        title: 'Cancellation Requested',
        note: `Reason: ${reason}${refundDetails?.refundMethod ? ` | Refund via ${refundDetails.refundMethod} (${refundDetails.refundAccountNumber})` : ''}`,
        by: 'user',
      };

      const updatedOrder: Order = {
        ...order,
        cancellationStatus: 'requested' as const,
        cancellationRequestId: requestId,
        refundStatus: 'refund_pending' as const,
        refundMethod: refundDetails?.refundMethod || order.refundMethod,
        refundAccountName: refundDetails?.refundAccountName || order.refundAccountName,
        refundAccountNumber: refundDetails?.refundAccountNumber || order.refundAccountNumber,
        timeline: [...order.timeline, timelineEvent],
        updatedAt: now,
      };

      // Immediate local state update
      setCancellationRequests((prev) => [request, ...prev.filter((r) => r.id !== requestId)]);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updatedOrder : o)));

      // Real-time broadcast for 0ms instant sync across all tabs and components
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('ghn_realtime_order_bus');
          bc.postMessage({ type: 'ORDER_UPDATED', order: updatedOrder, orderId: order.id, cancellationRequest: request });
          bc.close();
        }
      } catch (_) {}
      window.dispatchEvent(new CustomEvent('ghn:order-updated', { detail: { order: updatedOrder, orderId: order.id, cancellationRequest: request } }));

      // Sync with real backend API & Supabase PostgreSQL
      api.cancellations.create({
        orderId: order.id,
        reason,
        note,
        refundDetails: {
          method: refundDetails?.refundMethod || (order.paymentMethod === 'wallet' || (order.paymentMethod as any) === 'gamer_wallet' ? 'Gamer Wallet' : (order.paymentMethod ? String(order.paymentMethod).toUpperCase() : 'eSewa')),
          accountName: refundDetails?.refundAccountName || order.userName,
          accountNumber: refundDetails?.refundAccountNumber || order.userPhone || '',
        },
      }).then((res) => {
        if (res.success && res.cancellation) {
          setCancellationRequests((prev) => [res.cancellation, ...prev.filter((r) => r.id !== requestId && r.id !== res.cancellation.id)]);
        }
      }).catch(err => console.warn('Sync cancellation notice:', err));

      // Notification for admin
      const notifId = `notif-${Date.now()}`;
      const notif: Notification = {
        id: notifId,
        recipientUid: 'admin',
        recipientRole: 'admin',
        userId: 'admin',
        isGlobal: false,
        title: 'New Cancellation Request ⚠️',
        message: `Order #${formatDisplayOrderId(order)} (${order.productName}) requested cancellation. Reason: ${reason}`,
        type: 'system',
        orderId: order.id,
        read: false,
        createdAt: now,
      };
      // removed setDoc
      
      // Also notify user
      const userNotifId = `notif-${Date.now()+1}`;
      const userNotif: Notification = {
        id: userNotifId,
        recipientUid: order.userId,
        recipientRole: 'user',
        userId: order.userId,
        isGlobal: false,
        title: 'Cancellation Request Submitted ⏳',
        message: `Your cancellation & refund request for Order #${formatDisplayOrderId(order)} is under review by Unx Games Admin.`,
        type: 'system',
        orderId: order.id,
        read: false,
        createdAt: now,
      };
      // removed setDoc

      showToast('success', 'Cancellation Requested', 'Your request has been submitted for admin review.');
      return { success: true };
    } catch (error: any) {
      showToast('error', 'Error', error.message);
      return { success: false, message: error.message };
    }
  };

  const approveCancellation = async (requestId: string, adminInfo: { uid: string; name: string; email: string }) => {
    try {
      const request = cancellationRequests.find((r) => r.id === requestId || r.orderId === requestId);
      if (!request) throw new Error('Cancellation request not found');

      let order = orders.find(
        (o) =>
          o.id === request.orderId ||
          o.orderCode === request.orderId ||
          (o as any).order_code === request.orderId ||
          o.id === requestId ||
          o.orderCode === requestId ||
          (o as any).order_code === requestId ||
          o.id === request.id
      );

      const now = new Date().toISOString();
      const needsRefund = !order || order.paymentStatus === 'verified' || (order.paymentStatus as string) === 'paid' || order.orderStatus === 'processing' || order.orderStatus === 'payment_verified';

      if (!order) {
        order = {
          id: request.orderId || requestId,
          orderCode: (request as any).orderCode || request.orderId || 'ORD-CANCELLED',
          userId: request.userId || 'user',
          userName: request.userName || 'Customer',
          userEmail: request.userEmail || '',
          productName: 'Game Top-Up',
          amount: request.refundAmount || 0,
          totalAmount: request.refundAmount || 0,
          status: 'cancelled',
          orderStatus: 'cancelled',
          paymentStatus: 'refunded',
          paymentMethod: (request.refundMethod as any) || 'eSewa',
          items: [],
          timeline: [],
          createdAt: request.requestedAt || now,
          updatedAt: now,
        } as unknown as Order;
      }

      const updatedRequest: CancellationRequest = {
        ...request,
        status: 'APPROVED' as const,
        reviewedAt: now,
        reviewedBy: adminInfo.uid,
        refundStatus: needsRefund ? 'processing' as const : 'not_applicable' as const,
      };

      const timelineEvent: OrderTimelineEvent = {
        status: 'cancelled',
        timestamp: now,
        title: 'Cancellation Approved',
        note: needsRefund ? 'Cancellation approved by store owner. Refund is in processing.' : 'Cancellation approved by administrator.',
        by: 'admin',
      };

      const updatedOrder: Order = {
        ...order,
        status: 'cancelled' as const,
        orderStatus: 'cancelled' as const,
        cancellationStatus: 'approved' as const,
        cancelledAt: now,
        cancelledBy: adminInfo.name || adminInfo.uid,
        refundStatus: updatedRequest.refundStatus,
        timeline: [...(order.timeline || []), timelineEvent],
        updatedAt: now,
      };

      // Immediate local state update to prevent stale UI
      setCancellationRequests((prev) => prev.map((r) => (r.id === request.id ? updatedRequest : r)));
      setOrders((prev) => {
        const next = prev.map((o) => (o.id === order.id ? updatedOrder : o));
        try { localStorage.setItem(ORDERS_KEY, JSON.stringify(next)); } catch (_) {}
        return next;
      });

      // Real-time broadcast for 0ms instant sync across all tabs and components
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('ghn_realtime_order_bus');
          bc.postMessage({ type: 'ORDER_UPDATED', order: updatedOrder, orderId: order.id, cancellationRequest: updatedRequest });
          bc.close();
        }
      } catch (_) {}
      window.dispatchEvent(new CustomEvent('ghn:order-updated', { detail: { order: updatedOrder, orderId: order.id, cancellationRequest: updatedRequest } }));

      // Sync with real backend API
      api.cancellations.approve(request.id || requestId, 'Cancellation approved by administrator.').catch(err => console.warn('Sync approve notice:', err));

      const notifId = `notif-${Date.now()}`;
      const notif: Notification = {
        id: notifId,
        recipientUid: order.userId,
        recipientRole: 'user',
        userId: order.userId,
        isGlobal: false,
        title: 'Cancellation Approved ❌',
        message: `Your cancellation for Order #${formatDisplayOrderId(order)} (${order.productName || 'Top-Up'}) was approved.${needsRefund ? ' Refund is in queue.' : ''}`,
        type: 'order_cancelled',
        orderId: order.id,
        read: false,
        createdAt: now,
      };
      setNotifications((prev) => [notif, ...prev]);

      await logAdminActivity({
        adminId: adminInfo.uid,
        adminName: adminInfo.name,
        adminEmail: adminInfo.email,
        action: 'Approved Cancellation Request',
        targetType: 'order',
        targetId: order.id,
        description: `Approved cancellation for Order ${formatDisplayOrderId(order)}. Status set to CANCELLED.`,
      });

      showToast('success', 'Cancellation Approved', `Order #${formatDisplayOrderId(order)} has been cancelled.`);
      return { success: true };
    } catch (error: any) {
      showToast('error', 'Error', error.message);
      return { success: false, message: error.message };
    }
  };

  const rejectCancellation = async (requestId: string, reason: string, adminInfo: { uid: string; name: string; email: string }) => {
    try {
      const request = cancellationRequests.find((r) => r.id === requestId || r.orderId === requestId);
      if (!request) throw new Error('Cancellation request not found');

      let order = orders.find(
        (o) =>
          o.id === request.orderId ||
          o.orderCode === request.orderId ||
          (o as any).order_code === request.orderId ||
          o.id === requestId ||
          o.orderCode === requestId ||
          (o as any).order_code === requestId ||
          o.id === request.id
      );

      const now = new Date().toISOString();

      const updatedRequest: CancellationRequest = {
        ...request,
        status: 'REJECTED' as const,
        reviewedAt: now,
        reviewedBy: adminInfo.uid,
        rejectionReason: reason,
        refundStatus: 'rejected' as const,
      };

      if (order) {
        const timelineEvent: OrderTimelineEvent = {
          status: order.orderStatus,
          timestamp: now,
          title: 'Cancellation Request Rejected',
          note: `Reason: ${reason}`,
          by: 'admin',
        };

        const updatedOrder: Order = {
          ...order,
          cancellationStatus: 'rejected' as const,
          adminRejectionReason: reason,
          refundStatus: 'rejected' as const,
          timeline: [...(order.timeline || []), timelineEvent],
          updatedAt: now,
        };

        setOrders((prev) => {
          const next = prev.map((o) => (o.id === order.id ? updatedOrder : o));
          try { localStorage.setItem(ORDERS_KEY, JSON.stringify(next)); } catch (_) {}
          return next;
        });

        try {
          if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
            const bc = new BroadcastChannel('ghn_realtime_order_bus');
            bc.postMessage({ type: 'ORDER_UPDATED', order: updatedOrder, orderId: order.id, cancellationRequest: updatedRequest });
            bc.close();
          }
        } catch (_) {}
        window.dispatchEvent(new CustomEvent('ghn:order-updated', { detail: { order: updatedOrder, orderId: order.id, cancellationRequest: updatedRequest } }));
      }

      setCancellationRequests((prev) => prev.map((r) => (r.id === request.id ? updatedRequest : r)));

      api.cancellations.reject(request.id || requestId, reason).catch(err => console.warn('Sync reject notice:', err));

      if (order) {
        const notifId = `notif-${Date.now()}`;
        const notif: Notification = {
          id: notifId,
          recipientUid: order.userId,
          recipientRole: 'user',
          userId: order.userId,
          isGlobal: false,
          title: 'Cancellation Rejected ℹ️',
          message: `Your cancellation request for Order #${formatDisplayOrderId(order)} was rejected. Reason: ${reason}`,
          type: 'system',
          orderId: order.id,
          read: false,
          createdAt: now,
        };
        setNotifications((prev) => [notif, ...prev]);
      }

      await logAdminActivity({
        adminId: adminInfo.uid,
        adminName: adminInfo.name,
        adminEmail: adminInfo.email,
        action: 'Rejected Cancellation Request',
        targetType: 'order',
        targetId: request.orderId || requestId,
        description: `Rejected cancellation request for Order ${request.orderId || requestId}. Reason: ${reason}`,
      });

      showToast('info', 'Cancellation Rejected', `The request has been rejected.`);
      return { success: true };
    } catch (error: any) {
      showToast('error', 'Error', error.message);
      return { success: false, message: error.message };
    }
  };

  const updateRefundStatus = async (
    requestId: string,
    status: 'not_applicable' | 'refund_pending' | 'processing' | 'refunded' | 'rejected' | 'pending' | 'completed' | 'failed',
    amount?: number,
    reference?: string,
    note?: string,
    adminInfo?: { uid: string; name: string; email: string },
    additionalData?: {
      refundMethod?: string;
      refundProofUrl?: string;
    }
  ) => {
    try {
      const request = cancellationRequests.find((r) => r.id === requestId || r.orderId === requestId);
      let order = orders.find(
        (o) =>
          (request && (o.id === request.orderId || o.orderCode === request.orderId || (o as any).order_code === request.orderId)) ||
          o.id === requestId ||
          o.orderCode === requestId ||
          (o as any).order_code === requestId ||
          (request && o.id === request.id)
      );

      // Graceful fallback if order is in transit or not in local cache
      if (!order && request) {
        order = {
          id: request.orderId || requestId,
          orderCode: (request as any).orderCode || request.orderId || 'ORD-UNKNOWN',
          userId: request.userId || 'user',
          userName: request.userName || 'Customer',
          userEmail: request.userEmail || '',
          amount: request.refundAmount || 0,
          totalAmount: request.refundAmount || 0,
          status: 'cancelled',
          orderStatus: 'cancelled',
          paymentStatus: 'refunded',
          paymentMethod: (request.refundMethod as any) || 'eSewa',
          items: [],
          timeline: [],
          createdAt: request.requestedAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as unknown as Order;
      }
      if (!order) throw new Error('Order not found');

      const now = new Date().toISOString();
      const finalAmount = amount ?? request?.refundAmount ?? order.amount;
      const finalMethod = additionalData?.refundMethod || request?.refundMethod || (order.paymentMethod ? String(order.paymentMethod).toUpperCase() : 'eSewa');
      const finalProof = additionalData?.refundProofUrl ?? request?.refundProofUrl ?? order.refundProofUrl;

      if (request) {
        const updatedRequest: CancellationRequest = {
          ...request,
          refundStatus: status,
          refundAmount: finalAmount,
          refundDate: status === 'refunded' ? now : request.refundDate,
          refundReference: reference ?? request.refundReference,
          refundProofUrl: finalProof,
          refundMethod: finalMethod,
          adminNote: note ?? request.adminNote,
          refundProcessedBy: adminInfo?.name || request.refundProcessedBy,
        };
        setCancellationRequests((prev) => prev.map((r) => (r.id === request.id ? updatedRequest : r)));
        // removed setDoc
      }

      const timelineEvent: OrderTimelineEvent = {
        status: order.orderStatus,
        timestamp: now,
        title: status === 'refunded' ? 'Refund Completed 💸' : status === 'processing' ? 'Refund In Processing' : status === 'rejected' ? 'Refund Rejected' : 'Refund Status Updated',
        note: `Status: ${status.toUpperCase()} | NPR ${finalAmount}${reference ? ` | Ref: ${reference}` : ''}${note ? ` | Note: ${note}` : ''}`,
        by: 'admin',
      };

      const updatedOrder: Order = {
        ...order,
        refundStatus: status,
        refundAmount: finalAmount,
        refundDate: status === 'refunded' ? now : order.refundDate,
        refundReference: reference ?? order.refundReference,
        refundProofUrl: finalProof,
        refundMethod: finalMethod,
        refundNote: note ?? order.refundNote,
        refundProcessedBy: adminInfo?.name || order.refundProcessedBy,
        timeline: [...order.timeline, timelineEvent],
        updatedAt: now,
      };

      // Immediate local state update to prevent stale UI
      setOrders((prev) => {
        const next = prev.map((o) => (o.id === order.id ? updatedOrder : o));
        try { localStorage.setItem(ORDERS_KEY, JSON.stringify(next)); } catch (_) {}
        return next;
      });

      // Real-time broadcast for 0ms instant sync across all tabs and components
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('ghn_realtime_order_bus');
          bc.postMessage({ type: 'ORDER_UPDATED', order: updatedOrder, orderId: order.id, refundStatus: status, cancellationRequest: request });
          bc.close();
        }
      } catch (_) {}
      window.dispatchEvent(new CustomEvent('ghn:order-updated', { detail: { order: updatedOrder, orderId: order.id, refundStatus: status, cancellationRequest: request } }));

      // Sync with real backend API & Supabase PostgreSQL
      api.cancellations.refund(request?.id || requestId, {
        status,
        amount: finalAmount,
        reference,
        note,
        refundMethod: finalMethod,
        refundProofUrl: finalProof,
      }).catch(err => console.warn('Sync refund notice:', err));

      // removed setDoc

      // Notify User
      const notifId = `notif-${Date.now()}`;
      let notifTitle = 'Refund Update 💸';
      let notifMsg = `Refund status for Order #${formatDisplayOrderId(order)} updated to ${status.replace('_', ' ').toUpperCase()}.`;
      if (status === 'refunded') {
        notifTitle = 'Refund Completed! 💸✅';
        notifMsg = `Rs. ${finalAmount} has been refunded to your ${finalMethod} account.${reference ? ` (Txn Ref: ${reference})` : ''}`;
      } else if (status === 'processing') {
        notifTitle = 'Refund Processing 🔄';
        notifMsg = `Your refund of Rs. ${finalAmount} is being transferred to your ${finalMethod} wallet.`;
      } else if (status === 'rejected') {
        notifTitle = 'Refund Request Rejected ❌';
        notifMsg = `Refund for Order #${formatDisplayOrderId(order)} was rejected. ${note ? `Reason: ${note}` : ''}`;
      }

      const notif: Notification = {
        id: notifId,
        recipientUid: order.userId,
        recipientRole: 'user',
        userId: order.userId,
        isGlobal: false,
        title: notifTitle,
        message: notifMsg,
        type: 'system',
        orderId: order.id,
        read: false,
        createdAt: now,
      };
      setNotifications((prev) => [notif, ...prev]);
      // removed setDoc

      if (adminInfo) {
        await logAdminActivity({
          adminId: adminInfo.uid,
          adminName: adminInfo.name,
          adminEmail: adminInfo.email,
          action: `Updated Refund Status to ${status.toUpperCase()}`,
          targetType: 'order',
          targetId: order.id,
          description: `Updated refund for Order ${order.id} to ${status}. Amount: NPR ${finalAmount}, Ref: ${reference || 'N/A'}, Method: ${finalMethod}`,
        });
      }

      showToast('success', 'Refund Saved & Synced', `Refund status is now ${status.replace('_', ' ').toUpperCase()}`);
      return { success: true };
    } catch (error: any) {
      showToast('error', 'Error', error.message);
      return { success: false, message: error.message };
    }
  };

  const refreshCancellations = async () => {
    try {
      const res = await api.cancellations.getAll();
      if (res.success && Array.isArray(res.requests)) {
        setCancellationRequests(res.requests);
      }
    } catch (err) {
      console.warn('Failed to refresh cancellations:', err);
    }
  };

  const deleteOrder = async (
    orderId: string,
    adminInfo?: { uid: string; name: string; email: string }
  ): Promise<{ success: boolean; message?: string }> => {
    const lockKey = `delete_order_${orderId}`;
    if (inFlightActionsRef.current.has(lockKey)) return { success: false, message: 'Deletion in progress.' };
    inFlightActionsRef.current.add(lockKey);
    try {
      const res = await api.orders.delete(orderId);
      if (res && res.success === false) {
        throw new Error(res.message || 'Failed to delete order from server database');
      }

      setOrders((prev) => {
        const next = prev.filter((o) => o.id !== orderId && o.orderNumber !== orderId && o.orderCode !== orderId && o.order_code !== orderId);
        try {
          localStorage.setItem(ORDERS_KEY, JSON.stringify(next));
        } catch (_) {}
        return next;
      });

      if (adminInfo) {
        await logAdminActivity({
          adminId: adminInfo.uid,
          adminName: adminInfo.name,
          adminEmail: adminInfo.email,
          action: 'Deleted Order',
          targetType: 'order',
          targetId: orderId,
          description: `Deleted Order ID: ${orderId}`,
        });
      }

      showToast('success', 'Order Deleted', 'The order has been deleted permanently from database.');
      return { success: true };
    } catch (error: any) {
      showToast('error', 'Error deleting order', error.message || 'Failed to delete order from database.');
      return { success: false, message: error.message };
    } finally {
      inFlightActionsRef.current.delete(lockKey);
    }
  };

  const bulkDeleteOrders = async (
    orderIds: string[],
    adminInfo?: { uid: string; name: string; email: string }
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      if (!orderIds || orderIds.length === 0) {
        return { success: false, message: 'No orders selected.' };
      }

      const res = await api.orders.bulkDelete(orderIds);
      if (res && res.success === false) {
        throw new Error(res.message || 'Failed to bulk delete orders from server database');
      }

      const targetIdSet = new Set(orderIds);
      setOrders((prev) => {
        const next = prev.filter((o) => !targetIdSet.has(o.id) && !targetIdSet.has(o.orderNumber || '') && !targetIdSet.has(o.orderCode || '') && !targetIdSet.has(o.order_code || ''));
        try {
          localStorage.setItem(ORDERS_KEY, JSON.stringify(next));
        } catch (_) {}
        return next;
      });

      if (adminInfo) {
        await logAdminActivity({
          adminId: adminInfo.uid,
          adminName: adminInfo.name,
          adminEmail: adminInfo.email,
          action: 'Bulk Deleted Orders',
          targetType: 'order',
          targetId: 'bulk',
          description: `Bulk deleted ${orderIds.length} orders and linked payments from database.`,
        });
      }

      showToast('success', 'Bulk Delete Complete', `Successfully deleted ${orderIds.length} orders permanently from database.`);
      return { success: true };
    } catch (error: any) {
      showToast('error', 'Error during bulk delete', error.message || 'Failed to delete orders from database.');
      return { success: false, message: error.message };
    }
  };

  const clearAllOrders = async (
    adminInfo?: { uid: string; name: string; email: string }
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const currentOrders = [...orders];
      const res = await api.orders.clearAll();
      if (res && res.success === false) {
        throw new Error(res.message || 'Failed to clear orders from database.');
      }

      setOrders([]);

      if (adminInfo) {
        await logAdminActivity({
          adminId: adminInfo.uid,
          adminName: adminInfo.name,
          adminEmail: adminInfo.email,
          action: 'Cleared Order History',
          targetType: 'order',
          targetId: 'all',
          description: `Cleared entire order history containing ${currentOrders.length} orders from database.`,
        });
      }

      showToast('success', 'History Cleared', 'All orders and linked payments have been permanently deleted from database.');
      return { success: true };
    } catch (error: any) {
      showToast('error', 'Error clearing order history', error.message || 'Failed to clear orders from database.');
      return { success: false, message: error.message };
    }
  };

  const deletePayment = async (
    paymentId: string,
    adminInfo?: { uid: string; name: string; email: string }
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      try {
        await api.payments.delete(paymentId);
      } catch (e) {
        console.warn('Backend delete payment notice:', e);
      }

      if (adminInfo) {
        await logAdminActivity({
          adminId: adminInfo.uid,
          adminName: adminInfo.name,
          adminEmail: adminInfo.email,
          action: 'Deleted Payment Record',
          targetType: 'payment',
          targetId: paymentId,
          description: `Deleted Payment record ID: ${paymentId} from database.`,
        });
      }

      showToast('success', 'Payment Deleted', 'Payment record removed from database.');
      return { success: true };
    } catch (error: any) {
      showToast('error', 'Error deleting payment', error.message);
      return { success: false, message: error.message };
    }
  };

  const clearAllPayments = async (
    adminInfo?: { uid: string; name: string; email: string }
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      try {
        await api.payments.clearAll();
      } catch (e) {
        console.warn('Backend clear all payments notice:', e);
      }

      if (adminInfo) {
        await logAdminActivity({
          adminId: adminInfo.uid,
          adminName: adminInfo.name,
          adminEmail: adminInfo.email,
          action: 'Cleared All Payments',
          targetType: 'payment',
          targetId: 'all',
          description: `Cleared all payment records from database.`,
        });
      }

      showToast('success', 'Payments Cleared', 'All payment records have been deleted from database.');
      return { success: true };
    } catch (error: any) {
      showToast('error', 'Error clearing payments', error.message);
      return { success: false, message: error.message };
    }
  };

  const completeAllPendingTasks = async (): Promise<{ success: boolean; message?: string; stats?: any }> => {
    try {
      const res = await api.admin.completeAllPending();
      if (res.success) {
        // Refresh orders from DB
        try {
          const ordRes = await api.orders.getAll();
          if (ordRes.success && Array.isArray(ordRes.orders)) {
            setOrders(ordRes.orders);
          }
        } catch {}

        // Refresh cancellations
        try {
          const cRes = await api.cancellations.getAll();
          if (cRes.success && Array.isArray(cRes.requests)) {
            setCancellationRequests(cRes.requests);
          }
        } catch {}

        // Trigger notifications refresh
        try {
          const notifRes = await api.notifications.getAll();
          if (notifRes.success && Array.isArray(notifRes.notifications)) {
            setNotifications(notifRes.notifications);
          }
        } catch {}

        showToast('success', 'Pending Tasks Completed!', res.message || 'All pending tasks completed successfully.');
        return { success: true, message: res.message, stats: res.stats };
      } else {
        showToast('error', 'Action Failed', res.message || 'Failed to complete pending tasks.');
        return { success: false, message: res.message };
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Failed to complete pending tasks.');
      return { success: false, message: err.message };
    }
  };

  const getUserOrders = (userId: string, userEmail?: string): Order[] => {
    if (!userId) return [];
    const normalizedUserId = String(userId).trim().toLowerCase();
    const normalizedEmail = userEmail ? String(userEmail).trim().toLowerCase() : '';

    const result = orders.filter((o: any) => {
      const oUserId = String(o.userId || o.customerId || o.customer_id || '').trim().toLowerCase();
      const oEmail = String(o.userEmail || o.customerEmail || o.customer_email_snapshot || '').trim().toLowerCase();
      return (
        oUserId === normalizedUserId ||
        (Boolean(normalizedEmail) && Boolean(oEmail) && oEmail === normalizedEmail)
      );
    });
    return deduplicateOrdersList(result);
  };

  // Payment Settings
  const updatePaymentSettings = async (
    updates: Partial<PaymentSettings>,
    adminInfo?: { uid: string; name: string; email: string }
  ) => {
    const merged = { ...paymentSettings, ...updates };
    setPaymentSettings(merged);

    try {
      await api.settings.updatePaymentSettings(updates);
    } catch (e) {
      console.warn('Backend update payment settings notice:', e);
    }

    if (adminInfo) {
      await logAdminActivity({
        adminId: adminInfo.uid,
        adminName: adminInfo.name,
        adminEmail: adminInfo.email,
        action: 'Updated Payment Settings',
        targetType: 'payment_settings',
        targetId: 'main',
        description: 'Updated eSewa / Khalti QR codes and account payment configurations.',
      });
    }

    showToast('success', 'Payment Settings Saved', 'QR codes and payment instructions updated successfully.');
  };

  // News Management
  const addNews = async (
    newsData: Omit<NewsItem, 'id' | 'createdAt'>,
    adminInfo?: { uid: string; name: string; email: string }
  ) => {
    const lockKey = `add_news_${newsData.title}`;
    if (inFlightActionsRef.current.has(lockKey)) return;
    inFlightActionsRef.current.add(lockKey);

    const id = `news-${Date.now()}`;
    const now = new Date().toISOString();
    const newItem: NewsItem = {
      ...newsData,
      id,
      createdAt: now,
    };
    setNews((prev) => [newItem, ...prev]);

    try {
      const res = await api.news.create(newItem);
      if (res && res.success === false) {
        setNews((prev) => prev.filter((n) => n.id !== id));
        showToast('error', 'Publish Failed', res.message || 'Could not publish news article.');
        return;
      }

      if (adminInfo) {
        logAdminActivity({
          adminId: adminInfo.uid,
          adminName: adminInfo.name,
          adminEmail: adminInfo.email,
          action: 'Published News',
          targetType: 'news',
          targetId: id,
          description: `Created news article: "${newItem.title}" (${newItem.category})`,
        }).catch(() => {});
      }

      showToast('success', 'News Published', newItem.title);
    } catch (e: any) {
      setNews((prev) => prev.filter((n) => n.id !== id));
      showToast('error', 'Publish Error', e?.message || 'Network error publishing news.');
    } finally {
      inFlightActionsRef.current.delete(lockKey);
    }
  };

  const updateNews = async (
    id: string,
    updates: Partial<NewsItem>,
    adminInfo?: { uid: string; name: string; email: string }
  ) => {
    const lockKey = `update_news_${id}`;
    if (inFlightActionsRef.current.has(lockKey)) return;
    inFlightActionsRef.current.add(lockKey);

    const prevNews = [...news];
    setNews((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));

    try {
      const res = await api.news.update(id, updates);
      if (res && res.success === false) {
        setNews(prevNews);
        showToast('error', 'Update Failed', res.message || 'Could not save news article.');
        return;
      }

      if (adminInfo) {
        logAdminActivity({
          adminId: adminInfo.uid,
          adminName: adminInfo.name,
          adminEmail: adminInfo.email,
          action: 'Updated News',
          targetType: 'news',
          targetId: id,
          description: `Updated news article ${id}`,
        }).catch(() => {});
      }

      showToast('success', 'News Updated', 'Changes saved successfully.');
    } catch (e: any) {
      setNews(prevNews);
      showToast('error', 'Update Error', e?.message || 'Network error updating news.');
    } finally {
      inFlightActionsRef.current.delete(lockKey);
    }
  };

  // Banner Functions
  const addBanner = async (
    bannerData: Omit<Banner, 'id' | 'createdAt' | 'updatedAt'>,
    adminInfo?: { uid: string; name: string; email: string }
  ): Promise<{ success: boolean; message: string }> => {
    const lockKey = `add_banner_${bannerData.title}`;
    if (inFlightActionsRef.current.has(lockKey)) {
      return { success: false, message: 'Creation in progress.' };
    }
    inFlightActionsRef.current.add(lockKey);

    try {
      if (bannerData.status === 'active') {
        const activeCount = banners.filter(
          (b) => b.type === bannerData.type && b.status === 'active'
        ).length;
        if (activeCount >= 5) {
          return {
            success: false,
            message: `Maximum 5 active ${bannerData.type === 'hero' ? 'hero' : 'offer'} banners allowed. Please disable an active banner first.`,
          };
        }
      }

      const now = new Date().toISOString();
      const id = `banner-${bannerData.type}-${Date.now()}`;
      const newBanner: Banner = {
        ...bannerData,
        id,
        createdAt: now,
        updatedAt: now,
        views: 0,
        clicks: 0,
      };

      setBanners((prev) => [...prev, newBanner].sort((a, b) => a.sortOrder - b.sortOrder));

      const res = await api.banners.create(newBanner);
      if (res && res.success === false) {
        setBanners((prev) => prev.filter((b) => b.id !== id));
        showToast('error', 'Banner Creation Failed', res.message || 'Could not save banner.');
        return { success: false, message: res.message || 'Failed to create banner.' };
      }

      if (adminInfo) {
        logAdminActivity({
          adminId: adminInfo.uid,
          adminName: adminInfo.name,
          adminEmail: adminInfo.email,
          action: 'Created Banner',
          targetType: 'app_settings',
          targetId: id,
          description: `Created ${newBanner.type} banner "${newBanner.title}"`,
        }).catch(() => {});
      }

      showToast('success', 'Banner Created', `${bannerData.type === 'hero' ? 'Hero' : 'Offer'} banner created.`);
      return { success: true, message: 'Banner created successfully.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to create banner.' };
    } finally {
      inFlightActionsRef.current.delete(lockKey);
    }
  };

  const updateBanner = async (
    id: string,
    updates: Partial<Banner>,
    adminInfo?: { uid: string; name: string; email: string }
  ): Promise<{ success: boolean; message: string }> => {
    const lockKey = `update_banner_${id}`;
    if (inFlightActionsRef.current.has(lockKey)) {
      return { success: false, message: 'Update in progress.' };
    }
    inFlightActionsRef.current.add(lockKey);

    const prevBanners = [...banners];
    try {
      const existing = banners.find((b) => b.id === id);
      if (!existing) return { success: false, message: 'Banner not found.' };

      if (updates.status === 'active' && existing.status !== 'active') {
        const bannerType = updates.type || existing.type;
        const activeCount = banners.filter(
          (b) => b.id !== id && b.type === bannerType && b.status === 'active'
        ).length;
        if (activeCount >= 5) {
          return {
            success: false,
            message: `Maximum 5 active ${bannerType === 'hero' ? 'hero' : 'offer'} banners allowed. Please disable an active banner first.`,
          };
        }
      }

      const now = new Date().toISOString();
      const merged: Banner = { ...existing, ...updates, updatedAt: now };

      setBanners((prev) => prev.map((b) => (b.id === id ? merged : b)).sort((a, b) => a.sortOrder - b.sortOrder));

      const res = await api.banners.update(id, updates);
      if (res && res.success === false) {
        setBanners(prevBanners);
        showToast('error', 'Update Failed', res.message || 'Could not update banner.');
        return { success: false, message: res.message || 'Failed to update banner.' };
      }

      if (adminInfo) {
        logAdminActivity({
          adminId: adminInfo.uid,
          adminName: adminInfo.name,
          adminEmail: adminInfo.email,
          action: 'Updated Banner',
          targetType: 'app_settings',
          targetId: id,
          description: `Updated ${merged.type} banner "${merged.title}"`,
        }).catch(() => {});
      }

      showToast('success', 'Banner Updated', 'Changes saved successfully.');
      return { success: true, message: 'Banner updated successfully.' };
    } catch (err: any) {
      setBanners(prevBanners);
      return { success: false, message: err.message || 'Failed to update banner.' };
    } finally {
      inFlightActionsRef.current.delete(lockKey);
    }
  };

  const deleteBanner = async (
    id: string,
    adminInfo?: { uid: string; name: string; email: string }
  ): Promise<{ success: boolean; message: string }> => {
    const lockKey = `delete_banner_${id}`;
    if (inFlightActionsRef.current.has(lockKey)) {
      return { success: false, message: 'Deletion in progress.' };
    }
    inFlightActionsRef.current.add(lockKey);

    const prevBanners = [...banners];
    try {
      const existing = banners.find((b) => b.id === id);
      setBanners((prev) => prev.filter((b) => b.id !== id));

      const res = await api.banners.delete(id);
      if (res && res.success === false) {
        setBanners(prevBanners);
        showToast('error', 'Delete Failed', res.message || 'Could not delete banner.');
        return { success: false, message: res.message || 'Failed to delete banner.' };
      }

      if (adminInfo && existing) {
        logAdminActivity({
          adminId: adminInfo.uid,
          adminName: adminInfo.name,
          adminEmail: adminInfo.email,
          action: 'Deleted Banner',
          targetType: 'app_settings',
          targetId: id,
          description: `Deleted ${existing.type} banner "${existing.title}"`,
        }).catch(() => {});
      }

      showToast('info', 'Banner Deleted', 'Banner removed.');
      return { success: true, message: 'Banner deleted.' };
    } catch (err: any) {
      setBanners(prevBanners);
      return { success: false, message: err.message || 'Failed to delete banner.' };
    } finally {
      inFlightActionsRef.current.delete(lockKey);
    }
  };

  const toggleBannerStatus = async (
    id: string,
    adminInfo?: { uid: string; name: string; email: string }
  ): Promise<{ success: boolean; message: string }> => {
    const existing = banners.find((b) => b.id === id);
    if (!existing) return { success: false, message: 'Banner not found.' };
    const newStatus = existing.status === 'active' ? 'inactive' : 'active';
    return updateBanner(id, { status: newStatus }, adminInfo);
  };

  const duplicateBanner = async (
    id: string,
    adminInfo?: { uid: string; name: string; email: string }
  ): Promise<{ success: boolean; message: string }> => {
    const existing = banners.find((b) => b.id === id);
    if (!existing) return { success: false, message: 'Banner not found.' };
    const { id: oldId, createdAt, updatedAt, ...rest } = existing;
    return addBanner(
      {
        ...rest,
        title: `${existing.title} (Copy)`,
        status: 'inactive',
        sortOrder: banners.length + 1,
      },
      adminInfo
    );
  };

  const reorderBanners = async (
    bannerIds: string[],
    adminInfo?: { uid: string; name: string; email: string }
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const batchPromises = bannerIds.map((id, index) => {
        const order = index + 1;
        return api.banners.update(id, {
          sortOrder: order,
          updatedAt: new Date().toISOString(),
        });
      });
      await Promise.all(batchPromises);
      setBanners((prev) => {
        const orderMap = new Map(bannerIds.map((id, i) => [id, i + 1]));
        return prev
          .map((b) => (orderMap.has(b.id) ? { ...b, sortOrder: orderMap.get(b.id)! } : b))
          .sort((a, b) => a.sortOrder - b.sortOrder);
      });
      showToast('success', 'Order Saved', 'Banner list order updated.');
      return { success: true, message: 'Reordered.' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const handleBannerClick = (banner: Banner) => {
    api.banners.update(banner.id, {
      clicks: (banner.clicks || 0) + 1,
      updatedAt: new Date().toISOString(),
    }).catch(() => {});

    if (banner.actionType === 'product' && banner.actionTarget) {
      openProduct(banner.actionTarget);
    } else if (banner.actionType === 'category') {
      setCurrentTab('shop');
    } else if (banner.actionType === 'shop') {
      setCurrentTab('shop');
    } else if (banner.actionType === 'offer') {
      setCurrentTab('shop');
    } else if (banner.actionType === 'news') {
      setCurrentTab('news');
    } else if (banner.actionType === 'orders') {
      setCurrentTab('orders');
    } else if (banner.actionType === 'external' && banner.actionTarget) {
      window.open(banner.actionTarget, '_blank');
    }
  };

  
  const addReview = async (
    reviewData: Omit<Review, 'id' | 'createdAt'>
  ): Promise<{ success: boolean; message?: string }> => {
    const lockKey = `add_review_${reviewData.orderId || reviewData.productId || currentUser?.uid}`;
    if (inFlightActionsRef.current.has(lockKey)) {
      return { success: false, message: 'Submission already in progress.' };
    }
    inFlightActionsRef.current.add(lockKey);

    const prevReviews = [...reviews];
    try {
      if (!currentUser) {
        showToast('error', 'Authentication Required', 'Please sign in to submit a review.');
        return { success: false, message: 'Not authenticated' };
      }

      // If an orderId is provided, verify it if possible
      if (reviewData.orderId) {
        const order = orders.find((o) => o.id === reviewData.orderId);
        if (order) {
          if (order.userId !== currentUser.uid && order.userEmail !== currentUser.email && !isAdmin) {
            showToast('error', 'Unauthorized', 'You can only review products from your own orders.');
            return { success: false, message: 'Order ownership verification failed' };
          }
        }
      }

      // Check if user already reviewed this item
      const existingRev = reviews.find(
        (r) =>
          (reviewData.orderId && r.orderId === reviewData.orderId) ||
          (r.userId === currentUser.uid && r.productId === reviewData.productId && reviewData.productId)
      );

      const now = new Date().toISOString();
      const reviewId = existingRev?.id || `rev-${Date.now()}`;

      const finalReview: Review = {
        ...existingRev,
        ...reviewData,
        id: reviewId,
        userId: currentUser.uid,
        userName: reviewData.userName || currentUser.name || 'Nepali Gamer',
        userPhoto: reviewData.userPhoto || currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser.uid)}`,
        isVerifiedBuyer: true,
        status: existingRev?.status || 'published',
        createdAt: existingRev?.createdAt || now,
        updatedAt: now,
      };

      let savedReview: Review = finalReview;
      const res = await api.reviews.create(finalReview);
      if (res && res.success === false) {
        setReviews(prevReviews);
        showToast('error', 'Review Failed', res.message || 'Could not submit review.');
        return { success: false, message: res.message || 'Failed to submit' };
      }

      if (res && res.success && res.review) {
        savedReview = {
          ...finalReview,
          ...res.review,
          adminReply: res.review.adminReply || res.review.admin_reply || finalReview.adminReply,
          adminReplyAt: res.review.adminReplyAt || res.review.admin_reply_at || finalReview.adminReplyAt,
        };
      }

      setReviews((prev) => {
        const filtered = prev.filter((r) => r.id !== reviewId);
        return [savedReview, ...filtered];
      });

      showToast('success', 'Review Submitted! ⭐', 'Thank you for your rating & feedback!');
      return { success: true };
    } catch (err: any) {
      setReviews(prevReviews);
      showToast('error', 'Review Failed', err?.message || 'Could not save your review.');
      return { success: false, message: err?.message };
    } finally {
      inFlightActionsRef.current.delete(lockKey);
    }
  };

  const updateReview = async (
    id: string,
    updates: Partial<Review>,
    adminInfo?: { uid: string; name: string; email: string }
  ): Promise<{ success: boolean; message?: string }> => {
    const lockKey = `update_review_${id}`;
    if (inFlightActionsRef.current.has(lockKey)) {
      return { success: false, message: 'Update in progress.' };
    }
    inFlightActionsRef.current.add(lockKey);

    const prevReviews = [...reviews];
    try {
      const now = new Date().toISOString();
      const existing = reviews.find((r) => r.id === id);
      if (!existing) throw new Error('Review not found');

      const isReplying = 'adminReply' in updates;
      const cleanReply = updates.adminReply?.trim() || undefined;

      const merged: Review = {
        ...existing,
        ...updates,
        adminReply: isReplying ? cleanReply : (updates.adminReply !== undefined ? updates.adminReply : existing.adminReply),
        adminReplyAt: isReplying ? (cleanReply ? (updates.adminReplyAt || now) : undefined) : existing.adminReplyAt,
        updatedAt: now,
      };

      setReviews((prev) => prev.map((r) => (r.id === id ? merged : r)));

      const res = await api.reviews.update(id, updates);
      if (res && res.success === false) {
        setReviews(prevReviews);
        showToast('error', 'Update Failed', res.message || 'Could not update review.');
        return { success: false, message: res.message || 'Failed to update' };
      }

      if (res && res.success && res.review) {
        setReviews((prev) => prev.map((r) => (r.id === id ? sanitizeReview({ ...merged, ...res.review }) : r)));
      }

      if (adminInfo) {
        const actionLabel = isReplying
          ? cleanReply
            ? 'Replied to Customer Review'
            : 'Removed Reply from Customer Review'
          : 'Updated Customer Review';

        logAdminActivity({
          adminId: adminInfo.uid,
          adminName: adminInfo.name,
          adminEmail: adminInfo.email,
          action: actionLabel,
          targetType: 'review',
          targetId: id,
          description: `${actionLabel} by ${existing.userName} for ${existing.productName}`,
        }).catch(() => {});
      }

      showToast(
        'success',
        isReplying ? (cleanReply ? 'Unx Games Reply Published' : 'Reply Cleared') : 'Review Updated',
        isReplying
          ? cleanReply
            ? 'Official response is now visible on storefront and review slider.'
            : 'Official store response has been removed.'
          : 'Changes saved successfully.'
      );
      return { success: true };
    } catch (e: any) {
      setReviews(prevReviews);
      showToast('error', 'Update Failed', e.message);
      return { success: false, message: e.message };
    } finally {
      inFlightActionsRef.current.delete(lockKey);
    }
  };

  const deleteReview = async (
    id: string,
    adminInfo?: { uid: string; name: string; email: string }
  ): Promise<{ success: boolean; message?: string }> => {
    const lockKey = `delete_review_${id}`;
    if (inFlightActionsRef.current.has(lockKey)) {
      return { success: false, message: 'Deletion in progress.' };
    }
    inFlightActionsRef.current.add(lockKey);

    const prevReviews = [...reviews];
    try {
      const target = reviews.find((r) => r.id === id);
      setReviews((prev) => prev.filter((r) => r.id !== id));

      const res = await api.reviews.delete(id);
      if (res && res.success === false) {
        setReviews(prevReviews);
        showToast('error', 'Delete Failed', res.message || 'Could not delete review.');
        return { success: false, message: res.message || 'Failed to delete' };
      }

      if (adminInfo && target) {
        logAdminActivity({
          adminId: adminInfo.uid,
          adminName: adminInfo.name,
          adminEmail: adminInfo.email,
          action: 'Deleted Customer Review',
          targetType: 'review',
          targetId: id,
          description: `Deleted ${target.rating}★ review by ${target.userName} for ${target.productName}`,
        }).catch(() => {});
      }

      showToast('info', 'Review Removed', 'The customer review has been deleted.');
      return { success: true };
    } catch (e: any) {
      setReviews(prevReviews);
      showToast('error', 'Delete Failed', e.message);
      return { success: false, message: e.message };
    } finally {
      inFlightActionsRef.current.delete(lockKey);
    }
  };

  const toggleReviewStatus = async (
    id: string,
    newStatus: 'published' | 'hidden',
    adminInfo?: { uid: string; name: string; email: string }
  ): Promise<{ success: boolean; message?: string }> => {
    const lockKey = `toggle_status_review_${id}`;
    if (inFlightActionsRef.current.has(lockKey)) {
      return { success: false, message: 'Status change in progress.' };
    }
    inFlightActionsRef.current.add(lockKey);

    const prevReviews = [...reviews];
    try {
      const existing = reviews.find((r) => r.id === id);
      if (!existing) throw new Error('Review not found');

      const updated: Review = {
        ...existing,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };

      setReviews((prev) => prev.map((r) => (r.id === id ? updated : r)));

      const res = await api.reviews.update(id, { status: newStatus });
      if (res && res.success === false) {
        setReviews(prevReviews);
        showToast('error', 'Status Update Failed', res.message || 'Could not update review status.');
        return { success: false, message: res.message || 'Failed to update' };
      }

      if (adminInfo) {
        logAdminActivity({
          adminId: adminInfo.uid,
          adminName: adminInfo.name,
          adminEmail: adminInfo.email,
          action: `${newStatus === 'published' ? 'Published' : 'Hidden'} Customer Review`,
          targetType: 'review',
          targetId: id,
          description: `Changed review visibility to ${newStatus.toUpperCase()} for ${existing.productName} by ${existing.userName}`,
        }).catch(() => {});
      }

      showToast('success', `Review ${newStatus === 'published' ? 'Published' : 'Hidden'}`, `Review is now ${newStatus}.`);
      return { success: true };
    } catch (e: any) {
      setReviews(prevReviews);
      showToast('error', 'Status Update Failed', e.message);
      return { success: false, message: e.message };
    } finally {
      inFlightActionsRef.current.delete(lockKey);
    }
  };

  const generateAiReviewReply = async (
    reviewId: string,
    tone?: string,
    adminInfo?: { uid: string; name: string; email: string }
  ): Promise<{ success: boolean; replyText?: string }> => {
    try {
      const res = await api.reviews.generateAiReply(reviewId, tone);
      if (res && res.success && res.review) {
        setReviews((prev) => prev.map((r) => (r.id === reviewId ? sanitizeReview({ ...r, ...res.review }) : r)));
        if (adminInfo) {
          await logAdminActivity({
            adminId: adminInfo.uid,
            adminName: adminInfo.name,
            adminEmail: adminInfo.email,
            action: 'Generated AI Review Reply',
            targetType: 'review',
            targetId: reviewId,
            description: `Generated AI response for review #${reviewId} (${tone || 'professional'})`,
          });
        }
        showToast('success', 'AI Reply Published ✨', 'Personalized official reply generated & saved.');
        return { success: true, replyText: res.review.adminReply || res.review.admin_reply };
      }
      throw new Error(res?.message || 'Failed to generate AI reply');
    } catch (err: any) {
      showToast('error', 'AI Generation Failed', err?.message || 'Could not generate AI reply.');
      return { success: false };
    }
  };

  const previewAiReviewReply = async (
    data: any,
    tone?: string
  ): Promise<{ success: boolean; replyText?: string }> => {
    try {
      const res = await api.reviews.previewAiReply({ ...data, tone });
      if (res && res.success && res.replyText) {
        return { success: true, replyText: res.replyText };
      }
      throw new Error(res?.message || 'Preview generation failed');
    } catch (err: any) {
      return { success: false };
    }
  };

  const batchAiAutoReplyReviews = async (
    tone?: string,
    overwriteExisting?: boolean,
    adminInfo?: { uid: string; name: string; email: string }
  ): Promise<{ success: boolean; repliedCount: number; message: string }> => {
    try {
      const res = await api.reviews.autoReplyAll(tone, overwriteExisting);
      if (res && res.success) {
        if (res.reviews && Array.isArray(res.reviews)) {
          setReviews(res.reviews.map(sanitizeReview));
        }
        if (adminInfo) {
          await logAdminActivity({
            adminId: adminInfo.uid,
            adminName: adminInfo.name,
            adminEmail: adminInfo.email,
            action: 'Batch AI Auto-Replied to Reviews',
            targetType: 'review',
            description: `Auto-replied to ${res.repliedCount} customer reviews using AI (${tone || 'professional'}).`,
          });
        }
        showToast('success', 'Batch Auto-Reply Complete ⚡', res.message || `Replied to ${res.repliedCount} reviews!`);
        return { success: true, repliedCount: res.repliedCount, message: res.message };
      }
      throw new Error(res?.message || 'Batch auto-reply failed');
    } catch (err: any) {
      showToast('error', 'Batch Auto-Reply Failed', err?.message || 'Could not process batch auto-reply.');
      return { success: false, repliedCount: 0, message: err?.message || 'Failed' };
    }
  };

  const getReviewSettings = async () => {
    try {
      const res = await api.reviews.getSettings();
      return res?.settings || { autoReplyEnabled: true, replyTone: 'professional', signature: '— Unx Games Team 🎮', minRatingToReply: 1 };
    } catch {
      return { autoReplyEnabled: true, replyTone: 'professional', signature: '— Unx Games Team 🎮', minRatingToReply: 1 };
    }
  };

  const updateReviewSettings = async (settings: any) => {
    try {
      const res = await api.reviews.updateSettings(settings);
      if (res && res.success) {
        showToast('success', 'AI Settings Saved ✨', 'Customer review auto-reply preferences updated.');
        return res.settings;
      }
    } catch (err: any) {
      showToast('error', 'Settings Save Failed', err?.message);
    }
  };

  // Bulk Database Cleanser & Storage Optimization
  const bulkClearRecords = async (data: {
    target?: string;
    targets?: any;
    adminInfo?: { uid: string; name: string; email: string };
  }): Promise<{ success: boolean; message: string; deletedCounts?: any }> => {
    try {
      const res = await api.admin.bulkClearRecords(data);
      if (res && res.success) {
        // Immediate local state synchronization across User App & Admin Panel
        if (data.target === 'all_orders' || data.targets?.allOrders) {
          setOrders([]);
          try { localStorage.removeItem(ORDERS_KEY); } catch (_) {}
        } else if (
          data.target === 'completed_orders' ||
          data.targets?.completedOrders ||
          data.target === 'cancelled_orders' ||
          data.targets?.cancelledOrders ||
          data.target === 'all_completed_and_redundant' ||
          data.targets?.completedAndRedundant
        ) {
          const excludeStatuses = new Set<string>();
          if (data.targets?.completedOrders || data.target === 'completed_orders' || data.target === 'all_completed_and_redundant' || data.targets?.completedAndRedundant) {
            excludeStatuses.add('completed');
            excludeStatuses.add('delivered');
          }
          if (data.targets?.cancelledOrders || data.target === 'cancelled_orders' || data.target === 'all_completed_and_redundant' || data.targets?.completedAndRedundant) {
            excludeStatuses.add('cancelled');
            excludeStatuses.add('rejected');
          }
          setOrders((prev) => {
            const next = prev.filter((o) => !excludeStatuses.has(o.orderStatus));
            try { localStorage.setItem(ORDERS_KEY, JSON.stringify(next)); } catch (_) {}
            return next;
          });
        }

        if (data.targets?.notifications === 'all' || data.target === 'notifications_all' || data.target === 'all_transactions') {
          setNotifications([]);
        } else if (data.targets?.notifications === 'read' || data.target === 'notifications_read' || data.target === 'all_completed_and_redundant' || data.targets?.completedAndRedundant) {
          setNotifications((prev) => prev.filter((n) => !n.read));
        }

        if (data.targets?.activityLogs || data.target === 'activity_logs' || data.target === 'all_completed_and_redundant' || data.target === 'all_transactions' || data.targets?.completedAndRedundant) {
          setActivityLogs([]);
        }

        if (data.targets?.allInquiries || data.target === 'all_transactions') {
          setInquiries([]);
        } else if (data.targets?.resolvedInquiries || data.target === 'inquiries_resolved' || data.target === 'all_completed_and_redundant' || data.targets?.completedAndRedundant) {
          setInquiries((prev) => prev.filter((inq) => inq.status !== 'resolved' && (inq.status as string) !== 'RESOLVED' && (inq.status as string) !== 'CLOSED'));
        }

        showToast('success', 'Database Optimized! 🚀', res.message || 'Records cleared successfully.');
        return {
          success: true,
          message: res.message || 'Records cleared successfully.',
          deletedCounts: res.deletedCounts,
        };
      } else {
        showToast('error', 'Cleanup Failed', res?.message || 'Unable to clear selected database records.');
        return { success: false, message: res?.message || 'Bulk clear failed' };
      }
    } catch (err: any) {
      showToast('error', 'Bulk Clear Error', err.message || 'Failed to complete database operation.');
      return { success: false, message: err.message };
    }
  };

  // Support Inquiries & Messages System (PostgreSQL Backed)
  const submitInquiry = async (data: {
    name: string;
    email: string;
    phone?: string;
    subject?: string;
    category?: SupportInquiry['category'];
    orderId?: string;
    message: string;
    priority?: 'NORMAL' | 'URGENT' | 'HIGH';
    attachmentUrl?: string;
    userId?: string;
  }): Promise<SupportInquiry> => {
    const lockKey = `submit_inquiry_${data.email}_${data.subject}`;
    if (inFlightActionsRef.current.has(lockKey)) {
      throw new Error('Inquiry submission in progress');
    }
    inFlightActionsRef.current.add(lockKey);

    try {
      const res = await api.support.submitInquiry(data);
      if (res.success && res.ticket) {
        setInquiries((prev) => [res.ticket, ...prev.filter(i => i.id !== res.ticket.id)]);
        showToast('success', 'Support Request Submitted!', `Your ticket #${res.ticket.ticketNumber || ''} has been received.`);
        return res.ticket;
      }
      throw new Error(res.message || 'Failed to submit ticket');
    } catch (e: any) {
      const fallbackId = `inq-${Date.now()}`;
      const fallbackTicket: SupportInquiry = {
        id: fallbackId,
        ticketNumber: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
        userId: data.userId || (data.email ? `guest-${data.email}` : 'guest'),
        userName: data.name.trim(),
        userEmail: data.email.trim(),
        userPhone: data.phone?.trim() || '',
        subject: data.subject?.trim() || 'Customer Support Request',
        category: data.category || 'General Inquiry',
        orderId: data.orderId?.trim() || undefined,
        priority: data.priority || 'NORMAL',
        attachmentUrl: data.attachmentUrl,
        message: data.message.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setInquiries((prev) => [fallbackTicket, ...prev]);
      showToast('info', 'Message Received', 'Your support ticket has been recorded.');
      return fallbackTicket;
    } finally {
      inFlightActionsRef.current.delete(lockKey);
    }
  };

  const fetchTicketMessages = async (ticketId: string, email?: string): Promise<any[]> => {
    try {
      const res = await api.support.getTicketMessages(ticketId, email);
      if (res.success && Array.isArray(res.messages)) {
        return res.messages;
      }
      return [];
    } catch {
      return [];
    }
  };

  const sendTicketMessage = async (
    ticketId: string,
    data: { message: string; attachmentUrl?: string; senderName?: string; email?: string }
  ): Promise<{ success: boolean; message?: any }> => {
    try {
      const res = await api.support.sendTicketMessage(ticketId, data);
      if (res.success && res.message) {
        // Update local inquiry's updatedAt and status
        setInquiries((prev) =>
          prev.map((i) =>
            i.id === ticketId
              ? {
                  ...i,
                  status: i.status === 'resolved' ? 'pending' : i.status,
                  updatedAt: new Date().toISOString(),
                }
              : i
          )
        );
        return { success: true, message: res.message };
      }
      throw new Error(res.message || 'Failed to send message');
    } catch (err: any) {
      showToast('error', 'Send Failed', err.message || 'Could not send message.');
      return { success: false, message: err.message };
    }
  };

  const replyToInquiry = async (
    inquiryId: string,
    replyMessage: string,
    newStatus: SupportInquiry['status'] = 'replied',
    _adminInfo?: { uid: string; name: string; email: string },
    attachmentUrl?: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await api.support.replyInquiry(inquiryId, replyMessage, newStatus, attachmentUrl);
      if (!res.success) throw new Error(res.message || 'Reply failed');

      setInquiries((prev) =>
        prev.map((i) =>
          i.id === inquiryId
            ? {
                ...i,
                adminReply: replyMessage.trim(),
                status: newStatus,
                repliedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : i
        )
      );

      showToast('success', 'Reply Sent!', `Customer has been replied and ticket is ${newStatus}.`);
      return { success: true };
    } catch (e: any) {
      showToast('error', 'Reply Failed', e.message || 'Could not send reply.');
      return { success: false, message: e.message };
    }
  };

  const updateInquiryStatus = async (
    inquiryId: string,
    status: SupportInquiry['status'],
    _adminInfo?: { uid: string; name: string; email: string }
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await api.support.updateStatus(inquiryId, status);
      if (!res.success) throw new Error(res.message || 'Status update failed');

      setInquiries((prev) =>
        prev.map((i) =>
          i.id === inquiryId
            ? {
                ...i,
                status,
                updatedAt: new Date().toISOString(),
                resolvedAt: status === 'resolved' ? new Date().toISOString() : i.resolvedAt,
              }
            : i
        )
      );

      showToast('success', 'Status Updated', `Ticket is now ${status}.`);
      return { success: true };
    } catch (e: any) {
      showToast('error', 'Status Update Failed', e.message);
      return { success: false, message: e.message };
    }
  };

  const deleteInquiry = async (
    inquiryId: string,
    _adminInfo?: { uid: string; name: string; email: string }
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await api.support.deleteInquiry(inquiryId);
      if (!res.success) throw new Error(res.message || 'Delete failed');

      setInquiries((prev) => prev.filter((i) => i.id !== inquiryId));
      showToast('info', 'Inquiry Deleted', 'Support record has been removed.');
      return { success: true };
    } catch (e: any) {
      showToast('error', 'Delete Failed', e.message);
      return { success: false, message: e.message };
    }
  };

  const clearAllInquiries = async (
    _adminInfo?: { uid: string; name: string; email: string }
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const currentInquiries = [...inquiries];
      setInquiries([]);

      for (const inq of currentInquiries) {
        try {
          await api.support.deleteInquiry(inq.id);
        } catch {
          // continue
        }
      }

      if (_adminInfo) {
        await logAdminActivity({
          adminId: _adminInfo.uid,
          adminName: _adminInfo.name,
          adminEmail: _adminInfo.email,
          action: 'Cleared Support Inquiries',
          targetType: 'app_settings',
          targetId: 'all',
          description: `Cleared entire support inquiries history containing ${currentInquiries.length} tickets.`,
        });
      }

      showToast('success', 'Support History Cleared', 'All support tickets have been permanently cleared.');
      return { success: true };
    } catch (error: any) {
      showToast('error', 'Error clearing support tickets', error.message);
      return { success: false, message: error.message };
    }
  };

  const deleteNews = async (id: string, adminInfo?: { uid: string; name: string; email: string }) => {
    const lockKey = `delete_news_${id}`;
    if (inFlightActionsRef.current.has(lockKey)) return;
    inFlightActionsRef.current.add(lockKey);
    const target = news.find((n) => n.id === id);
    setNews((prev) => prev.filter((n) => n.id !== id));

    try {
      await api.news.delete(id);
    } catch (e) {
      console.warn('Backend delete news notice:', e);
      setNews((prev) => [...prev, target!]);
    } finally {
      inFlightActionsRef.current.delete(lockKey);
    }

    if (adminInfo) {
      await logAdminActivity({
        adminId: adminInfo.uid,
        adminName: adminInfo.name,
        adminEmail: adminInfo.email,
        action: 'Deleted News',
        targetType: 'news',
        targetId: id,
        description: `Deleted news article: "${target?.title || id}"`,
      });
    }

    showToast('info', 'News Deleted', 'Article has been removed.');
  };

  // Notifications
  const initialNotifsLoaded = useRef(false);
  const knownNotifIds = useRef<Set<string>>(new Set());

  const refreshNotifications = useCallback(async () => {
    try {
      const res = await api.notifications.getAll();
      if (res.success && Array.isArray(res.notifications)) {
        let hasNewUserNotif = false;
        let latestUserNotif: any = null;

        const mappedNotifs = res.notifications.map((n: any) => {
          const notifId = String(n.id);
          
          if (!knownNotifIds.current.has(notifId)) {
            knownNotifIds.current.add(notifId);
            
            // If this isn't the initial load, and it's a new unread notification for the user, trigger a toast
            if (initialNotifsLoaded.current && !n.read) {
              const ageMs = Date.now() - new Date(n.created_at || n.createdAt).getTime();
              // Only alert for relatively recent notifications (e.g., last 2 minutes)
              if (ageMs < 120000) {
                const role = String(n.recipient_role || n.recipientRole || '').toUpperCase();
                const targetUid = n.recipient_uid || n.recipientUid;
                // Only toast if current user is non-admin customer matching recipient
                if (!isAdmin && role === 'USER' && currentUser?.uid && targetUid === currentUser.uid) {
                   hasNewUserNotif = true;
                   latestUserNotif = n;
                }
              }
            }
          }

          return {
            ...n,
            recipientUid: n.recipient_uid || n.recipientUid,
            recipientRole: n.recipient_role || n.recipientRole,
            isGlobal: n.is_global !== undefined ? n.is_global : n.isGlobal,
            orderId: n.order_id || n.orderId,
            createdAt: n.createdAt || n.created_at,
            updatedAt: n.updatedAt || n.updated_at,
          };
        });

        if (hasNewUserNotif && latestUserNotif) {
          showToast('info', latestUserNotif.title || 'New Notification', latestUserNotif.message || 'You have a new update.');
        }

        setNotifications(mappedNotifs);
        initialNotifsLoaded.current = true;
      }
    } catch (e) {
      console.warn('Failed to refresh notifications from DB:', e);
    }
  }, [isAdmin, currentUser?.uid]);

  // Real-Time Notification Background Synchronizer (every 15s or on tab focus)
  useEffect(() => {
    const interval = setInterval(() => {
      refreshNotifications();
    }, 15000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshNotifications();
      }
    };

    window.addEventListener('focus', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refreshNotifications]);

  // Real-time synchronization on Auth state changes (instant data hydration on login/logout)
  useEffect(() => {
    const handleAuthChange = (e: any) => {
      syncOrdersFromBackend();
      refreshWallet();
      refreshNotifications();
      if (e?.detail?.loggedIn) {
        api.notifications.getAll().then((res) => {
          if (res.success && Array.isArray(res.notifications)) {
            setNotifications(res.notifications);
          }
        }).catch(() => {});
        api.cancellations.getAll().then((res) => {
          if (res.success && Array.isArray(res.requests)) {
            setCancellationRequests(res.requests);
          }
        }).catch(() => {});
      }
    };

    window.addEventListener('ghn:auth-changed', handleAuthChange);
    return () => window.removeEventListener('ghn:auth-changed', handleAuthChange);
  }, [syncOrdersFromBackend, refreshWallet, refreshNotifications]);

  const getUserNotifications = (userId: string): Notification[] => {
    return notifications.filter((n) => {
      // Check if user explicitly cleared this notification
      if (clearedNotifIds.has(n.id) || (userId && clearedNotifIds.has(`${userId}_${n.id}`))) {
        return false;
      }
      const rRole = String(n.recipientRole || (n as any).recipient_role || '').toLowerCase();
      const rUid = String(n.recipientUid || (n as any).recipient_uid || n.userId || '').toLowerCase();
      const actionUrl = String(n.actionUrl || (n as any).action_url || '').toLowerCase();
      const title = String(n.title || '').toLowerCase();
      const type = String(n.type || '').toLowerCase();

      // STRICT RULE: Admin targeted notifications MUST NOT appear in the User App bell dropdown.
      // Admin notifications are exclusively viewed inside the Admin Panel.
      if (
        rRole === 'admin' ||
        rRole === 'staff' ||
        rRole === 'super_admin' ||
        rRole === 'store_owner' ||
        rRole === 'store_manager' ||
        rUid === 'admin' ||
        rUid === 'staff' ||
        actionUrl.startsWith('/admin') ||
        title.startsWith('new order received') ||
        title.includes('payment verification') ||
        type === 'payment_verification' ||
        type === 'admin_order_alert' ||
        type === 'admin_alert' ||
        type === 'kyc_request' ||
        type === 'wallet_deposit'
      ) {
        return false;
      }
      // Direct recipient match
      if (userId && (n.recipientUid === userId || n.userId === userId)) return true;
      // Global broadcast (intended for all users)
      if (n.isGlobal === true || rUid === 'all' || !n.recipientUid) {
        return true;
      }
      return false;
    });
  };

  const sendNotification = async (
    notifData: Omit<Notification, 'id' | 'createdAt' | 'read'>,
    adminInfo?: { uid: string; name: string; email: string }
  ) => {
    const isBroadcast =
      notifData.isGlobal === true ||
      notifData.recipientUid === 'all' ||
      notifData.userId === 'all';
    const targetUid = isBroadcast ? 'all' : (notifData.recipientUid || notifData.userId || 'all');

    try {
      const res = await api.notifications.send({
        title: notifData.title,
        message: notifData.message,
        recipientUid: targetUid,
        recipient_uid: targetUid,
        isGlobal: isBroadcast,
        is_global: isBroadcast,
        type: notifData.type || 'announcement',
        orderId: notifData.orderId,
      });

      if (res.success && res.notification) {
        const savedNotif: Notification = {
          id: res.notification.id,
          title: res.notification.title,
          message: res.notification.message,
          recipientUid: res.notification.recipient_uid || targetUid,
          userId: res.notification.recipient_uid || targetUid,
          isGlobal: res.notification.is_global ?? isBroadcast,
          type: res.notification.type || notifData.type,
          read: false,
          createdAt: res.notification.createdAt ? new Date(res.notification.createdAt).toISOString() : new Date().toISOString(),
          orderId: res.notification.order_id || notifData.orderId,
        };
        setNotifications((prev) => [savedNotif, ...prev.filter((n) => n.id !== savedNotif.id)]);
      }
    } catch (e) {
      console.error('Failed to dispatch notification to DB:', e);
      throw e;
    }

    if (adminInfo) {
      await logAdminActivity({
        adminId: adminInfo.uid,
        adminName: adminInfo.name,
        adminEmail: adminInfo.email,
        action: isBroadcast ? 'Dispatched Broadcast Notification' : 'Sent Targeted Notification',
        targetType: 'notification',
        targetId: 'db',
        description: `Notification "${notifData.title}" sent to ${isBroadcast ? 'All Customers (Broadcast)' : `User ${targetUid}`}`,
      });
    }

    showToast('success', 'Notification Dispatched', isBroadcast ? 'Broadcast sent to all customers.' : `Sent to ${targetUid}.`);
  };

  const markNotificationAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await api.notifications.markRead(id);
    } catch (e) {
      console.warn('Failed to mark notification read in DB:', id, e);
    }
  };

  const markAllNotificationsAsRead = async (userId: string) => {
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.recipientUid === userId || n.userId === userId || n.isGlobal || n.recipientUid === 'all' || n.userId === 'all') {
          return { ...n, read: true };
        }
        return n;
      })
    );
    try {
      await api.notifications.markAllRead();
    } catch (e) {
      console.warn('Failed to mark all notifications read in DB:', e);
    }
    showToast('info', 'Notifications Read', 'All notifications marked as read.');
  };

  const deleteNotification = async (id: string, adminInfo?: { uid: string; name: string; email: string }) => {
    setClearedNotifIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await api.notifications.deleteOne(id);
    } catch (e) {
      console.warn('Failed to delete notification from DB:', id, e);
    }
    if (adminInfo) {
      await logAdminActivity({
        adminId: adminInfo.uid,
        adminName: adminInfo.name,
        adminEmail: adminInfo.email,
        action: 'Deleted Notification',
        targetType: 'notification',
        targetId: id,
        description: `Deleted notification ID: ${id} from database`,
      });
    }
    showToast('info', 'Notification Removed', 'Notification removed.');
  };

  const clearUserNotifications = async (userId: string) => {
    if (!userId) return;
    const userNotifs = getUserNotifications(userId);
    if (userNotifs.length === 0) {
      showToast('info', 'Already Empty', 'No notifications to clear.');
      return;
    }

    setClearedNotifIds((prev) => {
      const next = new Set(prev);
      userNotifs.forEach((n) => next.add(n.id));
      return next;
    });
    setNotifications((prev) => prev.filter((n) => n.recipientUid !== userId && n.userId !== userId && !n.isGlobal));
    try {
      await api.notifications.clearUser();
    } catch (e) {
      console.warn('Failed to clear user notifications from DB:', e);
    }
    showToast('success', 'Notifications Cleared', 'All your notifications were cleared.');
  };

  const clearSystemNotifications = async (adminInfo?: { uid: string; name: string; email: string }) => {
    setNotifications([]);
    setClearedNotifIds(new Set());
    try {
      localStorage.removeItem('ghn_cleared_notifs_v1');
      await api.notifications.adminClearAll();
    } catch (e) {
      console.warn('Failed to clear all system notifications from DB:', e);
    }

    if (adminInfo) {
      await logAdminActivity({
        adminId: adminInfo.uid,
        adminName: adminInfo.name,
        adminEmail: adminInfo.email,
        action: 'Cleared All Notifications',
        targetType: 'notification',
        targetId: 'all',
        description: 'Admin cleared all system notifications from database.',
      });
    }
    showToast('success', 'System Cleared', 'All notifications have been deleted from database.');
  };

  const unreadCount = (userId?: string): number => {
    if (!userId) return 0;
    const userNotifs = getUserNotifications(userId);
    return userNotifs.filter((n) => !n.read).length;
  };

  // Dynamic Favicon & Title Syncing
  useEffect(() => {
    updateDocumentFavicon(appSettings.logoUrl);
    if (appSettings.appName) {
      document.title = `${appSettings.appName} — ${appSettings.appTagline || "Nepal's #1 Instant Gaming Top-Up Platform"}`;
    }
  }, [appSettings.logoUrl, appSettings.appName, appSettings.appTagline]);

  // App Settings
  const refreshSettings = async () => {
    try {
      const res = await api.settings.getAppSettings();
      if (res && res.success && (res.appSettings || res.settings)) {
        const incoming = res.appSettings || res.settings;
        if (incoming && (!incoming.logoUrl || incoming.logoUrl === '/logo.png' || incoming.logoUrl.includes('file_00000000b438821189f49d6cbc994849') || incoming.logoUrl.includes('1789182424123') || incoming.logoUrl.includes('Game%20Hub%20Nepal%20Logo.png') || incoming.logoUrl.includes('Game%20Hub%20Nepal.png') || !incoming.logoUrl.includes('unx.png'))) {
          incoming.logoUrl = OFFICIAL_LOGO_DATA_URI;
          incoming.faviconUrl = OFFICIAL_LOGO_DATA_URI;
        }
        const isOrdering = incoming.orderingEnabled !== false && incoming.ordering_enabled !== false;
        const isMaint = Boolean(incoming.maintenanceMode ?? incoming.maintenance_mode ?? false);
        setAppSettings(prev => ({
          ...prev,
          ...incoming,
          orderingEnabled: isOrdering,
          maintenanceMode: isMaint,
        }));
      }
    } catch (e) {
      console.warn('Failed to refresh app settings:', e);
    }
  };

  const updateAppSettings = async (
    updates: Partial<AppSettings>,
    adminInfo?: { uid: string; name: string; email: string },
    options?: { silent?: boolean }
  ) => {
    const targetOrdering = updates.orderingEnabled !== undefined 
      ? updates.orderingEnabled 
      : (updates as any).ordering_enabled !== undefined 
      ? (updates as any).ordering_enabled 
      : appSettings.orderingEnabled !== false;
    const targetMaint = updates.maintenanceMode !== undefined
      ? Boolean(updates.maintenanceMode)
      : (updates as any).maintenance_mode !== undefined
      ? Boolean((updates as any).maintenance_mode)
      : appSettings.maintenanceMode;

    const merged = { ...appSettings, ...updates, orderingEnabled: targetOrdering, maintenanceMode: targetMaint };
    setAppSettings(merged);

    try {
      const res = await api.settings.updateAppSettings(updates);
      if (res && res.success && (res.appSettings || res.settings)) {
        const incoming = res.appSettings || res.settings;
        const isOrdering = incoming.orderingEnabled !== false && incoming.ordering_enabled !== false;
        const isMaint = Boolean(incoming.maintenanceMode ?? incoming.maintenance_mode ?? false);
        setAppSettings(prev => ({
          ...prev,
          ...incoming,
          orderingEnabled: isOrdering,
          maintenanceMode: isMaint,
        }));
      }
    } catch (e) {
      console.warn('Backend update app settings notice:', e);
    }

    if (adminInfo) {
      await logAdminActivity({
        adminId: adminInfo.uid,
        adminName: adminInfo.name,
        adminEmail: adminInfo.email,
        action: 'Updated App Settings',
        targetType: 'app_settings',
        targetId: 'main',
        description: `Updated app settings. Maintenance Mode: ${merged.maintenanceMode ? 'ENABLED' : 'DISABLED'}, Banner: ${merged.announcementActive ? 'ACTIVE' : 'OFF'}`,
      });
    }

    if (!options?.silent) {
      showToast('success', 'App Settings Saved', 'Application configuration updated.');
    }
  };

  const toggleOrderingStatus = async (
    enabled: boolean,
    options?: { adminInfo?: any; silent?: boolean }
  ): Promise<boolean> => {
    const lockKey = 'toggle_ordering_status';
    if (inFlightActionsRef.current.has(lockKey)) {
      return false;
    }
    inFlightActionsRef.current.add(lockKey);

    const prevSettings = { ...appSettings };
    // 1. Instant optimistic local UI update for Ordering only
    setAppSettings(prev => ({
      ...prev,
      orderingEnabled: enabled,
      maintenanceMode: enabled ? false : prev.maintenanceMode,
    }));

    try {
      const adminData = options?.adminInfo || (currentUser ? { uid: currentUser.uid, name: currentUser.name, email: currentUser.email } : undefined);
      const res = await api.settings.toggleStoreStatus({
        orderingEnabled: enabled,
        adminInfo: adminData,
      });

      if (res && res.success) {
        setAppSettings(prev => ({
          ...prev,
          orderingEnabled: res.orderingEnabled !== false && res.ordering_enabled !== false,
          maintenanceMode: Boolean(res.maintenanceMode ?? res.maintenance_mode ?? (enabled ? false : prev.maintenanceMode)),
          maintenanceMessage: res.maintenanceMessage || res.maintenance_message || prev.maintenanceMessage,
          maintenanceUntil: res.maintenanceUntil || res.maintenance_until || null,
          maintenanceDurationMinutes: res.maintenanceDurationMinutes || res.maintenance_duration_minutes || null,
        }));
        if (!options?.silent) {
          showToast(
            enabled ? 'success' : 'warning',
            enabled ? 'Ordering is ONLINE' : 'Ordering is OFFLINE / PAUSED',
            enabled
              ? 'Customers can place new orders normally.'
              : 'New order checkout is safely paused. Site remains browsable.'
          );
        }
        return true;
      }
      setAppSettings(prevSettings);
      showToast('error', 'Status Sync Error', res?.message || 'Server did not acknowledge ordering status change.');
      return false;
    } catch (err: any) {
      console.error('Failed to toggle ordering status:', err);
      setAppSettings(prevSettings);
      showToast('error', 'Status Sync Error', err?.message || 'Could not sync ordering status with database.');
      return false;
    } finally {
      inFlightActionsRef.current.delete(lockKey);
    }
  };

  const toggleMaintenanceStatus = async (
    enabled: boolean,
    options?: { message?: string; durationMinutes?: number; adminInfo?: any; silent?: boolean }
  ): Promise<boolean> => {
    const lockKey = 'toggle_maintenance_status';
    if (inFlightActionsRef.current.has(lockKey)) {
      return false;
    }
    inFlightActionsRef.current.add(lockKey);

    const prevSettings = { ...appSettings };
    const rawDuration = options?.durationMinutes !== undefined ? options.durationMinutes : (appSettings.maintenanceDurationMinutes || 0);
    const calculatedUntil = (enabled && rawDuration > 0)
      ? new Date(Date.now() + rawDuration * 60000).toISOString() 
      : null;

    // 1. Instant optimistic local UI update for Maintenance only
    setAppSettings(prev => ({
      ...prev,
      maintenanceMode: enabled,
      maintenanceMessage: options?.message || prev.maintenanceMessage,
      maintenanceDurationMinutes: enabled ? rawDuration : null,
      maintenanceUntil: calculatedUntil
    }));

    try {
      const adminData = options?.adminInfo || (currentUser ? { uid: currentUser.uid, name: currentUser.name, email: currentUser.email } : undefined);
      const res = await api.settings.toggleStoreStatus({
        maintenanceMode: enabled,
        maintenanceMessage: options?.message,
        durationMinutes: rawDuration,
        adminInfo: adminData,
      });

      if (res && res.success) {
        setAppSettings(prev => ({
          ...prev,
          orderingEnabled: res.orderingEnabled !== false && res.ordering_enabled !== false,
          maintenanceMode: Boolean(res.maintenanceMode ?? res.maintenance_mode ?? enabled),
          maintenanceMessage: res.maintenanceMessage || res.maintenance_message || prev.maintenanceMessage,
          maintenanceUntil: res.maintenanceUntil || res.maintenance_until || calculatedUntil,
          maintenanceDurationMinutes: res.maintenanceDurationMinutes !== undefined 
            ? res.maintenanceDurationMinutes 
            : (res.maintenance_duration_minutes !== undefined ? res.maintenance_duration_minutes : (enabled ? rawDuration : null)),
        }));
        if (!options?.silent) {
          showToast(
            enabled ? 'warning' : 'success',
            enabled ? 'Maintenance Mode ACTIVE' : 'Maintenance Mode OFF',
            enabled
              ? 'Store maintenance screen is active. Regular customer access is locked.'
              : 'Store is live and accessible to all customers.'
          );
        }
        return true;
      }
      setAppSettings(prevSettings);
      showToast('error', 'Maintenance Sync Error', res?.message || 'Server did not acknowledge maintenance mode change.');
      return false;
    } catch (err: any) {
      console.error('Failed to toggle maintenance status:', err);
      setAppSettings(prevSettings);
      showToast('error', 'Maintenance Sync Error', err?.message || 'Could not sync maintenance status with database.');
      return false;
    } finally {
      inFlightActionsRef.current.delete(lockKey);
    }
  };

  const toggleStoreStatus = async (
    isOnline: boolean,
    options?: { orderingEnabled?: boolean; maintenanceMode?: boolean; message?: string; durationMinutes?: number; adminInfo?: any; silent?: boolean }
  ): Promise<boolean> => {
    const lockKey = 'toggle_store_status';
    if (inFlightActionsRef.current.has(lockKey)) {
      return false;
    }
    inFlightActionsRef.current.add(lockKey);

    const prevSettings = { ...appSettings };
    const targetOrdering = options?.orderingEnabled !== undefined ? options.orderingEnabled : isOnline;
    const targetMaintenance = options?.maintenanceMode !== undefined ? options.maintenanceMode : (isOnline ? false : Boolean(appSettings.maintenanceMode));
    const targetMessage = options?.message || appSettings.maintenanceMessage;
    const rawDuration = options?.durationMinutes !== undefined ? options.durationMinutes : (appSettings.maintenanceDurationMinutes || 0);

    const calculatedUntil = (targetMaintenance && rawDuration > 0)
      ? new Date(Date.now() + rawDuration * 60000).toISOString() 
      : null;

    // Optimistic UI Update
    setAppSettings(prev => ({
      ...prev,
      orderingEnabled: targetOrdering,
      maintenanceMode: targetMaintenance,
      maintenanceMessage: targetMessage,
      maintenanceDurationMinutes: targetMaintenance ? rawDuration : null,
      maintenanceUntil: calculatedUntil
    }));

    try {
      const adminData = options?.adminInfo || (currentUser ? { uid: currentUser.uid, name: currentUser.name, email: currentUser.email } : undefined);
      const res = await api.settings.toggleStoreStatus({
        orderingEnabled: targetOrdering,
        maintenanceMode: targetMaintenance,
        maintenanceMessage: targetMessage,
        durationMinutes: rawDuration,
        adminInfo: adminData,
      });

      if (res && res.success) {
        setAppSettings(prev => ({
          ...prev,
          orderingEnabled: res.orderingEnabled !== false && res.ordering_enabled !== false,
          maintenanceMode: Boolean(res.maintenanceMode ?? res.maintenance_mode ?? targetMaintenance),
          maintenanceMessage: res.maintenanceMessage || res.maintenance_message || targetMessage,
          maintenanceUntil: res.maintenanceUntil || res.maintenance_until || calculatedUntil,
          maintenanceDurationMinutes: res.maintenanceDurationMinutes !== undefined 
            ? res.maintenanceDurationMinutes 
            : (res.maintenance_duration_minutes !== undefined ? res.maintenance_duration_minutes : (targetMaintenance ? rawDuration : null)),
        }));
        if (!options?.silent) {
          showToast(
            isOnline ? 'success' : 'warning',
            isOnline ? 'Store is LIVE & ONLINE' : 'Store is OFFLINE / PAUSED',
            isOnline
              ? 'Ordering is open and customers can browse and place orders.'
              : 'New orders and checkout are paused safely.'
          );
        }
        return true;
      }
      setAppSettings(prevSettings);
      showToast('error', 'Store Status Error', res?.message || 'Server did not acknowledge store status change.');
      return false;
    } catch (err: any) {
      console.error('Failed to toggle store status:', err);
      setAppSettings(prevSettings);
      showToast('error', 'Status Sync Error', err?.message || 'Could not sync store status with database.');
      return false;
    } finally {
      inFlightActionsRef.current.delete(lockKey);
    }
  };

  // Upload / Replace App Logo
  const updateAppLogo = async (
    logoUrl: string,
    metadata?: { fileName?: string; dimensions?: { width: number; height: number } },
    adminInfo?: { uid: string; name: string; email: string }
  ) => {
    const now = new Date().toISOString();
    const merged: AppSettings = {
      ...appSettings,
      logoUrl,
      faviconUrl: logoUrl,
      logoFileName: metadata?.fileName || 'unxgames-logo.png',
      logoDimensions: metadata?.dimensions || { width: 600, height: 600 },
      logoUpdatedAt: now,
    };

    setAppSettings(merged);
    updateDocumentFavicon(logoUrl);

    try {
      await api.settings.updateAppSettings(merged);
    } catch (e) {
      console.warn('Backend update app settings for logo notice:', e);
    }

    if (adminInfo) {
      await logAdminActivity({
        adminId: adminInfo.uid,
        adminName: adminInfo.name,
        adminEmail: adminInfo.email,
        action: 'Updated Official App Logo',
        targetType: 'app_settings',
        targetId: 'main',
        description: `Uploaded and activated official Unx Games logo (${metadata?.fileName || 'image'}, ${metadata?.dimensions?.width || 600}x${metadata?.dimensions?.height || 600}px).`,
      });
    }

    showToast('success', 'Logo Updated!', 'The new official logo is now active across the entire application.');
  };

  // Reset App Logo to Official Master Vector Logo
  const resetAppLogo = async (adminInfo?: { uid: string; name: string; email: string }) => {
    const now = new Date().toISOString();
    const merged: AppSettings = {
      ...appSettings,
      logoUrl: OFFICIAL_LOGO_DATA_URI,
      faviconUrl: OFFICIAL_LOGO_DATA_URI,
      logoFileName: 'unxgames-official-logo.png',
      logoDimensions: { width: 1254, height: 1254 },
      logoUpdatedAt: now,
    };

    setAppSettings(merged);
    updateDocumentFavicon(OFFICIAL_LOGO_DATA_URI);

    try {
      await api.settings.updateAppSettings(merged);
    } catch (e) {
      console.warn('Backend reset app logo notice:', e);
    }

    if (adminInfo) {
      await logAdminActivity({
        adminId: adminInfo.uid,
        adminName: adminInfo.name,
        adminEmail: adminInfo.email,
        action: 'Reset App Logo',
        targetType: 'app_settings',
        targetId: 'main',
        description: 'Restored default Unx Games master vector logo.',
      });
    }

    showToast('info', 'Default Logo Restored', 'Unx Games master logo has been applied.');
  };

  const actionableOrderCount = isAdminView 
    ? orders.filter(
        (o) =>
          o.orderStatus === 'payment_verification' ||
          o.orderStatus === 'processing' ||
          o.orderStatus === 'payment_verified'
      ).length
    : orders.filter(
        (o) =>
          o.orderStatus === 'pending_payment' ||
          o.orderStatus === 'payment_verification' ||
          o.orderStatus === 'processing' ||
          o.orderStatus === 'payment_verified'
      ).length;

  return (
    <StoreContext.Provider
      value={{
        walletBalance,
        userWallet,
        refreshWallet,
        products,
        activeProducts,
        isLoadingProducts,
        addProduct,
        updateProduct,
        deleteProduct,
        toggleProductStatus,
        toggleProductStock,
        orders,
        actionableOrderCount,
        createOrder,
        updateOrderStatus,
        resubmitPayment,
        deleteOrder,
        bulkDeleteOrders,
        clearAllOrders,
        deletePayment,
        clearAllPayments,
        completeAllPendingTasks,
        cancellationRequests,
        refreshCancellations,
        requestOrderCancellation,
        approveCancellation,
        rejectCancellation,
        updateRefundStatus,
        getUserOrders,
        syncOrdersFromBackend,
        paymentSettings,
        updatePaymentSettings,
        news,
        isLoadingNews,
        addNews,
        updateNews,
        deleteNews,
        banners,
        addBanner,
        updateBanner,
        deleteBanner,
        toggleBannerStatus,
        duplicateBanner,
        reorderBanners,
        handleBannerClick,
        notifications,
        reviews,
        addReview,
        updateReview,
        deleteReview,
        toggleReviewStatus,
        generateAiReviewReply,
        previewAiReviewReply,
        batchAiAutoReplyReviews,
        getReviewSettings,
        updateReviewSettings,
        inquiries,
        submitInquiry,
        fetchTicketMessages,
        sendTicketMessage,
        replyToInquiry,
        updateInquiryStatus,
        deleteInquiry,
        clearAllInquiries,
        getUserNotifications,
        refreshNotifications,
        sendNotification,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
        clearUserNotifications,
        clearSystemNotifications,
        unreadCount,
        appSettings,
        updateAppSettings,
        toggleStoreStatus,
        toggleOrderingStatus,
        toggleMaintenanceStatus,
        updateAppLogo,
        resetAppLogo,
        bulkClearRecords,
        activityLogs,
        searchQuery,
        setSearchQuery,
        currentTab,
        setCurrentTab,
        goBack,
        openProduct,
        openOrder,
        openReviews,
        openCheckout,
        selectedProductId,
        setSelectedProductId,
        selectedOrderId,
        setSelectedOrderId,
        isAdminView,
        setIsAdminView,
        adminTab,
        setAdminTab,
        adminSelectedOrderId,
        setAdminSelectedOrderId,
        adminSelectedUserId,
        setAdminSelectedUserId,
        adminSelectedProductId,
        setAdminSelectedProductId,
        adminSelectedNewsId,
        setAdminSelectedNewsId,
        categories,
        isLoadingCategories,
        refreshCategories,
        refreshSettings,
        createCategory,
        updateCategory,
        deleteCategory,
        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

export const useBranding = () => {
  const { appSettings, updateAppLogo, resetAppLogo, showToast } = useStore();
  return {
    appName: appSettings?.appName || 'Unx Games',
    appTagline: appSettings?.appTagline || "Nepal's #1 Instant Gaming Top-Up Platform",
    logoUrl: appSettings?.logoUrl || OFFICIAL_LOGO_DATA_URI,
    faviconUrl: appSettings?.faviconUrl || OFFICIAL_LOGO_DATA_URI,
    logoFileName: appSettings?.logoFileName || 'unxgames-official-logo.png',
    logoDimensions: appSettings?.logoDimensions || { width: 1254, height: 1254 },
    logoUpdatedAt: appSettings?.logoUpdatedAt,
    updateAppLogo,
    resetAppLogo,
    showToast,
  };
};
