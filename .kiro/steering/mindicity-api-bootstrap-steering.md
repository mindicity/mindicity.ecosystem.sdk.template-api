---
inclusion: manual
---

# Mindicity API Bootstrap Guide

## 🚨 MANDATORY: Every New API Project MUST Start Here

**CRITICAL REQUIREMENT**: ALL new Mindicity API projects MUST begin by bootstrapping from the official template repository. This is not optional - it is the ONLY supported way to create new API projects.

### Why Bootstrap is Mandatory

- **Production-Ready Foundation**: Template includes pre-configured infrastructure (database, logging, MCP, testing)
- **Consistent Architecture**: All APIs follow the same proven patterns and structure
- **Security & Best Practices**: Built-in security configurations and development standards
- **Future Updates**: Template updates can be applied without breaking your API modules
- **Team Efficiency**: Developers know exactly where to find components across all APIs

### What Happens Without Bootstrap

❌ **FORBIDDEN**: Creating APIs from scratch or copying files manually will result in:
- Missing critical infrastructure components
- Inconsistent project structure
- Security vulnerabilities
- Incompatible with Mindicity ecosystem
- No MCP integration for AI agents
- Failed code reviews and deployment issues

## 🎯 Bootstrap Process Overview

**EVERY NEW API PROJECT MUST:**

1. **Clone the official template repository** (mandatory first step)
2. **Run the complete bootstrap process** to rename template → your API
3. **Implement your business logic** in the designated module areas
4. **Never modify core infrastructure** - only work in `src/modules/`

**Template Repository (MANDATORY SOURCE)**: `https://github.com/mindicity/mindicity.ecosystem.sdk.template-api.git`

---

## Detailed Implementation Guide

This template-based NestJS API project serves as the foundation for all Mindicity APIs. When creating new API projects, the AI assistant must rename the template module to match the new API's purpose while preserving all architectural patterns and infrastructure.

**AI Assistant Requirements:**

- MUST require explicit user input before starting (project name, API module name, description)
- MUST validate all inputs against specified patterns before proceeding
- MUST execute steps in exact order without skipping validation
- MUST implement MCP tools for HTTP transport (default) unless SSE explicitly requested
- MUST verify each step completion before proceeding to next step

## 🏗️ CRITICAL: Core vs Module Separation

**FUNDAMENTAL PRINCIPLE**: The template architecture maintains a strict separation between core infrastructure and API modules.

### What Gets Modified During Bootstrap

**✅ ONLY THESE AREAS ARE MODIFIED:**

- `src/modules/template/` → `src/modules/{api_name}/` (rename and update content)
- `test/template.e2e-spec.ts` → `test/{api_name}.e2e-spec.ts` (rename and update)
- `package.json` (name, description, keywords only)
- `src/app.module.ts` (import statement for new module only)
- `src/config/routes.config.ts` (route constant only)
- `README.md` (project-specific information only)
- `.env.example` (project-specific prefixes only)

**🔒 CORE INFRASTRUCTURE REMAINS UNTOUCHED:**

- `src/common/` - Shared utilities and services
- `src/config/` - Configuration schemas (except routes.config.ts)
- `src/infrastructure/` - Database, MCP, external services
- `src/main.ts` - Application bootstrap
- `test/setup.ts` - Test infrastructure
- `scripts/` - Utility scripts
- `docs/` - Core documentation
- `.kiro/steering/` - Steering documents
- All configuration files (tsconfig.json, jest.config.js, etc.)

### Benefits of This Separation

1. **🔄 Future Template Updates**: Core infrastructure can be updated without affecting your API modules
2. **🔒 Conflict Prevention**: No merge conflicts when updating template versions
3. **📦 Module Portability**: API modules can be moved between projects easily
4. **🧪 Isolated Testing**: Module tests don't interfere with core infrastructure tests

**IMPORTANT**: This separation ensures that when the template is updated with new features, security patches, or improvements, your API modules remain completely unaffected.

## Template Repository (MANDATORY - NO EXCEPTIONS)

**🚨 CRITICAL**: Every new API project MUST start by cloning this exact repository. There are no alternatives.

**Official Template Repository**: `https://github.com/mindicity/mindicity.ecosystem.sdk.template-api.git`

**Branch**: `master` (always use latest stable version)

**Why This Repository is Mandatory**:
- Contains all required Mindicity infrastructure components
- Pre-configured with security, logging, database, and MCP integration
- Tested and validated architecture patterns
- Consistent with all other Mindicity APIs
- Required for ecosystem compatibility

**FORBIDDEN Alternatives**:
❌ Creating new NestJS projects from scratch
❌ Using other NestJS templates or boilerplates  
❌ Copying code from existing APIs manually
❌ Starting with empty repositories

**Clone Command (Execute This First)**:

```bash
# Clone the template to a temporary directory
git clone -b master https://github.com/mindicity/mindicity.ecosystem.sdk.template-api.git temp-template

# Move template contents to project root
mv temp-template/* .
mv temp-template/.* . 2>/dev/null || true

# Remove temporary directory and template Git history
rm -rf temp-template
rm -rf .git
```

**CRITICAL REQUIREMENTS**:

- **ALWAYS clone from the official repository** - no exceptions or alternatives
- Clone to temporary directory first to avoid conflicts with existing files
- Move all contents (including hidden files) to project root
- Clean up temporary directory and template Git history
- Always use the `master` branch as it contains the latest stable template version with all required infrastructure and patterns
- **MANDATORY**: Remove the `.git` folder after cloning to eliminate template Git history
- **CRITICAL**: If `.kiro` folder already exists, merge template `.kiro` content with existing configurations
- You will initialize a new Git repository for your derived project later

**Template Validation**: After cloning, verify these critical files exist:
- `src/infrastructure/` (database, MCP, logging services)
- `src/modules/template/` (template module to be renamed)
- `.kiro/steering/` (development guidelines)
- `package.json` with Mindicity dependencies
- `nest-cli.json` and TypeScript configurations

## .kiro Folder Management

The template includes a `.kiro` folder with essential Kiro IDE configurations and steering files. Proper management of this folder is critical for maintaining both template guidance and existing project configurations.

### Template .kiro Contents

The template `.kiro` folder contains:

**Steering Files** (`/.kiro/steering/`):

- `mindicity-api-base-steering.md`: Core API development guidelines
- `mindicity-api-bootstrap-steering.md`: Bootstrap process instructions
- Additional steering files for consistent development patterns

**Settings** (`/.kiro/settings/`):

- MCP server configurations
- IDE-specific settings
- Development environment configurations

### .kiro Merge Strategies

#### Scenario 1: New Project (No existing .kiro)

```bash
# Simple case - use template .kiro as-is
# No action needed, template .kiro will be used directly
```

#### Scenario 2: Existing Project with .kiro

```bash
# Preserve existing configurations, add template steering
cp -r template/.kiro/steering/* existing-project/.kiro/steering/

# Optionally merge settings (review manually)
# Compare template/.kiro/settings/ with existing-project/.kiro/settings/
```

#### Scenario 3: Complete .kiro Replacement

```bash
# Backup existing .kiro and use template version
mv existing-project/.kiro existing-project/.kiro.backup
cp -r template/.kiro existing-project/
```

### Critical .kiro Files for Bootstrap

**MANDATORY Template Files**:

- `.kiro/steering/mindicity-api-base-steering.md`
- `.kiro/steering/mindicity-api-bootstrap-steering.md`

**Optional Template Files** (merge as needed):

- `.kiro/settings/mcp.json` (if MCP configuration needed)
- Additional steering files for specific development patterns

**Preserve Existing Files**:

- Custom steering files for your project
- User-specific IDE settings
- Project-specific MCP configurations
- Custom agent hooks and workflows

## Bootstrap Process

### Step 1: Template Setup (MANDATORY - FIRST STEP)

**🚨 CRITICAL**: Before ANY other work, you MUST clone and set up the template repository. This is the foundation for all Mindicity APIs.

**MANDATORY FIRST ACTION**: Clone the official template repository:

1. **Clone Template Repository** (REQUIRED):

   ```bash
   # MANDATORY: Clone the official Mindicity template repository
   git clone -b master https://github.com/mindicity/mindicity.ecosystem.sdk.template-api.git temp-template
   
   # Move all template contents to project root
   mv temp-template/* .
   mv temp-template/.* . 2>/dev/null || true
   
   # Clean up temporary directory
   rm -rf temp-template
   ```

   **Verification**: After cloning, confirm these critical directories exist:
   - `src/infrastructure/` (core services)
   - `src/modules/template/` (template to rename)
   - `.kiro/steering/` (development guidelines)
   - `docs/` (documentation structure)

2. **Merge .kiro Folder** (MANDATORY if .kiro already exists):

   ```bash
   # If .kiro folder already exists in your project, merge template .kiro content
   # This preserves existing Kiro configurations while adding template steering files
   
   # Option 1: Manual merge (recommended for careful control)
   # Copy template steering files to existing .kiro/steering/
   cp -r .kiro/steering/* /path/to/existing/project/.kiro/steering/
   
   # Option 2: Backup and replace (if you want template .kiro completely)
   # mv /path/to/existing/project/.kiro /path/to/existing/project/.kiro.backup
   # cp -r .kiro /path/to/existing/project/
   ```

3. **Remove Template Git History** (MANDATORY):

   ```bash
   # Remove template Git history to start fresh
   rm -rf .git
   ```

**Why Merge .kiro Folder?**

- Existing `.kiro` folder may contain project-specific configurations
- Template `.kiro` contains essential steering files for API development
- Merging preserves existing settings while adding template guidance
- Prevents overwriting custom Kiro configurations

**Important .kiro Merge Considerations**:

- **Steering Files**: Template steering files should be added/updated
- **Settings**: Preserve existing MCP configurations and user settings
- **Hooks**: Keep existing agent hooks, add template hooks if needed
- **Custom Files**: Preserve any custom Kiro configurations

**Next Steps After Template Setup**:

- Your directory now contains the clean template files
- `.kiro` folder properly merged with existing configurations
- No Git history from the template repository
- Ready to proceed with bootstrap process
- You will initialize your own Git repository later (Step 10)

### Step 2: User Input Declaration

**MANDATORY**: Before starting the bootstrap process, the user MUST explicitly declare:

1. **Project Name**: The name of the new API project (e.g., "user-management", "weather-service")
2. **API Module Name**: The main module/domain name for the API (e.g., "users", "weather")

**Example Declaration**:

```text
Project Name: user-management
API Module Name: users
Description: User management and authentication API
```

### Step 3: Input Validation & Variable Generation

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

### Step 4: File Renaming Operations

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

### Step 5: Configuration Updates

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

### Step 6: Content Replacement

**Execute replacements in this optimized order to avoid conflicts:**

1. **Configuration Files First**: package.json, app.module.ts, routes.config.ts
2. **Module Files**: All .ts files in src/modules/{api_name}/
3. **Test Files**: All .spec.ts files (including integration tests)
4. **Documentation**: README.md, Docker files, .env.example
5. **Quick Verification**: Run syntax check after each group

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

**CRITICAL - Integration Test Files**: Update configuration test expectations:

- **`src/config/package.config.integration.spec.ts`**:
  - Replace: `expect(packageInfo?.description).toContain('production-ready NestJS API template');`
  - With: `expect(packageInfo?.description).toContain('{api_description}');`
  - This prevents test failures due to outdated description expectations

**E2E Test Files**: Special attention to endpoint testing:

- Update all HTTP requests: `request(app.getHttpServer()).get('/mcapi/template')` → `request(app.getHttpServer()).get('/mcapi/{api_name}')`
- Update test expectations for API responses
- Update any hardcoded 'template' strings in test data
- Update swagger documentation tests if present

### Step 7: Documentation and Configuration

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

### Step 8: MCP Integration (MANDATORY)

**CRITICAL**: After bootstrap completion, MCP tools MUST be implemented for the new API module.

#### MCP Implementation Rules

**DEFAULT BEHAVIOR**: Unless explicitly specified otherwise, MCP tools MUST be implemented for **HTTP transport**

**MCP File Naming Convention**:

- **Pattern**: `{api_name}-mcp-{transport}.tool.ts`
- **Examples**:
  - `users-mcp-http.tool.ts` (HTTP transport)
  - `users-mcp-sse.tool.ts` (SSE transport)
  - `weather-mcp-http.tool.ts` (HTTP transport)
- **Test Files**: `{api_name}-mcp-{transport}.tool.spec.ts`
- **Index Export**: Update `mcp/index.ts` to export from the correctly named file

**Implementation Decision Matrix**:

| Bootstrap Request | MCP Implementation | Transport | Functionality |
| --- | --- | --- | --- |
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

### Step 9: Environment Setup (MANDATORY)

**CRITICAL**: Set up the development environment before verification:

1. **Create Environment File**: `cp .env.example .env`
2. **Configure Environment Variables**: Edit `.env` with your specific settings (database credentials, API keys, etc.)

### Step 10: Verification

**CRITICAL**: Run these commands to verify the bootstrap was successful:

1. **Install Dependencies**: `npm install`
2. **Build Check**: `npm run build` (must succeed)
3. **Lint Check**: `npm run lint` (must pass)
4. **MANDATORY: Test Verification**: `npm run test` (all tests must pass)
   - **CRITICAL**: If tests fail, check these common issues:
     - `src/config/package.config.integration.spec.ts`: Verify description expectation matches new API description
     - All test files use new API name in describe blocks and expectations
     - All mock data variables renamed from `mockTemplate` to `mock{ApiNamePascal}`
     - All hardcoded template strings in test assertions updated
5. **Test Files Check**: Verify all `.spec.ts` files have been renamed and updated correctly
6. **MCP Integration Check**: Verify MCP tools are implemented and working

**Enhanced Test Files Verification Checklist**:

- [ ] All test files renamed from `template.*` to `{api_name}.*`
- [ ] Import paths updated in test files
- [ ] Class references updated (`TemplateController` → `{ApiNamePascal}Controller`)
- [ ] Describe blocks updated (`describe('TemplateController')` → `describe('{ApiNamePascal}Controller')`)
- [ ] Test descriptions updated to use new API name
- [ ] Mock data variables renamed appropriately
- [ ] API endpoint paths updated in E2E tests (`'/template'` → `'/{api_name}'`)
- [ ] **CRITICAL**: `src/config/package.config.integration.spec.ts` description expectation updated
- [ ] **CRITICAL**: All hardcoded template strings in test assertions updated
- [ ] **CRITICAL**: Route constants in tests updated (`ROUTES.TEMPLATE` → `ROUTES.{API_NAME_UPPER}`)

**Common Test Failure Patterns and Solutions**:

| Error Pattern | Root Cause | Solution |
|---------------|------------|----------|
| `Expected 'production-ready NestJS API template'` | Integration test expects old description | Update `package.config.integration.spec.ts` expectation |
| `TemplateController is not defined` | Class reference not updated in test | Update all class references in test files |
| `Cannot resolve module '../template/template.module'` | Import path not updated | Update all import paths in test files |
| `Route '/mcapi/template' not found` | E2E test uses old endpoint | Update API endpoint paths in E2E tests |

**E2E Test Configuration**:

The template includes proper E2E test configuration to avoid common hanging issues:
- Database connection checks disabled during tests (`DB_CHECK=false`)
- MCP server disabled during tests (`MCP_ENABLED=false`)
- Reduced log levels for cleaner test output
- Proper test timeouts and cleanup procedures
- Separate Jest configuration for E2E tests (`jest-e2e.config.js`)

**Running Tests**:
- Unit tests: `npm run test`
- E2E tests: `npm run test:e2e`
- All tests with coverage: `npm run test:cov`

**If any step fails**, the bootstrap is incomplete and must be fixed before proceeding.

### Step 11: Git Repository Initialization

**CRITICAL**: Initialize a new Git repository for your project:

1. **Initialize Git Repository**:

   ```bash
   # Initialize new Git repository
   git init
   
   # Add all files to staging
   git add .
   
   # Create initial commit
   git commit -m "Initial commit: Bootstrap from template"
   ```

2. **Set Up Remote Repository** (Optional):

   ```bash
   # Add your project's remote repository
   git remote add origin https://github.com/your-org/your-project-name.git
   
   # Push to remote repository
   git branch -M master
   git push -u origin master
   ```

**Why Initialize New Git Repository?**

- Creates a clean Git history starting with your project
- No template commit history in your project
- Proper version control for your derived project
- Ready for your team's development workflow

**Git Setup Verification**:

- [ ] `.git` folder exists in project root
- [ ] Initial commit created successfully
- [ ] Remote repository configured (if applicable)
- [ ] Ready for team development

## Post-Bootstrap Instructions

**Success Message**: Project `api-{project_name}` has been successfully created!

### Next Steps for Developer

1. **Environment Configuration** (MANDATORY): 
   ```bash
   # Environment file should already be created during bootstrap
   # Edit .env file with your specific configuration
   nano .env  # or use your preferred editor
   ```
   
   **Required Environment Variables to Configure**:
   - Database connection settings (host, port, username, password, database name)
   - API keys and external service credentials
   - Log levels and application-specific settings
   - Port and host configurations for development

2. **Database Setup**: Ensure your database is running and accessible with the credentials in `.env`
3. **API Customization**: Review and customize API endpoints in `src/modules/{api_name}/`
4. **Documentation**: Update API documentation in `docs/` directory

**Environment Setup Details**:
```bash
# Environment file created during bootstrap - now configure it
# Update these critical settings in .env:
# - DATABASE_HOST, DATABASE_PORT, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME
# - APP_LOG_LEVEL (debug, info, warn, error)
# - APP_PORT (default: 3232)
# - Any API keys for external services your API will use
```

### Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run lint` - Run linting
- `npm run format` - Format code

### API Endpoints

- **API Base**: `http://localhost:3232/mcapi/{scope}/{project_name}`
- **Swagger UI**: `http://localhost:3232/mcapi/{scope}/docs/swagger/ui`

## AI Assistant Execution Guidelines

### Critical Rules for AI Assistants

1. **REQUIRE user declaration** - Always require explicit project name and API module name declaration before starting
2. **NEVER skip validation** - Always validate input parameters before starting
3. **Execute operations in exact order** - File operations must follow the sequence above
4. **Verify each step** - Check that files exist and contain expected content after each operation
5. **Handle errors gracefully** - If any step fails, provide clear error messages and cleanup guidance
6. **MANDATORY MCP INTEGRATION** - Always implement MCP tools for HTTP transport unless SSE explicitly requested
7. **CRITICAL TEST VALIDATION** - Always verify test expectations are updated, especially integration tests

### Input Validation Patterns

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

### Common Error Scenarios

**File Operations**:

- **File not found**: Verify the template structure matches expectations
- **npm install fails**: Ensure Node.js version >= 18 and npm is updated
- **Build fails**: Check TypeScript configuration and verify all imports are updated

**Test Issues**:

- **Test failures**: Ensure all class names and imports in test files are properly renamed
- **Test import errors**: Verify all import paths in `.spec.ts` files have been updated from `template` to `{api_name}`
- **E2E test failures**: Check that all API endpoint paths in tests have been updated (`'/mcapi/template'` → `'/mcapi/{api_name}'`)
- **Mock data errors**: Ensure all mock variables have been renamed (`mockTemplate` → `mock{ApiNamePascal}`)
- **Describe block mismatches**: Verify all `describe()` blocks use the new API name
- **Integration test failures**: Most common - check `src/config/package.config.integration.spec.ts` description expectation
- **Route constant errors**: Verify `ROUTES.TEMPLATE` updated to `ROUTES.{API_NAME_UPPER}` in all test files

### Success Criteria

The bootstrap is successful when:

- All files are renamed correctly
- All content replacements are complete
- `npm run build` succeeds
- `npm run lint` passes
- `npm run test` passes with 100% success rate
- **MCP tools are mandatorily implemented** for the new API module
- **HTTP transport is configured** as default (unless SSE explicitly requested)

### AI Assistant Execution Pattern

**STEP-BY-STEP EXECUTION**:

1. **Template Setup**: Clone repository, merge .kiro folder, and remove .git folder for clean start
2. **Validate User Input**: Confirm project_name, api_name, and description meet requirements
3. **Generate Variables**: Create all derived variables (pascal case, upper case, etc.)
4. **File Operations**: Execute renaming operations in exact order specified
5. **Content Updates**: Replace all template references with new API names (follow optimized order)
6. **Configuration Updates**: Update package.json, app.module.ts, routes.config.ts
7. **Test File Updates**: CRITICAL - Update all test files including integration test expectations
8. **MCP Integration**: Implement mandatory MCP tools for HTTP transport
9. **Environment Setup**: Create .env file from .env.example template
10. **Verification**: Run build, lint, and test commands to ensure success (use enhanced checklist)
11. **Git Initialization**: Initialize new Git repository for the project
12. **Report Results**: Provide clear success/failure status with next steps

**CRITICAL**: Never proceed to the next step if the current step fails. Always fix issues before continuing.

**ENHANCED ERROR HANDLING**: If tests fail during verification:
1. Check the common failure patterns table above
2. Verify all template strings have been replaced
3. Ensure integration test expectations match new API description
4. Validate all import paths and class references are updated

## 🚀 Future Enhancement Suggestions

### Automated Bootstrap Script (Future Consideration)

Consider creating a bootstrap automation script that handles:
- File renaming operations with regex patterns
- Content replacement with validation
- Test file updates including expectations
- Comprehensive verification of all replacements
- Rollback capability in case of errors

This would eliminate manual errors and ensure 100% consistency across all bootstrap operations.

### Performance Optimizations

- **Parallel Processing**: File operations could be parallelized where safe
- **Incremental Validation**: Validate each file group after replacement
- **Smart Conflict Detection**: Detect potential naming conflicts before starting
- **Template Versioning**: Support for different template versions and migration paths

---

**Last Updated**: Based on real-world bootstrap experience and error pattern analysis
**Version**: Enhanced with integration test fixes and comprehensive error handling