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

### Core Infrastructure (🔒 NEVER MODIFY)

```text
src/
├── common/           # Shared utilities, interceptors, filters
├── config/           # Configuration schemas (Zod validation)
├── infrastructure/   # Database, MCP, external services
├── app.module.ts     # Main application module
└── main.ts          # Application bootstrap
```

### Development Area (✅ MODIFY ONLY HERE)

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

**CRITICAL RULE:** Keep business logic in modules, use core infrastructure services without modification.

## AI Assistant Guidelines

### When Creating New Modules

1. **ALWAYS** use NestJS CLI generators
2. **NEVER** modify core infrastructure files
3. **ALWAYS** implement MCP tools for HTTP transport (default)
4. **ALWAYS** use `ContextLoggerService` instead of `console.log`
5. **ALWAYS** use `SqlQueryBuilder` for simple queries
6. **NEVER** add authentication guards (gateway handles auth)

### File Naming Conventions

- **Controllers:** `{module-name}.controller.ts`
- **Services:** `{module-name}.service.ts`
- **DTOs:** `{entity-name}.dto.ts`
- **Interfaces:** `{entity-name}.interface.ts`
- **MCP Tools:** `{module-name}-mcp-http.tool.ts`
- **Tests:** `{file-name}.spec.ts` or `{file-name}.e2e-spec.ts`

## Infrastructure Extension (When Needed)

**When to Extend Infrastructure:**

- Need new external services (Redis, MQTT, Elasticsearch)
- Require additional databases or message brokers
- Must integrate with third-party APIs

**AI Assistant Process:**

1. **Justify Extension:** Document why existing infrastructure is insufficient
2. **Create Service:** Add to `src/infrastructure/{service-name}/`
3. **Follow Patterns:** Use `ContextLoggerService`, Zod config, proper error handling
4. **Module Integration:** Create NestJS module, add to `AppModule`
5. **Add Testing:** Unit and integration tests required

**❌ FORBIDDEN:** Modifying existing infrastructure services (`DatabaseService`, `McpServerService`, etc.)

## Implementation Patterns

### Module Creation Commands

```bash
# Generate module structure (AI Assistant: Execute these in order)
nest generate module modules/{module-name} --no-spec
nest generate controller modules/{module-name} --no-spec  
nest generate service modules/{module-name} --no-spec
mkdir -p src/modules/{module-name}/{dto,interfaces,mcp,test}
```

### Controller Pattern (MANDATORY Template)

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

  @Get('paginated')
  @ApiOperation({ summary: 'Get paginated {entities}' })
  async findAllPaginated(@Query() query: Query{Entity}PaginatedDto): Promise<{Entity}PaginatedResponseDto> {
    this.logger.trace('findAllPaginated()', { query });
    
    // Convert DTO to interface for service
    const result = await this.{moduleName}Service.findAllPaginated(query);
    
    // Return paginated response with required structure
    return {
      data: result.data.map(entity => ({ ...entity })),
      meta: result.meta,
    };
  }
}
```

### Pagination Rules for AI Assistants

**CRITICAL:** Do NOT implement pagination by default. Only add when explicitly requested.

**Default Behavior:**

- Standard `findAll()` methods return all matching records
- No automatic pagination or limits applied
- Simple, straightforward data retrieval

**Pagination Implementation (when explicitly requested):**

- Create separate paginated endpoints (e.g., `GET /entities/paginated`)
- Use `limit` and `offset` parameters for pagination control
- Response format MUST follow this structure:

```typescript
{
  "data": [...],           // Array of actual data
  "meta": {
    "total": 53127,        // Total number of records
    "limit": 20,           // Records per page
    "offset": 0,           // Starting position
    "hasNext": true,       // Whether more records exist
    "hasPrevious": false   // Whether previous records exist
  }
}
```

**Pagination Parameters:**

- `limit`: Number of records to return (default: 20, max: 100)
- `offset`: Number of records to skip (default: 0)

**Example Usage:**

- `GET /users` → Returns all users (no pagination)
- `GET /users/paginated?limit=20&offset=0` → Returns first 20 users with pagination metadata

### Service Pattern (MANDATORY Template)

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
      // ✅ ALWAYS use SqlQueryBuilder for standard queries
      const { query: sql, params } = SqlQueryBuilder
        .create()
        .select(['id', 'name', 'email', 'status'])
        .from('{table_name}')
        .where('status = $1', ['active'])
        .orderBy('created_at', 'DESC')
        .build();

      const results = await this.databaseService.queryMany<{Entity}Data>(sql, params);
      
      return results;
    } catch (error) {
      this.logger.error('failed to retrieve {entities}', { 
        err: error, 
        correlationId: ContextUtil.getCorrelationId()
      });
      throw error;
    }
  }

  async findAllPaginated(query: {Entity}PaginatedQuery): Promise<{Entity}PaginatedResponse> {
    this.logger.trace('findAllPaginated()', { query });

    try {
      // Count total records first
      const { query: countSql, params: countParams } = SqlQueryBuilder
        .create()
        .select(['COUNT(*) as total'])
        .from('{table_name}')
        .where('status = $1', ['active'])
        .build();

      const [{ total }] = await this.databaseService.queryMany<{ total: number }>(countSql, countParams);

      // Get paginated data
      const { query: sql, params } = SqlQueryBuilder
        .create()
        .select(['id', 'name', 'email', 'status'])
        .from('{table_name}')
        .where('status = $1', ['active'])
        .orderBy('created_at', 'DESC')
        .limit(query.limit)
        .offset(query.offset)
        .build();

      const data = await this.databaseService.queryMany<{Entity}Data>(sql, params);
      
      return {
        data,
        meta: {
          total,
          limit: query.limit,
          offset: query.offset,
          hasNext: query.offset + query.limit < total,
          hasPrevious: query.offset > 0,
        },
      };
    } catch (error) {
      this.logger.error('failed to retrieve paginated {entities}', { 
        err: error, 
        correlationId: ContextUtil.getCorrelationId()
      });
      throw error;
    }
  }
}
```

### DTOs vs Interfaces (MANDATORY Separation)

```typescript
// DTOs (Controllers only) - Zod validation
const Create{Entity}Schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
});
export class Create{Entity}Dto extends createZodDto(Create{Entity}Schema) {}

// Query DTOs for pagination (when explicitly requested)
const Query{Entity}PaginatedSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  status: z.enum(['active', 'inactive']).optional(),
});
export class Query{Entity}PaginatedDto extends createZodDto(Query{Entity}PaginatedSchema) {}

// Response DTOs for paginated data
export interface {Entity}PaginatedResponseDto {
  data: {Entity}ResponseDto[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// Interfaces (Services only) - No validation
export interface {Entity}Data {
  id: string;
  name: string;
  email?: string;
  createdAt: Date;
}

export interface {Entity}PaginatedQuery {
  limit: number;
  offset: number;
  status?: 'active' | 'inactive';
}

export interface {Entity}PaginatedResponse {
  data: {Entity}Data[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}
```

## Database Query Rules

### SqlQueryBuilder (MANDATORY for Simple Queries)

```typescript
// ✅ ALWAYS use SqlQueryBuilder for standard operations
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

**AI Assistant: Only use raw SQL for:**

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

**❌ FORBIDDEN:** Simple queries with raw SQL (use SqlQueryBuilder instead)

## Logging Rules (MANDATORY)

**CRITICAL:** Always use `ContextLoggerService`, never `console.log`

### Logger Setup Pattern

```typescript
constructor(loggerService: ContextLoggerService) {
  this.logger = loggerService.child({ serviceContext: ExampleService.name });
}
```

### Logging Levels (AI Assistant Guidelines)

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

## Code Quality & Standards (ENFORCED)

### ESLint Rules (AI Assistant Must Follow)

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

### Security Rules (FORBIDDEN)

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

### MCP Implementation Rules for AI Assistants

#### Default: HTTP Transport

- MCP tools MUST be implemented for HTTP transport (unless SSE explicitly requested)
- HTTP provides complete functionality, production-ready error handling
- One tool per endpoint/intention with clear naming

#### MCP File Naming Convention (MANDATORY)

- **Pattern**: `{api_name}-mcp-{transport}.tool.ts`
- **Examples**:
  - `users-mcp-http.tool.ts` (HTTP transport)
  - `weather-mcp-sse.tool.ts` (SSE transport)
  - `notifications-mcp-http.tool.ts` (HTTP transport)
- **Test Files**: `{api_name}-mcp-{transport}.tool.spec.ts`
- **Index Export**: Update `mcp/index.ts` to export from the correctly named file

#### Tool Naming Pattern (MANDATORY)

`{action}_{module}_{entity}` (snake_case)

```typescript
// Examples:
'get_users_list'      // GET /users
'create_user'         // POST /users
'get_user_by_id'      // GET /users/:id
'update_user'         // PUT /users/:id
'delete_user'         // DELETE /users/:id
```

### MCP Tool Implementation Template

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

### MCP Integration Checklist (AI Assistant Must Complete)

- [ ] Add service to `TransportDependencies` interface
- [ ] Update `createTransportDependencies` function
- [ ] Inject service in `McpServerService` constructor
- [ ] Add tool handlers to `setupToolHandlers` switch
- [ ] Implement handler methods that delegate to services
- [ ] Add tool descriptions to `ListToolsRequestSchema`
- [ ] Create MCP E2E tests for all tools

**❌ FORBIDDEN:** Implementing business logic directly in MCP tools (must delegate to services)

## MCP Tool Definition Best Practices

**CRITICAL:** Tool definitions should be comprehensive and provide detailed guidance for AI agents.

### Rich Tool Definitions Template

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

### Tool Definition Requirements (AI Assistant Must Include)

- **Comprehensive Description**: Multi-line description with bullet points explaining functionality
- **Transport Specification**: Clearly indicate which transport (HTTP/STDIO/SSE) the tool uses
- **Usage Guidance**: When to use, response format, field interpretations
- **Practical Examples**: Real-world scenarios and expected outcomes
- **Input Schema**: Detailed parameter definitions with validation rules

## AI Assistant Module Creation Checklist

### Prerequisites (MANDATORY)

- [ ] **BOOTSTRAP REQUIRED:** Project created using bootstrap process (see top of document)
- [ ] Base API repository cloned and bootstrap steering followed

### Module Structure Creation

- [ ] Use NestJS CLI: `nest generate module/controller/service`
- [ ] Create `dto/`, `interfaces/`, `mcp/`, `test/` directories
- [ ] Follow kebab-case naming for files

### Implementation Requirements

- [ ] **Controller**: DTOs only, `@ApiBearerAuth()` for docs, NO auth guards
- [ ] **Service**: Interfaces only, child logger setup, `ContextUtil` usage
- [ ] **Module**: Import infrastructure modules (DatabaseModule, etc.)

### Infrastructure Extensions (Only If Needed)

- [ ] **JUSTIFY EXTENSION**: Document why existing infrastructure is insufficient
- [ ] **NEW SERVICE CREATION**: Create in `src/infrastructure/{service-name}/`
- [ ] **FOLLOW PATTERNS**: Use ContextLoggerService, proper error handling, Zod config
- [ ] **MODULE INTEGRATION**: Create NestJS module, import in AppModule
- [ ] **TESTING**: Add unit and integration tests

### MCP Integration (MANDATORY)

- [ ] **HTTP TRANSPORT**: MCP tools MUST be implemented for HTTP (default)
- [ ] **ONE TOOL PER ENDPOINT**: Each API endpoint needs corresponding MCP tool
- [ ] **TOOL NAMING**: Follow `{action}_{module}_{entity}` pattern (snake_case)
- [ ] **SERVICE DELEGATION**: MCP tools MUST delegate to existing service methods
- [ ] **DEPENDENCY INJECTION**: Add service to `TransportDependencies` interface
- [ ] **HANDLER REGISTRATION**: Register tools in `McpServerService` switch statement
- [ ] **COMPREHENSIVE TESTING**: Add MCP E2E tests for all tools

### Code Quality Requirements

- [ ] ESLint rules enforced (no `console.log`, use `??` not `||`, explicit return types)
- [ ] Use SqlQueryBuilder for simple queries, raw SQL only for complex scenarios
- [ ] Infrastructure logs in providers only, business logs in services only
- [ ] Unit tests >80% coverage, E2E tests for all endpoints
- [ ] JSDoc on public methods with `@param`, `@returns`, `@throws`

### Final Verification

- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] All MCP tools working and tested
- [ ] Documentation updated