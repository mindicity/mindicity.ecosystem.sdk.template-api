import { HttpStatus } from '@nestjs/common';

import { BaseException } from './base.exception';

/**
 * Exception thrown when a requested resource is not found.
 * Returns HTTP 404 status with specific error code and type.
 */
export class NotFoundException extends BaseException {
  /**
   * Creates a new NotFoundException.
   * @param resource - The type of resource that was not found (e.g., 'User', 'Product')
   * @param id - The identifier of the resource that was not found
   * @param instance - The request instance/path where the error occurred
   */
  constructor(resource: string, id: string, instance: string = '') {
    super(
      `${resource} with id ${id} not found`,
      HttpStatus.NOT_FOUND,
      'app-00404',
      'NotFoundError',
      instance,
    );
  }
}
