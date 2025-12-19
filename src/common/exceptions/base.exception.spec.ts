import { HttpStatus } from '@nestjs/common';

import { BaseException } from './base.exception';

// Create a concrete implementation for testing
class TestException extends BaseException {
  constructor(message: string, instance: string = '') {
    super(
      message,
      HttpStatus.BAD_REQUEST,
      'test-00001',
      'TestError',
      instance,
    );
  }
}

describe('BaseException', () => {
  it('should be defined', () => {
    const exception = new TestException('Test error');
    expect(exception).toBeDefined();
  });

  it('should have correct properties', () => {
    const message = 'Test error message';
    const instance = '/api/test';
    const exception = new TestException(message, instance);

    expect(exception.message).toBe(message);
    expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    expect(exception.errcode).toBe('test-00001');
    expect(exception.type).toBe('TestError');
    expect(exception.instance).toBe(instance);
    expect(exception.id).toBeDefined();
    expect(typeof exception.id).toBe('string');
  });

  it('should use empty string as default instance', () => {
    const exception = new TestException('Test error');
    expect(exception.instance).toBe('');
  });

  it('should generate unique IDs for different instances', () => {
    const exception1 = new TestException('Error 1');
    const exception2 = new TestException('Error 2');

    expect(exception1.id).not.toBe(exception2.id);
    expect(exception1.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(exception2.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('should inherit from HttpException', () => {
    const exception = new TestException('Test error');
    expect(exception).toBeInstanceOf(Error);
    expect(exception.name).toBe('TestException');
  });

  it('should handle different HTTP status codes', () => {
    class InternalServerTestException extends BaseException {
      constructor(message: string, instance: string = '') {
        super(
          message,
          HttpStatus.INTERNAL_SERVER_ERROR,
          'test-00500',
          'InternalServerTestError',
          instance,
        );
      }
    }

    const exception = new InternalServerTestException('Internal error');
    expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(exception.errcode).toBe('test-00500');
    expect(exception.type).toBe('InternalServerTestError');
  });

  it('should handle different error types and codes', () => {
    class CustomTestException extends BaseException {
      constructor(message: string, instance: string = '') {
        super(
          message,
          HttpStatus.CONFLICT,
          'custom-00409',
          'CustomConflictError',
          instance,
        );
      }
    }

    const exception = new CustomTestException('Conflict error', '/api/custom');
    expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
    expect(exception.errcode).toBe('custom-00409');
    expect(exception.type).toBe('CustomConflictError');
    expect(exception.instance).toBe('/api/custom');
  });

  it('should preserve error message and stack trace', () => {
    const message = 'Detailed error message';
    const exception = new TestException(message);

    expect(exception.message).toBe(message);
    expect(exception.stack).toBeDefined();
    expect(typeof exception.stack).toBe('string');
  });

  it('should handle empty message', () => {
    const exception = new TestException('');
    expect(exception.message).toBe('');
    expect(exception.id).toBeDefined();
    expect(exception.errcode).toBe('test-00001');
  });

  it('should handle special characters in message and instance', () => {
    const message = 'Error with special chars: àáâãäåæçèéêë';
    const instance = '/api/test?param=value&other=123';
    const exception = new TestException(message, instance);

    expect(exception.message).toBe(message);
    expect(exception.instance).toBe(instance);
  });

  it('should have readonly properties defined', () => {
    const exception = new TestException('Test error', '/api/test');
    
    // Properties should be defined and accessible
    expect(exception.id).toBeDefined();
    expect(exception.errcode).toBe('test-00001');
    expect(exception.type).toBe('TestError');
    expect(exception.instance).toBe('/api/test');
    
    // Properties are marked as readonly in TypeScript
    // but JavaScript allows assignment (this is expected behavior)
    const originalId = exception.id;
    (exception as any).id = 'new-id';
    expect(exception.id).toBe('new-id'); // JavaScript allows this
    
    // Restore original for consistency
    (exception as any).id = originalId;
    expect(exception.id).toBe(originalId);
  });

  it('should handle constructor with explicit instance parameter', () => {
    const exception = new TestException('Test message', 'test.instance');
    
    expect(exception.message).toBe('Test message');
    expect(exception.instance).toBe('test.instance');
    expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
  });

  it('should handle constructor with default instance parameter', () => {
    // Test the default parameter branch by calling constructor without instance
    class TestExceptionWithDefault extends BaseException {
      constructor(message: string) {
        super(message, HttpStatus.BAD_REQUEST, 'TEST_ERROR', 'TestError');
      }
    }
    
    const exception = new TestExceptionWithDefault('Test message');
    expect(exception.instance).toBe('');
  });
});