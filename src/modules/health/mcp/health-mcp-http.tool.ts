import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { HealthService } from '../health.service';

/**
 * MCP tool for health module.
 * Provides health check functionality for AI agents via MCP protocol.
 */
export class HealthMcpTool {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Get API health status tool.
   * Returns comprehensive health information including status, uptime, and memory usage.
   * 
   * @param _args - Tool arguments (empty for health check)
   * @returns CallToolResult with health status data
   */
  getApiHealth(_args: Record<string, unknown>): CallToolResult {
    const healthData = this.healthService.getHealthStatus();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(healthData, null, 2),
        },
      ],
    };
  }

  /**
   * Get tool definitions for health module.
   * Returns the list of available MCP tools with their schemas.
   * 
   * @returns Array of tool definitions
   */
  static getToolDefinitions(): Array<{
    name: string;
    description: string;
    inputSchema: {
      type: string;
      properties: Record<string, unknown>;
      required: string[];
    };
  }> {
    return [
      {
        name: 'get_api_health',
        description: 'Check the health status of the API server',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    ];
  }
}