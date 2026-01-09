import { config } from 'dotenv';

// Load environment variables from .env file for E2E tests
config();

// Set test-specific environment variables to avoid hanging issues
process.env.NODE_ENV = 'test';
process.env.DB_CHECK = 'false'; // Disable database connection checks
process.env.MCP_ENABLED = 'false'; // Disable MCP server for tests
process.env.APP_LOG_LEVEL = 'error'; // Reduce log noise during tests

// Set shorter timeouts for test environment
process.env.DB_CONNECTION_TIMEOUT = '5000';
process.env.DB_IDLE_TIMEOUT = '5000';
process.env.DB_RETRY_ATTEMPTS = '1';
process.env.DB_RETRY_DELAY = '1000';