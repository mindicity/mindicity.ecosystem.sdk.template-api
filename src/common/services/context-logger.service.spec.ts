import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';

import { ContextLoggerService } from './context-logger.service';

// Mock ContextUtil
jest.mock('../utils/context.util', () => ({
  ContextUtil: {
    getCorrelationId: jest.fn().mockReturnValue('test-correlation-id'),
    getUserId: jest.fn().mockReturnValue('test-user-id'),
  },
}));

describe('ContextLoggerService', () => {
  let service: ContextLoggerService;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockPinoLogger: jest.Mocked<PinoLogger>;
  let mockChildLogger: any;

  beforeEach(async () => {
    mockChildLogger = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      child: jest.fn(),
    };

    mockPinoLogger = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      setContext: jest.fn(),
      child: jest.fn().mockReturnValue(mockChildLogger),
      logger: {
        child: jest.fn().mockReturnValue(mockChildLogger),
      },
    } as any;

    mockConfigService = {
      get: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ContextLoggerService,
          useFactory: () => new ContextLoggerService(mockPinoLogger, mockConfigService),
        },
        {
          provide: PinoLogger,
          useValue: mockPinoLogger,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ContextLoggerService>(ContextLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('setContext', () => {
    it('should set context on the logger', () => {
      // Arrange
      const context = 'TestService';

      // Act
      service.setContext(context);

      // Assert
      expect(mockPinoLogger.setContext).toHaveBeenCalledWith(context);
    });

    it('should handle empty context', () => {
      // Arrange
      const context = '';

      // Act
      service.setContext(context);

      // Assert
      expect(mockPinoLogger.setContext).toHaveBeenCalledWith('');
    });

    it('should handle special characters in context', () => {
      // Arrange
      const context = 'Test-Service_123';

      // Act
      service.setContext(context);

      // Assert
      expect(mockPinoLogger.setContext).toHaveBeenCalledWith(context);
    });
  });

  describe('child', () => {
    it('should create child logger with additional context', () => {
      // Arrange
      const additionalContext = { userId: '123', requestId: 'abc-def' };

      // Act
      const childLogger = service.child(additionalContext);

      // Assert
      expect(childLogger).toBeInstanceOf(ContextLoggerService);
    });

    it('should handle empty additional context', () => {
      // Arrange
      const additionalContext = {};

      // Act
      const childLogger = service.child(additionalContext);

      // Assert
      expect(childLogger).toBeInstanceOf(ContextLoggerService);
    });

    it('should handle serviceContext in additional context', () => {
      // Arrange
      const additionalContext = { serviceContext: 'ChildService' };

      // Act
      const childLogger = service.child(additionalContext);

      // Assert
      expect(childLogger).toBeInstanceOf(ContextLoggerService);
    });
  });

  describe('logging methods', () => {
    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();
      
      // Re-setup the child logger mock
      (mockPinoLogger.logger as any).child.mockReturnValue(mockChildLogger);

      service.setContext('TestService');
    });

    describe('trace', () => {
      it('should log trace message with string', () => {
        // Arrange
        const message = 'Trace message';

        // Act
        service.trace(message);

        // Assert
        expect(mockChildLogger.trace).toHaveBeenCalledWith(
          expect.objectContaining({ context: 'TestService' }),
          message
        );
      });

      it('should log trace message with object and string', () => {
        // Arrange
        const obj = { userId: '123' };
        const message = 'Trace message';

        // Act
        service.trace(message, obj);

        // Assert
        expect(mockChildLogger.trace).toHaveBeenCalledWith(
          expect.objectContaining({ 
            context: 'TestService',
            userId: '123'
          }),
          message
        );
      });

      it('should handle empty message', () => {
        // Act
        service.trace('');

        // Assert
        expect(mockChildLogger.trace).toHaveBeenCalledWith(
          expect.objectContaining({ context: 'TestService' }),
          ''
        );
      });

      it('should handle undefined metadata', () => {
        // Act
        service.trace('message', undefined);

        // Assert
        expect(mockChildLogger.trace).toHaveBeenCalledWith(
          expect.objectContaining({ context: 'TestService' }),
          'message'
        );
      });
    });

    describe('debug', () => {
      it('should log debug message with string', () => {
        // Arrange
        const message = 'Debug message';

        // Act
        service.debug(message);

        // Assert
        expect(mockChildLogger.debug).toHaveBeenCalledWith(
          expect.objectContaining({ context: 'TestService' }),
          message
        );
      });

      it('should log debug message with object and string', () => {
        // Arrange
        const obj = { requestId: 'abc-123' };
        const message = 'Debug message';

        // Act
        service.debug(message, obj);

        // Assert
        expect(mockChildLogger.debug).toHaveBeenCalledWith(
          expect.objectContaining({ 
            context: 'TestService',
            requestId: 'abc-123'
          }),
          message
        );
      });

      it('should handle complex objects', () => {
        // Arrange
        const obj = {
          user: { id: 123, name: 'John' },
          metadata: { source: 'api', version: '1.0' },
        };
        const message = 'Complex debug';

        // Act
        service.debug(message, obj);

        // Assert
        expect(mockChildLogger.debug).toHaveBeenCalledWith(
          expect.objectContaining({ 
            context: 'TestService',
            user: { id: 123, name: 'John' },
            metadata: { source: 'api', version: '1.0' }
          }),
          message
        );
      });
    });

    describe('info', () => {
      it('should log info message with string', () => {
        // Arrange
        const message = 'Info message';

        // Act
        service.info(message);

        // Assert
        expect(mockChildLogger.info).toHaveBeenCalledWith(
          expect.objectContaining({ context: 'TestService' }),
          message
        );
      });

      it('should log info message with object and string', () => {
        // Arrange
        const obj = { action: 'user_login' };
        const message = 'User logged in';

        // Act
        service.info(message, obj);

        // Assert
        expect(mockChildLogger.info).toHaveBeenCalledWith(
          expect.objectContaining({ 
            context: 'TestService',
            action: 'user_login'
          }),
          message
        );
      });
    });

    describe('warn', () => {
      it('should log warn message with string', () => {
        // Arrange
        const message = 'Warning message';

        // Act
        service.warn(message);

        // Assert
        expect(mockChildLogger.warn).toHaveBeenCalledWith(
          expect.objectContaining({ context: 'TestService' }),
          message
        );
      });

      it('should log warn message with object and string', () => {
        // Arrange
        const obj = { deprecatedFeature: 'oldApi' };
        const message = 'Using deprecated API';

        // Act
        service.warn(message, obj);

        // Assert
        expect(mockChildLogger.warn).toHaveBeenCalledWith(
          expect.objectContaining({ 
            context: 'TestService',
            deprecatedFeature: 'oldApi'
          }),
          message
        );
      });
    });

    describe('error', () => {
      it('should log error message with string', () => {
        // Arrange
        const message = 'Error message';

        // Act
        service.error(message);

        // Assert
        expect(mockChildLogger.error).toHaveBeenCalledWith(
          expect.objectContaining({ context: 'TestService' }),
          message
        );
      });

      it('should log error message with object and string', () => {
        // Arrange
        const obj = { error: new Error('Test error') };
        const message = 'Operation failed';

        // Act
        service.error(message, obj);

        // Assert
        expect(mockChildLogger.error).toHaveBeenCalledWith(
          expect.objectContaining({ 
            context: 'TestService',
            error: expect.any(Error)
          }),
          message
        );
      });

      it('should handle Error objects', () => {
        // Arrange
        const error = new Error('Test error');
        error.stack = 'Error stack trace';
        const obj = { err: error, userId: '123' };
        const message = 'Database operation failed';

        // Act
        service.error(message, obj);

        // Assert
        expect(mockChildLogger.error).toHaveBeenCalledWith(
          expect.objectContaining({ 
            context: 'TestService',
            err: expect.any(Error),
            userId: '123'
          }),
          message
        );
      });
    });

    describe('fatal', () => {
      it('should log fatal message with string', () => {
        // Arrange
        const message = 'Fatal error';

        // Act
        service.fatal(message);

        // Assert
        expect(mockChildLogger.fatal).toHaveBeenCalledWith(
          expect.objectContaining({ context: 'TestService' }),
          message
        );
      });

      it('should log fatal message with object and string', () => {
        // Arrange
        const obj = { systemError: 'out_of_memory' };
        const message = 'System critical error';

        // Act
        service.fatal(message, obj);

        // Assert
        expect(mockChildLogger.fatal).toHaveBeenCalledWith(
          expect.objectContaining({ 
            context: 'TestService',
            systemError: 'out_of_memory'
          }),
          message
        );
      });
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      // Reset mocks and set context for edge case tests
      jest.clearAllMocks();
      (mockPinoLogger.logger as any).child.mockReturnValue(mockChildLogger);
      service.setContext('TestService');
    });

    it('should handle undefined messages', () => {
      // Act
      service.info(undefined as any);

      // Assert
      expect(mockChildLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ context: 'TestService' }),
        undefined
      );
    });

    it('should handle null messages', () => {
      // Act
      service.info(null as any);

      // Assert
      expect(mockChildLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ context: 'TestService' }),
        null
      );
    });

    it('should handle numeric messages', () => {
      // Act
      service.info(123 as any);

      // Assert
      expect(mockChildLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ context: 'TestService' }),
        123
      );
    });

    it('should handle boolean messages', () => {
      // Act
      service.info(true as any);

      // Assert
      expect(mockChildLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ context: 'TestService' }),
        true
      );
    });

    it('should handle array objects', () => {
      // Arrange
      const obj = [1, 2, 3];
      const message = 'Array data';

      // Act
      service.debug(message, obj as any);

      // Assert
      expect(mockChildLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({ 
          context: 'TestService',
          0: 1,
          1: 2,
          2: 3
        }),
        message
      );
    });

    it('should handle very long messages', () => {
      // Arrange
      const longMessage = 'A'.repeat(1000);

      // Act
      service.info(longMessage);

      // Assert
      expect(mockChildLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ context: 'TestService' }),
        longMessage
      );
    });

    it('should handle messages with special characters', () => {
      // Arrange
      const specialMessage = 'Message with special chars: @#$%^&*()_+-=[]{}|;:,.<>?';

      // Act
      service.info(specialMessage);

      // Assert
      expect(mockChildLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ context: 'TestService' }),
        specialMessage
      );
    });

    it('should handle unicode messages', () => {
      // Arrange
      const unicodeMessage = '你好世界! 🌍 Здравствуй мир!';

      // Act
      service.info(unicodeMessage);

      // Assert
      expect(mockChildLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ context: 'TestService' }),
        unicodeMessage
      );
    });
  });
});
    it('should create child logger with serviceContext', () => {
      // Arrange
      const mockPinoLogger = {
        setContext: jest.fn(),
        trace: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        fatal: jest.fn(),
      };

      const mockConfigService = {
        get: jest.fn().mockReturnValue({ level: 'info' }),
      };

      const service = new ContextLoggerService(mockPinoLogger as any, mockConfigService as any);

      // Act
      const childLogger = service.child({ serviceContext: 'TestService' });

      // Assert
      expect(childLogger).toBeDefined();
      expect(childLogger).toBeInstanceOf(ContextLoggerService);
    });