import { ExecutionContext, CallHandler } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { FastifyRequest, FastifyReply } from 'fastify';
import { getLoggerToken, PinoLogger } from 'nestjs-pino';
import { of, throwError } from 'rxjs';

import { HttpLoggingInterceptor } from './http-logging.interceptor';

describe('HttpLoggingInterceptor', () => {
  let interceptor: HttpLoggingInterceptor;
  let mockLogger: jest.Mocked<PinoLogger>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockChildLogger: jest.Mocked<any>;

  beforeEach(async () => {
    mockChildLogger = {
      info: jest.fn(),
      error: jest.fn(),
    };

    mockLogger = {
      logger: {
        child: jest.fn().mockReturnValue(mockChildLogger),
      },
    } as any;

    mockConfigService = {
      get: jest.fn().mockReturnValue({
        httpDetails: 'basic',
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HttpLoggingInterceptor,
        {
          provide: getLoggerToken(HttpLoggingInterceptor.name),
          useValue: mockLogger,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    interceptor = module.get<HttpLoggingInterceptor>(HttpLoggingInterceptor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('intercept', () => {
    let mockRequest: Partial<FastifyRequest>;
    let mockResponse: Partial<FastifyReply>;
    let mockContext: Partial<ExecutionContext>;
    let mockCallHandler: Partial<CallHandler>;

    beforeEach(() => {
      mockRequest = {
        method: 'GET',
        url: '/test',
        headers: {
          authorization:
            'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsInJvbGUiOiJ1c2VyIn0.test',
          'user-agent': 'test-agent',
        },
        ip: '127.0.0.1',
        query: { param: 'value' },
        params: { id: '123' },
      };

      mockResponse = {
        statusCode: 200,
        getHeader: jest.fn().mockReturnValue('100'),
        getHeaders: jest.fn().mockReturnValue({
          'content-type': 'application/json',
          'content-length': '100',
        }),
      };

      mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      };

      mockCallHandler = {
        handle: jest.fn().mockReturnValue(of('test response')),
      };
    });

    it('should be defined', () => {
      expect(interceptor).toBeDefined();
    });

    it('should log successful requests', (done) => {
      const result = interceptor.intercept(
        mockContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      result.subscribe({
        next: (response) => {
          expect(response).toBe('test response');
          expect(mockLogger.logger.child).toHaveBeenCalledWith({
            correlationId: expect.any(String),
            userId: 'user-123',
          });
          expect(mockChildLogger.info).toHaveBeenCalledWith(
            expect.objectContaining({
              http: expect.objectContaining({
                method: 'GET',
                url: '/test',
                statusCode: 200,
                contentLength: '100',
                duration: expect.any(Number),
                userAgent: 'test-agent',
              }),
            }),
            expect.stringContaining('GET /test - 200'),
          );
          done();
        },
        error: done,
      });
    });

    it('should log error requests', (done) => {
      const error = new Error('Test error');
      (error as any).status = 400;
      mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => error));

      const result = interceptor.intercept(
        mockContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      result.subscribe({
        next: () => done(new Error('Should not reach here')),
        error: (err) => {
          expect(err).toBe(error);
          expect(mockChildLogger.error).toHaveBeenCalledWith(
            expect.objectContaining({
              http: expect.objectContaining({
                method: 'GET',
                url: '/test',
                statusCode: 400,
                duration: expect.any(Number),
              }),
            }),
            expect.stringContaining('GET /test - 400 - Test error'),
          );
          done();
        },
      });
    });

    it('should handle requests without authorization header', (done) => {
      mockRequest.headers = { 'user-agent': 'test-agent' };

      const result = interceptor.intercept(
        mockContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      result.subscribe({
        next: () => {
          expect(mockLogger.logger.child).toHaveBeenCalledWith({
            correlationId: expect.any(String),
            userId: 'anonymous',
          });
          done();
        },
        error: done,
      });
    });

    it('should set correlation ID on request', (done) => {
      const result = interceptor.intercept(
        mockContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      result.subscribe({
        next: () => {
          expect(mockRequest.id).toBeDefined();
          expect(typeof mockRequest.id).toBe('string');
          done();
        },
        error: done,
      });
    });
  });

  describe('log configuration', () => {
    let mockRequest: Partial<FastifyRequest>;
    let mockResponse: Partial<FastifyReply>;
    let mockContext: Partial<ExecutionContext>;
    let mockCallHandler: Partial<CallHandler>;

    beforeEach(() => {
      mockRequest = {
        method: 'GET',
        url: '/test',
        headers: { 'user-agent': 'test-agent' },
        ip: '127.0.0.1',
        query: { param: 'value' },
        params: { id: '123' },
      };

      mockResponse = {
        statusCode: 200,
        getHeader: jest.fn().mockReturnValue('100'),
        getHeaders: jest.fn().mockReturnValue({
          'content-type': 'application/json',
        }),
      };

      mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      };

      mockCallHandler = {
        handle: jest.fn().mockReturnValue(of('test response')),
      };
    });

    it('should handle "none" http details configuration', (done) => {
      mockConfigService.get.mockReturnValue({ httpDetails: 'none' });

      const result = interceptor.intercept(
        mockContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      result.subscribe({
        next: () => {
          expect(mockChildLogger.info).toHaveBeenCalledWith(
            expect.stringContaining('GET /test - 200'),
          );
          done();
        },
        error: done,
      });
    });

    it('should handle "full" http details configuration', (done) => {
      mockConfigService.get.mockReturnValue({ httpDetails: 'full' });

      const result = interceptor.intercept(
        mockContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      result.subscribe({
        next: () => {
          expect(mockChildLogger.info).toHaveBeenCalledWith(
            expect.objectContaining({
              http: expect.objectContaining({
                method: 'GET',
                url: '/test',
                headers: expect.any(Object),
                query: { param: 'value' },
                params: { id: '123' },
                ip: '127.0.0.1',
              }),
              response: expect.objectContaining({
                headers: expect.any(Object),
              }),
            }),
            expect.any(String),
          );
          done();
        },
        error: done,
      });
    });
  });

  describe('header sanitization', () => {
    let mockRequest: Partial<FastifyRequest>;
    let mockResponse: Partial<FastifyReply>;
    let mockContext: Partial<ExecutionContext>;
    let mockCallHandler: Partial<CallHandler>;

    beforeEach(() => {
      mockRequest = {
        method: 'GET',
        url: '/test',
        headers: {
          authorization: 'Bearer secret-token',
          cookie: 'session=secret-session',
          'x-api-key': 'secret-api-key',
          'user-agent': 'test-agent',
          'content-type': 'application/json',
        },
      };

      mockResponse = {
        statusCode: 200,
        getHeader: jest.fn().mockReturnValue('100'),
        getHeaders: jest.fn().mockReturnValue({
          'content-type': 'application/json',
          'set-cookie': 'session=new-session',
        }),
      };

      mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      };

      mockCallHandler = {
        handle: jest.fn().mockReturnValue(of('test response')),
      };
    });

    it('should sanitize sensitive request headers', (done) => {
      mockConfigService.get.mockReturnValue({ httpDetails: 'full' });

      const result = interceptor.intercept(
        mockContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      result.subscribe({
        next: () => {
          const logCall = mockChildLogger.info.mock.calls[0];
          const logData = logCall[0];

          expect(logData.http.headers.authorization).toBe('[REDACTED]');
          expect(logData.http.headers.cookie).toBe('[REDACTED]');
          expect(logData.http.headers['x-api-key']).toBe('[REDACTED]');
          expect(logData.http.headers['user-agent']).toBe('test-agent');
          expect(logData.http.headers['content-type']).toBe('application/json');
          done();
        },
        error: done,
      });
    });

    it('should sanitize sensitive response headers', (done) => {
      mockConfigService.get.mockReturnValue({ httpDetails: 'full' });

      const result = interceptor.intercept(
        mockContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      result.subscribe({
        next: () => {
          const logCall = mockChildLogger.info.mock.calls[0];
          const logData = logCall[0];

          expect(logData.response.headers['set-cookie']).toBe('[REDACTED]');
          expect(logData.response.headers['content-type']).toBe('application/json');
          done();
        },
        error: done,
      });
    });

    it('should handle array header values', (done) => {
      mockRequest.headers = {
        'x-forwarded-for': ['127.0.0.1', '192.168.1.1'],
        authorization: 'Bearer token1',
      };
      mockConfigService.get.mockReturnValue({ httpDetails: 'full' });

      const result = interceptor.intercept(
        mockContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      result.subscribe({
        next: () => {
          const logCall = mockChildLogger.info.mock.calls[0];
          const logData = logCall[0];

          expect(logData.http.headers['x-forwarded-for']).toBe('127.0.0.1, 192.168.1.1');
          expect(logData.http.headers.authorization).toBe('[REDACTED]');
          done();
        },
        error: done,
      });
    });

    it('should handle undefined header values', (done) => {
      mockRequest.headers = {
        'user-agent': 'test-agent',
        'undefined-header': undefined,
      };
      mockConfigService.get.mockReturnValue({ httpDetails: 'full' });

      const result = interceptor.intercept(
        mockContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      result.subscribe({
        next: () => {
          const logCall = mockChildLogger.info.mock.calls[0];
          const logData = logCall[0];

          expect(logData.http.headers['user-agent']).toBe('test-agent');
          expect(logData.http.headers['undefined-header']).toBeUndefined();
          done();
        },
        error: done,
      });
    });
  });

  describe('content length handling', () => {
    let mockRequest: Partial<FastifyRequest>;
    let mockResponse: Partial<FastifyReply>;
    let mockContext: Partial<ExecutionContext>;
    let mockCallHandler: Partial<CallHandler>;

    beforeEach(() => {
      mockRequest = {
        method: 'GET',
        url: '/test',
        headers: {},
      };

      mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      };

      mockCallHandler = {
        handle: jest.fn().mockReturnValue(of('test response')),
      };
    });

    it('should handle array content-length header', (done) => {
      mockResponse = {
        statusCode: 200,
        getHeader: jest.fn().mockReturnValue(['100', '200']),
        getHeaders: jest.fn().mockReturnValue({}),
      };

      const result = interceptor.intercept(
        mockContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      result.subscribe({
        next: () => {
          expect(mockChildLogger.info).toHaveBeenCalledWith(
            expect.objectContaining({
              http: expect.objectContaining({
                contentLength: '100',
              }),
            }),
            expect.any(String),
          );
          done();
        },
        error: done,
      });
    });

    it('should handle missing content-length header', (done) => {
      mockResponse = {
        statusCode: 200,
        getHeader: jest.fn().mockReturnValue(undefined),
        getHeaders: jest.fn().mockReturnValue({}),
      };

      const result = interceptor.intercept(
        mockContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      result.subscribe({
        next: () => {
          expect(mockChildLogger.info).toHaveBeenCalledWith(
            expect.objectContaining({
              http: expect.objectContaining({
                contentLength: 0,
              }),
            }),
            expect.any(String),
          );
          done();
        },
        error: done,
      });
    });
  });

  describe('error handling', () => {
    let mockRequest: Partial<FastifyRequest>;
    let mockResponse: Partial<FastifyReply>;
    let mockContext: Partial<ExecutionContext>;
    let mockCallHandler: Partial<CallHandler>;

    beforeEach(() => {
      mockRequest = {
        method: 'POST',
        url: '/test-error',
        headers: {},
      };

      mockResponse = {
        statusCode: 200,
        getHeader: jest.fn().mockReturnValue('100'),
        getHeaders: jest.fn().mockReturnValue({}),
      };

      mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      };

      mockCallHandler = {
        handle: jest.fn(),
      };
    });

    it('should log errors with proper format', (done) => {
      const error = new Error('Test error') as any;
      error.status = 400;

      mockCallHandler.handle = jest.fn().mockReturnValue(throwError(error));

      const result = interceptor.intercept(
        mockContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      result.subscribe({
        error: (err) => {
          expect(err).toBe(error);
          expect(mockChildLogger.error).toHaveBeenCalledWith(
            expect.objectContaining({
              http: expect.objectContaining({
                statusCode: 400,
              }),
            }),
            expect.stringContaining('POST /test-error - 400 - Test error'),
          );
          done();
        },
      });
    });

    it('should handle errors without status code', (done) => {
      const error = new Error('Test error without status');
      // Set response status to 500 since error has no status
      mockResponse.statusCode = 500;

      mockCallHandler.handle = jest.fn().mockReturnValue(throwError(error));

      const result = interceptor.intercept(
        mockContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      result.subscribe({
        error: (err) => {
          expect(err).toBe(error);
          expect(mockChildLogger.error).toHaveBeenCalledWith(
            expect.objectContaining({
              http: expect.objectContaining({
                statusCode: 500,
              }),
            }),
            expect.stringContaining('POST /test-error - 500'),
          );
          done();
        },
      });
    });

    it('should use response status code when error has no status', (done) => {
      const error = new Error('Test error');
      mockResponse.statusCode = 422;

      mockCallHandler.handle = jest.fn().mockReturnValue(throwError(error));

      const result = interceptor.intercept(
        mockContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      result.subscribe({
        error: (err) => {
          expect(err).toBe(error);
          expect(mockChildLogger.error).toHaveBeenCalledWith(
            expect.objectContaining({
              http: expect.objectContaining({
                statusCode: 422,
              }),
            }),
            expect.stringContaining('POST /test-error - 422'),
          );
          done();
        },
      });
    });
  });

  describe('log configuration edge cases', () => {
    let mockRequest: Partial<FastifyRequest>;
    let mockResponse: Partial<FastifyReply>;
    let mockContext: Partial<ExecutionContext>;
    let mockCallHandler: Partial<CallHandler>;

    beforeEach(() => {
      mockRequest = {
        method: 'GET',
        url: '/test-config',
        headers: {},
      };

      mockResponse = {
        statusCode: 200,
        getHeader: jest.fn().mockReturnValue('100'),
        getHeaders: jest.fn().mockReturnValue({}),
      };

      mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      };

      mockCallHandler = {
        handle: jest.fn().mockReturnValue(of('test response')),
      };
    });

    it('should handle missing log config', (done) => {
      mockConfigService.get.mockReturnValue(undefined);

      const result = interceptor.intercept(
        mockContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      result.subscribe({
        next: () => {
          expect(mockChildLogger.info).toHaveBeenCalledWith(
            expect.objectContaining({
              http: expect.any(Object),
            }),
            expect.any(String),
          );
          done();
        },
        error: done,
      });
    });

    it('should return undefined for none httpDetails', (done) => {
      mockConfigService.get.mockReturnValue({ httpDetails: 'none' });

      const result = interceptor.intercept(
        mockContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      result.subscribe({
        next: () => {
          expect(mockChildLogger.info).toHaveBeenCalledWith(
            expect.stringContaining('GET /test-config - 200'),
          );
          done();
        },
        error: done,
      });
    });

    it('should handle unknown httpDetails value', (done) => {
      mockConfigService.get.mockReturnValue({ httpDetails: 'unknown' });

      const result = interceptor.intercept(
        mockContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      result.subscribe({
        next: () => {
          expect(mockChildLogger.info).toHaveBeenCalledWith(
            expect.stringContaining('GET /test-config - 200'),
          );
          done();
        },
        error: done,
      });
    });

    it('should log without data when logData is undefined', (done) => {
      mockConfigService.get.mockReturnValue({ httpDetails: 'none' });

      const result = interceptor.intercept(
        mockContext as ExecutionContext,
        mockCallHandler as CallHandler,
      );

      result.subscribe({
        next: () => {
          // Should call info with just the message, no data object
          expect(mockChildLogger.info).toHaveBeenCalledWith(
            expect.stringContaining('GET /test-config - 200')
          );
          // Verify it was called with only one argument (message only)
          const infoCall = mockChildLogger.info.mock.calls[0];
          expect(infoCall).toHaveLength(1);
          done();
        },
        error: done,
      });
    });
  });
});
