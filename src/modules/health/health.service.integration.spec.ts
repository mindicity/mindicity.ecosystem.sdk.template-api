import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { ContextLoggerService } from '../../common/services/context-logger.service';
import packageConfig from '../../config/package.config';

import { HealthService } from './health.service';

describe('HealthService Integration with PackageConfig', () => {
  let healthService: HealthService;
  let configService: ConfigService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [packageConfig],
        }),
      ],
      providers: [
        HealthService,
        {
          provide: ContextLoggerService,
          useValue: {
            child: jest.fn().mockReturnThis(),
            setContext: jest.fn(),
            trace: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    healthService = module.get<HealthService>(HealthService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should use real package.json values in health status', () => {
    // Act
    const healthStatus = healthService.getHealthStatus();

    // Assert
    expect(healthStatus.server).toBe('nestjs-template-api'); // From real package.json
    expect(healthStatus.version).toBe('1.0.0'); // From real package.json
    
    // Verify it's not using fallback values
    expect(healthStatus.server).not.toBe('template-api');
    expect(healthStatus.version).not.toBe('0.0.2');
  });

  it('should use real package.json values in simple health status', () => {
    // Act
    const simpleStatus = healthService.getSimpleHealthStatus();

    // Assert
    expect(simpleStatus.version).toBe('1.0.0'); // From real package.json
    expect(simpleStatus.status).toBe('ok');
    
    // Verify it's not using fallback values
    expect(simpleStatus.version).not.toBe('0.0.0');
  });

  it('should have package config available in ConfigService', () => {
    // Act
    const packageInfo = configService.get('package');

    // Assert
    expect(packageInfo).toBeDefined();
    expect(packageInfo.name).toBe('nestjs-template-api');
    expect(packageInfo.version).toBe('1.0.0');
  });
});