import { HttpStatus } from '@nestjs/common';

import { NotFoundException } from './not-found.exception';

describe('NotFoundException', () => {
  it('should be defined', () => {
    const exception = new NotFoundException('User', '123');
    expect(exception).toBeDefined();
  });

  it('should have correct properties', () => {
    const resource = 'User';
    const id = '123';
    const instance = '/api/users/123';
    const exception = new NotFoundException(resource, id, instance);

    expect(exception.message).toBe(`${resource} with id ${id} not found`);
    expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(exception.errcode).toBe('app-00404');
    expect(exception.type).toBe('NotFoundError');
    expect(exception.instance).toBe(instance);
    expect(exception.id).toBeDefined();
    expect(typeof exception.id).toBe('string');
  });

  it('should use empty string as default instance', () => {
    const exception = new NotFoundException('User', '123');
    expect(exception.instance).toBe('');
  });

  it('should generate unique IDs for different instances', () => {
    const exception1 = new NotFoundException('User', '1');
    const exception2 = new NotFoundException('User', '2');

    expect(exception1.id).not.toBe(exception2.id);
  });

  it('should format message correctly with different resources', () => {
    const userException = new NotFoundException('User', '123');
    const productException = new NotFoundException('Product', 'abc');

    expect(userException.message).toBe('User with id 123 not found');
    expect(productException.message).toBe('Product with id abc not found');
  });

  it('should handle undefined instance parameter', () => {
    const exception = new NotFoundException('User', '123');
    expect(exception.instance).toBe('');
  });
});
