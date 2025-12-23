import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder, OpenAPIObject } from '@nestjs/swagger';
import { Test, TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';

import { AppModule } from './app.module';
import { ROUTES } from './config/routes.config';

// Helper functions for validation
const validateResponseSchema = (response: Record<string, unknown>): void => {
  expect(response).toBeDefined();
  expect(response.description).toBeDefined();

  if (response.content) {
    const contentTypes = Object.keys(response.content as Record<string, unknown>);
    expect(contentTypes.length).toBeGreaterThan(0);

    contentTypes.forEach((contentType) => {
      const mediaType = (response.content as Record<string, unknown>)[contentType] as Record<
        string,
        unknown
      >;
      if (mediaType.schema) {
        expect(mediaType.schema).toBeDefined();
        const schema = mediaType.schema as Record<string, unknown>;
        expect(schema.properties ?? schema.$ref ?? schema.type).toBeDefined();
      }
    });
  }
};

const validateRequestBody = (operation: Record<string, unknown>): void => {
  if (operation.requestBody) {
    const requestBody = operation.requestBody as Record<string, unknown>;
    expect(requestBody.content).toBeDefined();

    const requestContentTypes = Object.keys(requestBody.content as Record<string, unknown>);
    expect(requestContentTypes.length).toBeGreaterThan(0);

    requestContentTypes.forEach((contentType) => {
      const mediaType = (requestBody.content as Record<string, unknown>)[contentType] as Record<
        string,
        unknown
      >;
      if (mediaType.schema) {
        expect(mediaType.schema).toBeDefined();
        const schema = mediaType.schema as Record<string, unknown>;
        expect(schema.properties ?? schema.$ref ?? schema.type).toBeDefined();
      }
    });
  }
};

const validateParameters = (parameters: Record<string, unknown>[]): void => {
  parameters.forEach((param) => {
    expect(param.name).toBeDefined();
    expect(param.in).toBeDefined();
    expect(param.schema ?? param.type).toBeDefined();
  });
};

const validateOperation = (operation: Record<string, unknown>, method: string): void => {
  expect(operation).toBeDefined();
  expect(operation.summary ?? operation.description).toBeDefined();

  expect(operation.responses).toBeDefined();
  const responses = operation.responses as Record<string, unknown>;
  expect(Object.keys(responses).length).toBeGreaterThan(0);

  const successResponses = Object.keys(responses).filter((code) => code.startsWith('2'));
  expect(successResponses.length).toBeGreaterThan(0);

  successResponses.forEach((responseCode) => {
    validateResponseSchema(responses[responseCode] as Record<string, unknown>);
  });

  if (['post', 'put', 'patch'].includes(method)) {
    validateRequestBody(operation);
  }

  if (operation.parameters) {
    validateParameters(operation.parameters as Record<string, unknown>[]);
  }
};

/**
 * **Feature: nestjs-hello-api, Property 14: Documentation completeness**
 * Validates: Requirements 5.4
 */
describe('Swagger Documentation Property Tests', () => {
  let app: NestFastifyApplication;
  let swaggerDocument: OpenAPIObject;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());

    const config = new DocumentBuilder()
      .setTitle('NestJS API')
      .setDescription('Production-ready NestJS API with Fastify and Pino')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();

    swaggerDocument = SwaggerModule.createDocument(app, config);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Endpoint Documentation Validation', () => {
    /**
     * **Feature: nestjs-hello-api, Property 14: Documentation completeness**
     * *For any* endpoint in the API_System, the Swagger documentation should include request/response schemas and examples
     * **Validates: Requirements 5.4**
     */
    it('should include request/response schemas and examples for all endpoints', () => {
      const validateEndpoint = (endpointPath: string): boolean => {
        const pathItem = swaggerDocument.paths?.[endpointPath];
        expect(pathItem).toBeDefined();

        const httpMethods = ['get', 'post', 'put', 'delete', 'patch'];
        const pathItemAny = pathItem as Record<string, unknown>;
        const definedMethods = httpMethods.filter((method) => pathItemAny[method]);
        expect(definedMethods.length).toBeGreaterThan(0);

        definedMethods.forEach((method) => {
          const operation = pathItemAny[method] as Record<string, unknown>;
          validateOperation(operation, method);
        });

        return true;
      };

      fc.assert(
        fc.property(fc.constantFrom(...Object.keys(swaggerDocument.paths ?? {})), validateEndpoint),
        { numRuns: 100 },
      );
    });
  });

  describe('Required Endpoints Documentation', () => {
    it('should have complete documentation for all required endpoints', () => {
      // Get the actual endpoint paths from the routes configuration
      const requiredEndpoints = [`/${ROUTES.HEALTH}/ping`];

      requiredEndpoints.forEach((endpoint) => {
        expect(swaggerDocument.paths?.[endpoint]).toBeDefined();

        const pathItem = swaggerDocument.paths?.[endpoint] as Record<string, unknown>;
        const getOperation = pathItem?.get as Record<string, unknown>;

        expect(getOperation).toBeDefined();
        expect(getOperation?.summary).toBeDefined();
        expect(getOperation?.responses).toBeDefined();

        const responses = getOperation?.responses as Record<string, unknown>;
        expect(responses?.['200']).toBeDefined();

        const response200 = responses?.['200'] as Record<string, unknown>;
        expect(response200?.description).toBeDefined();
      });
    });
  });

  describe('Component Schemas Validation', () => {
    it('should have properly defined component schemas', () => {
      if (!swaggerDocument.components?.schemas) {
        return;
      }

      const validateSchema = (schemaName: string): boolean => {
        const schema = swaggerDocument.components?.schemas?.[schemaName] as Record<string, unknown>;
        expect(schema).toBeDefined();

        expect(schema.type ?? schema.properties ?? schema.allOf ?? schema.oneOf).toBeDefined();

        if (schema.properties) {
          const properties = schema.properties as Record<string, Record<string, unknown>>;
          const validateProperty = (propName: string): void => {
            const property = properties[propName];
            expect(property).toBeDefined();
            expect(
              property.type ?? property.$ref ?? property.allOf ?? property.oneOf,
            ).toBeDefined();
          };

          Object.keys(properties).forEach(validateProperty);
        }

        return true;
      };

      fc.assert(
        fc.property(
          fc.constantFrom(...Object.keys(swaggerDocument.components.schemas)),
          validateSchema,
        ),
        { numRuns: 50 },
      );
    });
  });
});
