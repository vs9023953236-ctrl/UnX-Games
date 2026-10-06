import { Response, Request } from 'express';
import { GatewayErrorCode, StandardApiResponse } from './types.js';

export function sendGatewaySuccess<T = any>(
  req: Request,
  res: Response,
  data: T,
  statusCode = 200,
  options?: {
    pagination?: { page: number; limit: number; total: number; totalPages: number };
    message?: string;
    extraFields?: Record<string, any>;
  }
) {
  const reqId = req.gatewayMeta?.requestId || req.id || 'unx_unknown';
  const responsePayload: StandardApiResponse<T> = {
    success: true,
    data,
    requestId: reqId,
    timestamp: new Date().toISOString(),
    ...(options?.pagination ? { pagination: options.pagination } : {}),
    ...(options?.message ? { message: options.message } : {}),
    ...(options?.extraFields || {}),
  };

  // If data is an object, also spread top-level backward compatible properties
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    for (const [k, v] of Object.entries(data)) {
      if (!(k in responsePayload)) {
        responsePayload[k] = v;
      }
    }
  }

  return res.status(statusCode).json(responsePayload);
}

export function sendGatewayError(
  req: Request,
  res: Response,
  code: GatewayErrorCode,
  message: string,
  statusCode = 400,
  details?: any[]
) {
  const reqId = req.gatewayMeta?.requestId || req.id || 'unx_unknown';
  const responsePayload: StandardApiResponse = {
    success: false,
    message, // for legacy client backward-compatibility
    error: {
      code,
      message,
      ...(details && details.length ? { details } : {}),
    },
    requestId: reqId,
    timestamp: new Date().toISOString(),
  };

  return res.status(statusCode).json(responsePayload);
}
