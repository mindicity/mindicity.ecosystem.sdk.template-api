# Development Setup Guide

This guide provides step-by-step instructions for setting up the NestJS Template API development environment.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Development Tools](#development-tools)
- [IDE Configuration](#ide-configuration)
- [Docker Setup](#docker-setup)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)
- **Memory**: Minimum 4GB RAM, recommended 8GB+
- **Storage**: At least 2GB free space for dependencies

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| **Node.js** | 20.x LTS | JavaScript runtime |
| **npm** | 9.x+ | Package manager |
| **Git** | 2.30+ | Version control |
| **Docker** | 20.x+ | Containerization (optional) |

### Installation Links

- **Node.js**: [https://nodejs.org/](https://nodejs.org/) (Download LTS version)
- **Git**: [https://git-scm.com/](https://git-scm.com/)
- **Docker**: [https://www.docker.com/get-started](https://www.docker.com/get-started)

## Quick Start

### 1. Clone Repository

```bash
# Clone the repository
git clone <repository-url>
cd nestjs-template-api

# Or if using SSH
git clone git@github.com:your-org/nestjs-template-api.git
cd nestjs-template-api
```

### 2. Install Dependencies

```bash
# Install all dependencies
npm install

# Verify installation
npm list --depth=0
```

### 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables (optional)
nano .env  # or use your preferred editor
```

### 4. Start Development Server

```bash
# Start in development mode with hot reload
npm run dev

# The API will be available at:
# - API: http://localhost:3232/mcapi
# - Health: http://localhost:3232/mcapi/health/ping
# - Swagger: http://localhost:3232/mcapi/docs/swagger/ui
```

### 5. Verify Installation

```bash
# Test health endpoint
curl http://localhost:3232/mcapi/health/ping

# Expected response:
# {"status":"ok","version":"1.0.0"}
```

## Detailed Setup

### Node.js Installation

#### Using Node Version Manager (Recommended)

**For macOS/Linux:**
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell configuration
source ~/.bashrc  # or ~/.zshrc

# Install and use Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 9.x.x+
```

**For Windows:**
```powershell
# Install nvm-windows from: https://github.com/coreybutler/nvm-windows
# Then run:
nvm install 20.11.0
nvm use 20.11.0

# Verify installation
node --version
npm --version
```

#### Direct Installation

1. Visit [nodejs.org](https://nodejs.org/)
2. Download Node.js 20.x LTS
3. Run the installer
4. Verify installation:
   ```bash
   node --version
   npm --version
   ```

### Git Configuration

```bash
# Configure Git (first time setup)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Verify configuration
git config --list
```

### Project Dependencies

#### Core Dependencies Installation

```bash
# Install production dependencies
npm install --production

# Install all dependencies (including dev)
npm install

# Install specific dependency
npm install @nestjs/common@latest
```

#### Dependency Categories

**Production Dependencies:**
- `@nestjs/common`, `@nestjs/core` - NestJS framework
- `@nestjs/platform-fastify` - Fastify adapter
- `@nestjs/config` - Configuration management
- `@nestjs/swagger` - API documentation
- `nestjs-pino`, `pino` - Logging
- `nestjs-zod`, `zod` - Validation
- `@fastify/helmet` - Security middleware

**Development Dependencies:**
- `@nestjs/testing` - Testing utilities
- `jest`, `ts-jest` - Testing framework
- `typescript` - TypeScript compiler
- `eslint`, `prettier` - Code quality tools
- `fast-check` - Property-based testing

### Environment Configuration

#### Environment Variables

Create `.env` file in project root:

```bash
# Copy from template
cp .env.example .env
```

#### Default Configuration

```bash
# Server Configuration
APP_PORT=3232
APP_API_PREFIX=/mcapi
APP_API_SCOPE_PREFIX=

# Security
APP_CORS_ENABLED=true
APP_BODYPARSER_LIMIT=20MB
APP_ENABLE_COMPRESSION=true

# Error Handling
APP_ERR_DETAIL=false
APP_ERR_MESSAGE=false

# Logging
APP_LOG_LEVEL=debug
APP_LOG_TIMEZONE=Europe/Rome
APP_LOG_TRANSPORTS=console
APP_LOG_PREFIX=api_
APP_LOG_TRUNCATE=-1
APP_LOG_PRETTY_PRINT=true

# Swagger
APP_SWAGGER_HOSTNAME=http://localhost:3232
```

#### Environment-Specific Configurations

**Development (.env.development):**
```bash
APP_LOG_LEVEL=debug
APP_ERR_DETAIL=true
APP_ERR_MESSAGE=true
```

**Production (.env.production):**
```bash
APP_LOG_LEVEL=info
APP_ERR_DETAIL=false
APP_ERR_MESSAGE=false
```

## Development Tools

### Package Scripts

```bash
# Development
npm run dev          # Start with hot reload
npm run start        # Start production build

# Building
npm run build        # Compile TypeScript to dist/

# Testing
npm run test         # Run unit tests with coverage
npm run test:watch   # Run tests in watch mode
npm run test:e2e     # Run end-to-end tests

# Code Quality
npm run lint         # Run ESLint
npm run lint:check   # Check linting without fixing
npm run format       # Run Prettier
npm run format:check # Check formatting without fixing

# Git Hooks
npm run prepare      # Setup Husky git hooks
```

### Git Hooks Setup

The project uses Husky for git hooks:

```bash
# Install git hooks
npm run prepare

# Hooks will run automatically on:
# - pre-commit: lint and format staged files
# - pre-push: run tests before pushing
```

### Code Quality Tools

#### ESLint Configuration

ESLint is configured with comprehensive rules:

```bash
# Run linting
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix

# Check specific files
npm run lint src/modules/health/
```

#### Prettier Configuration

Prettier handles code formatting:

```bash
# Format all files
npm run format

# Check formatting
npm run format:check

# Format specific files
npx prettier --write src/modules/health/
```

### Testing Setup

#### Unit Tests

```bash
# Run all unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test -- --coverage

# Run specific test file
npm run test -- health.controller.spec.ts
```

#### E2E Tests

```bash
# Run end-to-end tests
npm run test:e2e

# Run specific E2E test
npm run test:e2e -- --testNamePattern="health"
```

#### Property-Based Tests

Property-based tests use fast-check:

```bash
# Run property tests (included in npm test)
npm run test -- --testNamePattern="Property"

# Run with more iterations
npm run test -- --testNamePattern="Property" --verbose
```

## IDE Configuration

### Visual Studio Code

#### Recommended Extensions

Create `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml",
    "ms-vscode.vscode-docker"
  ]
}
```

#### Workspace Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.git": true
  }
}
```

#### Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug NestJS",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/main.ts",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "runtimeArgs": ["-r", "ts-node/register"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "restart": true,
      "protocol": "inspector"
    }
  ]
}
```

### IntelliJ IDEA / WebStorm

#### Configuration Steps

1. **Import Project**: Open the project folder
2. **Node.js Setup**: Configure Node.js interpreter (Settings → Languages & Frameworks → Node.js)
3. **TypeScript**: Enable TypeScript service (Settings → Languages & Frameworks → TypeScript)
4. **ESLint**: Enable ESLint (Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint)
5. **Prettier**: Configure Prettier (Settings → Languages & Frameworks → JavaScript → Prettier)

#### Run Configurations

Create run configurations for:
- **Development Server**: `npm run dev`
- **Tests**: `npm run test`
- **Build**: `npm run build`

## Docker Setup

### Development with Docker

#### Build Development Image

```bash
# Build development image
docker build -f Dockerfile.standalone -t nestjs-template-api:dev .

# Run development container
docker run -p 3232:3232 --env-file .env nestjs-template-api:dev
```

#### Docker Compose

Create `docker-compose.dev.yml`:

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile.standalone
    ports:
      - "3232:3232"
    environment:
      - APP_PORT=3232
      - APP_LOG_LEVEL=debug

    volumes:
      - ./src:/app/src
      - ./logs:/app/logs
    restart: unless-stopped
```

Run with Docker Compose:

```bash
# Start services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

### Production Docker Setup

```bash
# Build production image
docker build -t nestjs-template-api:prod .

# Run production container
docker run -d \
  --name nestjs-template-api \
  -p 3232:3232 \
  -e APP_LOG_LEVEL=info \

  nestjs-template-api:prod
```

## Troubleshooting

### Common Issues

#### Node.js Version Issues

**Problem**: Wrong Node.js version
```bash
# Check current version
node --version

# Install correct version with nvm
nvm install 20
nvm use 20
```

#### Port Already in Use

**Problem**: Port 3232 is already in use
```bash
# Find process using port
lsof -i :3232  # macOS/Linux
netstat -ano | findstr :3232  # Windows

# Kill process or change port in .env
APP_PORT=3233
```

#### Permission Issues

**Problem**: npm permission errors
```bash
# Fix npm permissions (macOS/Linux)
sudo chown -R $(whoami) ~/.npm

# Or use nvm (recommended)
nvm install 20
nvm use 20
```

#### Module Not Found

**Problem**: Cannot find module errors
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### TypeScript Compilation Errors

**Problem**: TypeScript compilation fails
```bash
# Check TypeScript version
npx tsc --version

# Clean build
rm -rf dist/
npm run build

# Check for type errors
npx tsc --noEmit
```

### Environment Issues

#### Environment Variables Not Loading

**Problem**: Configuration not working
```bash
# Check .env file exists
ls -la .env

# Verify environment loading
node -e "require('dotenv').config(); console.log(process.env.APP_PORT)"
```

#### Logging Issues

**Problem**: Logs not appearing
```bash
# Check log level
echo $APP_LOG_LEVEL

# Test logging
curl http://localhost:3232/mcapi/health/ping
```

### Testing Issues

#### Tests Failing

**Problem**: Jest tests not running
```bash
# Clear Jest cache
npx jest --clearCache

# Run tests with verbose output
npm run test -- --verbose

# Run specific test
npm run test -- --testNamePattern="health"
```

#### Coverage Issues

**Problem**: Coverage reports not generating
```bash
# Run tests with coverage
npm run test -- --coverage --verbose

# Check coverage directory
ls -la test/coverage/
```

### Docker Issues

#### Build Failures

**Problem**: Docker build fails
```bash
# Build with verbose output
docker build --no-cache -t nestjs-template-api:dev .

# Check Dockerfile syntax
docker build --dry-run .
```

#### Container Issues

**Problem**: Container not starting
```bash
# Check container logs
docker logs nestjs-template-api

# Run container interactively
docker run -it nestjs-template-api:dev /bin/bash
```

### Getting Help

#### Resources

- **NestJS Documentation**: [https://docs.nestjs.com](https://docs.nestjs.com)
- **Fastify Documentation**: [https://fastify.dev](https://fastify.dev)
- **TypeScript Handbook**: [https://www.typescriptlang.org/docs](https://www.typescriptlang.org/docs)

#### Community Support

- **Stack Overflow**: Tag questions with `nestjs`, `fastify`, `typescript`
- **GitHub Issues**: Check project repository for known issues
- **Discord/Slack**: Join NestJS community channels

#### Debug Information

When reporting issues, include:

```bash
# System information
node --version
npm --version
git --version

# Project information
npm list --depth=0
cat package.json | grep version

# Environment
cat .env | grep -v PASSWORD | grep -v SECRET
```

## Next Steps

After successful installation:

1. **Explore the API**: Visit Swagger UI at http://localhost:3232/mcapi/docs/swagger/ui
2. **Run Tests**: Execute `npm run test` to verify everything works
3. **Read Documentation**: Check `docs/` folder for detailed guides
4. **Start Development**: Begin implementing new features following the established patterns

## Maintenance

### Regular Updates

```bash
# Check for outdated packages
npm outdated

# Update dependencies
npm update

# Update major versions (carefully)
npm install @nestjs/common@latest
```

### Security Updates

```bash
# Check for security vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Fix with breaking changes (review carefully)
npm audit fix --force
```

### Cleanup

```bash
# Clean build artifacts
rm -rf dist/ test/coverage/

# Clean dependencies
rm -rf node_modules/ package-lock.json
npm install

# Clean Docker
docker system prune -f
```