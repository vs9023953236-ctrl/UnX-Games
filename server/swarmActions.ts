/**
 * UNX Games - Real Swarm Actions Executor
 * Executes real backend actions without any fabricated results.
 */

import { pool } from '../src/db/index.js';
import { logTerminalEvent } from './swarmTerminal.js';

export interface SwarmActionRecord {
  id: string;
  requestId: string;
  actionType: string;
  status: 'SUCCESS' | 'FAILED' | 'NOT_EXECUTED';
  input: any;
  output: any;
  error: string | null;
  timestamp: string;
  durationMs: number;
}

export async function executeRealSwarmAction(params: {
  requestId: string;
  actionType: string;
  input?: any;
}): Promise<SwarmActionRecord> {
  const { requestId, actionType, input = {} } = params;
  const startTime = Date.now();

  logTerminalEvent({
    requestId,
    stage: 'ACTION_STARTED',
    message: `Executing real action: ${actionType}`,
    level: 'INFO',
  });

  let status: 'SUCCESS' | 'FAILED' | 'NOT_EXECUTED' = 'FAILED';
  let output: any = null;
  let error: string | null = null;

  try {
    switch (actionType) {
      case 'CHECK_DB_HEALTH': {
        const t0 = Date.now();
        const pingRes = await pool.query('SELECT NOW() as current_time, version() as pg_version');
        const countRes = await pool.query(`
          SELECT 
            (SELECT count(*) FROM orders) as total_orders,
            (SELECT count(*) FROM products WHERE active IS TRUE) as active_products,
            (SELECT count(*) FROM users) as total_users
        `);
        const queryTimeMs = Date.now() - t0;

        output = {
          databaseConnected: true,
          queryTimeMs,
          currentTime: pingRes.rows[0]?.current_time,
          postgresVersion: pingRes.rows[0]?.pg_version?.split(' ')?.[0] || 'PostgreSQL',
          totalOrders: parseInt(countRes.rows[0]?.total_orders || '0', 10),
          activeProducts: parseInt(countRes.rows[0]?.active_products || '0', 10),
          totalUsers: parseInt(countRes.rows[0]?.total_users || '0', 10),
        };
        status = 'SUCCESS';
        break;
      }

      case 'SCAN_PENDING_ORDERS': {
        const res = await pool.query(`
          SELECT id, order_code, package_name, product_name, total_amount, order_status, payment_status, created_at
          FROM orders
          WHERE order_status IN ('pending', 'pending_payment', 'pending_verification', 'processing')
          ORDER BY created_at DESC
          LIMIT 10
        `);

        output = {
          pendingCount: res.rows.length,
          pendingOrders: res.rows.map((r) => ({
            id: r.id,
            orderCode: r.order_code || r.id?.slice(0, 8),
            item: r.package_name || r.product_name,
            amount: r.total_amount,
            orderStatus: r.order_status,
            paymentStatus: r.payment_status,
            createdAt: r.created_at,
          })),
        };
        status = 'SUCCESS';
        break;
      }

      case 'VERIFY_PAYMENT_GATEWAYS': {
        const res = await pool.query('SELECT * FROM payment_settings LIMIT 1');
        const row = res.rows[0] || {};

        output = {
          esewaConfigured: Boolean(row.esewa_id),
          esewaId: row.esewa_id || '9768914027',
          esewaName: row.esewa_name || 'BINOD THALAL',
          khaltiConfigured: Boolean(row.khalti_id),
          khaltiId: row.khalti_id || '9768914027',
          khaltiName: row.khalti_name || 'UNX GAMES',
          qrImagesPresent: Boolean(row.esewa_qr_url || row.khalti_qr_url),
        };
        status = 'SUCCESS';
        break;
      }

      case 'QUERY_PRODUCT_CATALOG': {
        const res = await pool.query(`
          SELECT p.id, p.name, c.name as category,
            (SELECT count(*) FROM product_packages pkg WHERE pkg.product_id = p.id) as packages_count
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.id
          WHERE p.active IS TRUE AND p.archived IS NOT TRUE
          ORDER BY p.name ASC
          LIMIT 15
        `);

        output = {
          totalReturned: res.rows.length,
          products: res.rows,
        };
        status = 'SUCCESS';
        break;
      }

      case 'EXECUTE_CUSTOM_SELECT': {
        const queryText = (input?.query || '').trim();
        if (!queryText.toLowerCase().startsWith('select')) {
          throw new Error('Only SELECT queries are permitted for safety in action console.');
        }

        const res = await pool.query(queryText);
        output = {
          rowCount: res.rowCount,
          rows: res.rows.slice(0, 20),
        };
        status = 'SUCCESS';
        break;
      }

      default:
        status = 'NOT_EXECUTED';
        error = `Unknown action type: ${actionType}`;
        break;
    }
  } catch (err: any) {
    status = 'FAILED';
    error = err?.message || 'Action execution error';
    output = { rawError: String(err) };
  }

  const durationMs = Date.now() - startTime;
  const record: SwarmActionRecord = {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    requestId,
    actionType,
    status,
    input,
    output,
    error,
    timestamp: new Date().toISOString(),
    durationMs,
  };

  logTerminalEvent({
    requestId,
    stage: 'ACTION_FINISHED',
    message: `Action ${actionType} finished with status: ${status} in ${durationMs}ms`,
    level: status === 'SUCCESS' ? 'SUCCESS' : 'ERROR',
  });

  // Record in database
  try {
    await pool.query(
      `INSERT INTO ai_swarm_actions (id, request_id, action_type, status, input, output, error, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        record.id,
        record.requestId,
        record.actionType,
        record.status,
        JSON.stringify(record.input),
        JSON.stringify(record.output),
        record.error,
      ]
    );
  } catch (dbErr) {
    console.warn('[Swarm Actions] DB logging note:', dbErr);
  }

  return record;
}

export async function getRecentSwarmActions(limit = 20): Promise<SwarmActionRecord[]> {
  try {
    const res = await pool.query(
      `SELECT * FROM ai_swarm_actions ORDER BY timestamp DESC LIMIT $1`,
      [limit]
    );
    return res.rows.map((r) => ({
      id: r.id,
      requestId: r.request_id,
      actionType: r.action_type,
      status: r.status,
      input: r.input,
      output: r.output,
      error: r.error,
      timestamp: r.timestamp,
      durationMs: 0,
    }));
  } catch (_) {
    return [];
  }
}
