import { getSupabaseAdmin } from './supabaseClient.js';
import { pool } from '../src/db/index.js';

export interface RpcResult<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: any;
}

/**
 * Execute a secure Supabase RPC function.
 * Tries `sb.rpc(functionName, params)`.
 * If Supabase is unavailable or returns an error, safely falls back
 * to direct PostgreSQL execution of the stored procedure via pool.query.
 */
export async function executeSupabaseRpc<T = any>(
  functionName: string,
  params: Record<string, any>
): Promise<RpcResult<T>> {
  const sb = getSupabaseAdmin();
  if (sb) {
    try {
      const { data, error } = await sb.rpc(functionName, params);
      if (!error && data !== null && data !== undefined) {
        if (typeof data === 'object' && data.success === false) {
          return { success: false, message: data.message || 'Operation failed', data };
        }
        return { success: true, data };
      }
      if (error) {
        console.warn(`[Supabase RPC ${functionName}] notice:`, error.message);
      }
    } catch (err: any) {
      console.warn(`[Supabase RPC ${functionName}] call exception:`, err?.message || err);
    }
  }

  // Direct PostgreSQL execution fallback for the same stored procedure
  try {
    const keys = Object.keys(params);
    const paramHolders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const paramValues = keys.map(k => params[k]);
    const query = `SELECT public.${functionName}(${paramHolders}) as result;`;
    const pgRes = await pool.query(query, paramValues);
    const result = pgRes.rows[0]?.result;
    if (result && typeof result === 'object' && result.success === false) {
      return { success: false, message: result.message || 'Operation failed', data: result };
    }
    return { success: true, data: result };
  } catch (pgErr: any) {
    console.error(`[PostgreSQL RPC ${functionName}] fallback error:`, pgErr?.message || pgErr);
    return { success: false, message: pgErr?.message || 'Database RPC operation failed', error: pgErr };
  }
}

// 1. Coupon validation
export async function rpcValidateCoupon(code: string, customerId?: string, orderAmount: number = 0) {
  return executeSupabaseRpc('ghn_validate_coupon', {
    p_code: code,
    p_customer_id: customerId || null,
    p_order_amount: orderAmount
  });
}

// 2. Wallet adjustment (Credit / Debit / Purchase)
export async function rpcAdjustWallet(params: {
  customerId: string;
  amount: number;
  type: string;
  reference?: string;
  description?: string;
  orderId?: string;
  adminId?: string;
}) {
  return executeSupabaseRpc('ghn_adjust_wallet', {
    p_customer_id: params.customerId,
    p_amount: params.amount,
    p_type: params.type,
    p_reference: params.reference || null,
    p_description: params.description || null,
    p_order_id: params.orderId || null,
    p_admin_id: params.adminId || null
  });
}

// 3. Wallet deposit submission
export async function rpcSubmitWalletDeposit(params: {
  customerId: string;
  amount: number;
  paymentMethod: string;
  reference: string;
  proofUrl?: string;
}) {
  return executeSupabaseRpc('ghn_submit_wallet_deposit', {
    p_customer_id: params.customerId,
    p_amount: params.amount,
    p_payment_method: params.paymentMethod,
    p_reference: params.reference,
    p_proof_url: params.proofUrl || null
  });
}

// 4. Wallet deposit review (Admin approve / reject)
export async function rpcReviewWalletDeposit(params: {
  transactionId: string;
  action: 'approve' | 'reject';
  adminId: string;
  notes?: string;
}) {
  return executeSupabaseRpc('ghn_review_wallet_deposit', {
    p_transaction_id: params.transactionId,
    p_action: params.action,
    p_admin_id: params.adminId,
    p_notes: params.notes || null
  });
}

// 5. Order creation
export async function rpcCreateOrder(params: {
  orderId: string;
  orderCode: string;
  customerId: string;
  productId?: string;
  packageId?: string;
  gameId?: string;
  customerName?: string;
  customerEmail?: string;
  customerMobile?: string;
  gameUid?: string;
  gameServer?: string;
  gameUsername?: string;
  region?: string;
  quantity?: number;
  couponCode?: string;
  paymentMethod?: string;
  transactionId?: string;
  proofUrl?: string;
}) {
  return executeSupabaseRpc('ghn_create_order', {
    p_order_id: params.orderId,
    p_order_code: params.orderCode,
    p_customer_id: params.customerId,
    p_product_id: params.productId || null,
    p_package_id: params.packageId || null,
    p_game_id: params.gameId || null,
    p_customer_name: params.customerName || null,
    p_customer_email: params.customerEmail || null,
    p_customer_mobile: params.customerMobile || null,
    p_game_uid: params.gameUid || null,
    p_game_server: params.gameServer || null,
    p_game_username: params.gameUsername || null,
    p_region: params.region || null,
    p_quantity: params.quantity || 1,
    p_coupon_code: params.couponCode || null,
    p_payment_method: params.paymentMethod || 'eSewa / Khalti QR',
    p_transaction_id: params.transactionId || null,
    p_proof_url: params.proofUrl || null
  });
}

// 6. Payment submission
export async function rpcSubmitPayment(params: {
  orderId: string;
  customerId: string;
  method: string;
  amount: number;
  transactionId?: string;
  proofUrl?: string;
}) {
  return executeSupabaseRpc('ghn_submit_payment', {
    p_order_id: params.orderId,
    p_customer_id: params.customerId,
    p_method: params.method,
    p_amount: params.amount,
    p_transaction_id: params.transactionId || null,
    p_proof_url: params.proofUrl || null
  });
}

// 7. Payment verification (Admin approve / reject)
export async function rpcVerifyPayment(params: {
  paymentId: string;
  orderId: string;
  action: 'approve' | 'reject';
  adminId: string;
  notes?: string;
}) {
  return executeSupabaseRpc('ghn_verify_payment', {
    p_payment_id: params.paymentId,
    p_order_id: params.orderId,
    p_action: params.action,
    p_admin_id: params.adminId,
    p_notes: params.notes || null
  });
}

// 8. Order status update
export async function rpcUpdateOrderStatus(params: {
  orderId: string;
  newStatus: string;
  changedBy: string;
  notes?: string;
}) {
  return executeSupabaseRpc('ghn_update_order_status', {
    p_order_id: params.orderId,
    p_new_status: params.newStatus,
    p_changed_by: params.changedBy,
    p_notes: params.notes || null
  });
}

// 9. Inventory update
export async function rpcUpdateInventory(params: {
  packageId: string;
  quantity?: number;
  action?: 'DEDUCT' | 'RESTORE';
}) {
  return executeSupabaseRpc('ghn_update_inventory', {
    p_package_id: params.packageId,
    p_quantity: params.quantity || 1,
    p_action: params.action || 'DEDUCT'
  });
}

// 10. Cancellation request
export async function rpcRequestCancellation(params: {
  orderId: string;
  customerId: string;
  reason: string;
  refundMethod?: string;
  refundDetails?: string;
}) {
  return executeSupabaseRpc('ghn_request_cancellation', {
    p_order_id: params.orderId,
    p_customer_id: params.customerId,
    p_reason: params.reason,
    p_refund_method: params.refundMethod || 'WALLET',
    p_refund_details: params.refundDetails || null
  });
}

// 11. Cancellation resolution
export async function rpcResolveCancellation(params: {
  cancellationId: string;
  action: 'approve' | 'reject';
  adminId: string;
  notes?: string;
}) {
  return executeSupabaseRpc('ghn_resolve_cancellation', {
    p_cancellation_id: params.cancellationId,
    p_action: params.action,
    p_admin_id: params.adminId,
    p_notes: params.notes || null
  });
}

// 12. Refund processing
export async function rpcProcessRefund(params: {
  orderId: string;
  customerId: string;
  amount: number;
  reason: string;
  processedBy: string;
  method?: string;
}) {
  return executeSupabaseRpc('ghn_process_refund', {
    p_order_id: params.orderId,
    p_customer_id: params.customerId,
    p_amount: params.amount,
    p_reason: params.reason,
    p_processed_by: params.processedBy,
    p_method: params.method || 'WALLET'
  });
}

// 13. KYC submission
export async function rpcSubmitKyc(params: {
  customerId: string;
  docType: string;
  docNumber?: string;
  documentUrl: string;
  notes?: string;
}) {
  return executeSupabaseRpc('ghn_submit_kyc', {
    p_customer_id: params.customerId,
    p_doc_type: params.docType,
    p_doc_number: params.docNumber || null,
    p_document_url: params.documentUrl,
    p_notes: params.notes || null
  });
}

// 14. KYC review
export async function rpcReviewKyc(params: {
  customerId: string;
  action: 'approve' | 'reject';
  reviewedBy: string;
  notes?: string;
}) {
  return executeSupabaseRpc('ghn_review_kyc', {
    p_customer_id: params.customerId,
    p_action: params.action,
    p_reviewed_by: params.reviewedBy,
    p_notes: params.notes || null
  });
}

// 15. Support ticket creation
export async function rpcCreateSupportTicket(params: {
  customerId: string;
  orderId?: string;
  subject: string;
  category?: string;
  priority?: string;
  initialMessage?: string;
  attachments?: any[];
}) {
  return executeSupabaseRpc('ghn_create_support_ticket', {
    p_customer_id: params.customerId,
    p_order_id: params.orderId || null,
    p_subject: params.subject,
    p_category: params.category || 'General',
    p_priority: params.priority || 'MEDIUM',
    p_initial_message: params.initialMessage || null,
    p_attachments: JSON.stringify(params.attachments || [])
  });
}

// 16. Support message
export async function rpcAddSupportMessage(params: {
  ticketId: string;
  senderType: string;
  senderId: string;
  senderName: string;
  message: string;
  attachments?: any[];
}) {
  return executeSupabaseRpc('ghn_add_support_message', {
    p_ticket_id: params.ticketId,
    p_sender_type: params.senderType,
    p_sender_id: params.senderId,
    p_sender_name: params.senderName,
    p_message: params.message,
    p_attachments: JSON.stringify(params.attachments || [])
  });
}
