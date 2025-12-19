import { IncomingMessage } from 'http';

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { LoggerModule } from 'nestjs-pino';

import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';
import { ContextLoggerService } from './common/services/context-logger.service';
import { extractUserIdFromJWT, extractCorrelationId } from './common/utils/jwt.util';
import { createPinoTransportsWithRotation } from './common/utils/pino-roll-transport.util';
import appConfig from './config/app.config';
import logConfig from './config/log.config';
import { DatabaseModule } from './infrastructure/database/database.module';
import { HealthModule } from './modules/health/health.module';
import { TemplateModule } from './modules/template/template.module';

/**
 * Main application module with configurable logging system.
 * Supports context visibility control via environment variables.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, logConfig],
      envFilePath: '.env',
      validate: (config: Record<string, unknown>) => {
        // Validate environment variables using our Zod schemas
        try {
          appConfig();
          logConfig();
          // Database config will be validated when the module is loaded
          return config;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
          throw new Error(`Configuration validation failed: ${errorMessage}`);
        }
      },
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logConfig = configService.get('log');

        const transport = createPinoTransportsWithRotation(logConfig.transports, {
          prefix: logConfig.prefix,
          fileMaxSize: logConfig.fileMaxSize,
          fileFrequency: logConfig.fileFrequency,
          prettyPrint: logConfig.prettyPrint,
        });

        const pinoConfig: Record<string, unknown> = {
          level: logConfig.level,
          // Disable automatic HTTP logging - we'll handle it manually
          autoLogging: false,
          // Add base properties for message formatting only
          base: {
            correlationId: 'system',
            userId: 'system',
          },
          customProps: (req: IncomingMessage): { correlationId: string; userId: string } => ({
            correlationId: extractCorrelationId(req as unknown as { id?: string }),
            userId: extractUserIdFromJWT(
              (req as unknown as { headers?: { authorization?: string } }).headers?.authorization,
            ),
          }),
          serializers: {
            req: (): undefined => undefined, // Don't serialize request object
            res: (): undefined => undefined, // Don't serialize response object
          },
        };

        // Add transport if it exists
        if (transport) {
          pinoConfig.transport = transport;
        }

        return {
          // Configure the main Pino logger for all logs (including system logs)
          pinoHttp: pinoConfig,
        };
      },
    }),
    DatabaseModule,
    HealthModule,
    TemplateModule,
  ],
  providers: [HttpLoggingInterceptor, ContextLoggerService],
})
/**
 * Root application module that configures the entire NestJS application.
 * Sets up logging, configuration, CLS context, and imports all feature modules.
 */
export class AppModule {}
