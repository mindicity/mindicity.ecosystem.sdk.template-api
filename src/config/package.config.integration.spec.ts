import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import packageConfig, { PackageConfig } from './package.config';

describe('PackageConfig Integration', () => {
  let configService: ConfigService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [packageConfig],
        }),
      ],
    }).compile();

    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should load package configuration from real package.json', () => {
    // Act
    const packageInfo = configService.get<PackageConfig>('package');

    // Assert
    expect(packageInfo).toBeDefined();
    expect(packageInfo?.name).toBe('nestjs-template-api');
    expect(packageInfo?.version).toBe('1.0.0');
    expect(packageInfo?.description).toContain('production-ready NestJS API template');
    expect(packageInfo?.author).toBe('Mindicity Srl S.B.');
    expect(packageInfo?.license).toBe('EUPL-1.2');
  });

  it('should match values from actual package.json file', () => {
    // Arrange
    const actualPackageJson = require('../../package.json');

    // Act
    const packageInfo = configService.get<PackageConfig>('package');

    // Assert
    expect(packageInfo?.name).toBe(actualPackageJson.name);
    expect(packageInfo?.version).toBe(actualPackageJson.version);
    expect(packageInfo?.description).toBe(actualPackageJson.description);
    expect(packageInfo?.author).toBe(actualPackageJson.author);
    expect(packageInfo?.license).toBe(actualPackageJson.license);
  });

  it('should be available for health service usage', () => {
    // Act
    const packageInfo = configService.get<PackageConfig>('package');

    // Assert - These are the values that health service will use
    expect(packageInfo?.name).toBeTruthy();
    expect(packageInfo?.version).toBeTruthy();
    expect(typeof packageInfo?.name).toBe('string');
    expect(typeof packageInfo?.version).toBe('string');
    
    // Verify they're not the fallback values
    expect(packageInfo?.name).not.toBe('unknown-api');
    expect(packageInfo?.version).not.toBe('0.0.0');
  });
});