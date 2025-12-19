# Development Tooling Guide

This document describes the development tooling setup for the NestJS Template API project, including linting, formatting, testing, and pre-commit hooks.

## Overview

The project uses a comprehensive set of development tools to ensure code quality, consistency, and maintainability:

- **ESLint**: Code linting with TypeScript, security, and code quality plugins
- **Prettier**: Code formatting for consistent style
- **Jest**: Testing framework with coverage reporting
- **Husky**: Git hooks for automated quality checks
- **lint-staged**: Run linters on staged files only

## ESLint Configuration

### Plugins and Rules

The project uses the following ESLint plugins:

- `@typescript-eslint/eslint-plugin`: TypeScript-specific linting rules
- `eslint-plugin-import`: Import/export syntax validation
- `eslint-plugin-jsdoc`: JSDoc comment validation
- `eslint-plugin-security`: Security vulnerability detection
- `eslint-plugin-sonarjs`: Code smell and complexity detection
- `eslint-plugin-unicorn`: Additional best practices

### Key Rules

- **Code Quality**:
  - Maximum function length: 80 lines
  - Maximum parameters: 4
  - Maximum nesting depth: 4 levels
  - Complexity limit: 10

- **TypeScript**:
  - Explicit function return types (warning)
  - No `any` type (error)
  - Unused variables detection

- **Security**:
  - No `console.log` statements
  - Object injection detection
  - Non-literal regexp detection

- **Import Quality**:
  - Alphabetical import ordering
  - Grouped imports with newlines
  - Prefer named exports over default exports

### Configuration Files

- `eslint.config.js`: Main ESLint configuration
- Different rules for source files vs test files
- Relaxed rules for test files (longer functions, more parameters allowed)

## Prettier Configuration

### Settings

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### Ignored Files

- `dist/` - Build output
- `node_modules/` - Dependencies
- `coverage/` - Test coverage reports
- `*.md` - Markdown files
- `.env*` - Environment files

## Jest Testing Configuration

### Coverage Settings

- **Statements**: 90% minimum
- **Branches**: 80% minimum
- **Functions**: 90% minimum
- **Lines**: 90% minimum

### Test Organization

```
src/
├── **/*.spec.ts          # Unit tests
test/
├── **/*.e2e-spec.ts      # End-to-end tests
├── coverage/             # Coverage reports
└── jest-e2e.json         # E2E test configuration
```

### Coverage Reports

- HTML reports in `test/coverage/`
- LCOV format for CI/CD integration
- JSON summary for programmatic access

## Git Hooks (Husky)

### Pre-commit Hook

Runs automatically before each commit:

```bash
npx lint-staged
```

### Pre-push Hook

Runs automatically before pushing to remote:

```bash
npm run lint:check
npm run format:check
npm run test
```

### lint-staged Configuration

Processes only staged files:

```json
{
  "*.{ts,js}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,md}": [
    "prettier --write"
  ]
}
```

## Available Scripts

### Development

```bash
# Start development server with hot reload
npm run dev

# Build the application
npm run build

# Start production server
npm start
```

### Code Quality

```bash
# Run ESLint with auto-fix
npm run lint

# Check ESLint without fixing
npm run lint:check

# Format code with Prettier
npm run format

# Check Prettier formatting
npm run format:check
```

### Testing

```bash
# Run all tests with coverage
npm run test

# Run tests in watch mode
npm run test:watch

# Run end-to-end tests
npm run test:e2e
```

## IDE Integration

### VS Code

Recommended extensions:

- ESLint
- Prettier - Code formatter
- Jest
- TypeScript Importer

### Settings

Add to `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

## Troubleshooting

### Common Issues

1. **ESLint errors on save**
   - Ensure ESLint extension is installed
   - Check that `eslint.config.js` is valid
   - Restart VS Code if needed

2. **Prettier not formatting**
   - Verify Prettier extension is set as default formatter
   - Check `.prettierrc` configuration
   - Ensure file is not in `.prettierignore`

3. **Tests failing in CI**
   - Check coverage thresholds
   - Ensure all dependencies are installed
   - Verify Node.js version compatibility

4. **Pre-commit hooks not running**
   - Run `npm run prepare` to install Husky
   - Check that `.husky/` directory exists
   - Verify hook files have execute permissions

### Performance Tips

1. **ESLint Performance**
   - Use `--cache` flag for faster subsequent runs
   - Consider using `--max-warnings 0` in CI

2. **Jest Performance**
   - Use `--onlyChanged` for faster test runs during development
   - Configure `maxWorkers` based on available CPU cores

3. **Prettier Performance**
   - Use `--cache` flag for faster formatting
   - Consider formatting only changed files during development

## Continuous Integration

### GitHub Actions

The project includes CI/CD configuration that:

1. Installs dependencies
2. Runs linting checks
3. Runs formatting checks
4. Executes all tests
5. Generates coverage reports
6. Builds the application

### Quality Gates

All checks must pass before code can be merged:

- ESLint: No errors allowed
- Prettier: All files must be formatted
- Tests: All tests must pass
- Coverage: Must meet minimum thresholds

## Best Practices

### Code Style

1. Use meaningful variable and function names
2. Keep functions small and focused
3. Add JSDoc comments for public APIs
4. Prefer composition over inheritance
5. Use TypeScript strict mode features

### Testing

1. Follow AAA pattern (Arrange, Act, Assert)
2. Write descriptive test names
3. Test both happy path and error cases
4. Use property-based testing for complex logic
5. Mock external dependencies

### Git Workflow

1. Make small, focused commits
2. Write clear commit messages
3. Use feature branches for new development
4. Ensure all checks pass before pushing
5. Review code before merging

## Configuration Files Reference

- `eslint.config.js` - ESLint configuration
- `.prettierrc` - Prettier configuration
- `.prettierignore` - Prettier ignore patterns
- `jest.config.js` - Jest test configuration
- `test/jest-e2e.json` - E2E test configuration
- `.husky/pre-commit` - Pre-commit hook
- `.husky/pre-push` - Pre-push hook
- `package.json` - Scripts and lint-staged configuration