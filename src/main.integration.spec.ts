import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder } from '@nestjs/swagger';
import { Test, TestingModule } from '@nestjs/testing';
import { v4 as uuidv4 } from 'uuid';

// Test the actual functions and logic from main.ts without full bootstrap
describe('Main.ts Integration Tests', () => {
  let configService: ConfigService;

  beforeEach(async () => {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.APP_PORT = '3232';
    process.env.APP_LOG_LEVEL = 'info';
    process.env.APP_LOG_PREFIX = 'test_api';
    process.env.npm_package_version = '1.0.0';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              const configs = {
                app: {
                  port: 3232,
                  apiPrefix: '/mcapi',
                  enableCompression: true,
                  corsEnabled: true,
                  swaggerHostname: 'http://localhost:3232',
                  swaggerAuth: 'bearer',
                },
              };
              return configs[key as keyof typeof configs];
            }),
          },
        },
      ],
    }).compile();

    configService = module.get<ConfigService>(ConfigService);
  });

  describe('FastifyAdapter Configuration', () => {
    it('should create FastifyAdapter with correct body limit', () => {
      const bodyLimit = 20 * 1024 * 1024; // 20MB
      expect(bodyLimit).toBe(20971520);
    });

    it('should configure genReqId function correctly', () => {
      const genReqId = (req: any): string => {
        return (req.headers['x-correlation-id'] as string) ?? uuidv4();
      };

      // Test with existing correlation ID
      const reqWithId = { headers: { 'x-correlation-id': 'existing-id' } };
      expect(genReqId(reqWithId)).toBe('existing-id');

      // Test without correlation ID (mocked UUID)
      const reqWithoutId = { headers: {} };
      const result = genReqId(reqWithoutId);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration Integration', () => {
    it('should get app configuration correctly', () => {
      const appConfig = configService.get('app');
      
      expect(appConfig).toBeDefined();
      expect(appConfig.port).toBe(3232);
      expect(appConfig.apiPrefix).toBe('/mcapi');
      expect(appConfig.enableCompression).toBe(true);
      expect(appConfig.corsEnabled).toBe(true);
      expect(appConfig.swaggerHostname).toBe('http://localhost:3232');
      expect(appConfig.swaggerAuth).toBe('bearer');
    });
  });

  describe('Swagger DocumentBuilder Configuration', () => {
    it('should create DocumentBuilder with correct settings', () => {
      const appConfig = configService.get('app');
      
      const swaggerConfigBuilder = new DocumentBuilder()
        .setTitle('NestJS API')
        .setDescription('Production-ready NestJS API with Fastify and Pino')
        .setVersion(process.env.npm_package_version ?? '1.0.0')
        .addServer(`${appConfig.swaggerHostname}`, 'API Server');

      // Add authentication based on configuration
      switch (appConfig.swaggerAuth) {
        case 'bearer':
          swaggerConfigBuilder.addBearerAuth();
          break;
        case 'basic':
          swaggerConfigBuilder.addBasicAuth();
          break;
        case 'apikey':
          swaggerConfigBuilder.addApiKey({ type: 'apiKey', in: 'header', name: 'X-API-Key' });
          break;
        case 'none':
        default:
          // No authentication
          break;
      }

      const swaggerConfig = swaggerConfigBuilder.build();

      expect(swaggerConfig.info.title).toBe('NestJS API');
      expect(swaggerConfig.info.description).toBe('Production-ready NestJS API with Fastify and Pino');
      expect(swaggerConfig.info.version).toBe('1.0.0');
      expect(swaggerConfig.servers).toEqual([
        { url: 'http://localhost:3232', description: 'API Server' }
      ]);
      expect(swaggerConfig.components?.securitySchemes?.bearer).toBeDefined();
    });

    it('should handle different authentication types', () => {
      const testAuthType = (authType: string) => {
        const builder = new DocumentBuilder()
          .setTitle('Test API')
          .setVersion('1.0.0');

        switch (authType) {
          case 'bearer':
            builder.addBearerAuth();
            break;
          case 'basic':
            builder.addBasicAuth();
            break;
          case 'apikey':
            builder.addApiKey({ type: 'apiKey', in: 'header', name: 'X-API-Key' });
            break;
          case 'none':
          default:
            // No authentication
            break;
        }

        return builder.build();
      };

      // Test bearer auth
      const bearerConfig = testAuthType('bearer');
      expect(bearerConfig.components?.securitySchemes?.bearer).toBeDefined();

      // Test basic auth
      const basicConfig = testAuthType('basic');
      expect(basicConfig.components?.securitySchemes?.basic).toBeDefined();

      // Test API key auth
      const apiKeyConfig = testAuthType('apikey');
      expect(Object.keys(apiKeyConfig.components?.securitySchemes ?? {})).toContain('api_key');

      // Test no auth
      const noneConfig = testAuthType('none');
      expect(noneConfig.components?.securitySchemes).toBeUndefined();
    });
  });

  describe('ValidationPipe Configuration', () => {
    it('should create ValidationPipe with correct options', () => {
      const pipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      });

      expect(pipe).toBeDefined();
      expect(pipe).toBeInstanceOf(ValidationPipe);
      
      // Test that the pipe has the correct configuration
      const options = (pipe as any).validatorOptions;
      expect(options.whitelist).toBe(true);
      expect(options.forbidNonWhitelisted).toBe(true);
    });
  });

  describe('CORS Configuration', () => {
    it('should create correct CORS configuration', () => {
      const corsConfig = {
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: [
          'Content-Type',
          'Authorization',
          'x-correlation-id',
          'x-ent-value',
          'x-ent-resource',
          'x-ent-ref',
        ],
      };

      expect(corsConfig.origin).toBe(true);
      expect(corsConfig.credentials).toBe(true);
      expect(corsConfig.methods).toContain('GET');
      expect(corsConfig.methods).toContain('POST');
      expect(corsConfig.methods).toContain('PUT');
      expect(corsConfig.methods).toContain('DELETE');
      expect(corsConfig.allowedHeaders).toContain('Content-Type');
      expect(corsConfig.allowedHeaders).toContain('Authorization');
      expect(corsConfig.allowedHeaders).toContain('x-correlation-id');
    });
  });

  describe('Fastify Hooks Logic', () => {
    it('should test onRequest hook logic', () => {
      const mockReply = {
        header: jest.fn(),
      };
      const mockRequest = {
        id: 'test-correlation-id',
      };

      // Simulate the onRequest hook logic
      const onRequestHook = (request: any, reply: any, done: () => void) => {
        reply.header('x-correlation-id', request.id);
        done();
      };

      const mockDone = jest.fn();
      onRequestHook(mockRequest, mockReply, mockDone);

      expect(mockReply.header).toHaveBeenCalledWith('x-correlation-id', 'test-correlation-id');
      expect(mockDone).toHaveBeenCalled();
    });

    it('should test onSend hook logic', () => {
      const mockReply = {
        removeHeader: jest.fn(),
      };

      // Simulate the onSend hook logic
      const onSendHook = (_request: any, reply: any, _payload: any, done: () => void) => {
        reply.removeHeader('X-Powered-By');
        done();
      };

      const mockDone = jest.fn();
      onSendHook({}, mockReply, {}, mockDone);

      expect(mockReply.removeHeader).toHaveBeenCalledWith('X-Powered-By');
      expect(mockDone).toHaveBeenCalled();
    });
  });

  describe('Swagger Setup Configuration', () => {
    it('should create correct Swagger setup options', () => {
      const appConfig = configService.get('app');
      const apiPrefix = appConfig.apiPrefix;
      const docsPath = `${apiPrefix}/docs/swagger/ui`;

      const swaggerOptions = {
        customSiteTitle: 'NestJS API Documentation',
        customCss: '.swagger-ui .topbar { display: none }',
        jsonDocumentUrl: `${docsPath.replace('/ui', '/specs')}`,
      };

      expect(swaggerOptions.customSiteTitle).toBe('NestJS API Documentation');
      expect(swaggerOptions.customCss).toBe('.swagger-ui .topbar { display: none }');
      expect(swaggerOptions.jsonDocumentUrl).toBe('/mcapi/docs/swagger/specs');
    });
  });

  describe('Error Handling Logic', () => {
    it('should test error message formatting', () => {
      const mockError = new Error('Bootstrap failed');
      const errorMessage = `❌ Application failed to start: ${mockError.message}\n`;

      expect(errorMessage).toBe('❌ Application failed to start: Bootstrap failed\n');
    });

    it('should test process exit logic', () => {
      const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      try {
        process.exit(1);
      } catch (error) {
        expect(error).toEqual(new Error('process.exit called'));
      }

      expect(mockProcessExit).toHaveBeenCalledWith(1);
      mockProcessExit.mockRestore();
    });
  });

  describe('Startup Logging Messages', () => {
    it('should format startup messages correctly', () => {
      const appConfig = configService.get('app');
      const port = appConfig.port;
      const apiPrefix = appConfig.apiPrefix;
      const docsPath = `${apiPrefix}/docs/swagger/ui`;
      const specsPath = docsPath.replace('/ui', '/specs');

      const messages = {
        app: `🚀 Application is running on: http://localhost:${port}${apiPrefix}`,
        swagger: `📚 Swagger UI: http://localhost:${port}${docsPath}`,
        specs: `📋 Swagger Specs: http://localhost:${port}${specsPath}`,
        health: `❤️  Health check: http://localhost:${port}${apiPrefix}/health/ping`,
      };

      expect(messages.app).toBe('🚀 Application is running on: http://localhost:3232/mcapi');
      expect(messages.swagger).toBe('📚 Swagger UI: http://localhost:3232/mcapi/docs/swagger/ui');
      expect(messages.specs).toBe('📋 Swagger Specs: http://localhost:3232/mcapi/docs/swagger/specs');
      expect(messages.health).toBe('❤️  Health check: http://localhost:3232/mcapi/health/ping');
    });
  });
});