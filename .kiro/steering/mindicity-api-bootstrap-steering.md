---
inclusion: manual
---

# Mindicity API Bootstrap Guide

**Purpose**: This guide provides step-by-step instructions for bootstrapping new Mindicity API projects from the official template repository.

**When to Use**: Only when creating a NEW API project. For existing projects, use `mindicity-api-base-steering.md` instead.

## Overview

All new Mindicity API projects MUST start by cloning and customizing the official template repository. This ensures:
- Production-ready infrastructure (database, logging, MCP, testing)
- Consistent architecture across all Mindicity APIs
- Built-in security and best practices
- Future template updates without breaking your modules

**Template Repository**: `https://github.com/mindicity/mindicity.ecosystem.sdk.template-api.git` (branch: `master`)

## Core Principles

**Separation of Concerns**:
- **Core Infrastructure** (DO NOT MODIFY): `src/common/`, `src/config/`, `src/infrastructure/`, `src/main.ts`
- **Business Modules** (MODIFY HERE): `src/modules/{your-api}/`

This separation allows template updates without affecting your business logic.

## Prerequisites

Before starting, gather this information from the user:

1. **project_name**: Lowercase kebab-case (e.g., "user-management", "weather-service")
   - Pattern: `^[a-z][a-z0-9-]*[a-z0-9]$`
   - Length: 2-50 characters

2. **api_name**: Lowercase kebab-case module name (e.g., "users", "weather")
   - Pattern: `^[a-z][a-z0-9-]*[a-z0-9]$`
   - Length: 2-50 characters

3. **api_description**: Brief description (10-200 characters)

**Derived Variables** (generate automatically):
- `project_name_pascal`: PascalCase (e.g., "UserManagement")
- `project_name_upper`: UPPER_SNAKE_CASE (e.g., "USER_MANAGEMENT")
- `api_name_pascal`: PascalCase (e.g., "Users")
- `api_name_upper`: UPPER_SNAKE_CASE (e.g., "USERS")

## Files Modified During Bootstrap

**Modified Files** (template → your API):
- `src/modules/template/` → `src/modules/{api_name}/`
- `test/template.e2e-spec.ts` → `test/{api_name}.e2e-spec.ts`
- `package.json` (name, description, keywords)
- `src/app.module.ts` (import statement)
- `src/config/routes.config.ts` (route constant)
- `README.md`, `.env.example`, Docker files

**Untouched Files** (core infrastructure):
- `src/common/`, `src/infrastructure/`, `src/main.ts`
- `test/setup.ts`, `scripts/`, `docs/`
- Configuration files (tsconfig.json, jest.config.js, etc.)

## Bootstrap Steps

Execute these steps in order. Do not skip steps or proceed if a step fails.

### Step 1: Clone Template Repository

```bash
# Clone template to temporary directory
git clone -b master https://github.com/mindicity/mindicity.ecosystem.sdk.template-api.git temp-template

# Move all contents to project root
mv temp-template/* .
mv temp-template/.* . 2>/dev/null || true

# Clean up
rm -rf temp-template
rm -rf .git
```

**Verify**: Confirm these directories exist:
- `src/infrastructure/`
- `src/modules/template/`
- `.kiro/steering/`

### Step 2: Handle .kiro Folder

**If .kiro already exists** in your project:
```bash
# Preserve existing, add template steering
cp -r .kiro/steering/* /path/to/existing/.kiro/steering/
```

**If .kiro doesn't exist**: Use template .kiro as-is (no action needed).

### Step 3: Validate User Input

Confirm user provided:
- `project_name` (matches pattern `^[a-z][a-z0-9-]*[a-z0-9]$`, 2-50 chars)
- `api_name` (matches pattern `^[a-z][a-z0-9-]*[a-z0-9]$`, 2-50 chars)
- `api_description` (10-200 chars)

Generate derived variables (PascalCase, UPPER_SNAKE_CASE versions).

### Step 4: Rename Files and Directories

Execute in this exact order:

1. **Rename module directory**:
   ```bash
   mv src/modules/template src/modules/{api_name}
   ```

2. **Rename module files** (inside `src/modules/{api_name}/`):
   - `template.module.ts` → `{api_name}.module.ts`
   - `template.controller.ts` → `{api_name}.controller.ts`
   - `template.service.ts` → `{api_name}.service.ts`
   - `template.controller.spec.ts` → `{api_name}.controller.spec.ts`
   - `template.service.spec.ts` → `{api_name}.service.spec.ts`

3. **Rename test file**:
   ```bash
   mv test/template.e2e-spec.ts test/{api_name}.e2e-spec.ts
   ```

### Step 5: Update Configuration Files

**package.json**:
```json
{
  "name": "api-{project_name}",
  "description": "{api_description}",
  "keywords": ["nestjs", "api", "{project_name}", "{api_name}", "mindicity"]
}
```

**src/app.module.ts**:
- Replace: `import { TemplateModule } from './modules/template/template.module';`
- With: `import { {ApiNamePascal}Module } from './modules/{api_name}/{api_name}.module';`
- Replace: `TemplateModule,` with `{ApiNamePascal}Module,`

**src/config/routes.config.ts**:
- Replace: `TEMPLATE: 'template'`
- With: `{API_NAME_UPPER}: '{api_name}'`

### Step 6: Replace Content in All Files

Execute replacements in this order to avoid conflicts:

1. **Configuration files** (package.json, app.module.ts, routes.config.ts)
2. **Module files** (all .ts files in `src/modules/{api_name}/`)
3. **Test files** (all .spec.ts and .e2e-spec.ts files)
4. **Documentation** (README.md, Docker files, .env.example)

**Replacement Patterns**:

| Find | Replace With |
|------|--------------|
| `TemplateModule` | `{ApiNamePascal}Module` |
| `TemplateController` | `{ApiNamePascal}Controller` |
| `TemplateService` | `{ApiNamePascal}Service` |
| `./template.controller` | `./{api_name}.controller` |
| `./template.service` | `./{api_name}.service` |
| `../template.module` | `../{api_name}.module` |
| `ROUTES.TEMPLATE` | `ROUTES.{API_NAME_UPPER}` |
| `@ApiTags('template')` | `@ApiTags('{api_name}')` |
| `templateService` | `{api_name}Service` |
| `mockTemplate` | `mock{ApiNamePascal}` |
| `'/mcapi/template'` | `'/mcapi/{api_name}'` |

**Critical Test File Updates**:
- Update `src/config/package.config.integration.spec.ts`:
  - Replace: `expect(packageInfo?.description).toContain('production-ready NestJS API template');`
  - With: `expect(packageInfo?.description).toContain('{api_description}');`

### Step 7: Update Documentation

**README.md**:
- `# Mindicity Template API` → `# {ProjectNamePascal} API`
- `Template API for Mindicity ecosystem` → `{api_description}`
- `template-api` → `api-{project_name}`
- `/template` → `/{api_name}`

**Docker files** (Dockerfile, Dockerfile.standalone, docker-compose.yml):
- `mindicity-template-api` → `api-{project_name}`

**.env.example**:
- `APP_LOG_PREFIX=api_template` → `APP_LOG_PREFIX=api_{project_name}`
- `APP_API_SCOPE_PREFIX=/project` → `APP_API_SCOPE_PREFIX=/{project_name}`

### Step 8: Implement MCP Tools (MANDATORY)

**Default**: Implement HTTP transport MCP tools (unless SSE explicitly requested).

**File naming**: `{api_name}-mcp-http.tool.ts` (and `.spec.ts` for tests)

**Required tools** (pattern: `{action}_{api_name}_{entity}`):
- `get_{api_name}_list` - GET /{api_name}
- `create_{api_name}` - POST /{api_name}
- `get_{api_name}_by_id` - GET /{api_name}/:id
- `update_{api_name}` - PUT /{api_name}/:id
- `delete_{api_name}` - DELETE /{api_name}/:id

**Integration steps**:
1. Add `{api_name}Service` to `TransportDependencies` interface
2. Update `createTransportDependencies` function
3. Inject service in `McpServerService` constructor
4. Add tool handlers to `setupToolHandlers` switch
5. Implement handler methods delegating to service
6. Add tool descriptions to `ListToolsRequestSchema`
7. Create MCP E2E tests

### Step 9: Environment Setup

```bash
# Create environment file
cp .env.example .env

# Edit .env with your specific settings
# - Database credentials
# - API keys
# - Port and host configurations
```

### Step 10: Verification

Run these commands in order. All must succeed:

```bash
# Install dependencies
npm install

# Build check
npm run build

# Lint check
npm run lint

# Test check (CRITICAL - all must pass)
npm run test
```

**If tests fail**, check:
- `src/config/package.config.integration.spec.ts` description expectation
- All test files use new API name in describe blocks
- All mock variables renamed from `mockTemplate` to `mock{ApiNamePascal}`
- All API endpoint paths updated in E2E tests
- Route constants updated in all test files

### Step 11: Initialize Git Repository

```bash
# Initialize new repository
git init

# Create initial commit
git add .
git commit -m "Initial commit: Bootstrap from template"

# Optional: Add remote and push
git remote add origin https://github.com/your-org/your-project.git
git branch -M master
git push -u origin master
```

## Post-Bootstrap

**Success Criteria**:
- All files renamed correctly
- All content replacements complete
- `npm run build` succeeds
- `npm run lint` passes
- `npm run test` passes (100% success)
- MCP tools implemented for HTTP transport
- Git repository initialized

**Next Steps for Developer**:

1. **Configure Environment**: Edit `.env` with database credentials, API keys, and settings
2. **Start Development**: `npm run dev`
3. **Customize API**: Implement business logic in `src/modules/{api_name}/`
4. **Update Documentation**: Add API-specific docs in `docs/` directory

**API Endpoints**:
- Base: `http://localhost:3232/mcapi/{scope}/{project_name}`
- Swagger: `http://localhost:3232/mcapi/{scope}/docs/swagger/ui`

## AI Assistant Guidelines

**Execution Rules**:
1. Require explicit user input (project_name, api_name, description) before starting
2. Validate all inputs against patterns before proceeding
3. Execute steps in exact order - never skip steps
4. Verify each step completion before proceeding
5. Implement HTTP transport MCP tools by default (unless SSE explicitly requested)
6. If any step fails, stop and provide clear error message

**Common Errors**:

| Issue | Cause | Solution |
|-------|-------|----------|
| File not found | Template structure mismatch | Verify template cloned correctly |
| npm install fails | Node.js version < 18 | Update Node.js to v18+ |
| Build fails | Imports not updated | Check all import paths updated |
| Tests fail | Description expectation mismatch | Update `package.config.integration.spec.ts` |
| E2E tests fail | Endpoint paths not updated | Update all `/template` → `/{api_name}` |

**Test Failure Checklist**:
- [ ] `package.config.integration.spec.ts` description matches new API
- [ ] All class names updated in test files
- [ ] All import paths updated
- [ ] All describe blocks use new API name
- [ ] All mock variables renamed
- [ ] All endpoint paths updated in E2E tests
- [ ] All route constants updated

**Execution Pattern**:
1. Clone template → 2. Validate input → 3. Generate variables → 4. Rename files → 5. Update config → 6. Replace content → 7. Update docs → 8. Implement MCP → 9. Setup environment → 10. Verify → 11. Initialize Git → 12. Report results

Never proceed to next step if current step fails.