import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { ContextLoggerService } from '../../common/services/context-logger.service';
import appConfig from '../../config/app.config';
import mcpConfig from '../../config/mcp.config';
import { HealthModule } from '../../modules/health/health.module';

import { McpServerService } from './mcp-server.service';
import { McpModule } from './mcp.module';

describe('McpModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [mcpConfig, appConfig],
        }),
        McpModule, 
        HealthModule,
      ],
    })
      .overrideProvider(ContextLoggerService)
      .useValue({
        child: jest.fn().mockReturnThis(),
        setContext: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        trace: jest.fn(),
        error: jest.fn(),
      })
      .compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide McpServerService', () => {
    const mcpServerService = module.get<McpServerService>(McpServerService);
    expect(mcpServerService).toBeDefined();
    expect(mcpServerService).toBeInstanceOf(McpServerService);
  });

  it('should provide ContextLoggerService', () => {
    const contextLoggerService = module.get<ContextLoggerService>(ContextLoggerService);
    expect(contextLoggerService).toBeDefined();
  });

  it('should export McpServerService', () => {
    const exports = Reflect.getMetadata('exports', McpModule) ?? [];
    expect(exports).toContain(McpServerService);
  });
});