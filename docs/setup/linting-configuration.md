# ESLint Configuration - Production Ready

## Overview

This document describes the enhanced ESLint configuration for the Mindicity API project, following production-ready standards with comprehensive code quality, security, and maintainability rules.

## Configuration Structure

The ESLint configuration uses the new flat config format (`eslint.config.js`) with specialized rule sets for different file types:

### 1. Source Files (`src/**/*.ts`)
- **Strictest rules** for production code
- **TypeScript**: Explicit return types, no `any`, strict naming conventions
- **Code Quality**: Max 80 lines per function, complexity limit 10
- **Security**: Comprehensive security rules, no `console.log`
- **Documentation**: JSDoc required for classes and interfaces

### 2. Test Files (`src/**/*.spec.ts`)
- **Relaxed rules** for test code
- **Increased limits**: 300 lines per function, 6 parameters
- **Allows**: `any` type (with warnings), `require()` imports
- **Disabled**: JSDoc requirements, duplicate string checks

### 3. E2E Tests (`test/**/*.ts`)
- **Very relaxed rules** for integration tests
- **High limits**: 500 lines per function, 8 parameters
- **Minimal restrictions** for test scenarios

### 4. Configuration Files (`*.config.ts`, `src/config/*.ts`)
- **Allows**: Default exports (NestJS pattern)
- **Relaxed**: Function length limits (120 lines)
- **Permits**: `require()` imports for config files

### 5. Main Entry Point (`src/main.ts`)
- **Special rules** for bootstrap function
- **Extended limits**: 150 lines per function
- **Higher complexity**: Limit 15 for startup logic

## Key Rules Implemented

### TypeScript Strictness
```javascript
'@typescript-eslint/explicit-function-return-type': 'error',
'@typescript-eslint/explicit-module-boundary-types': 'error',
'@typescript-eslint/no-explicit-any': 'error',
'@typescript-eslint/no-require-imports': 'error',
'@typescript-eslint/prefer-nullish-coalescing': 'error',
'@typescript-eslint/prefer-optional-chain': 'error',
'@typescript-eslint/no-floating-promises': 'error',
```

### Code Quality Standards
```javascript
'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
'max-params': ['error', 4],
'max-depth': ['error', 4],
'complexity': ['error', 10],
'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
'max-nested-callbacks': ['error', 4],
```

### Naming Conventions
```javascript
'@typescript-eslint/naming-convention': [
  'error',
  { selector: 'default', format: ['camelCase'] },
  { selector: 'variable', format: ['camelCase', 'UPPER_CASE', 'PascalCase'] },
  { selector: 'typeLike', format: ['PascalCase'] },
  { selector: 'enumMember', format: ['UPPER_CASE'] },
  // ... more conventions
],
```

### Import Management
```javascript
'import/order': [
  'error',
  {
    groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
    'newlines-between': 'always',
    alphabetize: { order: 'asc', caseInsensitive: true },
    pathGroups: [
      { pattern: '@nestjs/**', group: 'external', position: 'before' },
      { pattern: '@/**', group: 'internal' }
    ]
  }
],
'import/no-default-export': 'error',
'import/no-duplicates': 'error',
'import/no-cycle': 'error',
```

### Security Rules
```javascript
'no-console': 'error',
'no-eval': 'error',
'no-implied-eval': 'error',
'no-new-func': 'error',
'security/detect-object-injection': 'warn',
'security/detect-unsafe-regex': 'error',
'security/detect-buffer-noassert': 'error',
'security/detect-child-process': 'warn',
'security/detect-non-literal-require': 'error',
```

### Code Smells (SonarJS)
```javascript
'sonarjs/cognitive-complexity': ['error', 15],
'sonarjs/no-duplicate-string': ['warn', { threshold: 5 }],
'sonarjs/no-identical-functions': 'error',
'sonarjs/prefer-immediate-return': 'warn',
'sonarjs/prefer-object-literal': 'error',
```

## Package.json Scripts

Enhanced linting scripts for different scenarios:

```json
{
  "scripts": {
    "lint": "eslint \"src/**/*.ts\" --fix",
    "lint:check": "eslint \"src/**/*.ts\"",
    "lint:test": "eslint \"src/**/*.spec.ts\" --fix",
    "lint:test:check": "eslint \"src/**/*.spec.ts\"",
    "lint:all": "eslint \"{src,test}/**/*.ts\" --fix",
    "lint:all:check": "eslint \"{src,test}/**/*.ts\""
  }
}
```

## Usage Examples

### Development Workflow
```bash
# Check linting issues
npm run lint:check

# Auto-fix issues
npm run lint

# Lint only test files
npm run lint:test

# Lint everything including E2E tests
npm run lint:all
```

### CI/CD Integration
```bash
# In CI pipeline - fail on any issues
npm run lint:check
npm run lint:test:check
```

## Common Issues and Solutions

### 1. Missing Return Types
**Issue**: `Missing return type on function`
**Solution**: Add explicit return type annotations
```typescript
// ❌ Bad
function getData() {
  return { data: 'value' };
}

// ✅ Good
function getData(): { data: string } {
  return { data: 'value' };
}
```

### 2. Prefer Nullish Coalescing
**Issue**: `Prefer using nullish coalescing operator (??)`
**Solution**: Use `??` instead of `||` for null/undefined checks
```typescript
// ❌ Bad
const value = input || 'default';

// ✅ Good
const value = input ?? 'default';
```

### 3. Import Order
**Issue**: `There should be at least one empty line between import groups`
**Solution**: Organize imports with proper grouping
```typescript
// ✅ Good
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
```

### 4. Function Complexity
**Issue**: `Method has a complexity of X. Maximum allowed is 10`
**Solution**: Break down complex functions into smaller ones
```typescript
// ❌ Bad - High complexity
function processData(data: any[]): ProcessedData {
  if (data.length > 0) {
    if (data[0].type === 'user') {
      if (data[0].active) {
        // ... many nested conditions
      }
    }
  }
}

// ✅ Good - Lower complexity
function processData(data: any[]): ProcessedData {
  if (!hasValidData(data)) return null;
  
  return processValidData(data);
}

function hasValidData(data: any[]): boolean {
  return data.length > 0 && data[0].type === 'user' && data[0].active;
}
```

## Benefits

### 1. **Code Quality**
- Consistent code style across the project
- Early detection of potential bugs
- Improved maintainability

### 2. **Security**
- Detection of security vulnerabilities
- Prevention of unsafe patterns
- Secure coding practices enforcement

### 3. **Team Collaboration**
- Consistent coding standards
- Reduced code review time
- Better onboarding for new developers

### 4. **Production Readiness**
- Enterprise-grade code quality
- Compliance with industry standards
- Reduced technical debt

## Integration with IDE

### VS Code
Install the ESLint extension and add to `settings.json`:
```json
{
  "eslint.validate": ["typescript"],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### WebStorm/IntelliJ
Enable ESLint in Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint

## Continuous Integration

The linting configuration integrates with:
- **Pre-commit hooks** (via Husky)
- **GitHub Actions** CI/CD pipeline
- **Pull request** validation
- **Code coverage** reports

## Maintenance

### Regular Updates
- Update ESLint and plugins monthly
- Review and adjust rule severity based on team feedback
- Add new rules as they become available

### Rule Customization
Rules can be adjusted in `eslint.config.js` based on project needs while maintaining the core quality standards.

---

**Document Version**: 1.0  
**Last Updated**: 2025-12-11  
**Maintainer**: Development Team