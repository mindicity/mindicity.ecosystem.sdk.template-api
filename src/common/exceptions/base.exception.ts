import { HttpException, HttpStatus } from '@nestjs/common';

import { v4 as uuidv4 } from 'uuid';

/**
 * Base exception class for all custom exceptions in the application.
 * Provides consistent error structure with unique ID, error code, and type.
 */
export abstract class BaseException extends HttpException {
  public readonly id: string;
  public readonly errcode: string;
  public readonly type: string;
  public readonly instance: string;

  /**
   * Creates an instance of BaseException.
   * @param message - The error message
   * @param status - HTTP status code
   * @param errcode - Application-specific error code
   * @param type - Error type identifier
   * @param instance - Optional instance identifier where the error occurred
   */
  constructor(
    message: string,
    status: HttpStatus,
    errcode: string,
    type: string,
    instance: string = '',
  ) {
    super(message, status);
    this.id = uuidv4();
    this.errcode = errcode;
    this.type = type;
    this.instance = instance;
  }
}