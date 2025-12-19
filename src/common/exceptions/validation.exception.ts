import { HttpStatus } from '@nestjs/common';

import { BaseException } from './base.exception';

/**
 * Exception thrown for validation errors.
 * Returns HTTP 400 status with specific error code and type.
 */
export class ValidationException extends BaseException {
  /**
   * Creates a new ValidationException.
   * @param message - The error message (default: 'Validation failed')
   * @param instance - The request instance/path where the error occurred
   */
  constructor(message: string = 'Validation failed', instance: string = '') {
    super(
      message,
      HttpStatus.BAD_REQUEST,
      'app-00400',
      'ValidationError',
      instance,
    );
  }
}
