/**
 * JWT utility functions for token parsing and user extraction.
 *
 * These utilities provide safe JWT token parsing without verification,
 * suitable for extracting user information for logging and context purposes.
 */

/**
 * Bearer token regex for case insensitive matching
 */
const BEARER_REGEX = /^bearer\s+/i;

/**
 * Validates if auth header has Bearer prefix (case insensitive)
 */
function hasBearerPrefix(authHeader: string): boolean {
  return BEARER_REGEX.test(authHeader);
}

/**
 * Extracts token from Bearer auth header
 */
function extractTokenFromHeader(authHeader: string): string {
  return authHeader.replace(BEARER_REGEX, '');
}

/**
 * Validates JWT token structure
 */
function isValidJWTStructure(token: string): boolean {
  return token.split('.').length === 3;
}

/**
 * Decodes JWT payload safely
 */
function decodeJWTPayload(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    return JSON.parse(Buffer.from(parts[1], 'base64').toString()) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Extracts user ID from JWT payload
 */
function getUserIdFromPayload(payload: JWTPayload): string {
  return payload?.sub ?? payload?.userId ?? payload?.user_id ?? payload?.id ?? 'anonymous';
}

/**
 * Safely extracts user ID from JWT token without verification.
 *
 * This function only decodes the JWT payload to extract user information
 * for logging purposes. It does NOT verify the token signature or expiration.
 *
 * @param authHeader - The Authorization header value (e.g., "Bearer eyJ...")
 * @returns The user ID if found, otherwise 'anonymous'
 *
 * @example
 * ```typescript
 * const userId = extractUserIdFromJWT(req.headers.authorization);
 * logger.info(`User ${userId} performed action`);
 * ```
 */
export function extractUserIdFromJWT(authHeader?: string): string {
  if (!authHeader || !hasBearerPrefix(authHeader)) {
    return 'anonymous';
  }

  const token = extractTokenFromHeader(authHeader);

  if (!isValidJWTStructure(token)) {
    return 'anonymous';
  }

  const payload = decodeJWTPayload(token);
  if (!payload) {
    return 'anonymous';
  }

  return getUserIdFromPayload(payload);
}

/**
 * JWT payload interface for type safety
 */
interface JWTPayload {
  sub?: string;
  userId?: string;
  user_id?: string;
  id?: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

/**
 * Extracts full user information from JWT token without verification.
 *
 * @param authHeader - The Authorization header value
 * @returns User information object or null if extraction fails
 *
 * @example
 * ```typescript
 * const user = extractUserFromJWT(req.headers.authorization);
 * if (user) {
 *   logger.info(`User ${user.sub} (${user.email}) performed action`);
 * }
 * ```
 */
export function extractUserFromJWT(authHeader?: string): JWTPayload | null {
  if (!authHeader || !hasBearerPrefix(authHeader)) {
    return null;
  }

  const token = extractTokenFromHeader(authHeader);

  if (!isValidJWTStructure(token)) {
    return null;
  }

  return decodeJWTPayload(token);
}

import { v4 as uuidv4 } from 'uuid';

/**
 * Request interface for correlation ID extraction
 */
interface RequestWithId {
  id?: string;
}

/**
 * Extracts correlation ID from request.
 *
 * The correlation ID is set by Fastify's genReqId function, which uses
 * the x-correlation-id header if present, otherwise generates a new UUID.
 *
 * @param req - Fastify request object
 * @returns Correlation ID string
 */
export function extractCorrelationId(req: RequestWithId): string {
  return req.id ?? uuidv4();
}
