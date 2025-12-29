import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { ContextLoggerService } from '../../common/services/context-logger.service';

import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockLoggerService = {
    child: jest.fn().mockReturnThis(),
    setContext: jest.fn(),
    trace: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: ContextLoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHealthStatus', () => {
    it('should return comprehensive health status', () => {
      // Arrange
      const mockAppConfig = { port: 3232 };
      const mockPackageInfo = { name: 'test-api', version: '1.0.0' };
      
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'app') return mockAppConfig;
        if (key === 'package') return mockPackageInfo;
        return undefined;
      });

      // Act
      const result = service.getHealthStatus();

      // Assert
      expect(result).toHaveProperty('status', 'healthy');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('server', 'test-api');
      expect(result).toHaveProperty('version', '1.0.0');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('memory');
      expect(result).toHaveProperty('environment');
      
      expect(typeof result.uptime).toBe('number');
      expect(typeof result.memory).toBe('object');
      expect(result.memory).toHaveProperty('rss');
      expect(result.memory).toHaveProperty('heapTotal');
      expect(result.memory).toHaveProperty('heapUsed');
      expect(result.memory).toHaveProperty('external');
      expect(result.memory).toHaveProperty('arrayBuffers');
      
      expect(mockLoggerService.trace).toHaveBeenCalledWith('getHealthStatus()');
      expect(mockLoggerService.debug).toHaveBeenCalledWith('health status generated', {
        status: 'healthy',
        server: 'test-api',
        version: '1.0.0',
        uptime: expect.any(Number),
      });
    });

    it('should use default values when config is not available', () => {
      // Arrange
      mockConfigService.get.mockReturnValue(undefined);

      // Act
      const result = service.getHealthStatus();

      // Assert
      expect(result.server).toBe('nestjs-template-api');
      expect(result.version).toBe('1.0.0');
      expect(result.environment).toBe('test'); // In test environment, NODE_ENV is 'test'
    });

    it('should use NODE_ENV when available', () => {
      // Arrange
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      mockConfigService.get.mockReturnValue(undefined);

      // Act
      const result = service.getHealthStatus();

      // Assert
      expect(result.environment).toBe('production');

      // Cleanup
      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('getSimpleHealthStatus', () => {
    it('should return simple health status', () => {
      // Arrange
      const mockPackageInfo = { name: 'test-api', version: '2.0.0' };
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'package') return mockPackageInfo;
        return undefined;
      });

      // Act
      const result = service.getSimpleHealthStatus();

      // Assert
      expect(result).toEqual({
        status: 'ok',
        version: '2.0.0',
      });
      
      expect(mockLoggerService.trace).toHaveBeenCalledWith('getSimpleHealthStatus()');
    });

    it('should use default version when package info is not available', () => {
      // Arrange
      mockConfigService.get.mockReturnValue(undefined);

      // Act
      const result = service.getSimpleHealthStatus();

      // Assert
      expect(result).toEqual({
        status: 'ok',
        version: '1.0.0',
      });
    });
  });

  describe('logger setup', () => {
    it('should set up logger with correct context', () => {
      expect(mockLoggerService.child).toHaveBeenCalledWith({ 
        serviceContext: 'HealthService' 
      });
      expect(mockLoggerService.setContext).toHaveBeenCalledWith('HealthService');
    });
  });
});