import { extractUserIdFromJWT, extractUserFromJWT, extractCorrelationId } from './jwt.util';

describe('JWT Utilities', () => {
  describe('extractUserIdFromJWT', () => {
    it('should extract user ID from valid JWT with Bearer (case sensitive)', () => {
      const token =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSJ9.fake-signature';
      const authHeader = `Bearer ${token}`;

      const result = extractUserIdFromJWT(authHeader);

      expect(result).toBe('user-123');
    });

    it('should extract user ID from valid JWT with bearer (lowercase)', () => {
      const token =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSJ9.fake-signature';
      const authHeader = `bearer ${token}`;

      const result = extractUserIdFromJWT(authHeader);

      expect(result).toBe('user-123');
    });

    it('should extract user ID from valid JWT with BEARER (uppercase)', () => {
      const token =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSJ9.fake-signature';
      const authHeader = `BEARER ${token}`;

      const result = extractUserIdFromJWT(authHeader);

      expect(result).toBe('user-123');
    });

    it('should extract user ID from JWT with userId field', () => {
      const payload = { userId: 'user-456', email: 'test@example.com' };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${encodedPayload}.signature`;
      const authHeader = `Bearer ${token}`;

      const result = extractUserIdFromJWT(authHeader);

      expect(result).toBe('user-456');
    });

    it('should extract user ID from JWT with user_id field', () => {
      const payload = { user_id: 'user-789', email: 'test@example.com' };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${encodedPayload}.signature`;
      const authHeader = `Bearer ${token}`;

      const result = extractUserIdFromJWT(authHeader);

      expect(result).toBe('user-789');
    });

    it('should extract user ID from JWT with id field', () => {
      const payload = { id: 'user-999', email: 'test@example.com' };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${encodedPayload}.signature`;
      const authHeader = `Bearer ${token}`;

      const result = extractUserIdFromJWT(authHeader);

      expect(result).toBe('user-999');
    });

    it('should return anonymous for missing auth header', () => {
      const result = extractUserIdFromJWT();

      expect(result).toBe('anonymous');
    });

    it('should return anonymous for empty auth header', () => {
      const result = extractUserIdFromJWT('');

      expect(result).toBe('anonymous');
    });

    it('should return anonymous for invalid auth header format', () => {
      const result = extractUserIdFromJWT('InvalidHeader token');

      expect(result).toBe('anonymous');
    });

    it('should return anonymous for malformed JWT (wrong number of parts)', () => {
      const authHeader = 'Bearer invalid.jwt';

      const result = extractUserIdFromJWT(authHeader);

      expect(result).toBe('anonymous');
    });

    it('should return anonymous for JWT with invalid base64 payload', () => {
      const authHeader = 'Bearer header.invalid-base64.signature';

      const result = extractUserIdFromJWT(authHeader);

      expect(result).toBe('anonymous');
    });

    it('should return anonymous for JWT without user ID fields', () => {
      const payload = { email: 'test@example.com', role: 'admin' };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${encodedPayload}.signature`;
      const authHeader = `Bearer ${token}`;

      const result = extractUserIdFromJWT(authHeader);

      expect(result).toBe('anonymous');
    });

    it('should handle Bearer with multiple spaces', () => {
      const token =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSJ9.fake-signature';
      const authHeader = `Bearer   ${token}`;

      const result = extractUserIdFromJWT(authHeader);

      expect(result).toBe('user-123');
    });
  });

  describe('extractUserFromJWT', () => {
    it('should extract full user object from valid JWT', () => {
      const payload = { sub: 'user-123', email: 'test@example.com', role: 'admin' };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${encodedPayload}.signature`;
      const authHeader = `Bearer ${token}`;

      const result = extractUserFromJWT(authHeader);

      expect(result).toEqual(payload);
    });

    it('should work with case insensitive Bearer prefix', () => {
      const payload = { sub: 'user-123', email: 'test@example.com' };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${encodedPayload}.signature`;
      const authHeader = `bearer ${token}`;

      const result = extractUserFromJWT(authHeader);

      expect(result).toEqual(payload);
    });

    it('should return null for missing auth header', () => {
      const result = extractUserFromJWT();

      expect(result).toBeNull();
    });

    it('should return null for invalid auth header format', () => {
      const result = extractUserFromJWT('InvalidHeader token');

      expect(result).toBeNull();
    });

    it('should return null for malformed JWT', () => {
      const authHeader = 'Bearer invalid.jwt';

      const result = extractUserFromJWT(authHeader);

      expect(result).toBeNull();
    });

    it('should return null for JWT with invalid base64 payload', () => {
      const authHeader = 'Bearer header.invalid-base64.signature';

      const result = extractUserFromJWT(authHeader);

      expect(result).toBeNull();
    });
  });

  describe('extractCorrelationId', () => {
    it('should extract correlation ID from request object', () => {
      const mockRequest = { id: 'test-correlation-id' };

      const result = extractCorrelationId(mockRequest);

      expect(result).toBe('test-correlation-id');
    });

    it('should generate UUID when request has no ID', () => {
      const mockRequest = {};

      const result = extractCorrelationId(mockRequest);

      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should generate UUID when request ID is null', () => {
      const mockRequest = { id: undefined };

      const result = extractCorrelationId(mockRequest);

      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should generate UUID when request ID is undefined', () => {
      const mockRequest = { id: undefined };

      const result = extractCorrelationId(mockRequest);

      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });
  });
});
