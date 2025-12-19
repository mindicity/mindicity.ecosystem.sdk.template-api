import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Pool, PoolClient, QueryResult } from 'pg';

import { DatabaseException } from '../../common/exceptions/database.exception';
import { ContextLoggerService } from '../../common/services/context-logger.service';

import { DatabaseConfig } from './database.config';

/**
 * Database service for raw PostgreSQL queries.
 * Provides connection pooling and query execution methods.
 */
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool!: Pool;
  private readonly logger: ContextLoggerService;

  /**
   * Creates an instance of DatabaseService.
   * @param configService - The configuration service for database settings
   * @param loggerService - The context logger service for logging operations
   */
  constructor(
    private readonly configService: ConfigService,
    loggerService: ContextLoggerService,
  ) {
    this.logger = loggerService.child({ serviceContext: DatabaseService.name });
    this.logger.setContext(DatabaseService.name);
  }

  /**
   * Initializes the database connection pool on module initialization.
   */
  async onModuleInit(): Promise<void> {
    this.logger.trace('onModuleInit()');
    
    const dbConfig = this.configService.get<DatabaseConfig>('database');
    if (!dbConfig) {
      throw new DatabaseException('Database configuration not found', 'DatabaseService.onModuleInit');
    }
    
    // Always create the connection pool
    const connectionString = `postgresql://${dbConfig.username}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;

    this.pool = new Pool({
      connectionString,
      min: dbConfig.poolMin,
      max: dbConfig.poolMax,
      connectionTimeoutMillis: dbConfig.connectionTimeoutMillis,
      idleTimeoutMillis: dbConfig.idleTimeoutMillis,
      ssl: dbConfig.ssl,
    });

    this.logger.info('Database connection pool created', {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      poolMin: dbConfig.poolMin,
      poolMax: dbConfig.poolMax,
    });

    // Test connection with retry logic (respects checkConnection flag)
    await this.testConnectionWithRetry(dbConfig);
  }

  /**
   * Closes the database connection pool on module destruction.
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.trace('onModuleDestroy()');
    
    if (this.pool) {
      await this.pool.end();
      this.logger.info('Database connection pool closed');
    }
  }

  /**
   * Tests database connection with retry logic.
   * @param dbConfig - Database configuration with retry settings
   * @throws DatabaseException when all retry attempts fail
   */
  private async testConnectionWithRetry(dbConfig: DatabaseConfig): Promise<void> {
    // Skip database connection test if DB_CHECK is false
    if (!dbConfig.checkConnection) {
      this.logger.info('Database connection check disabled (DB_CHECK=false), skipping connection test');
      return;
    }

    this.logger.info('Testing database connection with retry logic', {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      ssl: dbConfig.ssl,
      retryAttempts: dbConfig.retryAttempts,
      retryDelay: `${dbConfig.retryDelay}ms`,
    });

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= dbConfig.retryAttempts; attempt++) {
      try {
        this.logger.debug(`Database connection attempt ${attempt}/${dbConfig.retryAttempts}`, {
          host: dbConfig.host,
          port: dbConfig.port,
          database: dbConfig.database,
        });

        const client = await this.pool.connect();
        await client.query('SELECT NOW()');
        client.release();

        this.logger.info('Database connection test successful', {
          host: dbConfig.host,
          port: dbConfig.port,
          database: dbConfig.database,
          poolMin: dbConfig.poolMin,
          poolMax: dbConfig.poolMax,
          attempt,
          totalAttempts: dbConfig.retryAttempts,
        });

        return; // Success, exit retry loop
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        this.logger.warn(`Database connection attempt ${attempt}/${dbConfig.retryAttempts} failed`, {
          err: error,
          host: dbConfig.host,
          port: dbConfig.port,
          database: dbConfig.database,
          nextRetryIn: attempt < dbConfig.retryAttempts ? `${dbConfig.retryDelay}ms` : 'none',
        });

        // If this is not the last attempt, wait before retrying
        if (attempt < dbConfig.retryAttempts) {
          this.logger.info(`Waiting ${dbConfig.retryDelay}ms before next connection attempt...`);
          await this.sleep(dbConfig.retryDelay);
        }
      }
    }

    // All retry attempts failed
    this.logger.error('All database connection attempts failed', {
      err: lastError,
      totalAttempts: dbConfig.retryAttempts,
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
    });

    throw new DatabaseException(
      `Database connection failed after ${dbConfig.retryAttempts} attempts: ${lastError?.message}`,
      'DatabaseService.testConnectionWithRetry'
    );
  }

  /**
   * Sleep utility function for retry delays.
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Executes a raw SQL query with parameters.
   * @param query - The SQL query string
   * @param params - Optional query parameters
   * @returns Query result with rows and metadata
   * @throws DatabaseException when query execution fails
   */
  async query<T extends Record<string, unknown> = Record<string, unknown>>(query: string, params?: unknown[]): Promise<QueryResult<T>> {
    this.logger.trace(`query: ${query}`, { params });
    
    if (!this.pool) {
      throw new DatabaseException(
        'Database connection pool not initialized.',
        'DatabaseService.query'
      );
    }
    
    const startTime = Date.now();
    let client: PoolClient | undefined;

    try {
      client = await this.pool.connect();
      const result = await client.query<T>(query, params);
      
      const duration = Date.now() - startTime;
      this.logger.debug('Query executed successfully', {
        rowCount: result.rowCount,
        duration: `${duration}ms`,
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error('Query execution failed', {
        err: error,
        query: query.replace(/\s+/g, ' ').trim(),
        params,
        duration: `${duration}ms`,
      });
      
      throw new DatabaseException(
        `Query execution failed: ${errorMessage}`,
        'DatabaseService.query'
      );
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Executes a query and returns the first row or null.
   * @param query - The SQL query string
   * @param params - Optional query parameters
   * @returns First row or null if no results
   */
  async queryOne<T extends Record<string, unknown> = Record<string, unknown>>(query: string, params?: unknown[]): Promise<T | null> {
    const result = await this.query<T>(query, params);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Executes a query and returns all rows.
   * @param query - The SQL query string
   * @param params - Optional query parameters
   * @returns Array of result rows
   */
  async queryMany<T extends Record<string, unknown> = Record<string, unknown>>(query: string, params?: unknown[]): Promise<T[]> {
    const result = await this.query<T>(query, params);
    return result.rows;
  }

  /**
   * Executes a transaction with multiple queries.
   * @param callback - Function that receives a client and executes queries
   * @returns Result of the callback function
   * @throws DatabaseException when transaction fails
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    this.logger.trace('transaction()');
    
    if (!this.pool) {
      throw new DatabaseException(
        'Database connection pool not initialized.',
        'DatabaseService.transaction'
      );
    }
    
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      
      this.logger.debug('Transaction completed successfully');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Transaction failed, rolled back', { err: error });
      
      throw new DatabaseException(
        `Transaction failed: ${errorMessage}`,
        'DatabaseService.transaction'
      );
    } finally {
      client.release();
    }
  }

  /**
   * Gets the current connection pool status.
   * @returns Pool status information
   */
  getPoolStatus(): {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  } {
    if (!this.pool) {
      return {
        totalCount: 0,
        idleCount: 0,
        waitingCount: 0,
      };
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }
}