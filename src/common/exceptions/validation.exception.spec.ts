import { HttpStatus } from '@nestjs/common';

import { ValidationException } from './validation.exception';

describe('ValidationException', () => {
  it('should be defined', () => {
    const exception = new ValidationException('Validation failed');
    expect(exception).toBeDefined();
  });

  it('should have correct properties', () => {
    const message = 'Invalid input data';
    const instance = '/api/users';
    const exception = new ValidationException(message, instance);

    expect(exception.message).toBe(message);
    expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    expect(exception.errcode).toBe('app-00400');
    expect(exception.type).toBe('ValidationError');
    expect(exception.instance).toBe(instance);
    expect(exception.id).toBeDefined();
    expect(typeof exception.id).toBe('string');
  });

  it('should use empty string as default instance', () => {
    const exception = new ValidationException('Validation failed');
    expect(exception.instance).toBe('');
  });

  it('should generate unique IDs for different instances', () => {
    const exception1 = new ValidationException('Error 1');
    const exception2 = new ValidationException('Error 2');

    expect(exception1.id).not.toBe(exception2.id);
    expect(exception1.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(exception2.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('should use default message when none provided', () => {
    const exception = new ValidationException();
    expect(exception.message).toBe('Validation failed');
    expect(exception.instance).toBe('');
  });

  it('should handle special characters in message and instance', () => {
    const message = 'Validation failed: àáâãäåæçèéêë';
    const instance = '/api/test?param=value&other=123';
    const exception = new ValidationException(message, instance);

    expect(exception.message).toBe(message);
    expect(exception.instance).toBe(instance);
  });

  it('should inherit from BaseException', () => {
    const exception = new ValidationException('Test error');
    expect(exception).toBeInstanceOf(Error);
    expect(exception.name).toBe('ValidationException');
  });

  it('should have consistent properties across multiple instantiations', () => {
    const exceptions = Array.from({ length: 5 }, (_, i) => 
      new ValidationException(`Error ${i}`, `/api/test/${i}`)
    );

    exceptions.forEach((exception, index) => {
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.errcode).toBe('app-00400');
      expect(exception.type).toBe('ValidationError');
      expect(exception.message).toBe(`Error ${index}`);
      expect(exception.instance).toBe(`/api/test/${index}`);
      expect(exception.id).toBeDefined();
    });

    // All IDs should be unique
    const ids = exceptions.map(e => e.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(exceptions.length);
  });
});
