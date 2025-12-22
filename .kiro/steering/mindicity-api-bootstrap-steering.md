---
inclusion: always
---

# Mindicity API Bootstrap Guide

**CRITICAL**: This document guides AI assistants in bootstrapping new Mindicity API projects from the template repository. All new API projects MUST follow this process.

## Overview

This is a template-based NestJS API project that serves as the foundation for all Mindicity APIs. When creating new API projects, the AI assistant must rename the template module to match the new API's purpose while preserving all architectural patterns and infrastructure.

## Template Repository

**MANDATORY**: The template MUST be cloned from the official Mindicity template repository:

**Repository URL**: `ssh://git@gitlab.devops.mindicity.it:2222/mindicity/ecosystem/sdk/mindicity.ecosystem.sdk.template-api.git`

**Branch**: `develop`

**Clone Command**:

```bash
# Clone the template to the root of your project directory
git clone -b develop ssh://git@gitlab.devops.mindicity.it:2222/mindicity/ecosystem/sdk/mindicity.ecosystem.sdk.template-api.git .
```

**IMPORTANT**: 
- The `.` at the end clones the template directly into the current directory (project root)
- Ensure you are in an empty directory before running the clone command
- Always use the `develop` branch as it contains the latest stable template version with all required infrastructure and patterns

## Bootstrap Process

### Step 1: User Input Declaration

**MANDATORY**: Before starting the bootstrap process, the user MUST explicitly declare:

1. **Project Name**: The name of the new API project (e.g., "user-management", "weather-service")
2. **API Module Name**: The main module/domain name for the API (e.g., "users", "weather")

**Example Declaration**:
```
Project Name: user-management
API Module Name: users
Description: User management and authentication API
```

### Step 2: Project Setup Requirements

**Input Validation**: After user declaration, validate these required parameters:

- `project_name`: Lowercase kebab-case (e.g., "user-management", "weather-service")
  - Pattern: `^[a-z][a-z0-9-]*[a-z0-9]$`
  - Length: 2-50 characters
- `api_name`: Lowercase kebab-case module name (e.g., "users", "weather")
  - Pattern: `^[a-z][a-z0-9-]*[a-z0-9]$`
  - Length: 2-50 characters
- `api_description`: Brief description (10-200 characters)

**Derived Variables**: Generate these from inputs:

- `project_name_pascal`: PascalCase version (e.g., "UserManagement")
- `project_name_upper`: UPPER_SNAKE_CASE (e.g., "USER_MANAGEMENT")
- `api_name_pascal`: PascalCase module name (e.g., "Users")
- `api_name_upper`: UPPER_SNAKE_CASE module name (e.g., "USERS")

### Step 3: File Renaming Operations

**CRITICAL**: Execute these file operations in exact order to avoid conflicts:

1. **Rename Template Module Directory**:
   - Move `src/modules/template` → `src/modules/{api_name}`

2. **Rename Module Files** (in this order):
   - `template.module.ts` → `{api_name}.module.ts`
   - `template.controller.ts` → `{api_name}.controller.ts`
   - `template.service.ts` → `{api_name}.service.ts`
   - `template.controller.spec.ts` → `{api_name}.controller.spec.ts`
   - `template.service.spec.ts` → `{api_name}.service.spec.ts`

3. **Rename Test Files**:
   - `test/template.e2e-spec.ts` → `test/{api_name}.e2e-spec.ts`

### Step 4: Configuration Updates

**Update package.json**:

```json
{
  "name": "api-{project_name}",
  "description": "{api_description}",
  "version": "1.0.0",
  "keywords": ["nestjs", "api", "{project_name}", "{api_name}", "mindicity"]
}
```

**Update src/app.module.ts**:

- Replace: `import { TemplateModule } from './modules/template/template.module';`
- With: `import { {ApiNamePascal}Module } from './modules/{api_name}/{api_name}.module';`
- Replace: `TemplateModule,` with `{ApiNamePascal}Module,`

**Update src/config/routes.config.ts**:

- Replace: `TEMPLATE: 'template'`
- With: `{API_NAME_UPPER}: '{api_name}'`

### Step 5: Content Replacement

**In all renamed module files**, replace these patterns:

**Class Names**:

- `TemplateModule` → `{ApiNamePascal}Module`
- `TemplateController` → `{ApiNamePascal}Controller`
- `TemplateService` → `{ApiNamePascal}Service`

**Import Paths**:

- `./template.controller` → `./{api_name}.controller`
- `./template.service` → `./{api_name}.service`
- `../template.module` → `../{api_name}.module`

**Route Constants**:

- `ROUTES.TEMPLATE` → `ROUTES.{API_NAME_UPPER}`

**API Documentation**:

- `@ApiTags('template')` → `@ApiTags('{api_name}')`
- `Template API endpoints` → `{ApiNamePascal} API endpoints`
- `TemplateModule provides` → `{ApiNamePascal}Module provides`

**Variable Names**:

- `templateService` → `{api_name}Service`
- `private readonly templateService` → `private readonly {api_name}Service`

**DTO and Interface Files**: Replace all instances of `Template`/`template` with appropriate casing.

**Test Files (.spec.ts)**: Update all test files with template/project references:

- `template.controller.spec.ts` → `{api_name}.controller.spec.ts`
- `template.service.spec.ts` → `{api_name}.service.spec.ts`
- `test/template.e2e-spec.ts` → `test/{api_name}.e2e-spec.ts`
- Update import paths: `../template/template.module` → `../{api_name}/{api_name}.module`
- Update class references: `TemplateController`, `TemplateService` → `{ApiNamePascal}Controller`, `{ApiNamePascal}Service`
- Update describe blocks: `describe('TemplateController')` → `describe('{ApiNamePascal}Controller')`
- Update test descriptions: `'should create template'` → `'should create {api_name}'`
- Update mock data: `mockTemplate` → `mock{ApiNamePascal}`
- Update API endpoints in tests: `'/mcapi/template'` → `'/mcapi/{api_name}'`
- Update route constants: `ROUTES.TEMPLATE` → `ROUTES.{API_NAME_UPPER}`

**E2E Test Files**: Special attention to endpoint testing:

- Update all HTTP requests: `request(app.getHttpServer()).get('/mcapi/template')` → `request(app.getHttpServer()).get('/mcapi/{api_name}')`
- Update test expectations for API responses
- Update any hardcoded 'template' strings in test data
- Update swagger documentation tests if present

### Step 6: Documentation and Configuration

**Update README.md**:

- `# Mindicity Template API` → `# {ProjectNamePascal} API`
- `Template API for Mindicity ecosystem` → `{api_description}`
- `template-api` → `api-{project_name}`
- `/template` → `/{api_name}`

**Update Docker Files** (Dockerfile, Dockerfile.standalone, docker-compose.yml):

- `mindicity-template-api` → `api-{project_name}`
- `template-api` → `api-{project_name}`

**Update .env.example**:

- `APP_LOG_PREFIX=api_template` → `APP_LOG_PREFIX=api_{project_name}`
- `APP_API_SCOPE_PREFIX=/project` → `APP_API_SCOPE_PREFIX=/{project_name}`

### Step 7: MCP Integration (MANDATORY)

**CRITICAL**: After bootstrap completion, MCP tools MUST be implemented for the new API module.

#### **Mandatory MCP Tool Implementation Rules**

**DEFAULT BEHAVIOR**: Unless explicitly specified otherwise, MCP tools MUST be implemented for **HTTP transport**

**Implementation Decision Matrix**:

| Bootstrap Request | MCP Implementation | Transport | Functionality |
|------------------|-------------------|-----------|---------------|
| Standard bootstrap | ✅ **MANDATORY HTTP** | HTTP | Complete tools + resources |
| "Bootstrap with SSE" | ✅ **MANDATORY SSE Only** | SSE | Basic connectivity only |
| "Bootstrap for real-time" | ✅ **MANDATORY SSE Only** | SSE | Basic connectivity only |

**Mandatory Tool Generation**:
```typescript
// For bootstrapped {api_name} module, MUST create:
// Pattern: {action}_{api_name}_{entity}

'get_{api_name}_list',      // GET /{api_name}
'create_{api_name}',        // POST /{api_name}  
'get_{api_name}_by_id',     // GET /{api_name}/:id
'update_{api_name}',        // PUT /{api_name}/:id
'delete_{api_name}',        // DELETE /{api_name}/:id

// Example for users module:
'get_users_list',           // GET /users
'create_user',              // POST /users
'get_user_by_id',          // GET /users/:id
'update_user',             // PUT /users/:id
'delete_user',             // DELETE /users/:id
```

**MCP Integration Steps (MANDATORY)**:
1. Add `{api_name}Service` to `TransportDependencies` interface
2. Update `createTransportDependencies` function
3. Inject service in `McpServerService` constructor
4. Add tool handlers to `setupToolHandlers` switch statement
5. Implement handler methods that delegate to service methods
6. Add tool descriptions to `ListToolsRequestSchema`
7. Create MCP E2E tests for all new tools

### Step 8: Verification

### Step 8: Verification

**CRITICAL**: Run these commands to verify the bootstrap was successful:

1. **Install Dependencies**: `npm install`
2. **Build Check**: `npm run build` (must succeed)
3. **Lint Check**: `npm run lint` (must pass)
4. **Test Verification**: `npm run test` (all tests must pass)
5. **Test Files Check**: Verify all `.spec.ts` files have been renamed and updated correctly
6. **MCP Integration Check**: Verify MCP tools are implemented and working

**Test Files Verification Checklist**:
- [ ] All test files renamed from `template.*` to `{api_name}.*`
- [ ] Import paths updated in test files
- [ ] Class references updated (`TemplateController` → `{ApiNamePascal}Controller`)
- [ ] Describe blocks updated (`describe('TemplateController')` → `describe('{ApiNamePascal}Controller')`)
- [ ] Test descriptions updated to use new API name
- [ ] Mock data variables renamed appropriately
- [ ] API endpoint paths updated in E2E tests (`'/template'` → `'/{api_name}'`)

**If any step fails**, the bootstrap is incomplete and must be fixed before proceeding.

## Post-Bootstrap Instructions

**Success Message**: Project `api-{project_name}` has been successfully created!

### Next Steps for Developer

1. **Environment Setup**: Copy `.env.example` to `.env` and configure environment variables
2. **Database Configuration**: Update database connection settings in `.env`
3. **API Customization**: Review and customize API endpoints in `src/modules/{api_name}/`
4. **Documentation**: Update API documentation in `docs/` directory
5. **Git Setup**: Initialize Git repository and set up remote

### Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run lint` - Run linting
- `npm run format` - Format code

### API Endpoints

- **API Base**: `http://localhost:3232/mcapi/{project_name}`
- **Swagger UI**: `http://localhost:3232/mcapi/docs/swagger/ui`

## AI Assistant Guidelines

### Critical Rules

1. **REQUIRE user declaration** - Always require explicit project name and API module name declaration before starting
2. **NEVER skip validation** - Always validate input parameters before starting
3. **Execute operations in exact order** - File operations must follow the sequence above
4. **Verify each step** - Check that files exist and contain expected content after each operation
5. **Handle errors gracefully** - If any step fails, provide clear error messages and cleanup guidance
6. **MANDATORY MCP INTEGRATION** - Always implement MCP tools for HTTP transport unless SSE explicitly requested

### Input Validation

**project_name**:

- Pattern: `^[a-z][a-z0-9-]*[a-z0-9]$`
- Length: 2-50 characters
- Examples: `user-management`, `weather-service`, `notification`

**api_name**:

- Pattern: `^[a-z][a-z0-9-]*[a-z0-9]$`
- Length: 2-50 characters
- Examples: `users`, `weather`, `notifications`

**api_description**:

- Length: 10-200 characters
- Examples: `User management and authentication API`, `Weather data aggregation service`

### Error Handling

**Common Issues and Solutions**:

- **File not found**: Verify the template structure matches expectations
- **npm install fails**: Ensure Node.js version >= 18 and npm is updated
- **Build fails**: Check TypeScript configuration and verify all imports are updated
- **Test failures**: Ensure all class names and imports in test files are properly renamed
- **Test import errors**: Verify all import paths in `.spec.ts` files have been updated from `template` to `{api_name}`
- **E2E test failures**: Check that all API endpoint paths in tests have been updated (`'/mcapi/template'` → `'/mcapi/{api_name}'`)
- **Mock data errors**: Ensure all mock variables have been renamed (`mockTemplate` → `mock{ApiNamePascal}`)
- **Describe block mismatches**: Verify all `describe()` blocks use the new API name

### Success Criteria

The bootstrap is successful when:

- All files are renamed correctly
- All content replacements are complete
- `npm run build` succeeds
- `npm run lint` passes
- `npm run test` passes with 100% success rate
- **MCP tools are mandatorily implemented** for the new API module
- **HTTP transport is configured** as default (unless SSE explicitly requested)
