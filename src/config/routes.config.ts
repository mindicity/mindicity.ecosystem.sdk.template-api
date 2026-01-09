/**
 * Dynamic route configuration based on environment variables
 * This file provides route configuration that can be used at runtime
 * 
 * Route Pattern: mcapi/${scopePrefix}/health, mcapi/${scopePrefix}/docs, mcapi/${scopePrefix}/mcp
 * - Without scope: /mcapi/health, /mcapi/docs, /mcapi/mcp
 * - With scope: /mcapi/{scope}/health, /mcapi/{scope}/docs, /mcapi/{scope}/mcp
 */

// Load environment variables from .env file
import { config } from 'dotenv';
config();

/**
 * Get the scope prefix from environment variables
 */
function getScopePrefix(): string {
  const apiScopePrefix = process.env.APP_API_SCOPE_PREFIX ?? '';
  // Remove leading slash if present for consistent path building
  return apiScopePrefix.startsWith('/') ? apiScopePrefix.slice(1) : apiScopePrefix;
}

/**
 * Generate route paths based on current environment configuration
 * Pattern: mcapi/${scopePrefix}/health, mcapi/${scopePrefix}/docs, mcapi/${scopePrefix}/mcp
 */
function generateRoutes(): {
  readonly HEALTH: string;
  readonly TEMPLATE: string;
  readonly DOCS: string;
  readonly MCP: string;
} {
  const scopePrefix = getScopePrefix();

  return {
    // Health controller: /mcapi/{scope}/health/ping
    HEALTH: scopePrefix ? `${scopePrefix}/health` : 'health',

    // Template API controller: /mcapi/{scope}/template
    TEMPLATE: scopePrefix ? `${scopePrefix}/template` : 'template',

    // Swagger docs path: /mcapi/{scope}/docs/swagger/ui
    // Swagger specs path: /mcapi/{scope}/docs/swagger/specs (configured in main.ts)
    DOCS: scopePrefix ? `${scopePrefix}/docs/swagger/ui` : 'docs/swagger/ui',

    // MCP server path: /mcapi/{scope}/mcp
    MCP: scopePrefix ? `${scopePrefix}/mcp` : 'mcp',
  } as const;
}

/**
 * Route paths for controllers - generated at runtime
 */
export const ROUTES = generateRoutes();

/**
 * Get the full API scope prefix for use in main.ts
 */
export const getApiScopePrefix = (): string => process.env.APP_API_SCOPE_PREFIX ?? '';
