/**
 * Unx Games - Price Alert Subscription & Price Drop Notification Utility
 * Allows users to subscribe to price alerts for specific game top-up products
 * and receive automatic in-app notifications when prices drop.
 */

export interface PriceAlertSubscription {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  packageId?: string;
  packageName?: string;
  targetPrice?: number;
  initialPrice: number;
  currentPrice: number;
  lastNotifiedPrice?: number;
  subscribedAt: string;
  userUid?: string;
}

const STORAGE_KEY = 'unx_price_alerts';

/**
 * Retrieves all stored price alert subscriptions.
 */
export function getPriceAlerts(): PriceAlertSubscription[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('[PriceAlerts] Failed to parse stored alerts:', err);
    return [];
  }
}

/**
 * Persists price alert subscriptions to localStorage and attempts backend sync if available.
 */
export function savePriceAlerts(alerts: PriceAlertSubscription[]): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
    // Dispatch local storage change event for reactive UI updates
    window.dispatchEvent(new Event('unx_price_alerts_updated'));
  } catch (err) {
    console.warn('[PriceAlerts] Failed to save price alerts:', err);
  }
}

/**
 * Checks if a user is subscribed to a price alert for a product/package.
 */
export function isSubscribedToPriceAlert(productId: string, packageId?: string): boolean {
  const alerts = getPriceAlerts();
  return alerts.some((a) => a.productId === productId && (!packageId || a.packageId === packageId));
}

/**
 * Subscribes the user to price drop alerts for a given product or package.
 */
export function subscribeToPriceAlert(
  params: {
    productId: string;
    productName: string;
    productImage?: string;
    packageId?: string;
    packageName?: string;
    currentPrice: number;
    targetPrice?: number;
  },
  userUid?: string
): PriceAlertSubscription {
  const alerts = getPriceAlerts();
  
  // Remove existing alert for this product/package if any
  const filtered = alerts.filter(
    (a) => !(a.productId === params.productId && (!params.packageId || a.packageId === params.packageId))
  );

  const newAlert: PriceAlertSubscription = {
    id: `alert-${params.productId}-${params.packageId || 'main'}-${Date.now()}`,
    productId: params.productId,
    productName: params.productName,
    productImage: params.productImage,
    packageId: params.packageId,
    packageName: params.packageName,
    targetPrice: params.targetPrice || Math.max(1, Math.floor(params.currentPrice * 0.95)), // Default 5% drop target
    initialPrice: params.currentPrice,
    currentPrice: params.currentPrice,
    subscribedAt: new Date().toISOString(),
    userUid,
  };

  filtered.unshift(newAlert);
  savePriceAlerts(filtered);

  // Sync with backend API silently if user is logged in
  if (userUid && typeof fetch !== 'undefined') {
    fetch('/api/price-alerts/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAlert),
    }).catch((e) => console.warn('[PriceAlerts] Server sync failed (offline/fallback):', e?.message));
  }

  return newAlert;
}

/**
 * Unsubscribes from price alert for a product/package.
 */
export function unsubscribeFromPriceAlert(productId: string, packageId?: string, userUid?: string): void {
  const alerts = getPriceAlerts();
  const updated = alerts.filter(
    (a) => !(a.productId === productId && (!packageId || a.packageId === packageId))
  );
  savePriceAlerts(updated);

  if (userUid && typeof fetch !== 'undefined') {
    fetch('/api/price-alerts/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, packageId, userUid }),
    }).catch((e) => console.warn('[PriceAlerts] Server unsubscribe sync failed:', e?.message));
  }
}

/**
 * Toggles price alert subscription status. Returns true if now subscribed, false if unsubscribed.
 */
export function togglePriceAlert(
  params: {
    productId: string;
    productName: string;
    productImage?: string;
    packageId?: string;
    packageName?: string;
    currentPrice: number;
    targetPrice?: number;
  },
  userUid?: string
): boolean {
  if (isSubscribedToPriceAlert(params.productId, params.packageId)) {
    unsubscribeFromPriceAlert(params.productId, params.packageId, userUid);
    return false;
  } else {
    subscribeToPriceAlert(params, userUid);
    return true;
  }
}

/**
 * Checks all active price alert subscriptions against updated product catalog data.
 * If a price drop is detected, creates an in-app notification and dispatches a notification event.
 */
export function checkAndTriggerPriceAlerts(
  products: any[],
  onTriggerNotif?: (notif: any) => void
): { triggeredAlerts: PriceAlertSubscription[]; notifications: any[] } {
  const alerts = getPriceAlerts();
  if (!alerts.length || !products.length) return { triggeredAlerts: [], notifications: [] };

  let modified = false;
  const triggeredAlerts: PriceAlertSubscription[] = [];
  const createdNotifs: any[] = [];

  const updatedAlerts = alerts.map((alert) => {
    const prod = products.find((p) => p.id === alert.productId || p.gameName === alert.productName);
    if (!prod) return alert;

    let latestPrice = alert.currentPrice;
    let pkgName = alert.packageName;

    if (alert.packageId && Array.isArray(prod.packages)) {
      const pkg = prod.packages.find((k: any) => k.id === alert.packageId);
      if (pkg && typeof pkg.price === 'number') {
        latestPrice = pkg.price;
        pkgName = pkg.name;
      }
    } else if (typeof prod.startingPrice === 'number' && prod.startingPrice > 0) {
      latestPrice = prod.startingPrice;
    } else if (Array.isArray(prod.packages) && prod.packages[0]?.price) {
      latestPrice = prod.packages[0].price;
      pkgName = prod.packages[0].name;
    }

    // Check if price has dropped below last notified price or initial price or target price
    const lastCheckPrice = alert.lastNotifiedPrice ?? alert.initialPrice;
    const isPriceDropped = latestPrice < lastCheckPrice || (alert.targetPrice && latestPrice <= alert.targetPrice);

    if (isPriceDropped && latestPrice !== alert.lastNotifiedPrice) {
      modified = true;
      const savings = Math.max(0, lastCheckPrice - latestPrice);
      const pkgText = pkgName ? ` (${pkgName})` : '';

      const notifObj = {
        id: `notif-pricedrop-${alert.productId}-${Date.now()}`,
        title: `🔥 Price Drop Alert: ${alert.productName}!`,
        message: `Great news! ${alert.productName}${pkgText} price dropped from Rs. ${lastCheckPrice} to Rs. ${latestPrice}! Save Rs. ${savings} now.`,
        type: 'PRICE_DROP',
        category: 'price_alert',
        actionUrl: `/product/${alert.productId}`,
        productId: alert.productId,
        read: false,
        createdAt: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      createdNotifs.push(notifObj);
      if (onTriggerNotif) onTriggerNotif(notifObj);

      const updatedAlert: PriceAlertSubscription = {
        ...alert,
        currentPrice: latestPrice,
        lastNotifiedPrice: latestPrice,
      };

      triggeredAlerts.push(updatedAlert);
      return updatedAlert;
    }

    // Keep current price up to date
    if (latestPrice !== alert.currentPrice) {
      modified = true;
      return { ...alert, currentPrice: latestPrice };
    }

    return alert;
  });

  if (modified) {
    savePriceAlerts(updatedAlerts);
  }

  return { triggeredAlerts, notifications: createdNotifs };
}
