import { HttpStatus } from '@nestjs/common';

import { BaseException } from './base.exception';

/**
 * Database exception for database-related errors.
 * Extends BaseException with database-specific error code and type.
 */
export class DatabaseException extends BaseException {
  /**
   * Creates an instance of DatabaseException.
   * @param message - The error message
   * @param instance - Optional instance identifier where the error occurred
   */
  constructor(message: string, instance: string = '') {
    super(
      message,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'db-00002',
      'DatabaseError',
      instance,
    );
  }
}