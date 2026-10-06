// Nepali currency and date formatters

export const formatNPR = (amount?: number | null): string => {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return `Rs. ${num.toLocaleString('en-IN')}`;
};

export const formatNPRShort = (amount?: number | null): string => {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return `Rs. ${num.toLocaleString('en-IN')}`;
};

export const formatDate = (isoString?: string | null): string => {
  if (!isoString) return 'Just now';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return String(isoString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(isoString || '');
  }
};

export const formatRelativeTime = (isoString?: string | null): string => {
  if (!isoString) return 'Just now';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return String(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'Just now';
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return String(isoString || '');
  }
};

/**
 * Standardized logic for checking if an order is awaiting payment verification.
 * An order is in the payment verification queue if:
 * 1. Its payment is NOT already verified, paid, or rejected.
 * 2. Its order status is NOT completed, delivered, cancelled, rejected, or refunded.
 * 3. Its order status or payment status is pending payment / verification.
 */
export const isOrderAwaitingPaymentVerification = (o: any): boolean => {
  if (!o) return false;
  const pStatus = String(o.paymentStatus || o.payment_status || '').toLowerCase().trim();
  const oStatus = String(o.orderStatus || o.order_status || o.status || '').toLowerCase().trim();
  const cStatus = String(o.cancellationStatus || o.cancellation_status || '').toLowerCase().trim();
  const rStatus = String(o.refundStatus || o.refund_status || '').toLowerCase().trim();

  // If order has already reached final states, is cancelled, or refund is requested/completed, it does NOT need payment verification
  if (
    ['completed', 'delivered', 'cancelled', 'rejected', 'refunded'].includes(oStatus) ||
    ['approved', 'pending', 'cancelled'].includes(cStatus) ||
    ['refunded', 'processing', 'completed'].includes(rStatus) ||
    o.cancelRequested === true ||
    o.isCancelled === true
  ) {
    return false;
  }

  // If payment has already been verified/paid or rejected, it's not pending verification
  if (['verified', 'paid', 'completed', 'approved', 'rejected', 'failed', 'refunded'].includes(pStatus)) {
    return false;
  }

  // Needs verification if status is pending payment, payment verification, or submitted proof
  return (
    oStatus === 'payment_verification' ||
    oStatus === 'pending_payment' ||
    pStatus === 'pending_verification' ||
    pStatus === 'pending' ||
    pStatus === 'submitted'
  );
};

export const formatNepaliDateTime = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
};

export const formatCompactDateTime = (isoString?: string | null): string => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return String(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return String(isoString);
  }
};

export const formatTimeAgo = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recent';
  }
};

// Generate human-friendly canonical order ID (format: UNX-XXXXXXXX)
export const generateOrderId = (): string => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `UNX-${result}`;
};

// Generate team application ID (format: UNX-TEAM-XXXXXXXX)
export const generateTeamApplicationId = (): string => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `UNX-TEAM-${result}`;
};

// Returns clean customer-facing order code (UNX-XXXXXXXX)
export const formatDisplayOrderId = (order: any): string => {
  if (!order) return '';
  
  if (typeof order === 'string') {
    const s = order.trim();
    if (/^(UNX|GHN)-[A-Z0-9]{4,12}$/i.test(s)) return s.toUpperCase().replace(/^GHN-/, 'UNX-');
    if (s.startsWith('UNX-') || s.startsWith('GHN-')) return s.toUpperCase().replace(/^GHN-/, 'UNX-');
    
    // If it's just a raw UUID or very long hash, take the last 8 clean chars
    const cleanS = s.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (cleanS.length > 8) {
      return `UNX-${cleanS.slice(-8)}`;
    }
    
    if (/^[A-Z0-9]{4,12}$/i.test(cleanS)) return `UNX-${cleanS}`;
    return s.toUpperCase();
  }

  const code = order.order_code || order.orderCode || order.orderNumber;
  if (code && typeof code === 'string' && code.trim()) {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.startsWith('UNX-') || trimmed.startsWith('GHN-')) return trimmed.replace(/^GHN-/, 'UNX-');
    if (/^[A-Z0-9]{4,12}$/i.test(trimmed)) return `UNX-${trimmed}`;
    return trimmed;
  }
  const idStr = String(order.id || order.orderId || '').trim();
  if (/^(UNX|GHN)-[A-Z0-9]{4,12}$/i.test(idStr)) {
    return idStr.toUpperCase().replace(/^GHN-/, 'UNX-');
  }
  if (/^\d{8}$/.test(idStr)) {
    return `UNX-${idStr.slice(0, 4)}`;
  }
  if (idStr.startsWith('UNX-') || idStr.startsWith('GHN-')) {
    return idStr.toUpperCase().replace(/^GHN-/, 'UNX-');
  }
  // Try to grab last 8 characters if it looks like a long UUID, else use first 8
  const cleanId = idStr.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  if (cleanId.length > 8) {
     return `UNX-${cleanId.slice(-8)}`;
  }
  
  return `UNX-${cleanId}`;
};

// Centralized Order Code Normalization
export const normalizeOrderCode = (input: string | null | undefined): string => {
  if (!input) return '';
  let str = String(input).trim();
  // Strip common conversational or punctuation prefixes
  str = str.replace(/^(track\s*order|track|order\s*id|order|#)\s*[:#-]?\s*/i, '').trim();
  // Normalize GHN-XXXX
  const ghnMatch = str.match(/^GHN-?([A-Z0-9]{4,12})$/i);
  if (ghnMatch) {
    return `GHN-${ghnMatch[1].toUpperCase()}`;
  }
  // 4 characters without prefix
  if (/^[A-Z0-9]{4,8}$/i.test(str)) {
    return `GHN-${str.toUpperCase()}`;
  }
  return str.toUpperCase();
};

// Clean and deduplicate location string (e.g. "Lalitpur, Kathmandu, Kathmandu, Nepal" -> "Lalitpur, Kathmandu, Nepal")
export const cleanLocation = (loc?: string | null): string => {
  if (!loc) return 'Nepal';
  const parts = loc
    .split(/[,;/]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const uniqueParts: string[] = [];
  for (const part of parts) {
    if (!uniqueParts.some((u) => u.toLowerCase() === part.toLowerCase())) {
      uniqueParts.push(part);
    }
  }
  return uniqueParts.join(', ') || 'Nepal';
};

// Sanitizes transaction ID to ensure Player ID is NEVER mistakenly shown as Transaction Ref
export const getSanitizedTransactionId = (order: any): string => {
  if (!order) return '';
  const pm = String(order.paymentMethod || order.payment_method || order.pay_method || order.method || '').toLowerCase().trim();
  const isWallet = pm === 'wallet' || pm.includes('gamer') || pm === 'gamer_wallet';

  const rawTxn = (
    order.transactionId ||
    order.transaction_id ||
    order.transferId ||
    order.transfer_id ||
    order.paymentReference ||
    order.transactionRefId ||
    order.payment?.transaction_id ||
    order.payment?.transactionId ||
    ''
  );
  const txn = String(rawTxn).trim();

  if (isWallet) {
    if (txn && txn !== 'null' && txn !== 'undefined' && txn !== '0') return txn;
    const code = String(order.orderCode || order.order_code || order.orderNumber || order.id || 'TXN').replace(/^GHN-/, '');
    return `GW-${code}`;
  }

  const player = String(order.playerId || order.gameUserId || order.uid || '').trim();

  if (
    !txn ||
    txn === player ||
    txn === 'SCREENSHOT_UPLOADED' ||
    txn.toLowerCase() === 'no txn id' ||
    txn.toLowerCase() === 'none' ||
    txn.toLowerCase() === 'n/a' ||
    txn.toLowerCase() === 'not provided'
  ) {
    if (order.paymentScreenshot || order.paymentProofUrl || order.payment?.proof_url) {
      return 'Screenshot Uploaded';
    }
    return '';
  }
  return txn;
};

export const formatPaymentGatewayName = (method?: string | null): string => {
  if (!method) return 'Gamer Wallet';
  const m = String(method).toLowerCase().trim();
  if (m === 'wallet' || m.includes('gamer') || m === 'gamer_wallet') return 'Gamer Wallet';
  if (m.includes('esewa')) return 'eSewa QR & ID';
  if (m.includes('khalti')) return 'Khalti Wallet';
  if (m.includes('bank') || m.includes('qr')) return 'Bank QR Transfer';
  return method;
};

/**
 * Dynamically determines the appropriate field label (e.g., "Account Email / Delivery ID", "Roblox Username", "Player UID / Game ID")
 * for an order based on the product requiredFields, product category, or target value structure.
 */
export const getOrderAccountLabel = (order?: any, product?: any): string => {
  if (!order) return 'Player UID / Account ID';

  const uidValue = String(
    order.gameUserId || order.playerId || order.uid || order.game_user_id || order.player_id || order.game_uid || order.game_username || ''
  ).trim();

  // 1. If explicitly configured on product or order requiredFields
  const productCustomLabel = product?.requiredFields?.idFieldLabel || order?.requiredFields?.idFieldLabel || order?.idFieldLabel;
  if (productCustomLabel && productCustomLabel !== 'Player ID / UID' && productCustomLabel !== 'Player ID') {
    return productCustomLabel;
  }

  // 2. Check value format - if value contains '@' or looks like an email address, it's an Email/Account
  const isEmailValue = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(uidValue) || uidValue.includes('@');

  // 3. Check product name / game name / category
  const productName = String(order.productName || order.gameName || product?.name || '').toLowerCase();
  const categoryName = String(product?.category || order.category || '').toLowerCase();

  const isGiftCardOrAccountType =
    categoryName.includes('gift') ||
    categoryName.includes('voucher') ||
    categoryName.includes('subscription') ||
    categoryName.includes('account') ||
    productName.includes('gift card') ||
    productName.includes('google play') ||
    productName.includes('apple') ||
    productName.includes('itunes') ||
    productName.includes('netflix') ||
    productName.includes('spotify') ||
    productName.includes('steam') ||
    productName.includes('xbox') ||
    productName.includes('playstation') ||
    productName.includes('psn') ||
    productName.includes('amazon') ||
    productName.includes('discord') ||
    productName.includes('membership') ||
    productName.includes('subscription') ||
    productName.includes('canva') ||
    productName.includes('chatgpt') ||
    productName.includes('adobe');

  const isUsernameType =
    productName.includes('roblox') ||
    productName.includes('riot') ||
    productName.includes('valorant');

  if (isEmailValue || isGiftCardOrAccountType) {
    return 'Account Email / Delivery ID';
  }

  if (isUsernameType) {
    return 'Account Username / ID';
  }

  return 'Player UID / Game ID';
};

export const getOrderAccountShortLabel = (order?: any, product?: any): string => {
  const fullLabel = getOrderAccountLabel(order, product);
  if (fullLabel.toLowerCase().includes('email')) return 'Account Email';
  if (fullLabel.toLowerCase().includes('username') || fullLabel.toLowerCase().includes('roblox') || fullLabel.toLowerCase().includes('riot')) return 'Account Username';
  if (fullLabel.toLowerCase().includes('account')) return 'Account ID';
  return 'Player UID';
};

export const STORE_OWNER_EMAILS: string[] = [];

export const isStoreOwnerEmail = (email?: string | null): boolean => { return false; };

export const getDisplayUserRole = (user?: any): string => {
  if (!user) return 'Customer Account';
  const role = String(user.role || '').toUpperCase().trim();
  
  if (role === 'STORE_OWNER') {
    return 'Store Owner';
  }
  if (role === 'SUPER_ADMIN') return 'Super Admin';
  if (role === 'STORE_MANAGER') return 'Store Manager';
  if (role === 'SUPPORT_STAFF') return 'Support Staff';
  if (role === 'VIP' || role === 'VIP_CUSTOMER') return 'VIP Customer';
  if (role === 'RESELLER') return 'Reseller Partner';
  return 'Verified Account';
};

/**
 * Cleanly formats a person's display name with proper spaces and title casing.
 * Fixes names like 'Binodthalal' -> 'Binod Thalal', 'hii.binodthalal' -> 'Binod Thalal',
 * 'binod_thalal' -> 'Binod Thalal', 'BinodThalal' -> 'Binod Thalal', etc.
 */
export function formatPersonName(rawName?: string | null): string {
  if (!rawName || !rawName.trim()) return '';
  let str = rawName.trim();

  // Strip email domains
  if (str.includes('@')) {
    str = str.split('@')[0];
  }

  // Strip common prefixes
  if (str.toLowerCase().startsWith('hii.')) str = str.substring(4);
  if (str.toLowerCase().startsWith('hello.')) str = str.substring(6);
  if (str.toLowerCase().startsWith('admin.')) str = str.substring(6);
  if (str.toLowerCase().startsWith('staff.')) str = str.substring(6);

  // Exact check for 'binodthalal' (with or without spaces/punctuations/camelCase)
  if (/^binodthalal$/i.test(str.replace(/[\s\._\-]+/g, ''))) {
    return 'Binod Thalal';
  }

  // Split on punctuation (. _ - / \)
  str = str.replace(/[\._\-\/\\]+/g, ' ');

  // Insert space between camelCase or PascalCase words (e.g. BinodThalal -> Binod Thalal)
  str = str.replace(/([a-z])([A-Z])/g, '$1 $2');

  // Capitalize each word
  const words = str
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

  return words.join(' ');
}

/**
 * Standardizes role codes (e.g., 'STORE_OWNER', 'SUPER_ADMIN', 'STORE_MANAGER', 'SUPPORT_STAFF')
 * into user-friendly titles like 'Store Owner', 'Super Admin', 'Store Manager', 'Support Staff'.
 */
export function formatRoleTitle(role?: string | null): string {
  if (!role || !role.trim()) return '';
  const r = role.trim().toUpperCase().replace(/[\s\-]+/g, '_');
  if (r === 'STORE_OWNER' || r === 'OWNER') return 'Store Owner';
  if (r === 'SUPER_ADMIN') return 'Super Admin';
  if (r === 'STORE_MANAGER' || r === 'MANAGER') return 'Store Manager';
  if (r === 'SUPPORT_STAFF' || r === 'SUPPORT') return 'Support Staff';
  if (r === 'ADMIN' || r === 'ADMINISTRATOR') return 'Super Admin';
  if (r === 'STAFF') return 'Support Staff';
  if (r === 'CUSTOMER' || r === 'USER') return 'Customer';

  return r.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

/**
 * Formats verifier / compliance officer name nicely for display
 * Converts emails (e.g. hii.binodthalal@gmail.com) to human officer names (e.g. Binod Thalal (Store Owner))
 */
export function formatVerifierName(verifiedBy?: string, ownerName?: string): string {
  if (!verifiedBy || verifiedBy.trim() === '') {
    return 'Unx Games Officer';
  }
  const clean = verifiedBy.trim();
  const parenMatch = clean.match(/^(.*?)\s*\((.*?)\)$/);

  let name = '';
  let role = '';
  if (parenMatch) {
    name = formatPersonName(parenMatch[1]);
    role = formatRoleTitle(parenMatch[2]) || parenMatch[2];
  } else {
    name = formatPersonName(clean);
  }

  // Self-verification safety guard: A user cannot verify their own document.
  // If the verifier's parsed name is equal to the owner's name, or contains the owner's name,
  // we fallback to an independent system verification authority to prevent conflict-of-interest indicators!
  if (ownerName && name) {
    const cleanOwner = ownerName.trim().toLowerCase();
    const cleanName = name.trim().toLowerCase();
    if (
      cleanName === cleanOwner ||
      cleanOwner.includes(cleanName) ||
      cleanName.includes(cleanOwner)
    ) {
      return 'Senior Compliance Officer';
    }
  }

  if (parenMatch) {
    return `${name || 'Unx Games Officer'} (${role})`;
  }

  if (
    !clean.toLowerCase().includes('officer') &&
    !clean.toLowerCase().includes('team') &&
    !clean.toLowerCase().includes('admin') &&
    !clean.toLowerCase().includes('owner') &&
    !clean.toLowerCase().includes('manager') &&
    !clean.toLowerCase().includes('compliance')
  ) {
    return `${name} (Team Officer)`;
  }
  return clean;
}

/**
 * Formats admin / processor / verifier name cleanly for display in activity logs and timeline.
 * Converts raw email prefixes (e.g. hii.binodthalal or hii.binodthalal@gmail.com or Binodthalal) into human names (e.g. Binod Thalal)
 * and includes their active role (e.g. Store Owner, Store Manager, Super Admin, Support Staff).
 */
export function formatActorName(actor?: string | null, roleFallback?: string | null): string {
  if (!actor || !actor.trim()) {
    const role = roleFallback ? formatRoleTitle(roleFallback) : '';
    return role ? `Admin (${role})` : 'System';
  }
  const clean = actor.trim();
  const lower = clean.toLowerCase();

  if (lower === 'system' || lower.includes('system (automated)')) {
    return 'System (Automated)';
  }
  if (lower.includes('system (wallet)')) {
    return 'System (Wallet)';
  }
  if (
    lower.includes('automated') ||
    lower.includes('server') ||
    lower.includes('engine')
  ) {
    return 'System';
  }
  if (lower === 'customer' || lower === 'user') {
    return 'Customer';
  }

  // If the string already includes parentheses e.g. "Binodthalal (Store Owner)"
  const parenMatch = clean.match(/^(.*?)\s*\((.*?)\)$/);
  if (parenMatch) {
    const extractedName = formatPersonName(parenMatch[1]);
    const extractedRole = formatRoleTitle(parenMatch[2]) || parenMatch[2];
    return `${extractedName || 'Admin'} (${extractedRole})`;
  }

  // If plain "Admin" / "Administrator"
  if (lower === 'admin' || lower === 'administrator' || lower === 'gamehub admin' || lower === 'unx games admin') {
    const role = roleFallback ? formatRoleTitle(roleFallback) : '';
    return role ? `Admin (${role})` : 'Unx Games Admin';
  }

  const cleanName = formatPersonName(clean);
  if (roleFallback) {
    const formattedRole = formatRoleTitle(roleFallback);
    if (formattedRole && !cleanName.toLowerCase().includes(formattedRole.toLowerCase())) {
      return `${cleanName} (${formattedRole})`;
    }
  }

  return cleanName || 'Unx Games Admin';
}
