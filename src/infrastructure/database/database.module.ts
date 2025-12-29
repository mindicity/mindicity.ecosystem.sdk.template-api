import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ContextLoggerService } from '../../common/services/context-logger.service';

import { databaseConfig } from './database.config';
import { DatabaseService } from './database.service';

/**
 * Database module that provides PostgreSQL connection and raw query capabilities.
 * Exports DatabaseService for use in other modules.
 */
@Module({
  imports: [
    ConfigModule.forFeature(databaseConfig),
  ],
  providers: [DatabaseService, ContextLoggerService],
  exports: [DatabaseService],
})
export class DatabaseModule {}