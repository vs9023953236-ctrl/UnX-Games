import { Router, Response } from 'express';
import crypto from 'crypto';
import { db, pool } from '../src/db/index.js';
import { wallets, wallet_transactions, customers, orders, payments, order_status_history, notifications } from '../src/db/schema.js';
import { eq, desc, and, sql } from 'drizzle-orm';
import { AuthRequest, authenticateUser, requireAdmin, requireManager, requireSuperAdmin, requirePermission } from './auth.js';
import { createRateLimiter } from './rateLimiter.js';
import { RATE_LIMIT_CONFIG } from './rateLimitConfig.js';
import { emitGhnSyncEvent } from './syncEvents.js';
import { getSupabaseAdmin } from './supabaseClient.js';
import { rpcAdjustWallet, rpcSubmitWalletDeposit, rpcReviewWalletDeposit } from './rpcService.js';

export const walletRouter = Router();

const walletRateLimiter = createRateLimiter(RATE_LIMIT_CONFIG.WALLET_PAYMENT);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Resolves any customer identifier (UUID, legacy usr_ string, uid, or email)
 * to a valid PostgreSQL UUID customer ID. If not found in customers table,
 * automatically creates/syncs the customer so that foreign key and UUID type
 * constraints are always satisfied.
 */
export async function resolveCustomerUuid(rawId: string | undefined | null, email?: string | null): Promise<string> {
  if (!rawId) return '';
  const trimmedId = String(rawId).trim();

  // Fast Path: If rawId is already a valid UUID, return immediately
  if (UUID_REGEX.test(trimmedId)) {
    return trimmedId;
  }

  const cleanEmail = email ? String(email).trim().toLowerCase() : '';

  try {
    // 1. Check if user already exists in PostgreSQL customers table by id, uid, supabase_auth_user_id, or email
    const query = `
      SELECT id FROM customers 
      WHERE id::text = $1 OR uid = $1 OR supabase_auth_user_id = $1 OR ($2 != '' AND LOWER(email) = $2)
      LIMIT 1
    `;
    const res = await pool.query(query, [trimmedId, cleanEmail]);
    if (res.rows.length > 0 && res.rows[0]?.id && UUID_REGEX.test(res.rows[0].id)) {
      return res.rows[0].id;
    }

    // 2. Check customers table
    const uQuery = `
      SELECT id FROM customers
      WHERE id::text = $1 OR supabase_auth_user_id = $1 OR ($2 != '' AND LOWER(email) = $2)
      LIMIT 1
    `;
    const uRes = await pool.query(uQuery, [trimmedId, cleanEmail]);
    if (uRes.rows.length > 0 && uRes.rows[0]?.id && UUID_REGEX.test(uRes.rows[0].id)) {
      return uRes.rows[0].id;
    }

    // 3. Fallback: if trimmedId is already a valid UUID and not found in DB under a different primary key, return it
    if (UUID_REGEX.test(trimmedId)) {
      return trimmedId;
    }

    // 2. Check fallback user store in JSON / memory
    const fbUser: any = null;
    const targetEmail = cleanEmail || (fbUser?.email ? String(fbUser.email).trim().toLowerCase() : '');

    if (targetEmail) {
      const byEmail = await pool.query('SELECT id FROM customers WHERE LOWER(email) = $1 LIMIT 1', [targetEmail]);
      if (byEmail.rows.length > 0 && byEmail.rows[0]?.id && UUID_REGEX.test(byEmail.rows[0].id)) {
        return byEmail.rows[0].id;
      }
    }

    // 3. Create customer record in PostgreSQL with a deterministic or random UUID
    const newUuid = crypto.randomUUID();
    const userEmail = targetEmail || `${trimmedId.replace(/[^a-zA-Z0-9]/g, '')}@placeholder.gamehub.np`;
    const fullName = fbUser?.full_name || fbUser?.name || 'Customer';
    const mobile = fbUser?.mobile || fbUser?.phone || null;
    const username = fbUser?.username || userEmail.split('@')[0];
    const role = fbUser?.role || 'CUSTOMER';

    await pool.query(`
      INSERT INTO customers (
        id, uid, supabase_auth_user_id, email, full_name, mobile, username, role, status, email_verified, mobile_verified, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE', true, false, NOW(), NOW()
      )
      ON CONFLICT (email) DO UPDATE SET uid = EXCLUDED.uid, updated_at = NOW()
    `, [newUuid, trimmedId, trimmedId, userEmail, fullName, mobile, username, role]);

    const finalCheck = await pool.query('SELECT id FROM customers WHERE LOWER(email) = $1 LIMIT 1', [userEmail]);
    if (finalCheck.rows.length > 0 && finalCheck.rows[0]?.id && UUID_REGEX.test(finalCheck.rows[0].id)) {
      return finalCheck.rows[0].id;
    }
  } catch (err: any) {
    console.warn('⚠️ [WALLET] resolveCustomerUuid notice:', err?.message || err);
  }

  return trimmedId;
}

// Helper: Format canonical gamer wallet code
export function formatWalletCode(customerId?: string, mobile?: string): string {
  const prefix = (customerId || '0000').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || '0000';
  const cleanMobile = (mobile || '').replace(/\D/g, '');
  const suffix = cleanMobile.length >= 4 ? cleanMobile.slice(-4) : '4027';
  return `GHN-${prefix}-${suffix}-WLT`;
}

// Helper: Get or create customer wallet
export async function getOrCreateCustomerWallet(rawCustomerId: string, userEmail?: string) {
  if (!rawCustomerId) return null;

  const customerId = await resolveCustomerUuid(rawCustomerId, userEmail);

  // If customerId is still not a valid UUID (e.g. total DB disconnect), return safe in-memory wallet
  if (!UUID_REGEX.test(customerId)) {
    return {
      id: crypto.randomUUID(),
      customer_id: customerId,
      balance: '0.00',
      currency: 'NPR',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  try {
    const wRes = await pool.query(`
      SELECT * FROM wallets 
      WHERE customer_id::text = $1 OR customer_id::text = $2 
      LIMIT 1
    `, [customerId, rawCustomerId]);
    if (wRes.rows.length > 0) {
      return wRes.rows[0];
    }

    // Create new wallet with 0.00 NPR
    const newWltId = crypto.randomUUID();
    const [newWallet] = await db.insert(wallets).values({
      id: newWltId,
      customer_id: customerId,
      balance: '0.00',
      currency: 'NPR',
      status: 'ACTIVE',
    }).returning();

    if (newWallet) {
      return newWallet;
    }

    const [reselected] = await db.select().from(wallets).where(eq(wallets.customer_id, customerId)).limit(1);
    if (reselected) {
      return reselected;
    }

    return {
      id: newWltId,
      customer_id: customerId,
      balance: '0.00',
      currency: 'NPR',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (err: any) {
    console.warn('getOrCreateCustomerWallet insert note:', err?.message || err);
    try {
      if (UUID_REGEX.test(customerId)) {
        const [fallback] = await db.select().from(wallets).where(eq(wallets.customer_id, customerId)).limit(1);
        if (fallback) {
          return fallback;
        }
      }
    } catch (_) {}

    return {
      id: crypto.randomUUID(),
      customer_id: customerId,
      balance: '0.00',
      currency: 'NPR',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

// 1. GET /api/wallet/my-wallet
walletRouter.get('/my-wallet', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const rawUserId = user?.id || user?.uid || (user as any)?.customer_id || req.adminUser?.customer_id || req.adminUser?.id;
    if (!user || !rawUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const userId = await resolveCustomerUuid(rawUserId, user?.email);
    const wallet = await getOrCreateCustomerWallet(userId, user?.email);
    if (!wallet) {
      return res.status(500).json({ success: false, message: 'Failed to retrieve or create wallet' });
    }

    let transactions: any[] = [];
    if (userId && UUID_REGEX.test(userId)) {
      try {
        transactions = await db.select()
          .from(wallet_transactions)
          .where(eq(wallet_transactions.customer_id, userId))
          .orderBy(desc(wallet_transactions.createdAt))
          .limit(50);
      } catch (txErr: any) {
        console.warn('Wallet transactions query notice:', txErr?.message || txErr);
        transactions = [];
      }
    }

    // Look up customer phone for canonical wallet code
    let customerMobile = user?.mobile || (user as any)?.phone;
    if (!customerMobile && userId && UUID_REGEX.test(userId)) {
      try {
        const [cRow] = await db.select().from(customers).where(eq(customers.id, userId)).limit(1);
        if (cRow && cRow.mobile) customerMobile = cRow.mobile;
      } catch (_) {}
    }
    const walletPassCode = formatWalletCode(userId, customerMobile);

    return res.json({
      success: true,
      wallet: {
        id: wallet.id,
        walletCode: walletPassCode,
        code: walletPassCode,
        customerId: wallet.customer_id,
        balance: Number(wallet.balance) || 0,
        currency: wallet.currency || 'NPR',
        status: wallet.status || 'ACTIVE',
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt,
      },
      transactions: (transactions || []).map(t => ({
        id: t.id,
        walletId: t.wallet_id,
        type: t.type,
        amount: Number(t.amount) || 0,
        balanceBefore: Number(t.balance_before) || 0,
        balanceAfter: Number(t.balance_after) || 0,
        status: t.status,
        paymentMethod: t.payment_method,
        reference: t.reference,
        description: t.description,
        orderId: t.order_id,
        adminVerified: t.admin_verified,
        adminNotes: t.admin_notes,
        createdAt: t.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Failed to get my-wallet:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Failed to load wallet' });
  }
});

// 2. POST /api/wallet/deposit
walletRouter.post('/deposit', authenticateUser, walletRateLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { amount, paymentMethod, reference, proofUrl } = req.body;
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount < 10) {
      return res.status(400).json({ success: false, message: 'Minimum deposit amount is Rs. 10' });
    }

    if (!paymentMethod || !reference) {
      return res.status(400).json({ success: false, message: 'Payment method and Reference ID are required' });
    }

    const customerId = await resolveCustomerUuid(user.id, user.email);

    // Call Canonical Supabase RPC layer
    const rpcRes = await rpcSubmitWalletDeposit({
      customerId,
      amount: numAmount,
      paymentMethod,
      reference,
      proofUrl,
    });

    if (!rpcRes.success) {
      return res.status(400).json({ success: false, message: rpcRes.message || 'Deposit submission failed' });
    }

    const tx = rpcRes.data;

    // Create confirmation notification for customer
    try {
      await db.insert(notifications).values({
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        customer_id: customerId,
        recipient_uid: user.uid || customerId,
        title: 'Deposit Request Submitted',
        message: `Your deposit request of Rs. ${numAmount} via ${paymentMethod} (Ref: ${reference}) has been received and is pending admin verification.`,
        type: 'WALLET_DEPOSIT',
        read: false,
      });

      // Create admin notification
      await db.insert(notifications).values({
        id: `notif_admin_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        customer_id: customerId,
        recipient_uid: 'admin',
        title: `Wallet Deposit Request: Rs. ${numAmount} 💳`,
        message: `${user.full_name || user.email || 'Customer'} submitted deposit request of Rs. ${numAmount} via ${paymentMethod} (Ref: ${reference}).`,
        type: 'WALLET_DEPOSIT',
        read: false,
      });
    } catch (nErr) {
      console.warn('Notification insert note:', nErr);
    }

    emitGhnSyncEvent({
      eventType: 'wallet.updated',
      entityType: 'wallets',
      entityId: tx?.walletId || customerId,
      userId: customerId,
      safeMetadata: { type: 'DEPOSIT_REQUEST', amount: numAmount }
    }).catch(() => {});

    return res.json({
      success: true,
      message: 'Deposit request submitted successfully! An admin will verify your payment shortly.',
      transaction: tx,
    });
  } catch (error: any) {
    console.error('Wallet deposit error:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Deposit submission failed' });
  }
});

// 3. POST /api/wallet/pay-order (Atomic wallet purchase transaction)
walletRouter.post('/pay-order', authenticateUser, walletRateLimiter, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const user = req.user;
    if (!user || !user.id) {
      client.release();
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { orderId } = req.body;
    if (!orderId) {
      client.release();
      return res.status(400).json({ success: false, message: 'Order ID is required' });
    }

    const customerId = await resolveCustomerUuid(user.id, user.email);

    await client.query('BEGIN');

    // 1. Fetch and lock order
    const orderRes = await client.query(
      'SELECT * FROM orders WHERE id = $1 OR order_code = $1 OR order_number = $1 FOR UPDATE',
      [orderId]
    );
    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    const order = orderRes.rows[0];

    // Ensure user owns order or is admin
    const orderMatchesUser = order.customer_id === customerId || order.customer_id === user.id || (user.uid && order.customer_id === user.uid);
    if (!orderMatchesUser && user.role !== 'admin' && user.role !== 'ADMIN') {
      await client.query('ROLLBACK');
      client.release();
      return res.status(403).json({ success: false, message: 'You do not have permission to pay for this order' });
    }

    if (order.payment_status === 'paid' || order.payment_status === 'payment_verified') {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({ success: false, message: 'This order has already been paid for' });
    }

    const orderAmount = parseFloat(order.total_amount);
    if (isNaN(orderAmount) || orderAmount <= 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({ success: false, message: 'Invalid order amount' });
    }

    // 2. Adjust wallet using Canonical Supabase RPC procedure
    const rpcRes = await rpcAdjustWallet({
      customerId,
      amount: orderAmount,
      type: 'PURCHASE',
      reference: `ORDER-${order.order_code || order.order_number || order.id}`,
      description: `Payment for Order #${order.order_code || order.order_number || order.id}`,
      orderId: order.id,
    });

    if (!rpcRes.success) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({ success: false, message: rpcRes.message || 'Wallet payment failed' });
    }

    const newBalance = rpcRes.data?.balanceAfter ?? 0;

    // 3. Update order status
    await client.query(`
      UPDATE orders 
      SET payment_status = 'paid',
          order_status = 'processing',
          payment_id = $1,
          updated_at = now()
      WHERE id = $2
    `, [`pay_wallet_${Date.now()}`, order.id]);

    // 4. Create payment record
    const paymentRecordId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await client.query(`
      INSERT INTO payments (
        id, order_id, customer_id, method, amount, currency,
        transaction_id, payment_status, customer_note, verified_at, verified_by
      ) VALUES ($1, $2, $3, 'wallet', $4, 'NPR', $5, 'verified', 'Paid via Unx Games Wallet', now(), 'SYSTEM_WALLET')
    `, [
      paymentRecordId,
      order.id,
      customerId,
      orderAmount.toFixed(2),
      `WTX-${order.order_code || order.order_number || order.id}`
    ]);

    // 5. Add order status history
    await client.query(`
      INSERT INTO order_status_history (
        id, order_id, old_status, new_status, changed_by, note
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      `osh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      order.id,
      order.order_status,
      'processing',
      user.full_name || 'Customer',
      'Paid instantly using Unx Games Wallet balance'
    ]);

    // 6. Notification
    await client.query(`
      INSERT INTO notifications (
        id, customer_id, recipient_uid, title, message, type, read
      ) VALUES ($1, $2, $3, $4, $5, $6, false)
    `, [
      `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      customerId,
      user.uid || customerId,
      'Order Paid via Wallet',
      `Order #${order.order_code || order.order_number || order.id} has been paid successfully using Rs. ${orderAmount.toFixed(2)} from your wallet. It is now being processed!`,
      'ORDER_UPDATE'
    ]);

    await client.query('COMMIT');
    client.release();

    emitGhnSyncEvent({
      eventType: 'wallet.updated',
      entityType: 'wallets',
      entityId: rpcRes.data?.walletId || customerId,
      userId: customerId,
      safeMetadata: { type: 'ORDER_PAYMENT', orderId: order.id, amount: orderAmount }
    }).catch(() => {});
    emitGhnSyncEvent({
      eventType: 'order.status_changed',
      entityType: 'orders',
      entityId: order.id,
      userId: customerId,
      safeMetadata: { paymentStatus: 'paid', orderStatus: 'processing' }
    }).catch(() => {});

    return res.json({
      success: true,
      message: 'Order paid successfully using your wallet balance!',
      newBalance: Number(newBalance.toFixed(2)),
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    client.release();
    console.error('Wallet order payment error:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Payment failed' });
  }
});

// 4. GET /api/admin/wallets (All customer wallets for admin)
walletRouter.get('/admin/list', requirePermission('wallet.view'), async (_req: AuthRequest, res: Response) => {
  try {
    const query = `
      SELECT 
        COALESCE(w.id::text, 'wlt_' || c.id::text) as wallet_id,
        c.id as customer_id,
        COALESCE(w.balance, 0.00) as balance,
        COALESCE(w.currency, 'NPR') as currency,
        COALESCE(w.status, 'ACTIVE') as wallet_status,
        COALESCE(w.created_at, c.created_at) as wallet_created_at,
        COALESCE(w.updated_at, c.created_at) as wallet_updated_at,
        c.full_name,
        c.email,
        c.mobile,
        c.gamer_id,
        c.status as customer_status
      FROM customers c
      LEFT JOIN wallets w ON c.id::text = w.customer_id::text
      ORDER BY COALESCE(w.balance, 0) DESC, c.created_at DESC;
    `;
    const result = await pool.query(query);

    return res.json({
      success: true,
      wallets: result.rows.map(r => {
        const code = formatWalletCode(r.customer_id, r.mobile);
        return {
          id: r.wallet_id,
          walletCode: code,
          code: code,
          customerId: r.customer_id,
          customerName: r.full_name || 'Customer',
          customerEmail: r.email,
          customerPhone: r.mobile,
          gamerId: r.gamer_id,
          balance: parseFloat(r.balance) || 0,
          currency: r.currency || 'NPR',
          status: r.wallet_status,
          customerStatus: r.customer_status,
          createdAt: r.wallet_created_at,
          updatedAt: r.wallet_updated_at,
        };
      }),
    });
  } catch (error: any) {
    console.error('Admin get wallets error:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Failed to load wallets' });
  }
});

// 5. GET /api/admin/wallets/transactions (Admin transactions ledger)
walletRouter.get('/admin/transactions', requirePermission('wallet.transactions.view'), async (req: AuthRequest, res: Response) => {
  try {
    const { status, type, limit = 100 } = req.query;

    let query = `
      SELECT 
        wt.*,
        c.full_name as customer_name,
        c.email as customer_email,
        c.mobile as customer_mobile
      FROM wallet_transactions wt
      LEFT JOIN customers c ON wt.customer_id::text = c.id::text
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (status && status !== 'all') {
      params.push(String(status).toUpperCase());
      conditions.push(`wt.status = $${params.length}`);
    }

    if (type && type !== 'all') {
      params.push(String(type).toUpperCase());
      conditions.push(`wt.type = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    params.push(parseInt(String(limit), 10) || 100);
    query += ` ORDER BY wt.created_at DESC LIMIT $${params.length};`;

    const result = await pool.query(query, params);

    return res.json({
      success: true,
      transactions: result.rows.map(r => {
        const code = formatWalletCode(r.customer_id, r.customer_mobile);
        return {
          id: r.id,
          walletId: r.wallet_id,
          walletCode: code,
          customerId: r.customer_id,
          customerName: r.customer_name,
          customerEmail: r.customer_email,
          customerMobile: r.customer_mobile,
          type: r.type,
          amount: parseFloat(r.amount) || 0,
          balanceBefore: parseFloat(r.balance_before) || 0,
          balanceAfter: parseFloat(r.balance_after) || 0,
          status: r.status,
          paymentMethod: r.payment_method,
          reference: r.reference,
          description: r.description,
          orderId: r.order_id,
          adminVerified: r.admin_verified,
          adminVerifiedBy: r.admin_verified_by,
          adminNotes: r.admin_notes,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        };
      }),
    });
  } catch (error: any) {
    console.error('Admin get wallet transactions error:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Failed to load wallet transactions' });
  }
});

// 6. POST /api/admin/wallets/verify-deposit/:id (Admin approves/rejects deposit)
walletRouter.post('/admin/verify-deposit/:id', requirePermission('payments.verify'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body; // action: 'approve' | 'reject'
    const adminUser = req.user;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be approve or reject' });
    }

    const adminId = adminUser.email || adminUser.full_name || 'Admin';

    // 1. Call Canonical Supabase RPC procedure
    const rpcRes = await rpcReviewWalletDeposit({
      transactionId: id,
      action: action as 'approve' | 'reject',
      adminId,
      notes: notes || (action === 'approve' ? 'Verified by Admin' : 'Rejected by Admin')
    });

    if (!rpcRes.success) {
      return res.status(400).json({ success: false, message: rpcRes.message || 'Verification failed' });
    }

    // 2. Fetch transaction for notification and event emission
    const txRes = await pool.query('SELECT * FROM wallet_transactions WHERE id = $1 LIMIT 1', [id]);
    const tx = txRes.rows[0];
    const customerId = tx?.customer_id;
    const txAmount = parseFloat(tx?.amount || '0');
    const newBalance = rpcRes.data?.newBalance || 0;

    if (action === 'approve') {
      try {
        await pool.query(`
          INSERT INTO notifications (
            id, customer_id, recipient_uid, title, message, type, read, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, false, NOW())
        `, [
          `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          customerId,
          customerId,
          'Deposit Approved!',
          `Your deposit of Rs. ${txAmount.toFixed(2)} via ${tx?.payment_method || 'Payment'} has been verified! Your new wallet balance is Rs. ${Number(newBalance).toFixed(2)}.`,
          'WALLET_DEPOSIT'
        ]);
      } catch (_) {}

      emitGhnSyncEvent({
        eventType: 'wallet.updated',
        entityType: 'wallets',
        entityId: tx?.wallet_id || id,
        userId: customerId,
        safeMetadata: { type: 'DEPOSIT_APPROVED', amount: txAmount }
      }).catch(() => {});

      return res.json({
        success: true,
        message: `Deposit of Rs. ${txAmount.toFixed(2)} approved successfully!`,
        newBalance: Number(Number(newBalance).toFixed(2)),
      });
    } else {
      try {
        await pool.query(`
          INSERT INTO notifications (
            id, customer_id, recipient_uid, title, message, type, read, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, false, NOW())
        `, [
          `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          customerId,
          customerId,
          'Deposit Request Rejected',
          `Your deposit request of Rs. ${txAmount.toFixed(2)} could not be verified: ${notes || 'Invalid Reference ID'}. Please contact support.`,
          'WALLET_DEPOSIT'
        ]);
      } catch (_) {}

      emitGhnSyncEvent({
        eventType: 'wallet.updated',
        entityType: 'wallets',
        entityId: tx?.wallet_id || id,
        userId: customerId,
        safeMetadata: { type: 'DEPOSIT_REJECTED', amount: txAmount }
      }).catch(() => {});

      return res.json({
        success: true,
        message: `Deposit of Rs. ${txAmount.toFixed(2)} has been rejected.`,
      });
    }
  } catch (error: any) {
    console.error('Admin verify deposit error:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Verification failed' });
  }
});

// 7. POST /api/admin/wallets/adjust (Admin manual credit/debit adjustment)
walletRouter.post('/admin/adjust', requirePermission('wallet.adjust'), async (req: AuthRequest, res: Response) => {
  try {
    const { customerId, type, amount, reason } = req.body;
    const adminUser = req.user;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
    }

    if (!['CREDIT', 'DEBIT'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type must be CREDIT or DEBIT' });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Adjustment reason is required for audit trails' });
    }

    const targetCustomerId = await resolveCustomerUuid(customerId);
    const adminId = adminUser.email || adminUser.full_name || 'Admin';

    // 1. Call Canonical Supabase RPC procedure
    const rpcRes = await rpcAdjustWallet({
      customerId: targetCustomerId,
      amount: numAmount,
      type,
      reference: `ADJ-${Date.now().toString().slice(-6)}`,
      description: `Admin adjustment: ${reason}`,
      adminId
    });

    if (!rpcRes.success) {
      return res.status(400).json({ success: false, message: rpcRes.message || 'Adjustment failed' });
    }

    const newBalance = rpcRes.data?.balanceAfter ?? 0;

    // 2. Notification to user
    try {
      await pool.query(`
        INSERT INTO notifications (
          id, customer_id, recipient_uid, title, message, type, read, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, false, NOW())
      `, [
        `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        targetCustomerId,
        targetCustomerId,
        type === 'CREDIT' ? 'Wallet Credited' : 'Wallet Debited',
        `Your wallet has been ${type === 'CREDIT' ? 'credited with' : 'debited by'} Rs. ${numAmount.toFixed(2)} (${reason}). New balance: Rs. ${Number(newBalance).toFixed(2)}.`,
        'WALLET_ADJUSTMENT'
      ]);
    } catch (_) {}

    emitGhnSyncEvent({
      eventType: 'wallet.updated',
      entityType: 'wallets',
      entityId: rpcRes.data?.walletId || targetCustomerId,
      userId: targetCustomerId,
      safeMetadata: { type: `ADJUSTMENT_${type}`, amount: numAmount }
    }).catch(() => {});

    return res.json({
      success: true,
      message: `Wallet successfully ${type === 'CREDIT' ? 'credited' : 'debited'} by Rs. ${numAmount.toFixed(2)}`,
      newBalance: Number(Number(newBalance).toFixed(2)),
    });
  } catch (error: any) {
    console.error('Admin adjust wallet error:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Adjustment failed' });
  }
});
