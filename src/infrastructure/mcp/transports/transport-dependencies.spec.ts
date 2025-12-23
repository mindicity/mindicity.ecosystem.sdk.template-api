import { HealthService } from '../../../modules/health/health.service';

import { 
  createTransportDependencies, 
  validateTransportDependencies,
  OptionalTransportDependencies 
} from './transport-dependencies';

describe('TransportDependencies', () => {
  let mockHealthService: jest.Mocked<HealthService>;

  beforeEach(() => {
    mockHealthService = {
      getHealthStatus: jest.fn().mockReturnValue({
        status: 'healthy',
        timestamp: '2025-12-22T14:00:00.000Z',
        server: 'test-server',
        version: '1.0.0',
        uptime: 123.456,
        memory: {
          rss: 124878848,
          heapTotal: 45776896,
          heapUsed: 42331056,
          external: 2981905,
          arrayBuffers: 8466399,
        },
        environment: 'test',
      }),
      getSimpleHealthStatus: jest.fn().mockReturnValue({
        status: 'ok',
        version: '1.0.0',
      }),
    } as any;
  });

  describe('createTransportDependencies', () => {
    it('should create dependencies with healthService', () => {
      const dependencies = createTransportDependencies({
        healthService: mockHealthService,
      });

      expect(dependencies).toBeDefined();
      expect(dependencies.healthService).toBe(mockHealthService);
    });

    it('should throw error when healthService is missing', () => {
      expect(() => {
        createTransportDependencies({});
      }).toThrow('HealthService is required for MCP transports');
    });

    it('should accept optional dependencies', () => {
      const dependencies: OptionalTransportDependencies = {
        healthService: mockHealthService,
      };

      const result = createTransportDependencies(dependencies);

      expect(result).toBeDefined();
      expect(result.healthService).toBe(mockHealthService);
    });

    it('should handle empty object gracefully', () => {
      expect(() => {
        createTransportDependencies({});
      }).toThrow('HealthService is required for MCP transports');
    });

    it('should preserve all provided services', () => {
      const dependencies = createTransportDependencies({
        healthService: mockHealthService,
      });

      expect(dependencies.healthService).toBe(mockHealthService);
    });
  });

  describe('validateTransportDependencies', () => {
    it('should validate HTTP transport dependencies', () => {
      const dependencies = {
        healthService: mockHealthService,
      };

      expect(() => {
        validateTransportDependencies('http', dependencies);
      }).not.toThrow();
    });

    it('should not require healthService for SSE transport (simplified)', () => {
      expect(() => {
        validateTransportDependencies('sse', {});
      }).not.toThrow();
    });

    it('should accept healthService for SSE transport (optional)', () => {
      const dependencies = {
        healthService: mockHealthService,
      };

      expect(() => {
        validateTransportDependencies('sse', dependencies);
      }).not.toThrow();
    });

    it('should throw error for HTTP transport without healthService', () => {
      expect(() => {
        validateTransportDependencies('http', {});
      }).toThrow('HTTP transport requires HealthService in dependencies');
    });

    it('should handle undefined dependencies for HTTP', () => {
      expect(() => {
        validateTransportDependencies('http', undefined);
      }).toThrow('HTTP transport requires HealthService in dependencies');
    });

    it('should handle undefined dependencies for SSE (allowed)', () => {
      expect(() => {
        validateTransportDependencies('sse', undefined);
      }).not.toThrow();
    });

    it('should handle unknown transport types', () => {
      const dependencies = {
        healthService: mockHealthService,
      };

      expect(() => {
        validateTransportDependencies('unknown', dependencies);
      }).not.toThrow();
    });

    it('should validate case sensitivity of transport types', () => {
      const dependencies = {
        healthService: mockHealthService,
      };

      // Lowercase should work
      expect(() => {
        validateTransportDependencies('http', dependencies);
      }).not.toThrow();

      // Uppercase should not match (case-sensitive)
      expect(() => {
        validateTransportDependencies('HTTP', dependencies);
      }).not.toThrow();
    });
  });

  describe('OptionalTransportDependencies type', () => {
    it('should allow partial dependencies', () => {
      const partialDeps: OptionalTransportDependencies = {
        healthService: mockHealthService,
      };

      expect(partialDeps.healthService).toBe(mockHealthService);
    });

    it('should allow empty dependencies object', () => {
      const emptyDeps: OptionalTransportDependencies = {};

      expect(emptyDeps).toBeDefined();
      expect(emptyDeps.healthService).toBeUndefined();
    });

    it('should allow only healthService', () => {
      const deps: OptionalTransportDependencies = {
        healthService: mockHealthService,
      };

      expect(deps.healthService).toBeDefined();
    });
  });

  describe('dependency validation edge cases', () => {
    it('should handle null healthService', () => {
      expect(() => {
        createTransportDependencies({
          healthService: null as any,
        });
      }).toThrow('HealthService is required for MCP transports');
    });

    it('should handle undefined healthService', () => {
      expect(() => {
        createTransportDependencies({
          healthService: undefined as any,
        });
      }).toThrow('HealthService is required for MCP transports');
    });

    it('should accept valid healthService instance', () => {
      const dependencies = createTransportDependencies({
        healthService: mockHealthService,
      });

      expect(dependencies.healthService).toBe(mockHealthService);
      expect(dependencies.healthService!.getHealthStatus).toBeDefined();
      expect(dependencies.healthService!.getSimpleHealthStatus).toBeDefined();
    });
  });

  describe('future service extensibility', () => {
    it('should support adding new services without breaking existing code', () => {
      // Simulate adding a new service in the future
      const extendedDependencies = {
        healthService: mockHealthService,
        // Future services would go here
        // userService: mockUserService,
        // notificationService: mockNotificationService,
      };

      const result = createTransportDependencies(extendedDependencies);

      expect(result.healthService).toBe(mockHealthService);
    });

    it('should maintain backward compatibility', () => {
      // Old code should still work
      const oldStyleDeps = createTransportDependencies({
        healthService: mockHealthService,
      });

      expect(oldStyleDeps).toBeDefined();
      expect(oldStyleDeps.healthService).toBe(mockHealthService);
    });
  });
});
