import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { HealthService } from '../health.service';

/**
 * MCP tool for health module - STDIO transport.
 * Provides health check functionality for AI agents via MCP STDIO protocol.
 */
export class HealthMcpStdioTool {
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
   * Returns comprehensive tool definitions with detailed descriptions and usage guidance.
   * 
   * @returns Array of detailed tool definitions with usage information
   */
  static getToolDefinitions(): Array<{
    name: string;
    description: string;
    inputSchema: {
      type: string;
      properties: Record<string, unknown>;
      required: string[];
    };
    usage?: {
      purpose: string;
      when_to_use: string[];
      response_format: string;
      interpretation: Record<string, string>;
      examples: Array<{
        scenario: string;
        expected_result: string;
      }>;
    };
  }> {
    return [
      {
        name: 'get_api_health',
        description: `Check the comprehensive health status of the API server via STDIO transport.

This tool provides detailed health information including:
- Server operational status (healthy/unhealthy)
- Current timestamp and server identification
- Version information and environment details
- System resource usage (memory, uptime)
- Performance metrics and operational data

Use this tool to verify API availability, monitor system health, and troubleshoot connectivity issues before making other API requests.`,
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
        usage: {
          purpose: 'Monitor API server health and operational status via STDIO transport',
          when_to_use: [
            'Before making other API requests to ensure server availability',
            'During automated health monitoring and alerting workflows',
            'When troubleshooting connectivity or performance issues',
            'For system status verification in CI/CD pipelines',
            'To gather server information for debugging purposes',
          ],
          response_format: 'JSON object with health status, server info, and system metrics',
          interpretation: {
            status: 'healthy = server operational and ready, unhealthy = server has issues',
            timestamp: 'Current server time when health check was performed (ISO 8601)',
            server: 'API server name and identification string',
            version: 'Current API version deployed and running',
            environment: 'Deployment environment (development, staging, production)',
            uptime: 'Server uptime in seconds since last restart',
            memory: 'Current memory usage statistics (RSS, heap, external)',
          },
          examples: [
            {
              scenario: 'Healthy server check',
              expected_result: 'Status: healthy, with current timestamp, version info, and resource usage',
            },
            {
              scenario: 'Pre-request validation',
              expected_result: 'Confirms server is operational before executing other API calls',
            },
            {
              scenario: 'System monitoring',
              expected_result: 'Provides metrics for uptime, memory usage, and performance tracking',
            },
          ],
        },
      },
    ];
  }
}