import { writeFileSync, mkdirSync } from 'fs';
import { IncomingMessage } from 'http';

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import fastifyCompress from '@fastify/compress';
import helmet from '@fastify/helmet';
import { config } from 'dotenv';
import { Logger } from 'nestjs-pino';
import { v4 as uuidv4 } from 'uuid';
// import { patchNestJsSwagger } from 'nestjs-zod';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';
import { McpConfig } from './config/mcp.config';
import { ROUTES } from './config/routes.config';

// Load environment variables from .env file
config();

/**
 * Bootstrap function that initializes and starts the NestJS application.
 * Configures Fastify adapter, security middleware, logging, validation, and Swagger documentation.
 */
export async function bootstrap(): Promise<void> {
  // Create Fastify adapter with configuration
  const adapter = new FastifyAdapter({
    bodyLimit: 20 * 1024 * 1024, // Will be updated from config after app creation
    logger: false, // Use Pino instead
    trustProxy: true,
    genReqId: (req: IncomingMessage): string => {
      // Use existing x-correlation-id header if present, otherwise generate new UUID
      return (req.headers['x-correlation-id'] as string) ?? uuidv4();
    },
  });

  // Create NestJS application
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const appConfig = configService.get('app');
  const port = appConfig.port;
  const apiPrefix = appConfig.apiPrefix;

  // Use Pino logger
  const logger = app.get(Logger);
  app.useLogger(logger);

  // Add Fastify hooks for consistent request logging
  const fastifyInstance = app.getHttpAdapter().getInstance();

  // Hook to add correlation ID to response headers
  fastifyInstance.addHook('onRequest', (request, reply, done): void => {
    reply.header('x-correlation-id', request.id);
    done();
  });

  // Set global prefix (without scope for now)
  app.setGlobalPrefix(apiPrefix);

  // Security: Helmet
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [`'self'`],
        styleSrc: [`'self'`, `'unsafe-inline'`],
        imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
        scriptSrc: [`'self'`, `https: 'unsafe-inline'`],
      },
    },
  });

  // Compression
  if (appConfig.enableCompression) {
    await app.register(fastifyCompress, {
      global: true,
      encodings: ['gzip', 'deflate'],
    });
    logger.log('Fastify compression enabled (gzip, deflate)');
  } else {
    logger.log('Fastify compression disabled');
  }

  // CORS
  if (appConfig.corsEnabled) {
    app.enableCors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'x-correlation-id',
        'x-ent-value',
        'x-ent-resource',
        'x-ent-ref',
      ],
    });
    logger.log('Fastify CORS enabled');
  } else {
    logger.log('Fastify CORS disabled');
  }

  // Remove X-Powered-By header
  app
    .getHttpAdapter()
    .getInstance()
    .addHook('onSend', (_request, reply, _payload, done) => {
      reply.removeHeader('X-Powered-By');
      done();
    });

  // Global validation pipe
  // patchNestJsSwagger();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter(app.get(Logger), configService));

  // Global interceptors
  app.useGlobalInterceptors(app.get(HttpLoggingInterceptor));

  // Swagger documentation
  const swaggerConfigBuilder = new DocumentBuilder()
    .setTitle('NestJS Hello API')
    .setDescription('Production-ready NestJS API with Fastify and Pino')
    .setVersion(process.env.npm_package_version ?? '1.0.0')
    .addServer(`${appConfig.swaggerHostname}`, 'API Server');

  // Add authentication based on configuration
  switch (appConfig.swaggerAuth) {
    case 'bearer':
      swaggerConfigBuilder.addBearerAuth();
      break;
    case 'basic':
      swaggerConfigBuilder.addBasicAuth();
      break;
    case 'apikey':
      swaggerConfigBuilder.addApiKey({ type: 'apiKey', in: 'header', name: 'X-API-Key' });
      break;
    case 'none':
    default:
      // No authentication
      break;
  }

  const swaggerConfig = swaggerConfigBuilder.build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // Serve Swagger UI
  const docsPath = `${apiPrefix}/${ROUTES.DOCS}`;
  SwaggerModule.setup(docsPath, app, document, {
    customSiteTitle: 'NestJS Hello API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
    jsonDocumentUrl: `${docsPath.replace('/ui', '/specs')}`,
  });

  // Export OpenAPI specs
  try {
    mkdirSync('./docs/api', { recursive: true });
    writeFileSync('./docs/api/openapi.json', JSON.stringify(document, null, 2));
    logger.log('Fastify OpenAPI specs exported to ./docs/api/openapi.json');
  } catch (error) {
    logger.warn(
      'Fastify failed to export OpenAPI specs',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  // Start server
  await app.listen(port, '0.0.0.0');

  // Log MCP server information if enabled
  const mcpConfig = configService.get<McpConfig>('mcp');
  if (mcpConfig?.enabled) {
    let transportInfo: string;
    const mcpUrls: string[] = [];

    switch (mcpConfig.transport) {
      case 'stdio':
        transportInfo = 'stdio transport';
        break;
      case 'http':
        transportInfo = `http transport (${mcpConfig.host}:${mcpConfig.port})`;
        mcpUrls.push(`http://${mcpConfig.host}:${mcpConfig.port}/mcp`);
        break;
      case 'sse':
        transportInfo = `sse transport (${mcpConfig.host}:${mcpConfig.port})`;
        mcpUrls.push(`http://${mcpConfig.host}:${mcpConfig.port}/mcp/events`);
        mcpUrls.push(`http://${mcpConfig.host}:${mcpConfig.port}/mcp`);
        mcpUrls.push(`http://${mcpConfig.host}:${mcpConfig.port}/mcp/info`);
        break;
      default:
        // This should never happen due to Zod validation, but TypeScript requires it
        transportInfo = `${mcpConfig.transport} transport (${mcpConfig.host}:${mcpConfig.port})`;
        logger.warn(`Unknown MCP transport type: ${mcpConfig.transport}`);
    }
    
    logger.log(`🤖 MCP Server: ${transportInfo} (name: ${mcpConfig.serverName})`);
    
    // Log MCP URLs for HTTP/SSE transports
    if (mcpUrls.length > 0) {
      mcpUrls.forEach((url, index) => {
        const label = mcpConfig.transport === 'sse' 
          ? ['📡 MCP Events', '📨 MCP Requests', 'ℹ️  MCP Info'][index]
          : '📨 MCP Endpoint';
        logger.log(`   ${label}: ${url}`);
      });
    }
  }

  const specsPath = docsPath.replace('/ui', '/specs');
  logger.log(`🚀 Application is running on: http://localhost:${port}${apiPrefix}`);
  logger.log(`📚 Swagger UI: http://localhost:${port}${docsPath}`);
  logger.log(`📋 Swagger Specs: http://localhost:${port}${specsPath}`);
  logger.log(`❤️  Health check: http://localhost:${port}${apiPrefix}/${ROUTES.HEALTH}/ping`);
}

bootstrap().catch((error: Error) => {
  // Use process.stderr.write instead of console.error for startup errors
  process.stderr.write(`❌ Application failed to start: ${error.message}\n`);
  process.exit(1);
});
