import { ConfigService } from '@nestjs/config';

/**
 * MCP resources for health module.
 * Provides access to API documentation and specifications.
 */
export class HealthMcpResources {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Get resource definitions for health module.
   * Dynamically generates resource definitions based on the actual OpenAPI specification file.
   * 
   * @param configService - Configuration service to get app settings
   * @returns Array of detailed resource definitions generated from OpenAPI spec
   */
  static getResourceDefinitions(configService: ConfigService): Array<{
    uri: string;
    name: string;
    description: string;
    mimeType: string;
  }> {
    const appConfig = configService.get('app');
    const apiScopePrefix = appConfig?.apiScopePrefix ?? '';
    
    // Try to read the OpenAPI file to generate dynamic descriptions
    try {
      const fs = require('fs');
      const path = require('path');
      
      const openApiPath = path.join(process.cwd(), 'docs', 'api', 'openapi.json');
      
      if (fs.existsSync(openApiPath)) {
        const swaggerContent = fs.readFileSync(openApiPath, 'utf8');
        const openApiSpec = JSON.parse(swaggerContent);
        
        // Extract information from the actual OpenAPI spec
        const apiTitle = openApiSpec.info?.title || 'API';
        const apiDescription = openApiSpec.info?.description || 'API documentation';
        const apiVersion = openApiSpec.info?.version || '1.0.0';
        
        // Get available endpoints
        const paths = Object.keys(openApiSpec.paths || {});
        const endpointCount = paths.length;
        
        // Get available schemas
        const schemas = Object.keys(openApiSpec.components?.schemas || {});
        const schemaCount = schemas.length;
        
        // Get available tags
        const tags = openApiSpec.tags || [];
        const tagNames = tags.map((tag: any) => tag.name).join(', ');
        
        return [
          {
            uri: `doc://openapi${apiScopePrefix}/specs`,
            name: `${apiTitle} OpenAPI Specification`,
            description: `Complete OpenAPI 3.0 specification for ${apiTitle} (v${apiVersion}).

${apiDescription}

This resource contains the full API documentation including:
- ${endpointCount} available API endpoints with HTTP methods and paths
- ${schemaCount} data models and schema definitions
- Request/response schemas and validation rules
- Authentication requirements and security schemes
- Error response formats and status codes
- Example requests and responses for all endpoints
${tagNames ? `- API sections: ${tagNames}` : ''}

Available endpoints:
${paths.slice(0, 10).map(path => `- ${path}`).join('\n')}${paths.length > 10 ? `\n- ... and ${paths.length - 10} more endpoints` : ''}

Use this resource to:
- Understand the complete API structure and capabilities
- Generate proper API requests with correct parameters and schemas
- Validate request/response formats against official schemas
- Learn about available endpoints and their specific purposes
- Get comprehensive schema definitions for all data models
- Access authentication and security requirements

Format: JSON document following OpenAPI 3.0 specification standard.
Content: Machine-readable API specification that can be used to generate client code, documentation, or API calls.`,
            mimeType: 'application/json',
          },
        ];
      }
    } catch (error) {
      // If we can't read the file, fall back to a generic description
      console.warn('Could not read OpenAPI file for dynamic resource generation:', error);
    }
    
    // Fallback to generic description if file doesn't exist or can't be read
    return [
      {
        uri: `doc://openapi${apiScopePrefix}/specs`,
        name: 'API OpenAPI Specification',
        description: `Complete OpenAPI 3.0 specification for the API.

This resource contains the full API documentation including:
- All available API endpoints with HTTP methods and paths
- Request/response schemas and data models
- Parameter definitions and validation rules
- Authentication requirements
- Error response formats
- Example requests and responses

Use this resource to:
- Understand the complete API structure and capabilities
- Generate proper API requests with correct parameters
- Validate request/response formats
- Learn about available endpoints and their purposes
- Get schema definitions for data models

Format: JSON document following OpenAPI 3.0 specification standard.
Content: Machine-readable API specification that can be used to generate client code, documentation, or API calls.`,
        mimeType: 'application/json',
      },
    ];
  }

  /**
   * Handle resource read requests for health module.
   * @param uri - Resource URI to read
   * @returns Resource content
   */
  async handleResourceRead(uri: string): Promise<{
    contents: Array<{ uri: string; mimeType: string; text?: string }>;
  }> {
    try {
      if (uri.startsWith('doc://openapi') && uri.includes('/specs')) {
        return await this.fetchHealthSwaggerResource(uri);
      }

      throw new Error(`Unknown health resource URI: ${uri}`);
    } catch (error) {
      return {
        contents: [
          {
            uri,
            mimeType: 'text/plain',
            text: `Error reading health resource: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }

  /**
   * Fetch the Health API Swagger resource content.
   * @private
   */
  private async fetchHealthSwaggerResource(uri: string): Promise<{
    contents: Array<{ uri: string; mimeType: string; text?: string }>;
  }> {
    try {
      // Try to read the exported OpenAPI JSON file first
      const fs = await import('fs');
      const path = await import('path');
      
      const openApiPath = path.join(process.cwd(), 'docs', 'api', 'openapi.json');
      
      if (fs.existsSync(openApiPath)) {
        const swaggerContent = fs.readFileSync(openApiPath, 'utf8');
        
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: swaggerContent,
            },
          ],
        };
      }
      
      // No fallback - return error if file doesn't exist
      throw new Error('OpenAPI specification file not found. Please generate the API documentation first.');
    } catch (error) {
      return {
        contents: [
          {
            uri,
            mimeType: 'text/plain',
            text: `Error fetching Health Swagger documentation: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }
}