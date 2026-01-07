import { ContextLoggerService } from '../../../common/services/context-logger.service';
import { HealthService } from '../../../modules/health/health.service';

import { 
  createTransportDependencies, 
  validateTransportDependencies,
  OptionalTransportDependencies 
} from './transport-dependencies';

describe('TransportDependencies', () => {
  let mockHealthService: jest.Mocked<HealthService>;
  let mockLoggerService: jest.Mocked<ContextLoggerService>;
  let mockConfigService: any;

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

    mockLoggerService = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      setContext: jest.fn(),
      child: jest.fn().mockReturnThis(),
    } as any;

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'app') return { apiPrefix: '/mcapi', apiScopePrefix: '/test' };
        return null;
      }),
    };
  });

  describe('createTransportDependencies', () => {
    it('should create dependencies with healthService and loggerService', () => {
      const dependencies = createTransportDependencies({
        healthService: mockHealthService,
        loggerService: mockLoggerService,
        configService: mockConfigService,
      });

      expect(dependencies).toBeDefined();
      expect(dependencies.healthService).toBe(mockHealthService);
      expect(dependencies.loggerService).toBe(mockLoggerService);
    });

    it('should throw error when healthService is missing', () => {
      expect(() => {
        createTransportDependencies({
          loggerService: mockLoggerService,
        });
      }).toThrow('HealthService is required for MCP transports');
    });

    it('should throw error when loggerService is missing', () => {
      expect(() => {
        createTransportDependencies({
          healthService: mockHealthService,
        });
      }).toThrow('ContextLoggerService is required for MCP transports');
    });

    it('should accept optional dependencies', () => {
      const dependencies: OptionalTransportDependencies = {
        healthService: mockHealthService,
        loggerService: mockLoggerService,
      };

      const result = createTransportDependencies(dependencies);

      expect(result).toBeDefined();
      expect(result.healthService).toBe(mockHealthService);
      expect(result.loggerService).toBe(mockLoggerService);
    });

    it('should handle empty object gracefully', () => {
      expect(() => {
        createTransportDependencies({});
      }).toThrow('HealthService is required for MCP transports');
    });

    it('should preserve all provided services', () => {
      const dependencies = createTransportDependencies({
        healthService: mockHealthService,
        loggerService: mockLoggerService,
      });

      expect(dependencies.healthService).toBe(mockHealthService);
      expect(dependencies.loggerService).toBe(mockLoggerService);
    });
  });

  describe('validateTransportDependencies', () => {
    it('should validate HTTP transport dependencies', () => {
      const dependencies = {
        healthService: mockHealthService,
        loggerService: mockLoggerService,
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
        loggerService: mockLoggerService,
      };

      expect(() => {
        validateTransportDependencies('sse', dependencies);
      }).not.toThrow();
    });

    it('should throw error for HTTP transport without healthService', () => {
      expect(() => {
        validateTransportDependencies('http', { loggerService: mockLoggerService });
      }).toThrow('HTTP transport requires HealthService in dependencies');
    });

    it('should throw error for HTTP transport without loggerService', () => {
      expect(() => {
        validateTransportDependencies('http', { healthService: mockHealthService });
      }).toThrow('HTTP transport requires ContextLoggerService in dependencies');
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
        loggerService: mockLoggerService,
      };

      expect(() => {
        validateTransportDependencies('unknown', dependencies);
      }).not.toThrow();
    });

    it('should validate case sensitivity of transport types', () => {
      const dependencies = {
        healthService: mockHealthService,
        loggerService: mockLoggerService,
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
        loggerService: mockLoggerService,
      };

      expect(partialDeps.healthService).toBe(mockHealthService);
      expect(partialDeps.loggerService).toBe(mockLoggerService);
    });

    it('should allow empty dependencies object', () => {
      const emptyDeps: OptionalTransportDependencies = {};

      expect(emptyDeps).toBeDefined();
      expect(emptyDeps.healthService).toBeUndefined();
      expect(emptyDeps.loggerService).toBeUndefined();
    });

    it('should allow only healthService', () => {
      const deps: OptionalTransportDependencies = {
        healthService: mockHealthService,
      };

      expect(deps.healthService).toBeDefined();
      expect(deps.loggerService).toBeUndefined();
    });
  });

  describe('dependency validation edge cases', () => {
    it('should handle null healthService', () => {
      expect(() => {
        createTransportDependencies({
          healthService: null as any,
          loggerService: mockLoggerService,
        });
      }).toThrow('HealthService is required for MCP transports');
    });

    it('should handle undefined healthService', () => {
      expect(() => {
        createTransportDependencies({
          healthService: undefined as any,
          loggerService: mockLoggerService,
        });
      }).toThrow('HealthService is required for MCP transports');
    });

    it('should handle null loggerService', () => {
      expect(() => {
        createTransportDependencies({
          healthService: mockHealthService,
          loggerService: null as any,
        });
      }).toThrow('ContextLoggerService is required for MCP transports');
    });

    it('should handle undefined loggerService', () => {
      expect(() => {
        createTransportDependencies({
          healthService: mockHealthService,
          loggerService: undefined as any,
        });
      }).toThrow('ContextLoggerService is required for MCP transports');
    });

    it('should accept valid healthService and loggerService instances', () => {
      const dependencies = createTransportDependencies({
        healthService: mockHealthService,
        loggerService: mockLoggerService,
      });

      expect(dependencies.healthService).toBe(mockHealthService);
      expect(dependencies.loggerService).toBe(mockLoggerService);
      expect(dependencies.healthService!.getHealthStatus).toBeDefined();
      expect(dependencies.healthService!.getSimpleHealthStatus).toBeDefined();
      expect(dependencies.loggerService!.debug).toBeDefined();
      expect(dependencies.loggerService!.setContext).toBeDefined();
    });
  });

  describe('future service extensibility', () => {
    it('should support adding new services without breaking existing code', () => {
      // Simulate adding a new service in the future
      const extendedDependencies = {
        healthService: mockHealthService,
        loggerService: mockLoggerService,
        // Future services would go here
        // userService: mockUserService,
        // notificationService: mockNotificationService,
      };

      const result = createTransportDependencies(extendedDependencies);

      expect(result.healthService).toBe(mockHealthService);
      expect(result.loggerService).toBe(mockLoggerService);
    });

    it('should maintain backward compatibility', () => {
      // Old code should still work
      const oldStyleDeps = createTransportDependencies({
        healthService: mockHealthService,
        loggerService: mockLoggerService,
      });

      expect(oldStyleDeps).toBeDefined();
      expect(oldStyleDeps.healthService).toBe(mockHealthService);
      expect(oldStyleDeps.loggerService).toBe(mockLoggerService);
    });
  });
});
