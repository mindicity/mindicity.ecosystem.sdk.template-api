import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Pool, PoolClient, QueryResult } from 'pg';

import { ContextLoggerService } from '../../common/services/context-logger.service';

import { DatabaseService } from './database.service';

// Mock pg Pool
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
    totalCount: 0,
    idleCount: 0,
    waitingCount: 0,
  })),
}));

describe('DatabaseService', () => {
  let service: DatabaseService;
  let mockPool: jest.Mocked<Pool>;
  let mockClient: jest.Mocked<PoolClient>;
  let mockLogger: jest.Mocked<ContextLoggerService>;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    } as any;

    mockPool = {
      connect: jest.fn(),
      query: jest.fn(),
      end: jest.fn(),
      get totalCount() { return 0; },
      get idleCount() { return 0; },
      get waitingCount() { return 0; },
    } as any;

    (Pool as jest.MockedClass<typeof Pool>).mockImplementation(() => mockPool);

    mockLogger = {
      child: jest.fn().mockReturnValue({
        setContext: jest.fn(),
        trace: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        fatal: jest.fn(),
      }),
      setContext: jest.fn(),
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
    } as any;

    mockConfigService = {
      get: jest.fn().mockReturnValue({
        host: 'localhost',
        port: 5432,
        username: 'test',
        password: 'test',
        database: 'test',
        poolMin: 2,
        poolMax: 10,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        ssl: false,
        retryAttempts: 3,
        retryDelay: 1000,
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseService,
        {
          provide: ContextLoggerService,
          useValue: mockLogger,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
    
    // Manually set the pool to avoid onModuleInit issues in tests
    (service as any).pool = mockPool;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('queryMany', () => {
    it('should execute query and return rows', async () => {
      // Arrange
      const query = 'SELECT * FROM users WHERE active = $1';
      const params = [true];
      const mockRows = [
        { id: 1, name: 'John', active: true },
        { id: 2, name: 'Jane', active: true },
      ];

      const mockResult: QueryResult = {
        rows: mockRows,
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      (mockClient.query as jest.Mock).mockResolvedValue(mockResult);
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

      // Act
      const result = await service.queryMany(query, params);

      // Assert
      expect(result).toEqual(mockRows);
      expect(mockPool.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.query).toHaveBeenCalledWith(query, params);
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it('should handle query without parameters', async () => {
      // Arrange
      const query = 'SELECT * FROM users';
      const mockRows = [{ id: 1, name: 'John' }];

      const mockResult: QueryResult = {
        rows: mockRows,
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      (mockClient.query as jest.Mock).mockResolvedValue(mockResult);
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

      // Act
      const result = await service.queryMany(query);

      // Assert
      expect(result).toEqual(mockRows);
      expect(mockClient.query).toHaveBeenCalledWith(query, undefined);
    });

    it('should handle empty result set', async () => {
      // Arrange
      const query = 'SELECT * FROM users WHERE id = $1';
      const params = [999];

      const mockResult: QueryResult = {
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      (mockClient.query as jest.Mock).mockResolvedValue(mockResult);
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

      // Act
      const result = await service.queryMany(query, params);

      // Assert
      expect(result).toEqual([]);
      expect(mockClient.query).toHaveBeenCalledWith(query, params);
    });

    it('should release client on successful query', async () => {
      // Arrange
      const query = 'SELECT * FROM users';
      const mockResult: QueryResult = {
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      (mockClient.query as jest.Mock).mockResolvedValue(mockResult);
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

      // Act
      await service.queryMany(query);

      // Assert
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it('should release client on query error', async () => {
      // Arrange
      const query = 'INVALID SQL';
      const error = new Error('syntax error');
      (mockClient.query as jest.Mock).mockRejectedValue(error);
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

      // Act & Assert
      await expect(service.queryMany(query)).rejects.toThrow();
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it('should handle connection error', async () => {
      // Arrange
      const query = 'SELECT * FROM users';
      const connectionError = new Error('connection refused');
      (mockPool.connect as jest.Mock).mockRejectedValue(connectionError);

      // Act & Assert
      await expect(service.queryMany(query)).rejects.toThrow();
    });

    it('should throw error when pool is not initialized', async () => {
      // Arrange
      const query = 'SELECT * FROM users';
      (service as any).pool = null; // Simulate uninitialized pool

      // Act & Assert
      await expect(service.queryMany(query)).rejects.toThrow('Database connection pool not initialized.');
    });

    it('should handle complex queries with multiple parameters', async () => {
      // Arrange
      const query = `
        SELECT u.id, u.name, p.title 
        FROM users u 
        JOIN posts p ON u.id = p.user_id 
        WHERE u.active = $1 AND p.created_at > $2 AND u.role = $3
      `;
      const params = [true, '2024-01-01', 'admin'];
      const mockRows = [{ id: 1, name: 'Admin', title: 'Post 1' }];

      const mockResult: QueryResult = {
        rows: mockRows,
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      (mockClient.query as jest.Mock).mockResolvedValue(mockResult);
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

      // Act
      const result = await service.queryMany(query, params);

      // Assert
      expect(result).toEqual(mockRows);
      expect(mockClient.query).toHaveBeenCalledWith(query, params);
    });
  });

  describe('queryOne', () => {
    it('should execute query and return single row', async () => {
      // Arrange
      const query = 'SELECT * FROM users WHERE id = $1';
      const params = [1];
      const mockRow = { id: 1, name: 'John', active: true };

      const mockResult: QueryResult = {
        rows: [mockRow],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      (mockClient.query as jest.Mock).mockResolvedValue(mockResult);
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

      // Act
      const result = await service.queryOne(query, params);

      // Assert
      expect(result).toEqual(mockRow);
      expect(mockPool.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.query).toHaveBeenCalledWith(query, params);
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it('should return null when no rows found', async () => {
      // Arrange
      const query = 'SELECT * FROM users WHERE id = $1';
      const params = [999];

      const mockResult: QueryResult = {
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      (mockClient.query as jest.Mock).mockResolvedValue(mockResult);
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

      // Act
      const result = await service.queryOne(query, params);

      // Assert
      expect(result).toBeNull();
      expect(mockClient.query).toHaveBeenCalledWith(query, params);
    });

    it('should return first row when multiple rows found', async () => {
      // Arrange
      const query = 'SELECT * FROM users WHERE active = $1';
      const params = [true];
      const mockRows = [
        { id: 1, name: 'John', active: true },
        { id: 2, name: 'Jane', active: true },
      ];

      const mockResult: QueryResult = {
        rows: mockRows,
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      (mockClient.query as jest.Mock).mockResolvedValue(mockResult);
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

      // Act
      const result = await service.queryOne(query, params);

      // Assert
      expect(result).toEqual(mockRows[0]);
      expect(mockClient.query).toHaveBeenCalledWith(query, params);
    });

    it('should handle query without parameters', async () => {
      // Arrange
      const query = 'SELECT COUNT(*) as total FROM users';
      const mockRow = { total: 5 };

      const mockResult: QueryResult = {
        rows: [mockRow],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      (mockClient.query as jest.Mock).mockResolvedValue(mockResult);
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

      // Act
      const result = await service.queryOne(query);

      // Assert
      expect(result).toEqual(mockRow);
      expect(mockClient.query).toHaveBeenCalledWith(query, undefined);
    });

    it('should release client on successful query', async () => {
      // Arrange
      const query = 'SELECT * FROM users WHERE id = $1';
      const params = [1];
      
      const mockResult: QueryResult = {
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      (mockClient.query as jest.Mock).mockResolvedValue(mockResult);
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

      // Act
      await service.queryOne(query, params);

      // Assert
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it('should release client on query error', async () => {
      // Arrange
      const query = 'INVALID SQL';
      const error = new Error('syntax error');
      (mockClient.query as jest.Mock).mockRejectedValue(error);
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

      // Act & Assert
      await expect(service.queryOne(query)).rejects.toThrow();
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it('should handle connection error', async () => {
      // Arrange
      const query = 'SELECT * FROM users WHERE id = $1';
      const params = [1];
      const connectionError = new Error('connection refused');
      (mockPool.connect as jest.Mock).mockRejectedValue(connectionError);

      // Act & Assert
      await expect(service.queryOne(query, params)).rejects.toThrow();
    });
  });

  describe('getPoolStatus', () => {
    it('should return pool status information', () => {
      // Arrange
      const mockPoolWithStatus = {
        ...mockPool,
        get totalCount() { return 10; },
        get idleCount() { return 5; },
        get waitingCount() { return 2; },
      };
      
      // Replace the pool instance
      (service as any).pool = mockPoolWithStatus;

      // Act
      const status = service.getPoolStatus();

      // Assert
      expect(status).toEqual({
        totalCount: 10,
        idleCount: 5,
        waitingCount: 2,
      });
    });
  });

  describe('transaction', () => {
    it('should throw error when pool is not initialized', async () => {
      // Arrange
      (service as any).pool = null; // Simulate uninitialized pool
      const callback = jest.fn();

      // Act & Assert
      await expect(service.transaction(callback)).rejects.toThrow('Database connection pool not initialized.');
    });

    it('should execute transaction successfully', async () => {
      // Arrange
      const mockTransactionResult = { success: true };
      const mockCallback = jest.fn().mockResolvedValue(mockTransactionResult);
      
      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined); // COMMIT
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

      // Act
      const result = await service.transaction(mockCallback);

      // Assert
      expect(result).toEqual(mockTransactionResult);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockCallback).toHaveBeenCalledWith(mockClient);
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it('should rollback transaction on error', async () => {
      // Arrange
      const error = new Error('Transaction failed');
      const mockCallback = jest.fn().mockRejectedValue(error);
      
      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined); // ROLLBACK
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

      // Act & Assert
      await expect(service.transaction(mockCallback)).rejects.toThrow('Transaction failed: Transaction failed');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it('should handle non-Error exceptions in transaction', async () => {
      // Arrange
      const mockCallback = jest.fn().mockRejectedValue('String error');
      
      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined); // ROLLBACK
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

      // Act & Assert
      await expect(service.transaction(mockCallback)).rejects.toThrow('Transaction failed: Unknown error');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should release client even if rollback fails', async () => {
      // Arrange
      const error = new Error('Transaction failed');
      const rollbackError = new Error('Rollback failed');
      const mockCallback = jest.fn().mockRejectedValue(error);
      
      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(rollbackError); // ROLLBACK fails
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

      // Act & Assert
      // When rollback fails, the rollback error is thrown instead of the original error
      await expect(service.transaction(mockCallback)).rejects.toThrow('Rollback failed');
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('onModuleInit', () => {
    it('should initialize database connection pool successfully', async () => {
      // Arrange
      const mockDbConfig = {
        host: 'localhost',
        port: 5432,
        username: 'test',
        password: 'test',
        database: 'test',
        poolMin: 2,
        poolMax: 10,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        ssl: false,
        retryAttempts: 3,
        retryDelay: 1000,
        checkConnection: true, // Enable connection check
      };

      mockConfigService.get.mockReturnValue(mockDbConfig);
      (mockClient.query as jest.Mock).mockResolvedValue({ rows: [{ now: new Date() }] });
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockConfigService.get).toHaveBeenCalledWith('database');
      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('SELECT NOW()');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw DatabaseException when config is not found', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue(null);

      // Act & Assert
      await expect(service.onModuleInit()).rejects.toThrow('Database configuration not found');
    });

    it('should retry connection on failure', async () => {
      // Arrange
      const mockDbConfig = {
        host: 'localhost',
        port: 5432,
        username: 'test',
        password: 'test',
        database: 'test',
        poolMin: 2,
        poolMax: 10,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        ssl: false,
        retryAttempts: 2,
        retryDelay: 100, // Short delay for testing
        checkConnection: true, // Enable connection check
      };

      mockConfigService.get.mockReturnValue(mockDbConfig);
      (mockPool.connect as jest.Mock)
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce(mockClient);
      (mockClient.query as jest.Mock).mockResolvedValue({ rows: [{ now: new Date() }] });

      // Mock sleep function
      jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockPool.connect).toHaveBeenCalledTimes(2);
      expect((service as any).sleep).toHaveBeenCalledWith(100);
    });

    it('should fail after all retry attempts', async () => {
      // Arrange
      const mockDbConfig = {
        host: 'localhost',
        port: 5432,
        username: 'test',
        password: 'test',
        database: 'test',
        poolMin: 2,
        poolMax: 10,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        ssl: false,
        retryAttempts: 2,
        retryDelay: 100,
        checkConnection: true, // Enable connection check
      };

      mockConfigService.get.mockReturnValue(mockDbConfig);
      (mockPool.connect as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      // Mock sleep function
      jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);

      // Act & Assert
      await expect(service.onModuleInit()).rejects.toThrow('Database connection failed after 2 attempts: Connection failed');
      expect(mockPool.connect).toHaveBeenCalledTimes(2);
    });

    it('should create pool but skip connection test when checkConnection is false', async () => {
      // Arrange
      const mockDbConfig = {
        host: 'localhost',
        port: 5432,
        username: 'test',
        password: 'test',
        database: 'test',
        poolMin: 2,
        poolMax: 10,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        ssl: false,
        retryAttempts: 3,
        retryDelay: 1000,
        checkConnection: false, // Disable connection check
      };

      mockConfigService.get.mockReturnValue(mockDbConfig);

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockConfigService.get).toHaveBeenCalledWith('database');
      expect(Pool).toHaveBeenCalled(); // Pool should be created
      expect(mockPool.connect).not.toHaveBeenCalled(); // But connection test should be skipped
      expect(mockClient.query).not.toHaveBeenCalled();
      expect(mockClient.release).not.toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should close database connection pool', async () => {
      // Arrange
      (mockPool.end as jest.Mock).mockResolvedValue(undefined);

      // Act
      await service.onModuleDestroy();

      // Assert
      expect(mockPool.end).toHaveBeenCalledTimes(1);
    });

    it('should handle case when pool is not initialized', async () => {
      // Arrange
      (service as any).pool = null;

      // Act & Assert
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });

    it('should handle pool.end() errors gracefully', async () => {
      // Arrange
      (mockPool.end as jest.Mock).mockRejectedValue(new Error('Failed to close pool'));

      // Act & Assert
      await expect(service.onModuleDestroy()).rejects.toThrow('Failed to close pool');
    });
  });

  describe('sleep utility', () => {
    it('should sleep for specified milliseconds', async () => {
      // Arrange
      const sleepTime = 100;
      const startTime = Date.now();

      // Act
      await (service as any).sleep(sleepTime);

      // Assert
      const endTime = Date.now();
      const actualSleepTime = endTime - startTime;
      expect(actualSleepTime).toBeGreaterThanOrEqual(sleepTime - 10); // Allow 10ms tolerance
    });

    it('should handle zero sleep time', async () => {
      // Arrange
      const sleepTime = 0;

      // Act & Assert
      await expect((service as any).sleep(sleepTime)).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle PostgreSQL constraint violation errors', async () => {
      // Arrange
      const query = 'INSERT INTO users (email) VALUES ($1)';
      const params = ['duplicate@example.com'];
      const pgError = new Error('duplicate key value violates unique constraint');
      (pgError as any).code = '23505';
      (mockClient.query as jest.Mock).mockRejectedValue(pgError);
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

      // Act & Assert
      await expect(service.queryOne(query, params)).rejects.toThrow();
    });

    it('should handle PostgreSQL syntax errors', async () => {
      // Arrange
      const query = 'SELCT * FROM users'; // Typo in SELECT
      const pgError = new Error('syntax error at or near "SELCT"');
      (pgError as any).code = '42601';
      (mockClient.query as jest.Mock).mockRejectedValue(pgError);
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

      // Act & Assert
      await expect(service.queryMany(query)).rejects.toThrow();
    });

    it('should handle network timeout errors', async () => {
      // Arrange
      const query = 'SELECT * FROM users';
      const timeoutError = new Error('Connection timeout');
      timeoutError.name = 'TimeoutError';
      (mockPool.connect as jest.Mock).mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(service.queryMany(query)).rejects.toThrow();
    });

    it('should handle connection pool exhaustion', async () => {
      // Arrange
      const query = 'SELECT * FROM users';
      const poolError = new Error('Pool exhausted');
      (mockPool.connect as jest.Mock).mockRejectedValue(poolError);

      // Act & Assert
      await expect(service.queryOne(query)).rejects.toThrow();
    });

    it('should handle non-Error exceptions', async () => {
      // Arrange
      const query = 'SELECT * FROM users';
      (mockClient.query as jest.Mock).mockRejectedValue('String error');
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

      // Act & Assert
      await expect(service.queryMany(query)).rejects.toThrow('Query execution failed: Unknown error');
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it('should handle client release errors gracefully', async () => {
      // Arrange
      const query = 'SELECT * FROM users';
      const queryError = new Error('Query failed');
      (mockClient.query as jest.Mock).mockRejectedValue(queryError);
      (mockClient.release as jest.Mock).mockImplementation(() => {
        throw new Error('Release failed');
      });
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

      // Act & Assert
      // When client.release() fails, it throws the release error instead of the query error
      await expect(service.queryMany(query)).rejects.toThrow('Release failed');
      // Should still attempt to release even if it fails
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPoolStatus with null pool', () => {
    it('should return zero status when pool is not initialized', () => {
      // Arrange
      (service as any).pool = null;

      // Act
      const status = service.getPoolStatus();

      // Assert
      expect(status).toEqual({
        totalCount: 0,
        idleCount: 0,
        waitingCount: 0,
      });
    });
  });
});