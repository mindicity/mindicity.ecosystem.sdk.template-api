import { HttpStatus } from '@nestjs/common';

import { BaseException } from './base.exception';

/**
 * Exception thrown for internal server errors.
 * Returns HTTP 500 status with specific error code and type.
 */
export class InternalServerException extends BaseException {
  /**
   * Creates a new InternalServerException.
   * @param message - The error message (default: 'Internal server error')
   * @param instance - The request instance/path where the error occurred
   */
  constructor(message: string = 'Internal server error', instance: string = '') {
    super(
      message,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'app-00500',
      'InternalServerError',
      instance,
    );
  }
}
