import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';

import appConfig from './app.config';
import logConfig from './log.config';

/**
 * Feature: nestjs-hello-api, Property 1: Configuration validation consistency
 *
 * For any environment configuration input, the Configuration_Module should either
 * accept valid configurations and provide typed objects, or reject invalid
 * configurations with clear error messages
 *
 * Validates: Requirements 1.3
 */
describe('Configuration Validation Property Tests', () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let configService: ConfigService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [appConfig, logConfig],
          envFilePath: '.env',
        }),
      ],
    }).compile();

    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should validate app configuration consistently across various inputs', () => {
    fc.assert(
      fc.property(
        fc.record({
          APP_PORT: fc.oneof(
            fc.integer({ min: 1, max: 65535 }).map(String),
            fc.constant('3232'),
            fc.constant(undefined),
          ),
          APP_API_PREFIX: fc.oneof(
            fc.string({ minLength: 1, maxLength: 50 }).map((s) => `/${s}`),
            fc.constant('/mcapi'),
            fc.constant(undefined),
          ),
          APP_API_SCOPE_PREFIX: fc.oneof(
            fc.string({ maxLength: 20 }),
            fc.constant(''),
            fc.constant(undefined),
          ),
          APP_CORS_ENABLED: fc.oneof(
            fc.boolean().map(String),
            fc.constant('true'),
            fc.constant('false'),
            fc.constant(undefined),
          ),
          APP_ERR_DETAIL: fc.oneof(
            fc.boolean().map(String),
            fc.constant('true'),
            fc.constant('false'),
            fc.constant(undefined),
          ),
          APP_ERR_MESSAGE: fc.oneof(
            fc.boolean().map(String),
            fc.constant('true'),
            fc.constant('false'),
            fc.constant(undefined),
          ),
        }),
        (envVars) => {
          // Arrange: Set up environment variables
          const originalEnv = { ...process.env };

          try {
            // Clear relevant env vars and set test values
            Object.keys(envVars).forEach((key) => {
              const value = envVars[key as keyof typeof envVars];
              if (value !== undefined) {
                process.env[key] = value;
              } else {
                delete process.env[key];
              }
            });

            // Act: Try to load configuration
            const config = appConfig();

            // Assert: Configuration should be valid and have expected properties
            expect(config).toBeDefined();
            expect(typeof config.port).toBe('number');
            expect(config.port).toBeGreaterThan(0);
            expect(config.port).toBeLessThanOrEqual(65535);
            expect(typeof config.apiPrefix).toBe('string');
            expect(config.apiPrefix.startsWith('/')).toBe(true);
            expect(typeof config.apiScopePrefix).toBe('string');
            expect(typeof config.corsEnabled).toBe('boolean');
            expect(typeof config.errDetail).toBe('boolean');
            expect(typeof config.errMessage).toBe('boolean');
            expect(typeof config.bodyParserLimit).toBe('string');
            expect(typeof config.enableCompression).toBe('boolean');
            expect(typeof config.swaggerHostname).toBe('string');
            expect(typeof config.swaggerAuth).toBe('string');
            expect(['bearer', 'basic', 'apikey', 'none']).toContain(config.swaggerAuth);
          } finally {
            // Restore original environment
            process.env = originalEnv;
          }
        },
      ),
      { numRuns: 3 },
    );
  });

  it('should validate log configuration consistently across various inputs', () => {
    fc.assert(
      fc.property(
        fc.record({
          APP_LOG_LEVEL: fc.oneof(
            fc.constantFrom('trace', 'debug', 'info', 'warn', 'error', 'fatal'),
            fc.constant('debug'),
            fc.constant(undefined),
          ),
          APP_LOG_TRANSPORTS: fc.oneof(
            fc.constantFrom('console', 'file', 'both'),
            fc.constant('console'),
            fc.constant(undefined),
          ),
          APP_LOG_PREFIX: fc.oneof(
            fc.string({ minLength: 1, maxLength: 10 }).map((s) => `${s}_`),
            fc.constant('api'),
            fc.constant(undefined),
          ),

          APP_LOG_HTTP_DETAILS: fc.oneof(
            fc.constantFrom('none', 'basic', 'full'),
            fc.constant('basic'),
            fc.constant(undefined),
          ),
        }),
        (envVars) => {
          // Arrange: Set up environment variables
          const originalEnv = { ...process.env };

          try {
            // Clear relevant env vars and set test values
            Object.keys(envVars).forEach((key) => {
              const value = envVars[key as keyof typeof envVars];
              if (value !== undefined) {
                process.env[key] = value;
              } else {
                delete process.env[key];
              }
            });

            // Act: Try to load configuration
            const config = logConfig();

            // Assert: Configuration should be valid and have expected properties
            expect(config).toBeDefined();
            expect(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).toContain(config.level);
            expect(typeof config.transports).toBe('string');
            expect(typeof config.prefix).toBe('string');
            expect(typeof config.prettyPrint).toBe('boolean');
            expect(['none', 'basic', 'full']).toContain(config.httpDetails);
            expect(typeof config.fileMaxSize).toBe('string');
            expect(['daily', 'hourly', 'weekly']).toContain(config.fileFrequency);
          } finally {
            // Restore original environment
            process.env = originalEnv;
          }
        },
      ),
      { numRuns: 3 },
    );
  });

  it('should handle invalid port values correctly', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ max: 0 }).map(String), // Invalid: <= 0 (parsed but rejected by Zod)
          fc.integer({ min: 65536 }).map(String), // Invalid: > 65535 (parsed but rejected by Zod)
        ),
        (invalidPort) => {
          // Arrange: Set up invalid port that parses to a number but fails Zod validation
          const originalEnv = { ...process.env };

          try {
            process.env.APP_PORT = invalidPort;

            // Act & Assert: Should throw Zod validation error for out-of-range ports
            expect(() => appConfig()).toThrow();
          } finally {
            // Restore original environment
            process.env = originalEnv;
          }
        },
      ),
      { numRuns: 3 },
    );
  });

  it('should use default port for non-numeric port values', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => {
          // Filter out strings that could parse to valid numbers (including 0)
          const trimmed = s.trim();
          return !/^\d+$/.test(trimmed) && trimmed !== '' && isNaN(Number(trimmed));
        }),
        (invalidPort) => {
          // Arrange: Set up non-numeric port
          const originalEnv = { ...process.env };

          try {
            process.env.APP_PORT = invalidPort;

            // Act: Load configuration with non-numeric port
            const config = appConfig();

            // Assert: Should use default port value (3232) for non-numeric inputs
            expect(config).toBeDefined();
            expect(config.port).toBe(3232); // Default port
            expect(typeof config.port).toBe('number');
          } finally {
            // Restore original environment
            process.env = originalEnv;
          }
        },
      ),
      { numRuns: 3 },
    );
  });

  it('should handle invalid log levels gracefully by using defaults', () => {
    fc.assert(
      fc.property(
        fc
          .string()
          .filter(
            (s) => !['trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(s) && s !== '',
          ),
        (invalidLevel) => {
          // Arrange: Set up invalid log level
          const originalEnv = { ...process.env };

          try {
            process.env.APP_LOG_LEVEL = invalidLevel;

            // Act: Load configuration with invalid log level
            const config = logConfig();

            // Assert: Should use default log level ('debug') for invalid inputs
            expect(config).toBeDefined();
            expect(config.level).toBe('debug'); // Default log level
            expect(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).toContain(config.level);
          } finally {
            // Restore original environment
            process.env = originalEnv;
          }
        },
      ),
      { numRuns: 3 },
    );
  });
});
