import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { ContextLoggerService } from '../../../common/services/context-logger.service';
import { HealthService } from '../health.service';

import { HealthMcpTool } from './health-mcp-http.tool';

describe('HealthMcpTool', () => {
  let healthMcpTool: HealthMcpTool;
  let healthService: HealthService;

  const mockHealthData = {
    status: 'healthy',
    timestamp: '2024-01-01T00:00:00.000Z',
    server: 'test-api',
    version: '1.0.0',
    uptime: 123.45,
    memory: {
      rss: 1000000,
      heapTotal: 2000000,
      heapUsed: 1500000,
      external: 500000,
      arrayBuffers: 100000,
    },
    environment: 'test',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({
              name: 'test-api',
              version: '1.0.0',
            }),
          },
        },
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
    healthMcpTool = new HealthMcpTool(healthService);
  });

  describe('getApiHealth', () => {
    it('should return health status in MCP format', () => {
      // Arrange
      jest.spyOn(healthService, 'getHealthStatus').mockReturnValue(mockHealthData);

      // Act
      const result = healthMcpTool.getApiHealth({});

      // Assert
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(mockHealthData, null, 2),
          },
        ],
      });
      expect(healthService.getHealthStatus).toHaveBeenCalledTimes(1);
    });

    it('should handle empty arguments', () => {
      // Arrange
      jest.spyOn(healthService, 'getHealthStatus').mockReturnValue(mockHealthData);

      // Act
      const result = healthMcpTool.getApiHealth({});

      // Assert
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
    });
  });

  describe('getToolDefinitions', () => {
    it('should return correct tool definitions', () => {
      // Act
      const definitions = HealthMcpTool.getToolDefinitions();

      // Assert
      expect(definitions).toHaveLength(1);
      expect(definitions[0]).toEqual({
        name: 'get_api_health',
        description: 'Check the health status of the API server',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      });
    });

    it('should return static definitions without instance', () => {
      // Act
      const definitions = HealthMcpTool.getToolDefinitions();

      // Assert
      expect(definitions).toBeDefined();
      expect(Array.isArray(definitions)).toBe(true);
    });
  });
});