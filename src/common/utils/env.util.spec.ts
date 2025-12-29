import { EnvUtil } from './env.util';

describe('EnvUtil', () => {
  describe('parseBoolean', () => {
    it('should parse truthy string values correctly', () => {
      expect(EnvUtil.parseBoolean('true')).toBe(true);
      expect(EnvUtil.parseBoolean('TRUE')).toBe(true);
      expect(EnvUtil.parseBoolean('1')).toBe(true);
      expect(EnvUtil.parseBoolean('yes')).toBe(true);
      expect(EnvUtil.parseBoolean('YES')).toBe(true);
      expect(EnvUtil.parseBoolean('on')).toBe(true);
      expect(EnvUtil.parseBoolean('enabled')).toBe(true);
    });

    it('should parse falsy string values correctly', () => {
      expect(EnvUtil.parseBoolean('false')).toBe(false);
      expect(EnvUtil.parseBoolean('FALSE')).toBe(false);
      expect(EnvUtil.parseBoolean('0')).toBe(false);
      expect(EnvUtil.parseBoolean('no')).toBe(false);
      expect(EnvUtil.parseBoolean('NO')).toBe(false);
      expect(EnvUtil.parseBoolean('off')).toBe(false);
      expect(EnvUtil.parseBoolean('disabled')).toBe(false);
      expect(EnvUtil.parseBoolean('')).toBe(false);
    });

    it('should handle boolean values directly', () => {
      expect(EnvUtil.parseBoolean(true)).toBe(true);
      expect(EnvUtil.parseBoolean(false)).toBe(false);
    });

    it('should handle undefined and null values', () => {
      expect(EnvUtil.parseBoolean(undefined)).toBe(false);
      expect(EnvUtil.parseBoolean(undefined, true)).toBe(true);
    });

    it('should return default value for unrecognized strings', () => {
      expect(EnvUtil.parseBoolean('invalid')).toBe(false);
      expect(EnvUtil.parseBoolean('invalid', true)).toBe(true);
    });

    it('should handle whitespace correctly', () => {
      expect(EnvUtil.parseBoolean('  true  ')).toBe(true);
      expect(EnvUtil.parseBoolean('  false  ')).toBe(false);
    });
  });

  describe('parseNumber', () => {
    it('should parse valid number strings', () => {
      expect(EnvUtil.parseNumber('123')).toBe(123);
      expect(EnvUtil.parseNumber('0')).toBe(0);
      expect(EnvUtil.parseNumber('-456')).toBe(-456);
    });

    it('should handle number values directly', () => {
      expect(EnvUtil.parseNumber(789)).toBe(789);
    });

    it('should return default for invalid numbers', () => {
      expect(EnvUtil.parseNumber('invalid')).toBe(0);
      expect(EnvUtil.parseNumber('invalid', 100)).toBe(100);
    });

    it('should handle undefined and null values', () => {
      expect(EnvUtil.parseNumber(undefined)).toBe(0);
      expect(EnvUtil.parseNumber(undefined, 42)).toBe(42);
    });
  });

  describe('parseString', () => {
    it('should parse and trim string values', () => {
      expect(EnvUtil.parseString('hello')).toBe('hello');
      expect(EnvUtil.parseString('  world  ')).toBe('world');
    });

    it('should return default for empty strings', () => {
      expect(EnvUtil.parseString('')).toBe('');
      expect(EnvUtil.parseString('', 'default')).toBe('default');
      expect(EnvUtil.parseString('   ', 'default')).toBe('default');
    });

    it('should handle undefined and null values', () => {
      expect(EnvUtil.parseString(undefined)).toBe('');
      expect(EnvUtil.parseString(undefined, 'default')).toBe('default');
    });
  });

  describe('parseArray', () => {
    it('should parse comma-separated values', () => {
      expect(EnvUtil.parseArray('a,b,c')).toEqual(['a', 'b', 'c']);
      expect(EnvUtil.parseArray('  one  ,  two  ,  three  ')).toEqual(['one', 'two', 'three']);
    });

    it('should handle single values', () => {
      expect(EnvUtil.parseArray('single')).toEqual(['single']);
    });

    it('should return default for empty strings', () => {
      expect(EnvUtil.parseArray('')).toEqual([]);
      expect(EnvUtil.parseArray('', ['default'])).toEqual(['default']);
    });

    it('should handle undefined and null values', () => {
      expect(EnvUtil.parseArray(undefined)).toEqual([]);
      expect(EnvUtil.parseArray(undefined, ['default'])).toEqual(['default']);
    });

    it('should filter out empty items', () => {
      expect(EnvUtil.parseArray('a,,b,  ,c')).toEqual(['a', 'b', 'c']);
    });
  });

  describe('parseEnum', () => {
    const allowedValues = ['development', 'production', 'test'];

    it('should parse valid enum values', () => {
      expect(EnvUtil.parseEnum('development', allowedValues, 'development')).toBe('development');
      expect(EnvUtil.parseEnum('production', allowedValues, 'development')).toBe('production');
    });

    it('should return default for invalid values', () => {
      expect(EnvUtil.parseEnum('invalid', allowedValues, 'development')).toBe('development');
    });

    it('should handle undefined and null values', () => {
      expect(EnvUtil.parseEnum(undefined, allowedValues, 'development')).toBe('development');
    });

    it('should handle whitespace', () => {
      expect(EnvUtil.parseEnum('  production  ', allowedValues, 'development')).toBe('production');
    });
  });

  describe('environment helpers', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should detect development environment', () => {
      process.env.NODE_ENV = 'development';
      expect(EnvUtil.isDevelopment()).toBe(true);
      expect(EnvUtil.isProduction()).toBe(false);
      expect(EnvUtil.isTest()).toBe(false);
    });

    it('should detect production environment', () => {
      process.env.NODE_ENV = 'production';
      expect(EnvUtil.isDevelopment()).toBe(false);
      expect(EnvUtil.isProduction()).toBe(true);
      expect(EnvUtil.isTest()).toBe(false);
    });

    it('should detect test environment', () => {
      process.env.NODE_ENV = 'test';
      expect(EnvUtil.isDevelopment()).toBe(false);
      expect(EnvUtil.isProduction()).toBe(false);
      expect(EnvUtil.isTest()).toBe(true);
    });

    it('should default to development for undefined NODE_ENV', () => {
      delete process.env.NODE_ENV;
      expect(EnvUtil.isDevelopment()).toBe(true);
    });
  });
});