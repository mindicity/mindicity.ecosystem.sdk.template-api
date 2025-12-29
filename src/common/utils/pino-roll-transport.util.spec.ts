import { mkdirSync } from 'fs';
import { join } from 'path';

import {
  createPinoTransportsWithRotation,
  createSimplePinoTransports,
} from './pino-roll-transport.util';

// Mock fs module
jest.mock('fs', () => ({
  mkdirSync: jest.fn(),
}));

// Mock path module
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
}));

describe('Pino Roll Transport Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (process as any).cwd = jest.fn(() => '/test/cwd');
  });

  describe('createPinoTransportsWithRotation', () => {
    const mockLogConfig = {
      prefix: 'test_api',
      fileMaxSize: '5MB',
      fileFrequency: 'daily' as const,
    };

    it('should return undefined for console-only transport without pretty print (JSON format)', () => {
      const result = createPinoTransportsWithRotation('console', mockLogConfig);

      expect(result).toBeUndefined();
    });

    it('should create pretty print transport for console-only when prettyPrint is true', () => {
      const result = createPinoTransportsWithRotation('console', {
        ...mockLogConfig,
        prettyPrint: true,
      });

      expect(result).toEqual({
        targets: [
          {
            target: 'pino-pretty',
            level: 'trace',
            options: {
              colorize: true,
              singleLine: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
              messageFormat: '[{correlationId}]({userId}) {msg}',
            },
          },
        ],
      });
    });

    it('should create multiple transports for console and file with JSON format', () => {
      const result = createPinoTransportsWithRotation('console,file', mockLogConfig);

      expect(result).toEqual({
        targets: [
          {
            target: 'pino/file',
            level: 'trace',
            options: {
              destination: 1, // stdout
            },
          },
          {
            target: 'pino-roll',
            level: 'trace',
            options: {
              file: '/test/cwd/logs/test_api.log',
              frequency: 'daily',
              size: '5m',
              mkdir: true,
              dateFormat: 'yyyyMMdd',
              symlink: false,
              limit: {
                count: 10,
                removeOtherLogFiles: false,
              },
            },
          },
        ],
      });

      expect(mkdirSync).toHaveBeenCalledWith('/test/cwd/logs', { recursive: true });
      expect(join).toHaveBeenCalledWith('/test/cwd', 'logs');
      expect(join).toHaveBeenCalledWith('/test/cwd/logs', 'test_api.log');
    });

    it('should create multiple transports for console and file with pretty print', () => {
      const result = createPinoTransportsWithRotation('console,file', {
        ...mockLogConfig,
        prettyPrint: true,
      });

      expect(result).toEqual({
        targets: [
          {
            target: 'pino-pretty',
            level: 'trace',
            options: {
              colorize: true,
              singleLine: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
              messageFormat: '[{correlationId}]({userId}) {msg}',
            },
          },
          {
            target: 'pino-roll',
            level: 'trace',
            options: {
              file: '/test/cwd/logs/test_api.log',
              frequency: 'daily',
              size: '5m',
              mkdir: true,
              dateFormat: 'yyyyMMdd',
              symlink: false,
              limit: {
                count: 10,
                removeOtherLogFiles: false,
              },
            },
          },
        ],
      });
    });

    it('should create file-only transport', () => {
      const result = createPinoTransportsWithRotation('file', mockLogConfig);

      expect(result).toEqual({
        targets: [
          {
            target: 'pino-roll',
            level: 'trace',
            options: {
              file: '/test/cwd/logs/test_api.log',
              frequency: 'daily',
              size: '5m',
              mkdir: true,
              dateFormat: 'yyyyMMdd',
              symlink: false,
              limit: {
                count: 10,
                removeOtherLogFiles: false,
              },
            },
          },
        ],
      });
    });

    it('should handle different file sizes', () => {
      const testCases = [
        { input: '10MB', expected: '10m' },
        { input: '1GB', expected: '1g' },
        { input: '500KB', expected: '500k' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = createPinoTransportsWithRotation('file', {
          ...mockLogConfig,
          fileMaxSize: input,
        });

        expect(result).toEqual({
          targets: [
            {
              target: 'pino-roll',
              level: 'trace',
              options: {
                file: '/test/cwd/logs/test_api.log',
                frequency: 'daily',
                size: expected,
                mkdir: true,
                dateFormat: 'yyyyMMdd',
                symlink: false,
                limit: {
                  count: 10,
                  removeOtherLogFiles: false,
                },
              },
            },
          ],
        });
      });
    });

    it('should handle different frequencies', () => {
      const testCases = ['daily', 'hourly', 'weekly'];

      testCases.forEach((frequency) => {
        const result = createPinoTransportsWithRotation('file', {
          ...mockLogConfig,
          fileFrequency: frequency as 'daily' | 'hourly' | 'weekly',
        });

        expect(result).toEqual({
          targets: [
            {
              target: 'pino-roll',
              level: 'trace',
              options: {
                file: '/test/cwd/logs/test_api.log',
                frequency,
                size: '5m',
                mkdir: true,
                dateFormat: 'yyyyMMdd',
                symlink: false,
                limit: {
                  count: 10,
                  removeOtherLogFiles: false,
                },
              },
            },
          ],
        });
      });
    });

    it('should throw error for invalid size format', () => {
      expect(() => {
        createPinoTransportsWithRotation('file', {
          ...mockLogConfig,
          fileMaxSize: 'invalid',
        });
      }).toThrow('Invalid size format: invalid. Use format like "5MB", "1GB", "500KB"');
    });

    it('should throw error for unsupported size unit', () => {
      expect(() => {
        createPinoTransportsWithRotation('file', {
          ...mockLogConfig,
          fileMaxSize: '5TB',
        });
      }).toThrow('Invalid size format: 5TB');
    });

    it('should throw error for unsupported size unit in parseSizeForPinoRoll', () => {
      expect(() => {
        createPinoTransportsWithRotation('file', {
          ...mockLogConfig,
          fileMaxSize: '5PB', // Petabyte - unsupported unit
        });
      }).toThrow('Invalid size format: 5PB');
    });

    it('should throw error for unsupported frequency', () => {
      expect(() => {
        createPinoTransportsWithRotation('file', {
          ...mockLogConfig,
          fileFrequency: 'monthly' as any,
        });
      }).toThrow('Unsupported frequency: monthly. Use "daily", "hourly", or "weekly"');
    });

    it('should handle whitespace in transport types', () => {
      const result = createPinoTransportsWithRotation(' console , file ', mockLogConfig);

      expect(result).toEqual({
        targets: [
          {
            target: 'pino/file',
            level: 'trace',
            options: {
              destination: 1,
            },
          },
          {
            target: 'pino-roll',
            level: 'trace',
            options: {
              file: '/test/cwd/logs/test_api.log',
              frequency: 'daily',
              size: '5m',
              mkdir: true,
              dateFormat: 'yyyyMMdd',
              symlink: false,
              limit: {
                count: 10,
                removeOtherLogFiles: false,
              },
            },
          },
        ],
      });
    });
  });

  describe('createSimplePinoTransports', () => {
    const mockLogConfig = {
      prefix: 'test_api',
    };

    it('should return undefined for console-only transport without pretty print (JSON format)', () => {
      const result = createSimplePinoTransports('console', mockLogConfig);

      expect(result).toBeUndefined();
    });

    it('should create pretty print transport for console-only when prettyPrint is true', () => {
      const result = createSimplePinoTransports('console', {
        ...mockLogConfig,
        prettyPrint: true,
      });

      expect(result).toEqual({
        targets: [
          {
            target: 'pino-pretty',
            level: 'trace',
            options: {
              colorize: true,
              singleLine: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
              messageFormat: '[{correlationId}]({userId}) {msg}',
            },
          },
        ],
      });
    });

    it('should create multiple transports for console and file', () => {
      const result = createSimplePinoTransports('console,file', mockLogConfig);

      expect(result).toEqual({
        targets: [
          {
            target: 'pino/file',
            level: 'trace',
            options: {
              destination: 1, // stdout
            },
          },
          {
            target: 'pino/file',
            level: 'trace',
            options: {
              destination: '/test/cwd/logs/test_api.log',
              mkdir: true,
            },
          },
        ],
      });
    });

    it('should create file-only transport without rotation', () => {
      const result = createSimplePinoTransports('file', mockLogConfig);

      expect(result).toEqual({
        targets: [
          {
            target: 'pino/file',
            level: 'trace',
            options: {
              destination: '/test/cwd/logs/test_api.log',
              mkdir: true,
            },
          },
        ],
      });
    });
  });

  describe('edge cases', () => {
    it('should handle case insensitive transport types', () => {
      const mockLogConfig = {
        prefix: 'test_api',
        fileMaxSize: '5MB',
        fileFrequency: 'daily' as const,
      };

      const result = createPinoTransportsWithRotation('CONSOLE,FILE', mockLogConfig);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('targets');
      expect((result as any).targets).toHaveLength(2);
    });

    it('should handle empty transport string', () => {
      const mockLogConfig = {
        prefix: 'test_api',
        fileMaxSize: '5MB',
        fileFrequency: 'daily' as const,
      };

      const result = createPinoTransportsWithRotation('', mockLogConfig);

      expect(result).toEqual({
        targets: [],
      });
    });
  });
});
    it('should handle gigabyte size unit', () => {
      // Arrange
      const mockConfig = {
        transports: 'file',
        prefix: 'test',
        fileMaxSize: '5GB',
        fileFrequency: 'daily' as const,
        prettyPrint: false,
      };

      // Act
      const result = createPinoTransportsWithRotation(
        mockConfig.transports,
        mockConfig,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result).toHaveProperty('targets');
    });

  describe('Additional size unit error cases', () => {
    const mockLogConfig = {
      prefix: 'test_api',
      fileMaxSize: '5MB',
      fileFrequency: 'daily' as const,
    };

    it('should throw error for completely unsupported size unit', () => {
      // Arrange & Act & Assert
      expect(() => {
        createPinoTransportsWithRotation('file', {
          ...mockLogConfig,
          fileMaxSize: '10ZB', // Zettabyte - completely unsupported
        });
      }).toThrow('Invalid size format: 10ZB');
    });

    it('should throw error for random unsupported unit', () => {
      // Arrange & Act & Assert  
      expect(() => {
        createPinoTransportsWithRotation('file', {
          ...mockLogConfig,
          fileMaxSize: '10XB', // Random unit - unsupported
        });
      }).toThrow('Invalid size format: 10XB');
    });

    it('should throw error for unsupported unit in switch default case', () => {
      // This test specifically targets the default case in the switch statement
      // We need to mock the regex match to return a unit that passes the regex but fails the switch
      const originalMatch = String.prototype.match;
      
      // Mock match to return a fake unit that will hit the default case
      String.prototype.match = jest.fn().mockReturnValue(['10TB', '10', 'TB']);
      
      try {
        expect(() => {
          createPinoTransportsWithRotation('file', {
            ...mockLogConfig,
            fileMaxSize: '10TB', // This will hit the default case
          });
        }).toThrow('Unsupported size unit: TB');
      } finally {
        // Restore original match function
        String.prototype.match = originalMatch;
      }
    });
  });