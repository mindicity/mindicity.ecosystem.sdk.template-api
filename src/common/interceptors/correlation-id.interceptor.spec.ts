import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';
import { of } from 'rxjs';

import { CorrelationIdInterceptor } from './correlation-id.interceptor';

describe('CorrelationIdInterceptor', () => {
  let interceptor: CorrelationIdInterceptor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CorrelationIdInterceptor],
    }).compile();

    interceptor = module.get<CorrelationIdInterceptor>(CorrelationIdInterceptor);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  /**
   * **Feature: nestjs-hello-api, Property 2: Correlation ID presence**
   * **Validates: Requirements 1.5**
   */
  it('should ensure correlation ID presence for any HTTP request', () => {
    fc.assert(
      fc.property(
        fc.record({
          method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH'),
          url: fc.webUrl(),
          existingCorrelationId: fc.option(fc.uuid(), { nil: undefined }),
          headers: fc.dictionary(fc.string(), fc.string()),
        }),
        (requestData) => {
          // Arrange: Create mock request and response
          const mockRequest = {
            headers: {
              ...requestData.headers,
              ...(requestData.existingCorrelationId && {
                'x-correlation-id': requestData.existingCorrelationId,
              }),
            },
            method: requestData.method,
            url: requestData.url,
          };

          const mockResponse = {
            header: jest.fn(),
          };

          const mockContext = {
            switchToHttp: () => ({
              getRequest: () => mockRequest,
              getResponse: () => mockResponse,
            }),
          } as ExecutionContext;

          const mockCallHandler = {
            handle: () => of('test response'),
          } as CallHandler;

          // Act: Execute the interceptor
          const result = interceptor.intercept(mockContext, mockCallHandler);

          // Assert: Verify correlation ID is present (synchronously)
          let testPassed = false;
          result.subscribe(() => {
            // Check that correlation ID was added to request
            const hasRequestId = (mockRequest as any).id !== undefined;
            const isStringId = typeof (mockRequest as any).id === 'string';
            const hasLength = (mockRequest as any).id && (mockRequest as any).id.length > 0;

            // Check that correlation ID was added to response headers
            const headerCalled = mockResponse.header.mock.calls.some(
              (call) => call[0] === 'x-correlation-id' && call[1] === (mockRequest as any).id,
            );

            // If existing correlation ID was provided, it should be used
            const correctExistingId = requestData.existingCorrelationId
              ? (mockRequest as any).id === requestData.existingCorrelationId
              : true;

            testPassed =
              hasRequestId && isStringId && hasLength && headerCalled && correctExistingId;
          });

          return testPassed;
        },
      ),
      { numRuns: 5 },
    );
  });

  it('should use existing correlation ID from headers', () => {
    const existingCorrelationId = 'existing-correlation-id-123';
    const mockRequest = {
      headers: { 'x-correlation-id': existingCorrelationId },
      id: undefined,
    };

    const mockResponse = {
      header: jest.fn(),
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as ExecutionContext;

    const mockCallHandler = {
      handle: () => of('test response'),
    } as CallHandler;

    // Act
    interceptor.intercept(mockContext, mockCallHandler);

    // Assert: Should use existing correlation ID
    expect(mockRequest.id).toBe(existingCorrelationId);
    expect(mockResponse.header).toHaveBeenCalledWith('x-correlation-id', existingCorrelationId);
  });

  it('should generate new UUID when no correlation ID exists', () => {
    const mockRequest = {
      headers: {},
      id: undefined,
    };

    const mockResponse = {
      header: jest.fn(),
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as ExecutionContext;

    const mockCallHandler = {
      handle: () => of('test response'),
    } as CallHandler;

    // Act
    interceptor.intercept(mockContext, mockCallHandler);

    // Assert: Should generate new UUID
    expect(mockRequest.id).toBeDefined();
    expect(typeof mockRequest.id).toBe('string');
    expect(mockRequest.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(mockResponse.header).toHaveBeenCalledWith('x-correlation-id', mockRequest.id);
  });
});
