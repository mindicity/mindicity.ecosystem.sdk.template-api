/**
 * Environment variables parsing utilities.
 * Provides type-safe parsing of environment variables with proper defaults.
 */
export class EnvUtil {
  /**
   * Parses a boolean value from environment variables.
   * Correctly handles string values like "false", "0", "no", etc.
   * 
   * @param value - The environment variable value
   * @param defaultValue - Default value if parsing fails or value is undefined
   * @returns Parsed boolean value
   * 
   * @example
   * ```typescript
   * // Environment: DB_SSL=false
   * const ssl = EnvUtil.parseBoolean(process.env.DB_SSL); // returns false
   * 
   * // Environment: ENABLE_FEATURE=true
   * const enabled = EnvUtil.parseBoolean(process.env.ENABLE_FEATURE); // returns true
   * 
   * // Environment: DEBUG=1
   * const debug = EnvUtil.parseBoolean(process.env.DEBUG); // returns true
   * 
   * // Environment: CORS_ENABLED=no
   * const cors = EnvUtil.parseBoolean(process.env.CORS_ENABLED); // returns false
   * ```
   */
  static parseBoolean(value: string | boolean | undefined, defaultValue: boolean = false): boolean {
    if (typeof value === 'boolean') return value;
    if (value === undefined || value === null) return defaultValue;
    
    const str = value.toString().toLowerCase().trim();
    
    return EnvUtil.isTruthyValue(str) || (!EnvUtil.isFalsyValue(str) && defaultValue);
  }

  /**
   * Checks if a string value represents a truthy boolean.
   */
  private static isTruthyValue(str: string): boolean {
    const truthyValues = ['true', '1', 'yes', 'on', 'enabled'];
    return truthyValues.includes(str);
  }

  /**
   * Checks if a string value represents a falsy boolean.
   */
  private static isFalsyValue(str: string): boolean {
    const falsyValues = ['false', '0', 'no', 'off', 'disabled', ''];
    return falsyValues.includes(str);
  }

  /**
   * Parses a number value from environment variables.
   * 
   * @param value - The environment variable value
   * @param defaultValue - Default value if parsing fails or value is undefined
   * @returns Parsed number value
   * 
   * @example
   * ```typescript
   * // Environment: PORT=3000
   * const port = EnvUtil.parseNumber(process.env.PORT, 8080); // returns 3000
   * 
   * // Environment: TIMEOUT=invalid
   * const timeout = EnvUtil.parseNumber(process.env.TIMEOUT, 5000); // returns 5000
   * ```
   */
  static parseNumber(value: string | number | undefined, defaultValue: number = 0): number {
    if (typeof value === 'number') return value;
    if (value === undefined || value === null) return defaultValue;
    
    const parsed = parseInt(value.toString(), 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Parses a string value from environment variables with trimming.
   * 
   * @param value - The environment variable value
   * @param defaultValue - Default value if value is undefined or empty
   * @returns Parsed string value
   * 
   * @example
   * ```typescript
   * // Environment: DB_HOST=  localhost  
   * const host = EnvUtil.parseString(process.env.DB_HOST, 'default'); // returns 'localhost'
   * 
   * // Environment: API_KEY=
   * const key = EnvUtil.parseString(process.env.API_KEY, 'default-key'); // returns 'default-key'
   * ```
   */
  static parseString(value: string | undefined, defaultValue: string = ''): string {
    if (value === undefined || value === null) return defaultValue;
    
    const trimmed = value.toString().trim();
    return trimmed === '' ? defaultValue : trimmed;
  }

  /**
   * Parses an array value from environment variables (comma-separated).
   * 
   * @param value - The environment variable value (comma-separated)
   * @param defaultValue - Default array if parsing fails or value is undefined
   * @returns Parsed array of strings
   * 
   * @example
   * ```typescript
   * // Environment: ALLOWED_ORIGINS=http://localhost:3000,https://app.com
   * const origins = EnvUtil.parseArray(process.env.ALLOWED_ORIGINS); 
   * // returns ['http://localhost:3000', 'https://app.com']
   * 
   * // Environment: FEATURES=
   * const features = EnvUtil.parseArray(process.env.FEATURES, ['default']); 
   * // returns ['default']
   * ```
   */
  static parseArray(value: string | undefined, defaultValue: string[] = []): string[] {
    if (value === undefined || value === null) return defaultValue;
    
    const trimmed = value.toString().trim();
    if (trimmed === '') return defaultValue;
    
    return trimmed.split(',').map(item => item.trim()).filter(item => item !== '');
  }

  /**
   * Parses an enum value from environment variables.
   * 
   * @param value - The environment variable value
   * @param allowedValues - Array of allowed enum values
   * @param defaultValue - Default value if parsing fails or value is not in allowed values
   * @returns Parsed enum value
   * 
   * @example
   * ```typescript
   * // Environment: LOG_LEVEL=debug
   * const level = EnvUtil.parseEnum(
   *   process.env.LOG_LEVEL, 
   *   ['trace', 'debug', 'info', 'warn', 'error'], 
   *   'info'
   * ); // returns 'debug'
   * 
   * // Environment: NODE_ENV=invalid
   * const env = EnvUtil.parseEnum(
   *   process.env.NODE_ENV, 
   *   ['development', 'production', 'test'], 
   *   'development'
   * ); // returns 'development'
   * ```
   */
  static parseEnum<T extends string>(
    value: string | undefined, 
    allowedValues: T[], 
    defaultValue: T
  ): T {
    if (value === undefined || value === null) return defaultValue;
    
    const trimmed = value.toString().trim() as T;
    return allowedValues.includes(trimmed) ? trimmed : defaultValue;
  }

  /**
   * Checks if the current environment matches the specified environment.
   * 
   * @param environment - The environment to check against
   * @returns True if current environment matches
   * 
   * @example
   * ```typescript
   * // Environment: NODE_ENV=development
   * const isDev = EnvUtil.isEnvironment('development'); // returns true
   * const isProd = EnvUtil.isEnvironment('production'); // returns false
   * ```
   */
  static isEnvironment(environment: string): boolean {
    return EnvUtil.parseString(process.env.NODE_ENV, 'development').toLowerCase() === environment.toLowerCase();
  }

  /**
   * Checks if the current environment is development.
   * 
   * @returns True if current environment is development
   */
  static isDevelopment(): boolean {
    return EnvUtil.isEnvironment('development');
  }

  /**
   * Checks if the current environment is production.
   * 
   * @returns True if current environment is production
   */
  static isProduction(): boolean {
    return EnvUtil.isEnvironment('production');
  }

  /**
   * Checks if the current environment is test.
   * 
   * @returns True if current environment is test
   */
  static isTest(): boolean {
    return EnvUtil.isEnvironment('test');
  }
}