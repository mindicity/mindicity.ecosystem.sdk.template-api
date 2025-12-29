import { Test, TestingModule } from '@nestjs/testing';

import { ContextLoggerService } from '../../common/services/context-logger.service';
import { DatabaseService } from '../../infrastructure/database/database.service';

import { TemplateService } from './template.service';

describe('TemplateService', () => {
  let service: TemplateService;
  let mockDatabaseService: jest.Mocked<DatabaseService>;

  beforeEach(async () => {
    const mockContextLogger = {
      child: jest.fn().mockReturnThis(),
      setContext: jest.fn(),
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
    };

    mockDatabaseService = {
      queryMany: jest.fn(),
      query: jest.fn(),
      queryOne: jest.fn(),
      transaction: jest.fn(),
      getPoolStatus: jest.fn(),
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateService,
        {
          provide: ContextLoggerService,
          useValue: mockContextLogger,
        },
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    service = module.get<TemplateService>(TemplateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have database service injected', () => {
    expect(mockDatabaseService).toBeDefined();
  });
});
