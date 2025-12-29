/**
 * Dynamic route configuration based on environment variables
 * This file provides route configuration that can be used at runtime
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
 */
function generateRoutes(): {
  readonly HEALTH: string;
  readonly TEMPLATE: string;
  readonly DOCS: string;
} {
  const scopePrefix = getScopePrefix();

  return {
    // Health controller: /mcapi/health/{scope}/ping
    HEALTH: scopePrefix ? `health/${scopePrefix}` : 'health',

    // Template API controller: /mcapi/{scope}/hello
    TEMPLATE: scopePrefix ? `${scopePrefix}/template` : 'template',

    // Swagger docs path: /mcapi/docs/{scope}/swagger/ui
    // Swagger specs path: /mcapi/docs/{scope}/swagger/specs (configured in main.ts)
    DOCS: scopePrefix ? `docs/${scopePrefix}/swagger/ui` : 'docs/swagger/ui',
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
