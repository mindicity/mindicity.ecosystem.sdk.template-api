# E2E Tests

This directory contains end-to-end (E2E) tests for the API.

## Structure

- `jest-e2e.json` - Jest configuration for E2E tests
- `app.e2e-spec.ts` - General application E2E tests
- `template.e2e-spec.ts` - Template module E2E tests
- `coverage/` - Test coverage reports (generated after running tests)

## Running Tests

```bash
# Run E2E tests
npm run test:e2e

# Run E2E tests with coverage
npm run test:e2e -- --coverage
```

## Coverage Reports

Coverage reports are generated in the `test/coverage/` directory and include:
- HTML report: `test/coverage/index.html`
- LCOV report: `test/coverage/lcov.info`
- JSON summary: `test/coverage/coverage-summary.json`

## Adding New E2E Tests

When adding new modules, create corresponding E2E test files following the naming pattern:
`{module-name}.e2e-spec.ts`

Each E2E test should:
1. Set up the NestJS application with FastifyAdapter
2. Test all HTTP endpoints for the module
3. Verify response structure and status codes
4. Clean up resources in afterAll hook