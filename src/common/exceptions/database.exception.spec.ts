import { HttpStatus } from '@nestjs/common';

import { DatabaseException } from './database.exception';

describe('DatabaseException', () => {
  it('should be defined', () => {
    const exception = new DatabaseException('Database error');
    expect(exception).toBeDefined();
  });

  it('should have correct properties', () => {
    const message = 'Connection failed';
    const instance = '/api/users';
    const exception = new DatabaseException(message, instance);

    expect(exception.message).toBe(message);
    expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(exception.errcode).toBe('db-00002');
    expect(exception.type).toBe('DatabaseError');
    expect(exception.instance).toBe(instance);
    expect(exception.id).toBeDefined();
    expect(typeof exception.id).toBe('string');
  });

  it('should use empty string as default instance', () => {
    const exception = new DatabaseException('Database error');
    expect(exception.instance).toBe('');
  });

  it('should generate unique IDs for different instances', () => {
    const exception1 = new DatabaseException('Error 1');
    const exception2 = new DatabaseException('Error 2');

    expect(exception1.id).not.toBe(exception2.id);
    expect(exception1.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(exception2.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('should handle special characters in message and instance', () => {
    const message = 'Database error: àáâãäåæçèéêë';
    const instance = '/api/database?query=complex&param=123';
    const exception = new DatabaseException(message, instance);

    expect(exception.message).toBe(message);
    expect(exception.instance).toBe(instance);
  });

  it('should inherit from BaseException', () => {
    const exception = new DatabaseException('Test error');
    expect(exception).toBeInstanceOf(Error);
    expect(exception.name).toBe('DatabaseException');
  });

  it('should handle empty message', () => {
    const exception = new DatabaseException('');
    expect(exception.message).toBe('');
    expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(exception.errcode).toBe('db-00002');
    expect(exception.type).toBe('DatabaseError');
  });

  it('should have consistent properties across multiple instantiations', () => {
    const exceptions = Array.from({ length: 5 }, (_, i) => 
      new DatabaseException(`Database error ${i}`, `/api/db/${i}`)
    );

    exceptions.forEach((exception, index) => {
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(exception.errcode).toBe('db-00002');
      expect(exception.type).toBe('DatabaseError');
      expect(exception.message).toBe(`Database error ${index}`);
      expect(exception.instance).toBe(`/api/db/${index}`);
      expect(exception.id).toBeDefined();
    });

    // All IDs should be unique
    const ids = exceptions.map(e => e.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(exceptions.length);
  });

  it('should preserve error stack trace', () => {
    const exception = new DatabaseException('Database connection failed');
    expect(exception.stack).toBeDefined();
    expect(typeof exception.stack).toBe('string');
    expect(exception.stack).toContain('DatabaseException');
  });
});
