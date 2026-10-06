/**
 * UNX Games API Gateway - Core Types, Contracts & Enums
 */

export type ClientAppType = 'unx-user' | 'unx-admin' | 'unx-web' | 'unx-mobile' | 'unknown';

export interface GatewayRequestMetadata {
  requestId: string;
  clientApp: ClientAppType;
  startTime: number;
  ip: string;
  userAgent: string;
  userId?: string;
  userRole?: string;
  idempotencyKey?: string;
}

export type GatewayErrorCode =
  | 'AUTH_REQUIRED'
  | 'AUTH_INVALID'
  | 'AUTH_EXPIRED'
  | 'FORBIDDEN'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_INVALID'
  | 'ORDER_INVALID'
  | 'ORDER_NOT_FOUND'
  | 'WALLET_INSUFFICIENT'
  | 'WALLET_OPERATION_FAILED'
  | 'COUPON_INVALID'
  | 'COUPON_EXPIRED'
  | 'SERVER_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'MAINTENANCE_MODE';

export interface StandardApiResponse<T = any> {
  success: boolean;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: {
    code: GatewayErrorCode;
    message: string;
    details?: any[];
  };
  requestId: string;
  timestamp: string;
  // Backward compatibility top-level fields
  [key: string]: any;
}

export interface IdempotencyRecord {
  key: string;
  userId?: string;
  endpoint: string;
  statusCode: number;
  responseBody: any;
  createdAt: number;
  expiresAt: number;
}
