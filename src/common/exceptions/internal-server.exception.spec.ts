import { HttpStatus } from '@nestjs/common';

import { BaseException } from './base.exception';
import { InternalServerException } from './internal-server.exception';

describe('InternalServerException', () => {
  it('should be defined', () => {
    const exception = new InternalServerException();
    expect(exception).toBeDefined();
  });

  it('should inherit from BaseException', () => {
    const exception = new InternalServerException();
    expect(exception).toBeInstanceOf(BaseException);
  });

  it('should have correct default properties', () => {
    const exception = new InternalServerException();

    expect(exception.message).toBe('Internal server error');
    expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(exception.errcode).toBe('app-00500');
    expect(exception.type).toBe('InternalServerError');
    expect(exception.instance).toBe('');
    expect(exception.id).toBeDefined();
    expect(typeof exception.id).toBe('string');
  });

  it('should accept custom message', () => {
    const customMessage = 'Database connection failed';
    const exception = new InternalServerException(customMessage);

    expect(exception.message).toBe(customMessage);
    expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(exception.errcode).toBe('app-00500');
    expect(exception.type).toBe('InternalServerError');
  });

  it('should accept custom message and instance', () => {
    const customMessage = 'Service unavailable';
    const customInstance = '/api/users/create';
    const exception = new InternalServerException(customMessage, customInstance);

    expect(exception.message).toBe(customMessage);
    expect(exception.instance).toBe(customInstance);
    expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(exception.errcode).toBe('app-00500');
    expect(exception.type).toBe('InternalServerError');
  });

  it('should handle empty message', () => {
    const exception = new InternalServerException('');
    expect(exception.message).toBe('');
    expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it('should handle empty instance', () => {
    const exception = new InternalServerException('Error', '');
    expect(exception.instance).toBe('');
  });

  it('should generate unique IDs for different instances', () => {
    const exception1 = new InternalServerException('Error 1');
    const exception2 = new InternalServerException('Error 2');

    expect(exception1.id).not.toBe(exception2.id);
    expect(exception1.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(exception2.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('should handle special characters in message and instance', () => {
    const message = 'Error with special chars: àáâãäåæçèéêë';
    const instance = '/api/test?param=value&other=123';
    const exception = new InternalServerException(message, instance);

    expect(exception.message).toBe(message);
    expect(exception.instance).toBe(instance);
  });

  it('should preserve error stack trace', () => {
    const exception = new InternalServerException('Test error');
    expect(exception.stack).toBeDefined();
    expect(typeof exception.stack).toBe('string');
  });

  it('should have correct error name', () => {
    const exception = new InternalServerException('Test error');
    expect(exception.name).toBe('InternalServerException');
  });

  it('should test default parameter behavior', () => {
    // Test calling with no parameters (both defaults)
    const exception1 = new InternalServerException();
    expect(exception1.message).toBe('Internal server error');
    expect(exception1.instance).toBe('');

    // Test calling with only message (instance default)
    const exception2 = new InternalServerException('Custom message');
    expect(exception2.message).toBe('Custom message');
    expect(exception2.instance).toBe('');

    // Test calling with both parameters
    const exception3 = new InternalServerException('Custom message', '/api/test');
    expect(exception3.message).toBe('Custom message');
    expect(exception3.instance).toBe('/api/test');
  });
});