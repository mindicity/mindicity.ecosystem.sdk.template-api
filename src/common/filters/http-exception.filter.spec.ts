import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';
import { PinoLogger } from 'nestjs-pino';

import { BaseException } from '../exceptions/base.exception';
import { InternalServerException } from '../exceptions/internal-server.exception';
import { NotFoundException } from '../exceptions/not-found.exception';
import { ValidationException } from '../exceptions/validation.exception';

import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockPinoLogger: jest.Mocked<PinoLogger>;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    // Create mock PinoLogger
    mockPinoLogger = {
      error: jest.fn(),
      setContext: jest.fn(),
    } as any;

    // Create mock ConfigService
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        switch (key) {
          case 'app.errDetail':
            return false;
          case 'app.errMessage':
            return false;
          default:
            return undefined;
        }
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HttpExceptionFilter,
        {
          provide: PinoLogger,
          useValue: mockPinoLogger,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    filter = module.get<HttpExceptionFilter>(HttpExceptionFilter);
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  /**
   * **Feature: nestjs-hello-api, Property 9: Error response structure**
   * **Validates: Requirements 4.1**
   */
  it('should return structured error response for any invalid request', () => {
    fc.assert(
      fc.property(
        fc.record({
          exceptionType: fc.constantFrom('validation', 'notFound', 'internal', 'generic'),
          message: fc.string({ minLength: 1, maxLength: 100 }),
          url: fc.webUrl(),
          resource: fc.string({ minLength: 1, maxLength: 50 }),
          id: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        (testData) => {
          // Arrange: Create different types of exceptions
          let exception: Error;
          switch (testData.exceptionType) {
            case 'validation':
              exception = new ValidationException(testData.message, testData.url);
              break;
            case 'notFound':
              exception = new NotFoundException(testData.resource, testData.id, testData.url);
              break;
            case 'internal':
              exception = new InternalServerException(testData.message, testData.url);
              break;
            default:
              exception = new HttpException(testData.message, HttpStatus.BAD_REQUEST);
              break;
          }

          const mockResponse = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
          };

          const mockRequest = {
            url: testData.url,
            headers: {},
          };

          const mockHost = {
            switchToHttp: () => ({
              getResponse: () => mockResponse,
              getRequest: () => mockRequest,
            }),
          } as ArgumentsHost;

          // Act: Execute the filter
          filter.catch(exception, mockHost);

          // Assert: Verify structured error response
          expect(mockResponse.send).toHaveBeenCalledTimes(1);
          const errorResponse = mockResponse.send.mock.calls[0][0];

          // Check required fields are present
          expect(errorResponse).toHaveProperty('id');
          expect(errorResponse).toHaveProperty('instance');
          expect(errorResponse).toHaveProperty('status');
          expect(errorResponse).toHaveProperty('type');
          expect(errorResponse).toHaveProperty('errcode');
          // Message field should NOT be present when APP_ERR_MESSAGE=false
          expect(errorResponse).not.toHaveProperty('message');

          // Check field types
          expect(typeof errorResponse.id).toBe('string');
          expect(typeof errorResponse.instance).toBe('string');
          expect(typeof errorResponse.status).toBe('number');
          expect(typeof errorResponse.type).toBe('string');
          expect(typeof errorResponse.errcode).toBe('string');

          // Check field values are not empty
          expect(errorResponse.id.length).toBeGreaterThan(0);
          expect(errorResponse.instance).toBe(testData.url);
          expect(errorResponse.status).toBeGreaterThan(0);
          expect(errorResponse.type.length).toBeGreaterThan(0);
          expect(errorResponse.errcode.length).toBeGreaterThan(0);

          // Check status code is set correctly on response
          expect(mockResponse.status).toHaveBeenCalledWith(errorResponse.status);

          // For BaseException instances, check specific properties
          if (exception instanceof BaseException) {
            // Note: The error ID is now the correlation ID for traceability, not the exception ID
            expect(errorResponse.type).toBe(exception.type);
            expect(errorResponse.errcode).toBe(exception.errcode);
          }

          return true;
        },
      ),
      { numRuns: 3 },
    );
  });

  /**
   * **Feature: nestjs-hello-api, Property 13: Error ID uniqueness**
   * **Validates: Requirements 4.5**
   */
  it('should include unique error IDs for tracking purposes', () => {
    const generatedIds = new Set<string>();

    fc.assert(
      fc.property(
        fc.record({
          exceptionType: fc.constantFrom('validation', 'notFound', 'internal', 'generic'),
          message: fc.string({ minLength: 1, maxLength: 100 }),
          url: fc.webUrl(),
          resource: fc.string({ minLength: 1, maxLength: 50 }),
          id: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        (testData) => {
          // Arrange: Create different types of exceptions
          let exception: Error;
          switch (testData.exceptionType) {
            case 'validation':
              exception = new ValidationException(testData.message, testData.url);
              break;
            case 'notFound':
              exception = new NotFoundException(testData.resource, testData.id, testData.url);
              break;
            case 'internal':
              exception = new InternalServerException(testData.message, testData.url);
              break;
            default:
              exception = new HttpException(testData.message, HttpStatus.BAD_REQUEST);
              break;
          }

          const mockResponse = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
          };

          const mockRequest = {
            url: testData.url,
            headers: {},
          };

          const mockHost = {
            switchToHttp: () => ({
              getResponse: () => mockResponse,
              getRequest: () => mockRequest,
            }),
          } as ArgumentsHost;

          // Act: Execute the filter
          filter.catch(exception, mockHost);

          // Assert: Verify error ID uniqueness
          expect(mockResponse.send).toHaveBeenCalledTimes(1);
          const errorResponse = mockResponse.send.mock.calls[0][0];

          // Check that error ID exists and is a string
          expect(errorResponse).toHaveProperty('id');
          expect(typeof errorResponse.id).toBe('string');
          expect(errorResponse.id.length).toBeGreaterThan(0);

          // Check that the error ID is unique (not seen before)
          expect(generatedIds.has(errorResponse.id)).toBe(false);
          generatedIds.add(errorResponse.id);

          // Check that it looks like a UUID (basic format check)
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          expect(uuidRegex.test(errorResponse.id)).toBe(true);

          return true;
        },
      ),
      { numRuns: 3 },
    );

    // Additional check: ensure we generated unique IDs
    expect(generatedIds.size).toBe(3);
  });

  describe('configuration handling', () => {
    it('should include error message when APP_ERR_MESSAGE is true', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'app.errDetail':
            return false;
          case 'app.errMessage':
            return true;
          default:
            return undefined;
        }
      });

      const exception = new ValidationException('Test validation error');
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      const mockRequest = {
        url: '/test',
        headers: {},
      };

      const mockHost = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => mockRequest,
        }),
      } as ArgumentsHost;

      filter.catch(exception, mockHost);

      const errorResponse = mockResponse.send.mock.calls[0][0];
      expect(errorResponse).toHaveProperty('message', 'Test validation error');
    });

    it('should include error details when APP_ERR_DETAIL is true', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'app.errDetail':
            return true;
          case 'app.errMessage':
            return true;
          default:
            return undefined;
        }
      });

      const exception = new Error('Test error with stack');
      exception.stack = 'Error: Test error\n    at test (file.js:1:1)';

      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      const mockRequest = {
        url: '/test',
        headers: {},
      };

      const mockHost = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => mockRequest,
        }),
      } as ArgumentsHost;

      filter.catch(exception, mockHost);

      const errorResponse = mockResponse.send.mock.calls[0][0];
      expect(errorResponse).toHaveProperty('detail');
      expect(errorResponse.detail).toHaveProperty('message', 'Test error with stack');
      expect(errorResponse.detail).toHaveProperty('stack');
      expect(Array.isArray(errorResponse.detail.stack)).toBe(true);
    });

    it('should handle non-Error exceptions', () => {
      const exception = 'String exception';

      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      const mockRequest = {
        url: '/test',
        headers: {},
      };

      const mockHost = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => mockRequest,
        }),
      } as ArgumentsHost;

      filter.catch(exception, mockHost);

      const errorResponse = mockResponse.send.mock.calls[0][0];
      expect(errorResponse.status).toBe(500);
      expect(errorResponse.type).toBe('InternalServerError');
      expect(errorResponse.errcode).toBe('app-00500');
    });

    it('should handle exceptions without status', () => {
      const exception = new Error('Generic error');

      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      const mockRequest = {
        url: '/test',
        headers: {},
      };

      const mockHost = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => mockRequest,
        }),
      } as ArgumentsHost;

      filter.catch(exception, mockHost);

      const errorResponse = mockResponse.send.mock.calls[0][0];
      expect(errorResponse.status).toBe(500);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('should parse stack trace correctly', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'app.errDetail':
            return true;
          case 'app.errMessage':
            return true;
          default:
            return undefined;
        }
      });

      const exception = new Error('Test error');
      exception.stack = `Error: Test error
    at testFunction (file.js:10:5)
    at anotherFunction (another.js:20:10)
    at Object.<anonymous> (index.js:30:15)`;

      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      const mockRequest = {
        url: '/test',
        headers: {},
      };

      const mockHost = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => mockRequest,
        }),
      } as ArgumentsHost;

      filter.catch(exception, mockHost);

      const errorResponse = mockResponse.send.mock.calls[0][0];
      expect(errorResponse.detail.stack).toHaveLength(3);
      expect(errorResponse.detail.stack[0]).toEqual({
        functionName: 'testFunction',
        fileName: 'file.js',
        lineNumber: 10,
        columnNumber: 5,
        source: 'at testFunction (file.js:10:5)',
      });
    });

    it('should handle empty stack trace', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'app.errDetail':
            return true;
          case 'app.errMessage':
            return true;
          default:
            return undefined;
        }
      });

      const exception = new Error('Test error');
      exception.stack = '';

      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      const mockRequest = {
        url: '/test',
        headers: {},
      };

      const mockHost = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => mockRequest,
        }),
      } as ArgumentsHost;

      filter.catch(exception, mockHost);

      const errorResponse = mockResponse.send.mock.calls[0][0];
      expect(errorResponse.detail.stack).toEqual([]);
    });

    it('should handle malformed stack trace lines', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'app.errDetail':
            return true;
          case 'app.errMessage':
            return true;
          default:
            return undefined;
        }
      });

      const exception = new Error('Test error');
      exception.stack = `Error: Test error
    at validFunction (file.js:10:5)
    invalid stack line
    at anotherValidFunction (another.js:20:10)`;

      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      const mockRequest = {
        url: '/test',
        headers: {},
      };

      const mockHost = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => mockRequest,
        }),
      } as ArgumentsHost;

      filter.catch(exception, mockHost);

      const errorResponse = mockResponse.send.mock.calls[0][0];
      expect(errorResponse.detail.stack).toHaveLength(2);
      expect(errorResponse.detail.stack[0].functionName).toBe('validFunction');
      expect(errorResponse.detail.stack[1].functionName).toBe('anotherValidFunction');
    });

    it('should log error with proper context', () => {
      const exception = new ValidationException('Test validation error');
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      const mockRequest = {
        url: '/test',
        headers: {},
      };

      const mockHost = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => mockRequest,
        }),
      } as ArgumentsHost;

      filter.catch(exception, mockHost);

      expect(mockPinoLogger.error).toHaveBeenCalledWith({
        err: exception,
        req: mockRequest,
        errorResponse: expect.any(Object),
      });
    });

    it('should handle UNAUTHORIZED status code', () => {
      const unauthorizedException = new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      const mockRequest = {
        url: '/test',
        headers: {},
      };

      const mockHost = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => mockRequest,
        }),
      } as ArgumentsHost;
      
      filter.catch(unauthorizedException, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'UnauthorizedError',
          errcode: 'app-00401',
          status: 401,
        }),
      );
    });

    it('should handle FORBIDDEN status code', () => {
      const forbiddenException = new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      const mockRequest = {
        url: '/test',
        headers: {},
      };

      const mockHost = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => mockRequest,
        }),
      } as ArgumentsHost;
      
      filter.catch(forbiddenException, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ForbiddenError',
          errcode: 'app-00403',
          status: 403,
        }),
      );
    });

    it('should handle BAD_REQUEST status code', () => {
      const badRequestException = new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      const mockRequest = {
        url: '/test',
        headers: {},
      };

      const mockHost = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => mockRequest,
        }),
      } as ArgumentsHost;
      
      filter.catch(badRequestException, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ValidationError',
          errcode: 'app-00400',
          status: 400,
        }),
      );
    });

    it('should handle NOT_FOUND status code', () => {
      const notFoundException = new HttpException('Not Found', HttpStatus.NOT_FOUND);
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      const mockRequest = {
        url: '/test',
        headers: {},
      };

      const mockHost = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => mockRequest,
        }),
      } as ArgumentsHost;
      
      filter.catch(notFoundException, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'NotFoundError',
          errcode: 'app-00404',
          status: 404,
        }),
      );
    });
  });
});
