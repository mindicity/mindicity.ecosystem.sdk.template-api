---
inclusion: always
---

# Mindicity API Development Guide

## 🚨 CRITICAL: Bootstrap Process Required

**MANDATORY:** All new Mindicity API projects MUST use the bootstrap process from `mindicity-api-bootstrap-steering.md`. This is not optional.

**Quick Start:**

1. Clone template repository
2. Run bootstrap process (renames template → your API)
3. Implement your business modules in `src/modules/`

**Benefits:** Production-ready foundation, consistent architecture, pre-configured infrastructure (database, logging, MCP, testing).

## Architecture Overview

**Tech Stack:** Node.js + NestJS + Fastify + Pino + Zod + MCP + TypeScript (strict mode)

**Core Principles:**

- **Module Isolation:** Business logic in `src/modules/`, infrastructure in `src/infrastructure/`
- **Gateway Authentication:** No auth guards in endpoints - gateway handles all security
- **Centralized Logging:** Use `ContextLoggerService` with correlation IDs
- **Service Delegation:** Controllers use DTOs, Services use interfaces
- **MCP Integration:** Every module MUST expose MCP tools for AI agents

## 🏗️ Directory Structure & Rules

### Core Infrastructure (🔒 DO NOT MODIFY)

```text
src/
├── common/           # Shared utilities, interceptors, filters
├── config/           # Configuration schemas (Zod validation)
├── infrastructure/   # Database, MCP, external services
├── app.module.ts     # Main application module
└── main.ts          # Application bootstrap
```

### Your Development Area (✅ MODIFY HERE)

```text
src/modules/{your-api}/
├── {api}.module.ts          # NestJS module
├── {api}.controller.ts      # HTTP endpoints (DTOs only)
├── {api}.service.ts         # Business logic (interfaces only)
├── dto/                     # Request/Response DTOs (Zod)
├── interfaces/              # Internal interfaces
├── mcp/                     # MCP tools/resources for this module
└── test/                    # E2E tests
```

**Key Rule:** Keep business logic in modules, use core infrastructure services.

## Infrastructure Extension (When Needed)

**When to Extend Infrastructure:**

- Need new external services (Redis, MQTT, Elasticsearch)
- Require additional databases or message brokers
- Must integrate with third-party APIs

**Extension Process:**

1. **Justify:** Document why existing infrastructure is insufficient
2. **Create Service:** Add to `src/infrastructure/{service-name}/`
3. **Follow Patterns:** Use `ContextLoggerService`, Zod config, proper error handling
4. **Module Integration:** Create NestJS module, add to `AppModule`
5. **Testing:** Unit and integration tests required

**❌ Forbidden:** Modifying existing infrastructure services (`DatabaseService`, `McpServerService`, etc.)

## Implementation Patterns

### Module Creation

```bash
# Generate module structure
nest generate module modules/{module-name} --no-spec
nest generate controller modules/{module-name} --no-spec  
nest generate service modules/{module-name} --no-spec
mkdir -p src/modules/{module-name}/{dto,interfaces,mcp,test}
```

### Controller Pattern (No Auth Guards!)

```typescript
@ApiTags('{module-name}')
@ApiBearerAuth() // Swagger docs only - gateway handles auth
@Controller(ROUTES.{MODULE_NAME})
export class {ModuleName}Controller {
  constructor(
    private readonly {moduleName}Service: {ModuleName}Service,
    private readonly logger: ContextLoggerService,
  ) {
    this.logger.setContext({ModuleName}Controller.name);
  }

  @Get()
  @ApiOperation({ summary: 'Get all {entities}' })
  async findAll(@Query() query: Query{Entity}Dto): Promise<{Entity}ResponseDto[]> {
    this.logger.trace('findAll()', { query });
    
    // Convert DTO to interface for service
    const entities = await this.{moduleName}Service.findAll(query);
    
    // Convert back to DTO for response
    return entities.map(entity => ({ ...entity }));
  }
}
```

### Service Pattern (Use SqlQueryBuilder)

```typescript
@Injectable()
export class {ModuleName}Service {
  private readonly logger: ContextLoggerService;

  constructor(
    loggerService: ContextLoggerService,
    private readonly databaseService: DatabaseService,
  ) {
    this.logger = loggerService.child({ serviceContext: {ModuleName}Service.name });
  }

  async findAll(query: {Entity}Query): Promise<{Entity}Data[]> {
    this.logger.trace('findAll()', { query });

    try {
      // ✅ Use SqlQueryBuilder for standard queries
      const { query: sql, params } = SqlQueryBuilder
        .create()
        .select(['id', 'name', 'email', 'status'])
        .from('{table_name}')
        .where('status = $1', ['active'])
        .orderBy('created_at', 'DESC')
        .limit(query.limit ?? 20)
        .build();

      const results = await this.databaseService.queryMany<{Entity}Data>(sql, params);
      
      this.logger.debug('{entities} retrieved', { 
        count: results.length,
        correlationId: ContextUtil.getCorrelationId()
      });
      
      return results;
    } catch (error) {
      this.logger.error('failed to retrieve {entities}', { 
        err: error, 
        correlationId: ContextUtil.getCorrelationId()
      });
      throw error;
    }
  }
}
```

### DTOs vs Interfaces

```typescript
// DTOs (Controllers only) - Zod validation
const Create{Entity}Schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
});
export class Create{Entity}Dto extends createZodDto(Create{Entity}Schema) {}

// Interfaces (Services only)
export interface {Entity}Data {
  id: string;
  name: string;
  email?: string;
  createdAt: Date;
}
```

## Database Queries

### SqlQueryBuilder (MANDATORY for Simple Queries)

```typescript
// ✅ Use SqlQueryBuilder for standard operations
const { query: sql, params } = SqlQueryBuilder
  .create()
  .select(['id', 'name', 'email'])
  .from('users')
  .where('status = $1', ['active'])
  .orderBy('created_at', 'DESC')
  .limit(20)
  .build();

const results = await this.databaseService.queryMany<UserData>(sql, params);
```

### Raw SQL (EXCEPTIONS ONLY)

**Only allowed for:**

- CTEs (Common Table Expressions)
- Window functions
- Advanced PostgreSQL features
- Complex recursive queries

```typescript
// ✅ Acceptable: Complex CTE requires raw SQL
const sql = `
  WITH RECURSIVE category_hierarchy AS (
    SELECT id, name, parent_id, 0 as level
    FROM categories WHERE parent_id IS NULL
    UNION ALL
    SELECT c.id, c.name, c.parent_id, ch.level + 1
    FROM categories c
    INNER JOIN category_hierarchy ch ON c.parent_id = ch.id
  )
  SELECT * FROM category_hierarchy ORDER BY level;
`;
```

**❌ Forbidden:** Simple queries with raw SQL (use SqlQueryBuilder instead)

## Logging Rules

**CRITICAL:** Always use `ContextLoggerService`, never `console.log`

### Logger Setup

```typescript
constructor(loggerService: ContextLoggerService) {
  this.logger = loggerService.child({ serviceContext: ExampleService.name });
}
```

### Logging Levels

- **trace**: Method entry/exit with parameters
- **debug**: Business logic steps with context
- **error**: Exceptions with correlation ID

### Infrastructure vs Business Logging

**Infrastructure providers** (Database, MQTT, WebSocket) handle their own logging centrally.
**Business services** log only business context, NOT infrastructure performance.

```typescript
// ✅ CORRECT: Business service logging
async findUsers(query: UserQuery): Promise<UserData[]> {
  this.logger.trace('findUsers()', { query });
  
  // NO logging of SQL - DatabaseService handles this
  const results = await this.databaseService.queryMany(sql, params);
  
  // Log business context only
  this.logger.debug('users retrieved for business logic', { 
    requestedBy: ContextUtil.getUserId(),
    correlationId: ContextUtil.getCorrelationId()
  });
  
  return results;
}

// ❌ WRONG: Don't re-log infrastructure operations
async findUsers(): Promise<UserData[]> {
  this.logger.trace('executing SQL query', { sql }); // ❌ DatabaseService logs this
  const results = await this.databaseService.queryMany(sql);
  this.logger.debug('query returned rows', { count: results.length }); // ❌ DatabaseService logs this
}
```

## Code Quality & Standards

### ESLint Rules (ENFORCED)

- **TypeScript Strict Mode**: Explicit return types, no `any`, proper typing
- **Nullish Coalescing**: Use `??` instead of `||` for defaults
- **Security**: No `console.log`, no `eval`, no hardcoded secrets
- **Complexity Limits**: Max 80 lines per function, 5 parameters, 4 nesting levels
- **Import Order**: Node.js → External → Internal → Local

```typescript
// ✅ CORRECT: Nullish coalescing
const pageSize = query.limit ?? 10;
const config = userConfig ?? defaultConfig;

// ❌ WRONG: Logical OR (fails for 0, "", false)
const pageSize = query.limit || 10;
```

### Security Rules

```typescript
// ❌ Prohibited
console.log('Debug');           // Use this.logger
const secret = 'hardcoded';     // Use ConfigService
eval(userInput);                // Never use eval

// ✅ Correct
this.logger.debug('Debug', { context });
const secret = this.configService.get<string>('secret');
```

### Documentation Requirements

```typescript
/**
 * UserService provides user management with correlation logging.
 * @param id - User identifier (UUID format)
 * @returns Promise resolving to user data or null
 * @throws {ValidationException} When ID format is invalid
 */
async findOne(id: string): Promise<UserData | null> {
  // Implementation
}
```

## 🤖 MCP Integration (MANDATORY)

**CRITICAL:** Every API module MUST implement MCP tools for AI agent connectivity.

### MCP Implementation Rules

#### Default: HTTP Transport

- MCP tools MUST be implemented for HTTP transport (unless SSE explicitly requested)
- HTTP provides complete functionality, production-ready error handling
- One tool per endpoint/intention with clear naming

#### MCP File Naming Convention

- **Pattern**: `{api_name}-mcp-{transport}.tool.ts`
- **Examples**:
  - `users-mcp-http.tool.ts` (HTTP transport)
  - `weather-mcp-sse.tool.ts` (SSE transport)
  - `notifications-mcp-http.tool.ts` (HTTP transport)
- **Test Files**: `{api_name}-mcp-{transport}.tool.spec.ts`
- **Index Export**: Update `mcp/index.ts` to export from the correctly named file

#### Tool Naming Pattern

`{action}_{module}_{entity}`

```typescript
// Examples:
'get_users_list'      // GET /users
'create_user'         // POST /users
'get_user_by_id'      // GET /users/:id
'update_user'         // PUT /users/:id
'delete_user'         // DELETE /users/:id
```

### MCP Tool Implementation Pattern

```typescript
// MCP Tool Class with comprehensive definitions
export class {ModuleName}McpHttpTool {
  constructor(private readonly {moduleName}Service: {ModuleName}Service) {}

  // Tool method implementation
  {toolMethod}(_args: Record<string, unknown>): CallToolResult {
    const data = this.{moduleName}Service.{serviceMethod}();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }

  // Comprehensive tool definitions with detailed descriptions
  static getToolDefinitions(): Array<{
    name: string;
    description: string;
    inputSchema: object;
    usage?: {
      purpose: string;
      when_to_use: string[];
      response_format: string;
      interpretation: Record<string, string>;
      examples: Array<{ scenario: string; expected_result: string }>;
    };
  }> {
    return [
      {
        name: '{tool_name}',
        description: `Comprehensive description of what this tool does.

Detailed explanation including:
- Primary functionality and purpose
- Data returned and format
- When and why to use this tool
- Integration with other API operations`,
        inputSchema: {
          type: 'object',
          properties: { /* parameter definitions */ },
          required: [],
        },
        usage: {
          purpose: 'Clear statement of tool purpose and transport type',
          when_to_use: [
            'Specific scenario 1',
            'Specific scenario 2',
            'Integration use case',
          ],
          response_format: 'Description of response structure and data types',
          interpretation: {
            field1: 'Explanation of what this field means',
            field2: 'How to interpret this value',
          },
          examples: [
            {
              scenario: 'Common use case',
              expected_result: 'What the agent should expect',
            },
          ],
        },
      },
    ];
  }
}
```

### MCP Integration Checklist

- [ ] Add service to `TransportDependencies` interface
- [ ] Update `createTransportDependencies` function
- [ ] Inject service in `McpServerService` constructor
- [ ] Add tool handlers to `setupToolHandlers` switch
- [ ] Implement handler methods that delegate to services
- [ ] Add tool descriptions to `ListToolsRequestSchema`
- [ ] Create MCP E2E tests for all tools

**❌ Forbidden:** Implementing business logic directly in MCP tools (must delegate to services)

## MCP Tool Definition Best Practices

**CRITICAL:** Tool definitions should be comprehensive and provide detailed guidance for AI agents.

### Rich Tool Definitions Structure

```typescript
// ✅ CORRECT: Comprehensive tool definition
static getToolDefinitions() {
  return [{
    name: 'get_users_list',
    description: `Retrieve a comprehensive list of users with filtering and pagination.

This tool provides access to user data including:
- User identification and profile information
- Account status and permissions
- Registration and activity timestamps
- Filtering by status, role, or date ranges

Use this tool for user management, reporting, and administrative tasks.`,
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'inactive', 'pending'] },
        limit: { type: 'number', minimum: 1, maximum: 100 },
      },
      required: [],
    },
    usage: {
      purpose: 'Retrieve and manage user data via HTTP transport',
      when_to_use: [
        'When displaying user lists in admin interfaces',
        'For user management and moderation tasks',
        'During user analytics and reporting workflows',
        'To verify user existence before other operations',
      ],
      response_format: 'Array of user objects with ID, name, email, status, and timestamps',
      interpretation: {
        status: 'active = user can login, inactive = suspended, pending = awaiting verification',
        createdAt: 'User registration timestamp in ISO 8601 format',
        lastLoginAt: 'Most recent login time, null if never logged in',
      },
      examples: [
        {
          scenario: 'Get all active users',
          expected_result: 'List of users with status: active and their profile data',
        },
        {
          scenario: 'Paginated user list',
          expected_result: 'Limited number of users based on limit parameter',
        },
      ],
    },
  }];
}

// ❌ WRONG: Minimal, unhelpful definition
static getToolDefinitions() {
  return [{
    name: 'get_users_list',
    description: 'Get users',
    inputSchema: { type: 'object', properties: {}, required: [] },
  }];
}
```

### Tool Definition Requirements

- **Comprehensive Description**: Multi-line description with bullet points explaining functionality
- **Transport Specification**: Clearly indicate which transport (HTTP/STDIO/SSE) the tool uses
- **Usage Guidance**: When to use, response format, field interpretations
- **Practical Examples**: Real-world scenarios and expected outcomes
- **Input Schema**: Detailed parameter definitions with validation rules

## Module Creation Checklist

**PREREQUISITE:**

- [ ] **MANDATORY:** Project created using bootstrap process (see top of document)
- [ ] Base API repository cloned and bootstrap steering followed

**Structure:**

- [ ] Use NestJS CLI: `nest generate module/controller/service`
- [ ] Create `dto/`, `interfaces/`, `test/` directories
- [ ] Follow kebab-case naming for files

**Implementation:**

- [ ] Controller: DTOs only, `@ApiBearerAuth()` for docs, no auth guards
- [ ] Service: Interfaces only, child logger setup, `ContextUtil` usage
- [ ] Module: Import infrastructure modules (DatabaseModule, etc.)

**Infrastructure Extensions (IF NEEDED):**

- [ ] **JUSTIFY EXTENSION**: Document why existing infrastructure is insufficient
- [ ] **NEW SERVICE CREATION**: Create in `src/infrastructure/{service-name}/`
- [ ] **FOLLOW PATTERNS**: Use ContextLoggerService, proper error handling, Zod config
- [ ] **MODULE INTEGRATION**: Create NestJS module, import in AppModule
- [ ] **TESTING**: Add unit and integration tests

**MCP Integration (MANDATORY):**

- [ ] **HTTP TRANSPORT**: MCP tools MUST be implemented for HTTP (default)
- [ ] **ONE TOOL PER ENDPOINT**: Each API endpoint needs corresponding MCP tool
- [ ] **TOOL NAMING**: Follow `{action}_{module}_{entity}` pattern (snake_case)
- [ ] **SERVICE DELEGATION**: MCP tools MUST delegate to existing service methods
- [ ] **DEPENDENCY INJECTION**: Add service to `TransportDependencies` interface
- [ ] **HANDLER REGISTRATION**: Register tools in `McpServerService` switch statement
- [ ] **COMPREHENSIVE TESTING**: Add MCP E2E tests for all tools

**Code Quality:**

- [ ] ESLint rules enforced (no `console.log`, use `??` not `||`, explicit return types)
- [ ] Use SqlQueryBuilder for simple queries, raw SQL only for complex scenarios
- [ ] Infrastructure logs in providers only, business logs in services only
- [ ] Unit tests >80% coverage, E2E tests for all endpoints
- [ ] JSDoc on public methods with `@param`, `@returns`, `@throws`