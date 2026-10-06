import { pool, db } from '../src/db/index.js';
import { orders, payments, reviews, support_tickets, wallets, users } from '../src/db/schema.js';
import { sql, eq, desc, and, or, isNull } from 'drizzle-orm';
import { testR2Connection } from './r2.js';
import { autoReplyToReviewIfEnabled, generateAiReviewReply } from './aiReviewReply.js';
import { generateCustomAiCompletion } from './aiOpenRouter.js';

export interface SentinelIssue {
  id: string;
  category: 'ORDERS' | 'PAYMENTS' | 'REVIEWS' | 'SUPPORT' | 'WALLET' | 'INFRASTRUCTURE' | 'SECURITY';
  severity: 'CRITICAL' | 'WARNING' | 'OPTIMIZATION' | 'HEALTHY';
  title: string;
  description: string;
  affectedCount?: number;
  data?: any;
  recommendedAction: string;
  canAutoFix: boolean;
}

export interface SentinelScanResult {
  timestamp: string;
  healthScore: number;
  overallStatus: 'OPTIMAL' | 'GOOD' | 'ATTENTION_NEEDED' | 'CRITICAL';
  executiveSummary: string;
  totalIssuesCount: number;
  criticalCount: number;
  warningCount: number;
  optimizationCount: number;
  issues: SentinelIssue[];
  metrics: {
    dbLatencyMs: number;
    r2Status: string;
    totalOrdersToday: number;
    pendingOrdersCount: number;
    stuckOrdersCount: number;
    unrepliedReviewsCount: number;
    openTicketsCount: number;
    unverifiedPaymentsCount: number;
  };
}

let sentinelCache: { data: SentinelScanResult; expiresAt: number } | null = null;

export function invalidateSentinelCache() {
  sentinelCache = null;
}

/**
 * Executes a full-spectrum deep diagnostic scan across the Unx Games ecosystem
 */
export async function runSystemSentinelScan(forceFresh = false): Promise<SentinelScanResult> {
  const nowTime = Date.now();
  if (!forceFresh && sentinelCache && sentinelCache.expiresAt > nowTime) {
    return sentinelCache.data;
  }

  const startScanTime = Date.now();
  const issues: SentinelIssue[] = [];

  // Metrics collectors
  let dbLatencyMs = 0;
  let r2Status = 'CONNECTED';
  let totalOrdersToday = 0;
  let pendingOrdersCount = 0;
  let stuckOrdersCount = 0;
  let unrepliedReviewsCount = 0;
  let openTicketsCount = 0;
  let unverifiedPaymentsCount = 0;

  // 1. DATABASE LATENCY & CONNECTIVITY CHECK
  const startDbPing = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    dbLatencyMs = Date.now() - startDbPing;
    if (dbLatencyMs > 600) {
      issues.push({
        id: 'db_high_latency',
        category: 'INFRASTRUCTURE',
        severity: 'WARNING',
        title: 'High Database Query Latency',
        description: `PostgreSQL response time is currently ${dbLatencyMs}ms (threshold is 600ms).`,
        recommendedAction: 'Monitor Supabase connection pooler or check for long-running unindexed queries.',
        canAutoFix: false,
      });
    }
  } catch (err: any) {
    dbLatencyMs = Date.now() - startDbPing;
    issues.push({
      id: 'db_connection_error',
      category: 'INFRASTRUCTURE',
      severity: 'CRITICAL',
      title: 'Database Connection Exception',
      description: `Failed to query PostgreSQL: ${err.message}`,
      recommendedAction: 'Verify SUPABASE_DATABASE_URL and Supabase pooler availability.',
      canAutoFix: false,
    });
  }

  // 2. R2 OBJECT STORAGE CHECK
  try {
    const r2Res = await testR2Connection();
    if (!r2Res.success && r2Res.status !== 'not_configured') {
      r2Status = 'DEGRADED';
      issues.push({
        id: 'r2_storage_degraded',
        category: 'INFRASTRUCTURE',
        severity: 'WARNING',
        title: 'Cloudflare R2 Bucket Health Notice',
        description: r2Res.message || 'R2 connection test reported non-optimal response.',
        recommendedAction: 'Inspect R2 API credentials, endpoint configuration, and bucket permissions.',
        canAutoFix: false,
      });
    } else if (r2Res.status === 'not_configured') {
      r2Status = 'NOT_CONFIGURED';
    }
  } catch (err: any) {
    r2Status = 'ERROR';
    issues.push({
      id: 'r2_storage_error',
      category: 'INFRASTRUCTURE',
      severity: 'WARNING',
      title: 'Cloudflare R2 Access Error',
      description: err.message,
      recommendedAction: 'Verify R2 secrets in Settings > Secrets.',
      canAutoFix: false,
    });
  }

  // 3. ORDERS WATCHDOG: STUCK & PENDING ORDERS SCAN
  try {
    const now = new Date();
    const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Total orders today
    const todayOrdersRes = await pool.query(
      `SELECT COUNT(*) FROM orders WHERE created_at >= $1`,
      [startOfToday]
    );
    totalOrdersToday = parseInt(todayOrdersRes.rows[0]?.count || '0', 10);

    // Pending payment verification orders (only orders where payment was submitted or in verification/processing)
    const pendingOrdersRes = await pool.query(
      `SELECT id, order_code, order_status, total_amount, created_at, customer_id, customer_email_snapshot, payment_status
       FROM orders
       WHERE order_status IN ('payment_verification', 'processing')
          OR payment_status IN ('pending_verification', 'submitted', 'payment_verification')
       ORDER BY created_at ASC
       LIMIT 50`
    );
    pendingOrdersCount = pendingOrdersRes.rows.length;

    // Check for orders stuck for > 15 minutes
    const stuckOrders = pendingOrdersRes.rows.filter((o: any) => new Date(o.created_at) < fifteenMinsAgo);
    stuckOrdersCount = stuckOrders.length;

    if (stuckOrdersCount > 0) {
      // Calculate exact age of oldest stuck order
      const oldestOrder = stuckOrders[0];
      let oldestAgeText = '15+ mins';
      if (oldestOrder && oldestOrder.created_at) {
        const oldestAgeMs = Math.max(0, now.getTime() - new Date(oldestOrder.created_at).getTime());
        const totalMins = Math.floor(oldestAgeMs / 60000);
        const hours = Math.floor(totalMins / 60);
        const mins = totalMins % 60;
        if (hours > 0) {
          oldestAgeText = `${hours}h ${mins}m`;
        } else {
          oldestAgeText = `${mins} mins`;
        }
      }

      const orderLabel = stuckOrdersCount === 1 ? '1 Order' : `${stuckOrdersCount} Orders`;

      issues.push({
        id: 'orders_stuck_in_queue',
        category: 'ORDERS',
        severity: stuckOrdersCount >= 5 ? 'CRITICAL' : 'WARNING',
        title: `${orderLabel} Awaiting Verification (${oldestAgeText} elapsed)`,
        description: stuckOrdersCount === 1
          ? `Identified 1 customer order in verification state awaiting admin confirmation for over ${oldestAgeText}.`
          : `Identified ${stuckOrdersCount} customer orders in verification state for over 15 minutes (oldest pending for ${oldestAgeText}).`,
        affectedCount: stuckOrdersCount,
        data: stuckOrders.map((o: any) => ({
          id: o.id,
          orderCode: o.order_code,
          status: o.order_status,
          game: 'In-Game Package',
          amount: o.total_amount,
          createdAt: o.created_at,
        })),
        recommendedAction: 'Navigate to Orders tab in Admin panel to verify payment receipts and deliver in-game packages.',
        canAutoFix: false,
      });
    }

    // Check for failed orders that might need review
    const failedOrdersRes = await pool.query(
      `SELECT COUNT(*) FROM orders WHERE order_status = 'failed' AND created_at >= $1`,
      [new Date(now.getTime() - 24 * 60 * 60 * 1000)]
    );
    const failedTodayCount = parseInt(failedOrdersRes.rows[0]?.count || '0', 10);
    if (failedTodayCount > 3) {
      issues.push({
        id: 'elevated_failed_orders',
        category: 'ORDERS',
        severity: 'WARNING',
        title: `Elevated Failed Orders Today (${failedTodayCount})`,
        description: `${failedTodayCount} orders ended with failed status in the last 24 hours.`,
        affectedCount: failedTodayCount,
        recommendedAction: 'Review order rejection logs and ensure payment QR / instructions are clear for customers.',
        canAutoFix: false,
      });
    }
  } catch (err: any) {
    console.warn('[Sentinel] Error scanning orders:', err);
  }

  // 4. PAYMENTS & TRANSACTION INTEGRITY
  try {
    const unverifiedPaymentsRes = await pool.query(
      `SELECT COUNT(*) FROM payments WHERE COALESCE(status, payment_status, 'pending') IN ('pending', 'verification_pending')`
    );
    unverifiedPaymentsCount = parseInt(unverifiedPaymentsRes.rows[0]?.count || '0', 10);
    if (unverifiedPaymentsCount > 0) {
      issues.push({
        id: 'unverified_payments',
        category: 'PAYMENTS',
        severity: unverifiedPaymentsCount > 10 ? 'CRITICAL' : 'WARNING',
        title: `${unverifiedPaymentsCount} Payments Pending Verification`,
        description: `There are ${unverifiedPaymentsCount} submitted customer payment transactions waiting for staff verification against eSewa/Khalti/Bank statements.`,
        affectedCount: unverifiedPaymentsCount,
        recommendedAction: 'Check Admin Payments tab to approve verified payment transaction receipts.',
        canAutoFix: false,
      });
    }
  } catch (err: any) {
    console.warn('[Sentinel] Error scanning payments:', err);
  }

  // 5. CUSTOMER REVIEWS & REPUTATION SENTINEL
  try {
    const unrepliedReviewsRes = await pool.query(
      `SELECT id, user_name, product_name, package_name, rating, comment, user_location, created_at, order_id
       FROM reviews
       WHERE (admin_reply IS NULL OR admin_reply = '')
       ORDER BY created_at DESC
       LIMIT 50`
    );
    unrepliedReviewsCount = unrepliedReviewsRes.rows.length;

    if (unrepliedReviewsCount > 0) {
      issues.push({
        id: 'unreplied_reviews',
        category: 'REVIEWS',
        severity: 'OPTIMIZATION',
        title: `${unrepliedReviewsCount} Customer Reviews Without Official Reply`,
        description: `There are ${unrepliedReviewsCount} published customer reviews that have not received an official response yet.`,
        affectedCount: unrepliedReviewsCount,
        data: unrepliedReviewsRes.rows,
        recommendedAction: 'Trigger AI Auto-Reply to instantly publish personalized official responses to all pending customer reviews.',
        canAutoFix: true,
      });
    }

    // Critical low-star reviews (1-2 stars) without follow-up
    const lowRatingReviewsRes = await pool.query(
      `SELECT id, user_name, product_name, rating, comment, created_at, order_id
       FROM reviews
       WHERE rating <= 2 AND (admin_reply IS NULL OR admin_reply = '')
       LIMIT 10`
    );
    if (lowRatingReviewsRes.rows.length > 0) {
      issues.push({
        id: 'critical_low_star_reviews',
        category: 'REVIEWS',
        severity: 'WARNING',
        title: `${lowRatingReviewsRes.rows.length} Low-Rating Reviews (1-2 Stars) Require Attention`,
        description: 'Customer reviews with low star ratings require urgent support follow-up to protect store reputation.',
        affectedCount: lowRatingReviewsRes.rows.length,
        data: lowRatingReviewsRes.rows,
        recommendedAction: 'Reach out to dissatisfied customers via WhatsApp/Support and resolve order discrepancies.',
        canAutoFix: true,
      });
    }
  } catch (err: any) {
    console.warn('[Sentinel] Error scanning reviews:', err);
  }

  // 6. CUSTOMER SUPPORT TICKETS QUEUE
  try {
    const openTicketsRes = await pool.query(
      `SELECT st.id, st.customer_id, 
              COALESCE(st.customer_email, c.email, '') as customer_email, 
              st.subject, st.status, st.priority, st.created_at
       FROM support_tickets st
       LEFT JOIN customers c ON st.customer_id = c.id
       WHERE LOWER(COALESCE(st.status, 'open')) IN ('open', 'pending', 'in_progress')
       ORDER BY st.created_at ASC
       LIMIT 20`
    );
    openTicketsCount = openTicketsRes.rows.length;

    if (openTicketsCount > 0) {
      const highPriorityTickets = openTicketsRes.rows.filter((t: any) => t.priority === 'urgent' || t.priority === 'high');
      issues.push({
        id: 'open_support_tickets',
        category: 'SUPPORT',
        severity: highPriorityTickets.length > 0 ? 'WARNING' : 'OPTIMIZATION',
        title: `${openTicketsCount} Unresolved Support Inquiries`,
        description: `${openTicketsCount} customer inquiries are currently open (${highPriorityTickets.length} marked high/urgent).`,
        affectedCount: openTicketsCount,
        data: openTicketsRes.rows,
        recommendedAction: 'Open the Support Inquiries section in Admin Console to reply to pending gamer inquiries.',
        canAutoFix: false,
      });
    }
  } catch (err: any) {
    console.warn('[Sentinel] Error scanning support tickets:', err);
  }

  // 7. WALLET & USER INTEGRITY SCAN
  try {
    const negativeWalletsRes = await pool.query(
      `SELECT customer_id, balance FROM wallets WHERE balance < 0 LIMIT 5`
    );
    if (negativeWalletsRes.rows.length > 0) {
      issues.push({
        id: 'negative_wallet_balance',
        category: 'WALLET',
        severity: 'CRITICAL',
        title: 'Negative Gamer Wallet Balances Detected',
        description: `Found ${negativeWalletsRes.rows.length} user wallet(s) with balance below NPR 0.`,
        affectedCount: negativeWalletsRes.rows.length,
        recommendedAction: 'Review user transaction history and adjust wallet balances in Admin Users tab.',
        canAutoFix: false,
      });
    }
  } catch (err: any) {
    console.warn('[Sentinel] Error scanning wallets:', err);
  }

  // CALCULATE HEALTH SCORE (0 to 100)
  const criticalCount = issues.filter((i) => i.severity === 'CRITICAL').length;
  const warningCount = issues.filter((i) => i.severity === 'WARNING').length;
  const optimizationCount = issues.filter((i) => i.severity === 'OPTIMIZATION').length;

  let healthScore = 100;
  healthScore -= criticalCount * 20;
  healthScore -= warningCount * 8;
  healthScore -= optimizationCount * 3;
  healthScore = Math.max(0, Math.min(100, healthScore));

  let overallStatus: 'OPTIMAL' | 'GOOD' | 'ATTENTION_NEEDED' | 'CRITICAL' = 'OPTIMAL';
  if (healthScore < 60 || criticalCount > 0) {
    overallStatus = 'CRITICAL';
  } else if (healthScore < 85 || warningCount >= 2) {
    overallStatus = 'ATTENTION_NEEDED';
  } else if (healthScore < 95 || optimizationCount > 0) {
    overallStatus = 'GOOD';
  }

  // Generate Executive AI Summary using Custom AI (nvidia/nemotron-3-ultra-550b-a55b:free) or Gemini Cascade
  let executiveSummary = '';
  try {
    const prompt = `You are the Unx Games AI System Sentinel.
Provide a crisp, professional, 2-3 sentence executive assessment in ENGLISH ONLY for the store administrator based on the following real diagnostic scan:
- Health Score: ${healthScore}/100 (${overallStatus})
- Critical Issues: ${criticalCount}
- Warnings: ${warningCount}
- Optimizations: ${optimizationCount}
- Pending Orders: ${pendingOrdersCount} (${stuckOrdersCount} stuck > 15m)
- Unreplied Reviews: ${unrepliedReviewsCount}
- Open Support Tickets: ${openTicketsCount}
- Unverified Payments: ${unverifiedPaymentsCount}
- DB Latency: ${dbLatencyMs}ms

Give a direct operational status, highlight the #1 priority action, and confirm system stability in professional tone.`;

    const aiRes = await generateCustomAiCompletion({
      systemInstruction: 'You are the Unx Games AI System Sentinel providing executive system diagnostics in Nepal.',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    if (aiRes && aiRes.content) {
      executiveSummary = aiRes.content;
    }
  } catch (err: any) {
    console.warn('[Sentinel] AI summary generation fallback:', err?.message || err);
  }

  if (!executiveSummary) {
    if (overallStatus === 'OPTIMAL') {
      executiveSummary = `All core systems across Unx Games are operating at peak performance with a perfect ${healthScore}/100 score. Database response is crisp at ${dbLatencyMs}ms, and order fulfillment queues are clean.`;
    } else if (overallStatus === 'GOOD') {
      executiveSummary = `System operations are healthy at ${healthScore}/100. There are ${unrepliedReviewsCount} customer reviews awaiting reply and ${openTicketsCount} active support tickets.`;
    } else if (overallStatus === 'ATTENTION_NEEDED') {
      const orderLabel = stuckOrdersCount === 1 ? '1 order' : `${stuckOrdersCount} orders`;
      executiveSummary = `System attention required (${healthScore}/100). Identified ${orderLabel} awaiting verification in queue and ${unverifiedPaymentsCount} pending payments requiring immediate staff confirmation.`;
    } else {
      executiveSummary = `CRITICAL ALERT (${healthScore}/100): Immediate administrative intervention required. Critical bottlenecks detected in order verification or database connectivity.`;
    }
  }

  const scanResult: SentinelScanResult = {
    timestamp: new Date().toISOString(),
    healthScore,
    overallStatus,
    executiveSummary,
    totalIssuesCount: issues.length,
    criticalCount,
    warningCount,
    optimizationCount,
    issues,
    metrics: {
      dbLatencyMs,
      r2Status,
      totalOrdersToday,
      pendingOrdersCount,
      stuckOrdersCount,
      unrepliedReviewsCount,
      openTicketsCount,
      unverifiedPaymentsCount,
    },
  };

  sentinelCache = { data: scanResult, expiresAt: Date.now() + 15000 };
  return scanResult;
}

/**
 * Autonomous AI Remediation Engine: Executes safe automated auto-fixes across database, auth, queues, and caches
 */
export async function runSentinelAutoFix(actionTypes?: string[]): Promise<{
  success: boolean;
  fixedCount: number;
  actionsTaken: string[];
}> {
  const actionsTaken: string[] = [];
  let fixedCount = 0;

  try {
    const runAll = !actionTypes || actionTypes.includes('all');

    // 1. Reset and flush expired rate limits & IP false-positives
    if (runAll || actionTypes?.includes('rate_limits') || actionTypes?.includes('security')) {
      try {
        const cleanRateRes = await pool.query('DELETE FROM rate_limits WHERE expires_at < NOW() OR count > 200');
        const rowsCleared = cleanRateRes.rowCount || 0;
        if (rowsCleared > 0) {
          fixedCount += rowsCleared;
          actionsTaken.push(`Flushed ${rowsCleared} expired or congested rate-limiter locks`);
        } else {
          actionsTaken.push('Rate-limiting locks verified optimal; no stuck keys found');
        }
      } catch (err: any) {
        console.warn('[SentinelAutoFix] Rate limit cleanup note:', err.message);
      }
    }

    // 2. Clear expired OTP requests and password reset tokens
    if (runAll || actionTypes?.includes('auth') || actionTypes?.includes('security')) {
      try {
        const cleanOtpRes = await pool.query('DELETE FROM password_reset_requests WHERE expires_at < NOW()');
        const otpsCleared = cleanOtpRes.rowCount || 0;
        if (otpsCleared > 0) {
          fixedCount += otpsCleared;
          actionsTaken.push(`Cleaned ${otpsCleared} expired password reset and OTP tokens`);
        }
      } catch (err: any) {
        console.warn('[SentinelAutoFix] OTP cleanup note:', err.message);
      }
    }

    // 3. Auto-heal user invitations: mark expired invites
    if (runAll || actionTypes?.includes('invitations') || actionTypes?.includes('users')) {
      try {
        const expireInvRes = await pool.query(
          "UPDATE user_invitations SET status = 'expired', updated_at = NOW() WHERE status = 'pending' AND expires_at < NOW()"
        );
        const expiredInvites = expireInvRes.rowCount || 0;
        if (expiredInvites > 0) {
          fixedCount += expiredInvites;
          actionsTaken.push(`Updated ${expiredInvites} stale staff invitations to expired`);
        }
      } catch (err: any) {
        console.warn('[SentinelAutoFix] Invitation cleanup note:', err.message);
      }
    }

    // 4. Auto-heal user accounts: heal missing status or roles
    if (runAll || actionTypes?.includes('users')) {
      try {
        const healStatusRes = await pool.query(
          "UPDATE users SET status = 'ACTIVE' WHERE status IS NULL OR status = ''"
        );
        const healedStatus = healStatusRes.rowCount || 0;
        if (healedStatus > 0) {
          fixedCount += healedStatus;
          actionsTaken.push(`Healed ${healedStatus} user accounts with missing active status`);
        }

        const healRoleRes = await pool.query(
          "UPDATE users SET role = 'CUSTOMER' WHERE role IS NULL OR role = ''"
        );
        const healedRoles = healRoleRes.rowCount || 0;
        if (healedRoles > 0) {
          fixedCount += healedRoles;
          actionsTaken.push(`Standardized ${healedRoles} user accounts with default role`);
        }
      } catch (err: any) {
        console.warn('[SentinelAutoFix] User account healing note:', err.message);
      }
    }

    // 5. Reconcile completed orders with verified payment status
    if (runAll || actionTypes?.includes('orders') || actionTypes?.includes('payments')) {
      try {
        const healOrdersRes = await pool.query(
          "UPDATE orders SET payment_status = 'verified' WHERE order_status = 'completed' AND payment_status != 'verified'"
        );
        const healedOrders = healOrdersRes.rowCount || 0;
        if (healedOrders > 0) {
          fixedCount += healedOrders;
          actionsTaken.push(`Reconciled payment verification status for ${healedOrders} completed orders`);
        }
      } catch (err: any) {
        console.warn('[SentinelAutoFix] Order reconciliation note:', err.message);
      }
    }

    // 6. Auto-Reply to all unreplied reviews with AI
    if (runAll || actionTypes?.includes('reviews')) {
      const unrepliedRes = await pool.query(
        `SELECT id, user_name, product_name, package_name, rating, comment, user_location, is_verified_buyer, order_id
         FROM reviews
         WHERE (admin_reply IS NULL OR admin_reply = '')
         ORDER BY created_at DESC
         LIMIT 20`
      );

      for (const rev of unrepliedRes.rows) {
        try {
          const autoRes = await autoReplyToReviewIfEnabled(rev.id, {
            id: rev.id,
            userName: rev.user_name,
            productName: rev.product_name,
            packageName: rev.package_name,
            rating: Number(rev.rating || 5),
            comment: rev.comment || '',
            isVerifiedBuyer: rev.is_verified_buyer !== false,
            userLocation: rev.user_location || 'Nepal',
            orderId: rev.order_id,
          });

          if (autoRes.replied) {
            fixedCount++;
            actionsTaken.push(`Auto-replied with AI to review #${rev.id.slice(0, 8)} (${rev.user_name} - ${rev.rating}★)`);
          }
        } catch (revErr: any) {
          console.warn(`[SentinelAutoFix] Error auto-replying to review ${rev.id}:`, revErr);
        }
      }
    }

    // Invalidate scan cache to immediately reflect healed state
    invalidateSentinelCache();

    if (actionsTaken.length === 0) {
      actionsTaken.push('All subsystems verified optimal; no pending discrepancies found');
    }

    return {
      success: true,
      fixedCount,
      actionsTaken,
    };
  } catch (err: any) {
    console.error('[SentinelAutoFix] Exception:', err);
    return {
      success: false,
      fixedCount,
      actionsTaken: [...actionsTaken, `Error: ${err.message}`],
    };
  }
}
