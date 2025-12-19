import { config } from 'dotenv';

// Load environment variables from .env file for E2E tests
config();

// Set test-specific environment variables if needed
process.env.NODE_ENV = 'test';