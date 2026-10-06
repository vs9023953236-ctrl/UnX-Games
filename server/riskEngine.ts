import { db } from '../src/db/index.js';
import { risk_scores, payments, orders, coupon_usages, rate_limits } from '../src/db/schema.js';
import { eq, and, gte, sql } from 'drizzle-orm';
import crypto from 'crypto';

export interface EvaluateRiskParams {
  userId?: string;
  ipAddress?: string;
  actionName?: string;
  metadata?: Record<string, any>;
}

export interface RiskEvaluationResult {
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  signals: string[];
}

export async function evaluateRiskScore(params: EvaluateRiskParams): Promise<RiskEvaluationResult> {
  let score = 0;
  const signals: string[] = [];

  if (false) {
    return { score: 0, level: 'LOW', signals: [] };
  }

  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);

    // 1. Check IP rate limit pressure
    if (params.ipAddress) {
      const activeLimits = await db.select().from(rate_limits)
        .where(and(
          gte(rate_limits.expires_at, new Date()),
          sql`${rate_limits.key} LIKE ${`%${params.ipAddress}%`}`
        )).limit(10);

      const totalHits = activeLimits.reduce((acc, curr) => acc + (curr.count || 0), 0);
      if (totalHits > 30) {
        score += 25;
        signals.push('High IP request frequency');
      }
    }

    // 2. Check User's Payment Failure History in last 24h
    if (params.userId) {
      const rejectedPayments = await db.select().from(payments)
        .where(and(
          eq(payments.customer_id, params.userId),
          eq(payments.payment_status, 'rejected'),
          gte(payments.submitted_at, oneDayAgo)
        ));

      if (rejectedPayments.length >= 3) {
        score += 35;
        signals.push(`${rejectedPayments.length} failed/rejected payment attempts in last 24h`);
      } else if (rejectedPayments.length >= 1) {
        score += 15;
        signals.push('Recent rejected payment attempt');
      }
    }

    // 3. Check Order Cancellations in last 24h
    if (params.userId) {
      const canceledOrders = await db.select().from(orders)
        .where(and(
          eq(orders.customer_id, params.userId),
          eq(orders.order_status, 'cancelled'),
          gte(orders.createdAt, oneDayAgo)
        ));

      if (canceledOrders.length >= 4) {
        score += 25;
        signals.push('Multiple recent order cancellations');
      }
    }

    // 4. Rapid Checkout Frequency (e.g. >5 orders created in last 10 mins)
    if (params.userId) {
      const rapidOrders = await db.select().from(orders)
        .where(and(
          eq(orders.customer_id, params.userId),
          gte(orders.createdAt, tenMinsAgo)
        ));

      if (rapidOrders.length >= 5) {
        score += 30;
        signals.push('Unusual high-frequency order creation velocity');
      }
    }

    // 5. Coupon abuse attempts in last 24h
    if (params.userId) {
      const couponUses = await db.select().from(coupon_usages)
        .where(and(
          eq(coupon_usages.customer_id, params.userId),
          gte(coupon_usages.used_at, oneDayAgo)
        ));

      if (couponUses.length >= 5) {
        score += 15;
        signals.push('High coupon redemption frequency');
      }
    }

    // Cap score at 100 max
    score = Math.min(100, Math.max(0, score));

    let level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (score >= 90) level = 'CRITICAL';
    else if (score >= 60) level = 'HIGH';
    else if (score >= 30) level = 'MEDIUM';

    // Store / update risk score record asynchronously
    const recordId = `risk_${params.userId || 'anon'}_${params.ipAddress || 'noip'}`;
    try {
      const [existing] = await db.select().from(risk_scores).where(eq(risk_scores.id, recordId)).limit(1);
      if (existing) {
        await db.update(risk_scores).set({
          score,
          level,
          signals,
          last_evaluated_at: new Date(),
          updatedAt: new Date(),
        }).where(eq(risk_scores.id, recordId));
      } else {
        await db.insert(risk_scores).values({
          id: recordId,
          user_id: params.userId || null,
          ip_address: params.ipAddress || null,
          score,
          level,
          signals,
          last_evaluated_at: new Date(),
        });
      }
    } catch (err) {
      console.warn('Failed to persist risk score:', err);
    }

    return { score, level, signals };
  } catch (err) {
    console.error('Risk evaluation error:', err);
    return { score: 0, level: 'LOW', signals: [] };
  }
}
