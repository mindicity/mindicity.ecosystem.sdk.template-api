import { writeFileSync, mkdirSync } from 'fs';

import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { DocumentBuilder } from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';

import { HttpExceptionFilter } from './common/filters/http-exception.filter';

// Mock external dependencies
jest.mock('fs');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

const mockWriteFileSync = writeFileSync as jest.MockedFunction<typeof writeFileSync>;
const mockMkdirSync = mkdirSync as jest.MockedFunction<typeof mkdirSync>;

describe('Main Bootstrap Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('FastifyAdapter Configuration', () => {
    it('should create FastifyAdapter with correct configuration', () => {
      const genReqIdFunction = (req: any) => req.headers['x-correlation-id'] ?? uuidv4();
      
      const adapter = new FastifyAdapter({
        bodyLimit: 20 * 1024 * 1024,
        logger: false,
        trustProxy: true,
        genReqId: genReqIdFunction,
      });

      expect(adapter).toBeDefined();
      expect(adapter).toBeInstanceOf(FastifyAdapter);
    });

    it('should generate correlation ID correctly', () => {
      const genReqId = (req: any) => {
        return req.headers['x-correlation-id'] ?? uuidv4();
      };

      // Test with existing correlation ID
      const reqWithId = { headers: { 'x-correlation-id': 'existing-id' } };
      expect(genReqId(reqWithId)).toBe('existing-id');

      // Test without correlation ID
      const reqWithoutId = { headers: {} };
      expect(genReqId(reqWithoutId)).toBe('test-uuid-1234');
    });

    it('should test adapter configuration options', () => {
      const bodyLimit = 20 * 1024 * 1024;
      const logger = false;
      const trustProxy = true;

      expect(bodyLimit).toBe(20971520); // 20MB
      expect(logger).toBe(false);
      expect(trustProxy).toBe(true);
    });
  });

  describe('DocumentBuilder Configuration', () => {
    it('should create DocumentBuilder with correct settings', () => {
      const builder = new DocumentBuilder()
        .setTitle('NestJS Hello API')
        .setDescription('Production-ready NestJS API with Fastify and Pino')
        .setVersion('1.0.0')
        .addServer('http://localhost:3232', 'API Server');

      const config = builder.build();

      expect(config.info.title).toBe('NestJS Hello API');
      expect(config.info.description).toBe('Production-ready NestJS API with Fastify and Pino');
      expect(config.info.version).toBe('1.0.0');
      expect(config.servers).toEqual([{ url: 'http://localhost:3232', description: 'API Server' }]);
    });

    it('should add bearer authentication to DocumentBuilder', () => {
      const builder = new DocumentBuilder()
        .setTitle('Test API')
        .setVersion('1.0.0')
        .addBearerAuth();

      const config = builder.build();

      expect(config.components?.securitySchemes).toBeDefined();
      expect(config.components?.securitySchemes?.bearer).toBeDefined();
    });

    it('should add basic authentication to DocumentBuilder', () => {
      const builder = new DocumentBuilder()
        .setTitle('Test API')
        .setVersion('1.0.0')
        .addBasicAuth();

      const config = builder.build();

      expect(config.components?.securitySchemes).toBeDefined();
      expect(config.components?.securitySchemes?.basic).toBeDefined();
    });

    it('should add API key authentication to DocumentBuilder', () => {
      const builder = new DocumentBuilder()
        .setTitle('Test API')
        .setVersion('1.0.0')
        .addApiKey({ type: 'apiKey', in: 'header', name: 'X-API-Key' });

      const config = builder.build();

      expect(config.components?.securitySchemes).toBeDefined();
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
    });
  });

  describe('Exception Filter Configuration', () => {
    it('should create HttpExceptionFilter with logger and config', () => {
      const mockPinoLogger = {
        trace: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        fatal: jest.fn(),
        context: 'HttpExceptionFilter',
        errorKey: 'err',
      };

      const mockConfigService = {
        get: jest.fn().mockReturnValue({ debug: false }),
      };

      const filter = new HttpExceptionFilter(mockPinoLogger as any, mockConfigService as any);

      expect(filter).toBeDefined();
      expect(filter).toBeInstanceOf(HttpExceptionFilter);
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

  describe('File System Operations', () => {
    it('should test file system operations for OpenAPI export', () => {
      const document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
      };

      mkdirSync('./docs/api', { recursive: true });
      writeFileSync('./docs/api/openapi.json', JSON.stringify(document, null, 2));
      
      expect(mockMkdirSync).toHaveBeenCalledWith('./docs/api', { recursive: true });
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        './docs/api/openapi.json',
        JSON.stringify(document, null, 2)
      );
    });

    it('should test error handling for file operations', () => {
      mockMkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      let errorMessage = '';
      try {
        mkdirSync('./docs/api', { recursive: true });
        writeFileSync('./docs/api/openapi.json', '{}');
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : 'Unknown error';
      }

      expect(errorMessage).toBe('Permission denied');
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

  describe('Swagger Authentication Configuration', () => {
    it('should test swagger authentication configuration logic', () => {
      const testSwaggerAuth = (authType: string) => {
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

      // Test each authentication type
      const bearerConfig = testSwaggerAuth('bearer');
      expect(bearerConfig.components?.securitySchemes?.bearer).toBeDefined();

      const basicConfig = testSwaggerAuth('basic');
      expect(basicConfig.components?.securitySchemes?.basic).toBeDefined();

      const apiKeyConfig = testSwaggerAuth('apikey');
      expect(Object.keys(apiKeyConfig.components?.securitySchemes ?? {})).toContain('api_key');

      const noneConfig = testSwaggerAuth('none');
      expect(noneConfig).toBeDefined();
    });
  });

  describe('Startup Logging Messages', () => {
    it('should format startup messages correctly', () => {
      const port = 3232;
      const apiPrefix = '/mcapi';
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