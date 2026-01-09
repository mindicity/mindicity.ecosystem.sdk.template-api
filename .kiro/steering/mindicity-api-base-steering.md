---
inclusion: always
---

# Mindicity API Development Guide

## 🚨 MANDATORY: Bootstrap Process Required for ALL New APIs

**CRITICAL REQUIREMENT**: Every new Mindicity API project MUST start by bootstrapping from the official template repository. This is not optional.

### Quick Start for New APIs

**STEP 1**: Clone the official template repository:
```bash
git clone -b master https://github.com/mindicity/mindicity.ecosystem.sdk.template-api.git temp-template
mv temp-template/* . && mv temp-template/.* . 2>/dev/null || true
rm -rf temp-template .git
```

**STEP 2**: Follow the complete bootstrap process from `mindicity-api-bootstrap-steering.md`

**STEP 3**: Implement your business modules in `src/modules/`

### Why Bootstrap is Mandatory

- **Production-Ready Foundation**: Template includes pre-configured infrastructure (database, logging, MCP, testing)
- **Consistent Architecture**: All APIs follow the same proven patterns and structure  
- **Security & Best Practices**: Built-in security configurations and development standards
- **Future Updates**: Template updates can be applied without breaking your API modules
- **Team Efficiency**: Developers know exactly where to find components across all APIs

### What's Included in the Template

✅ **Pre-configured Infrastructure**: Database connections, logging, MCP integration, testing setup
✅ **Security Patterns**: Authentication handling, input validation, error management
✅ **Development Tools**: ESLint, Prettier, Jest, Docker configurations
✅ **Documentation**: API docs, architecture guides, development workflows
✅ **CI/CD Ready**: GitLab CI, Docker builds, deployment scripts

---

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
5. **ALWAYS** add TRACE logging at the start of every method with method name and parameters
6. **ALWAYS** use `SqlQueryBuilder` for simple queries
7. **NEVER** add authentication guards (gateway handles auth)
8. **ALWAYS** add `@ApiResponse` decorations to all controller endpoints

### CRITICAL: Swagger Documentation Requirements (AI Assistant Must Enforce)

**EVERY CONTROLLER ENDPOINT MUST HAVE COMPLETE SWAGGER DOCUMENTATION**:

```typescript
// ✅ MANDATORY: Every endpoint must have these decorations
@Get('endpoint')
@ApiOperation({ summary: 'Clear description of what this endpoint does' })
@ApiResponse({
  status: 200,
  description: 'Description of successful response',
  type: ResponseDto, // or [ResponseDto] for arrays
})
async methodName(@Query() query: QueryDto): Promise<ResponseDto[]> {
  // Implementation...
}

// ✅ CORRECT: For array responses
@ApiResponse({
  status: 200,
  description: 'List of entities',
  type: [EntityResponseDto],
})

// ✅ CORRECT: For single object responses
@ApiResponse({
  status: 200,
  description: 'Entity details',
  type: EntityResponseDto,
})

// ✅ CORRECT: For paginated responses
@ApiResponse({
  status: 200,
  description: 'Paginated list of entities',
  type: EntityPaginatedResponseDto,
})
```

**AI Assistant Rules**:
- **NEVER generate controller methods** without `@ApiResponse` decoration
- **ALWAYS include proper response type** (single object, array, or paginated)
- **ALWAYS import `ApiResponse`** from `@nestjs/swagger`
- **VERIFY every endpoint** has complete Swagger documentation before completing tasks

### CRITICAL: Mandatory Method Logging (AI Assistant Must Enforce)

**EVERY METHOD MUST START WITH TRACE LOGGING**:
```typescript
// ✅ MANDATORY: Every method must have this pattern
methodName(param1: Type1, param2: Type2): ReturnType {
  this.logger.trace('methodName()', { param1, param2 });
  // Method implementation...
}

// ✅ MANDATORY: Methods without parameters
getStatus(): Status {
  this.logger.trace('getStatus()');
  // Method implementation...
}

// ✅ CORRECT: Static methods don't need trace logging
static getDefinitions(): Definition[] {
  // Static utility methods don't need logging
  // Method implementation...
}
```

**AI Assistant Rules**:
- **NEVER generate methods** without trace logging at the start
- **ALWAYS include ALL parameters** in the trace log object
- **USE EXACT method name** in the trace log string
- **VERIFY every method** has trace logging before completing tasks

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
  @ApiResponse({
    status: 200,
    description: 'List of {entities}',
    type: [{Entity}ResponseDto],
  })
  async findAll(@Query() query: Query{Entity}Dto): Promise<{Entity}ResponseDto[]> {
    this.logger.trace('findAll()', { query });
    
    // Convert DTO to interface for service
    const entities = await this.{moduleName}Service.findAll(query);
    
    // Convert back to DTO for response
    return entities.map(entity => ({ ...entity }));
  }

  @Get('paginated')
  @ApiOperation({ summary: 'Get paginated {entities}' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of {entities}',
    type: {Entity}PaginatedResponseDto,
  })
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
      
      // ✅ CORRECT: Log business context only
      this.logger.debug('retrieved {entities} for business operation', {
        requestedBy: ContextUtil.getUserId(),
        correlationId: ContextUtil.getCorrelationId(),
        filterCriteria: query.status
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
      
      // ✅ CORRECT: Log business pagination context, NOT query results
      this.logger.debug('paginated {entities} retrieved', {
        requestedBy: ContextUtil.getUserId(),
        correlationId: ContextUtil.getCorrelationId(),
        pagination: { limit: query.limit, offset: query.offset, total }
      });
      
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

**CRITICAL Service Logging Rules**:

**✅ DO Log in Services**:
- Method entry/exit with business parameters (trace level)
- Business logic decisions and context (debug level)
- User actions and business events (info level)
- Business errors and validation failures (error level)
- Correlation IDs and user context for traceability

**❌ DON'T Log in Services**:
- Database query results (DatabaseService logs everything)
- SQL execution details (DatabaseService handles this)
- Row counts or query performance (DatabaseService provides this)
- Raw database responses (already logged centrally)
- Infrastructure operation details (handled by respective services)

### DTOs vs Interfaces (MANDATORY Separation)

```typescript
// DTOs (Controllers only) - Zod validation
const Create{Entity}Schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
});
export class Create{Entity}Dto extends createZodDto(Create{Entity}Schema) {}

// Query DTOs for pagination (when explicitly requested)
// CRITICAL: Use z.coerce.number() for numeric querystring parameters
const Query{Entity}PaginatedSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
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

### CRITICAL: ValidationPipe Configuration for nestjs-zod

**MANDATORY**: When using nestjs-zod DTOs, you MUST use `ZodValidationPipe` instead of the standard NestJS `ValidationPipe`.

**❌ WRONG: Standard ValidationPipe (causes validation errors)**:
```typescript
// This will cause "property should not exist" errors with Zod DTOs
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
);
```

**✅ CORRECT: ZodValidationPipe for nestjs-zod compatibility**:
```typescript
import { ZodValidationPipe } from 'nestjs-zod';

// Use ZodValidationPipe for proper Zod schema validation
app.useGlobalPipes(new ZodValidationPipe());
```

**AI Assistant Rules**:
- **NEVER use standard ValidationPipe** with nestjs-zod DTOs
- **ALWAYS import and use ZodValidationPipe** from 'nestjs-zod'
- **VERIFY ValidationPipe configuration** when debugging validation errors
- **COMMON ERROR**: "property should not exist" indicates wrong ValidationPipe usage

### CRITICAL: Zod Validation Rules for Query Parameters

**MANDATORY**: When validating numeric parameters in querystring, you MUST use `z.coerce.number()` to handle string-to-number conversion.

**Why Coerce is Required**:
- HTTP querystring parameters are always strings (`?limit=20` → `"20"`)
- `z.number()` will fail validation on string inputs
- `z.coerce.number()` automatically converts valid numeric strings to numbers

**✅ CORRECT: Querystring numeric parameters**:
```typescript
// Query DTOs - Use coerce for numeric querystring parameters
const QueryEntitySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),    // ✅ Converts "20" → 20
  offset: z.coerce.number().int().min(0).default(0),             // ✅ Converts "0" → 0
  minPrice: z.coerce.number().positive().optional(),             // ✅ Converts "99.99" → 99.99
  maxAge: z.coerce.number().int().max(120).optional(),           // ✅ Converts "25" → 25
  status: z.enum(['active', 'inactive']).optional(),             // ✅ Strings don't need coerce
});
```

**❌ WRONG: Using z.number() for querystring parameters**:
```typescript
// This will FAIL validation - querystring params are strings!
const QueryEntitySchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),    // ❌ Fails: "20" is not number
  offset: z.number().int().min(0).default(0),             // ❌ Fails: "0" is not number
});
```

**✅ CORRECT: Request body numeric parameters (no coerce needed)**:
```typescript
// Request body DTOs - Numbers come as actual numbers from JSON
const CreateEntitySchema = z.object({
  price: z.number().positive(),           // ✅ JSON: {"price": 99.99}
  quantity: z.number().int().min(1),      // ✅ JSON: {"quantity": 5}
  name: z.string().min(1),                // ✅ JSON: {"name": "Product"}
});
```

**AI Assistant Rules**:
- **ALWAYS use `z.coerce.number()`** for numeric querystring parameters
- **NEVER use `z.coerce.number()`** for request body parameters (JSON already typed)
- **VERIFY parameter source**: Query params = coerce, Body params = no coerce
- **COMMON ERROR**: Validation failures on numeric query params indicate missing coerce

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

- **trace**: Method entry/exit with parameters (business parameters only, not query results)
- **debug**: Business logic steps with context (user actions, business decisions)
- **error**: Exceptions with correlation ID

**What NOT to Log in Services**:
- ❌ Database query results (already logged by DatabaseService)
- ❌ SQL execution details (already logged by DatabaseService)  
- ❌ Row counts or query performance (already logged by DatabaseService)
- ❌ Raw database responses (already logged by DatabaseService)
- ❌ Infrastructure operation details (handled by respective services)

**What TO Log in Services**:
- ✅ Business method entry/exit with business parameters
- ✅ Business logic decisions and context
- ✅ User actions and business events
- ✅ Business errors and validation failures

### MANDATORY Method Logging Rule

**CRITICAL REQUIREMENT**: Every method in every file MUST start with a TRACE log containing:
- Method name
- All input parameters

**Pattern (MANDATORY)**:
```typescript
methodName(param1: Type1, param2: Type2): ReturnType {
  this.logger.trace('methodName()', { param1, param2 });
  
  // Method implementation...
}
```

**Examples**:
```typescript
// ✅ CORRECT: All methods must have trace logging
async findUsers(query: UserQuery): Promise<UserData[]> {
  this.logger.trace('findUsers()', { query });
  // Implementation...
}

async createUser(userData: CreateUserData): Promise<UserData> {
  this.logger.trace('createUser()', { userData });
  // Implementation...
}

getHealthStatus(): HealthStatus {
  this.logger.trace('getHealthStatus()');
  // Implementation...
}

// ✅ CORRECT: Static methods don't need trace logging
static getToolDefinitions(): ToolDefinition[] {
  // Static utility methods don't need logging
  // Implementation...
}

// ❌ WRONG: Missing trace log
async findUsers(query: UserQuery): Promise<UserData[]> {
  // Missing: this.logger.trace('findUsers()', { query });
  const results = await this.databaseService.queryMany(sql, params);
  return results;
}
```

**Rules**:
- **EVERY method** must start with trace logging (except static utility methods)
- **Include ALL parameters** in the trace log object
- **Use method name exactly** as it appears in the function signature
- **Static methods**: Don't need trace logging as they are utility methods
- **Private methods**: Follow same rule as public methods
- **Constructors**: Log with `constructor()` and include all parameters

### Infrastructure vs Business Logging

**Infrastructure providers** (Database, MQTT, WebSocket) handle their own logging centrally.
**Business services** log only business context, NOT infrastructure performance.

**CRITICAL RULE**: Never log database query results in services - DatabaseService already logs all query operations, parameters, execution time, and row counts.

```typescript
// ✅ CORRECT: Business service logging
async findUsers(query: UserQuery): Promise<UserData[]> {
  this.logger.trace('findUsers()', { query });
  
  // NO logging of SQL or results - DatabaseService handles this completely
  const results = await this.databaseService.queryMany(sql, params);
  
  // Log business context only, NOT query results
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
  this.logger.debug('query results', { results }); // ❌ NEVER log query results - already logged by DatabaseService
}
```

**Why This Rule Exists**:

- **Performance**: Prevents duplicate logging of potentially large result sets
- **Consistency**: All database operations logged in one place with consistent format
- **Debugging**: DatabaseService provides comprehensive query logging with timing and parameters
- **Security**: Avoids accidental logging of sensitive data in business services

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

### CRITICAL: Object Injection Security Rules (AI Assistant Must Follow)

**MANDATORY**: All dynamic property access must be properly typed to prevent Generic Object Injection Sink vulnerabilities.

**❌ FORBIDDEN: Unsafe bracket notation access**:
```typescript
// These patterns trigger security/detect-object-injection warnings
const value = obj[userInput];                    // ❌ Unsafe
const header = req.headers[headerName];          // ❌ Unsafe
const config = settings[configKey];              // ❌ Unsafe
const label = labels[index];                     // ❌ Unsafe
```

**✅ REQUIRED: Safe property access patterns**:
```typescript
// Method 1: Type-safe property access with proper validation
const headerValue = req.headers['x-correlation-id'];
const safeValue = typeof headerValue === 'string' ? headerValue : undefined;

// Method 2: Use const assertions for array access
const labels = ['Label 1', 'Label 2', 'Label 3'] as const;
const label = labels[index] ?? 'Default Label';

// Method 3: Use toLowerCase() assignment to avoid repeated bracket access
const lowerKey = key.toLowerCase();
if (lowerKey === 'authorization') {
  // Safe to use lowerKey
}

// Method 4: Use Object.hasOwnProperty or 'in' operator for validation
if (Object.prototype.hasOwnProperty.call(obj, key)) {
  const value = obj[key as keyof typeof obj];
}

// Method 5: Use Record types with proper key validation
interface SafeConfig {
  [key: string]: string | undefined;
}
const config: SafeConfig = settings;
const value = config[key]; // Safe with proper typing
```

**AI Assistant Rules**:
- **NEVER use bracket notation** without proper type validation
- **ALWAYS validate property existence** before dynamic access
- **USE const assertions** for array access with indices
- **ASSIGN toLowerCase() results** to variables instead of repeated bracket access
- **VERIFY all dynamic property access** is properly typed and validated

**Common Fixes for Object Injection Issues**:
```typescript
// ❌ WRONG: Direct bracket access
const userAgent = request.headers['user-agent'];

// ✅ CORRECT: Type-safe access
const userAgent = typeof request.headers['user-agent'] === 'string' 
  ? request.headers['user-agent'] 
  : undefined;

// ❌ WRONG: Dynamic array access
const label = labels[index];

// ✅ CORRECT: Safe array access with switch statement
let label: string;
switch (index) {
  case 0:
    label = 'First Label';
    break;
  case 1:
    label = 'Second Label';
    break;
  default:
    label = 'Default Label';
    break;
}

// ❌ WRONG: Dynamic object property assignment
sanitized[key] = value;

// ✅ CORRECT: Use Object.assign for dynamic property assignment
Object.assign(sanitized, { [key]: value });

// ❌ WRONG: Repeated bracket access in conditions
if (key.toLowerCase() === 'auth') {
  sanitized[key] = '[REDACTED]';
}

// ✅ CORRECT: Assign to variable first
const lowerKey = key.toLowerCase();
if (lowerKey === 'auth') {
  Object.assign(sanitized, { [key]: '[REDACTED]' });
}

// ❌ WRONG: forEach with dynamic property access
Object.entries(headers).forEach(([key, value]) => {
  sanitized[key] = processValue(value);
});

// ✅ CORRECT: for...of loop with Object.assign
for (const [key, value] of Object.entries(headers)) {
  Object.assign(sanitized, { [key]: processValue(value) });
}
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
  private readonly logger: ContextLoggerService;

  constructor(
    private readonly {moduleName}Service: {ModuleName}Service,
    loggerService: ContextLoggerService,
  ) {
    this.logger = loggerService.child({ serviceContext: '{ModuleName}McpHttpTool' });
  }

  // Tool method implementation - MANDATORY: Start with trace logging
  async {toolMethod}(args: Record<string, unknown>): Promise<CallToolResult> {
    this.logger.trace('{toolMethod}()', { args });
    
    try {
      // CRITICAL: Always validate input parameters first
      if (args.requiredParam && typeof args.requiredParam !== 'string') {
        throw new Error('requiredParam is required and must be a string');
      }

      // Build query/parameters from validated arguments
      const query = {};
      if (args.param1 && typeof args.param1 === 'string') {
        query.param1 = args.param1;
      }

      // CRITICAL: Always await service calls for async operations
      const data = await this.{moduleName}Service.{serviceMethod}(query);
      
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      // CRITICAL: Always handle errors gracefully with structured responses
      this.logger.error('Error in {toolMethod}', { err: error, args });
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Failed to execute {toolMethod}',
              message: error instanceof Error ? error.message : 'Unknown error',
            }, null, 2),
          },
        ],
      };
    }
  }

  // Comprehensive tool definitions with detailed descriptions
  static getToolDefinitions(): Array<{
    name: string;
    description: string;
    inputSchema: {
      type: string;
      properties: Record<string, unknown>;
      required: string[];
    };
    usage?: {
      purpose: string;
      when_to_use: string[];
      response_format: string;
      interpretation: Record<string, string>;
      examples: Array<{ scenario: string; expected_result: string }>;
    };
  }> {
    // CRITICAL: Static methods don't need trace logging
    
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
          properties: {
            param1: {
              type: 'string',
              description: 'Description of parameter 1',
            },
            param2: {
              type: 'string',
              description: 'Description of parameter 2',
            },
          },
          required: [], // or ['param1'] if required
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

### CRITICAL: Common MCP Implementation Errors & Solutions

**AI Assistant MUST avoid these common errors that cause runtime failures:**

#### Error 1: Missing Async/Await in Tool Methods
```typescript
// ❌ WRONG: Missing async/await causes Promise<CallToolResult> instead of CallToolResult
searchBuildings(args: Record<string, unknown>): CallToolResult {
  const buildings = this.buildingsService.findAll(query); // Returns Promise!
  return { content: [{ type: 'text', text: JSON.stringify(buildings, null, 2) }] };
}

// ✅ CORRECT: Proper async/await handling
async searchBuildings(args: Record<string, unknown>): Promise<CallToolResult> {
  const buildings = await this.buildingsService.findAll(query);
  return { content: [{ type: 'text', text: JSON.stringify(buildings, null, 2) }] };
}
```

#### Error 2: Missing Error Handling in Tool Methods
```typescript
// ❌ WRONG: No error handling causes unhandled promise rejections
async searchBuildings(args: Record<string, unknown>): Promise<CallToolResult> {
  const buildings = await this.buildingsService.findAll(query); // Can throw!
  return { content: [{ type: 'text', text: JSON.stringify(buildings, null, 2) }] };
}

// ✅ CORRECT: Comprehensive error handling
async searchBuildings(args: Record<string, unknown>): Promise<CallToolResult> {
  try {
    const buildings = await this.buildingsService.findAll(query);
    return { content: [{ type: 'text', text: JSON.stringify(buildings, null, 2) }] };
  } catch (error) {
    this.logger.error('Error in searchBuildings', { err: error, args });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'Failed to search buildings',
          message: error instanceof Error ? error.message : 'Unknown error',
        }, null, 2),
      }],
    };
  }
}
```

#### Error 3: Missing Input Validation
```typescript
// ❌ WRONG: No input validation causes runtime errors
async searchBuildingsSpatial(args: Record<string, unknown>): Promise<CallToolResult> {
  const query = { polygon: args.polygon }; // args.polygon might be undefined or wrong type!
  const buildings = await this.buildingsService.findAll(query);
  return { content: [{ type: 'text', text: JSON.stringify(buildings, null, 2) }] };
}

// ✅ CORRECT: Proper input validation
async searchBuildingsSpatial(args: Record<string, unknown>): Promise<CallToolResult> {
  try {
    // Validate required parameters
    if (!args.polygon || typeof args.polygon !== 'string') {
      throw new Error('polygon parameter is required and must be a valid WKT POLYGON string');
    }

    const query = { polygon: args.polygon };
    const buildings = await this.buildingsService.findAll(query);
    return { content: [{ type: 'text', text: JSON.stringify(buildings, null, 2) }] };
  } catch (error) {
    // Error handling...
  }
}
```

#### Error 4: Incorrect Tool Registration in McpServerService
```typescript
// ❌ WRONG: Missing await in async tool calls
private async handleDynamicToolCall(toolName: string, args: unknown): Promise<CallToolResult> {
  if (toolName === 'search_buildings_basic') {
    return this.buildingsMcpHttpTool.searchBuildingsBasic(args as Record<string, unknown>); // Missing await!
  }
}

// ✅ CORRECT: Proper async handling
private async handleDynamicToolCall(toolName: string, args: unknown): Promise<CallToolResult> {
  if (toolName === 'search_buildings_basic') {
    return await this.buildingsMcpHttpTool.searchBuildingsBasic(args as Record<string, unknown>);
  }
}
```

#### Error 5: Incomplete Tool Schema Definitions
```typescript
// ❌ WRONG: Missing proper TypeScript typing for inputSchema
static getToolDefinitions(): Array<{
  name: string;
  description: string;
  inputSchema: object; // Too generic!
}> {
  return [{
    inputSchema: { /* incomplete schema */ }
  }];
}

// ✅ CORRECT: Proper TypeScript typing and complete schema
static getToolDefinitions(): Array<{
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
}> {
  return [{
    inputSchema: {
      type: 'object',
      properties: {
        param1: { type: 'string', description: 'Parameter description' },
      },
      required: ['param1'], // Specify required parameters
    },
  }];
}
```

#### Error 6: Missing Service Dependency Injection
```typescript
// ❌ WRONG: Service not added to TransportDependencies interface
interface TransportDependencies {
  healthService: HealthService;
  // Missing: buildingsService: BuildingsService;
}

// ❌ WRONG: Service not injected in McpServerService constructor
constructor(
  private readonly healthService: HealthService,
  // Missing: private readonly buildingsService: BuildingsService,
) {}

// ✅ CORRECT: Complete dependency injection setup
interface TransportDependencies {
  healthService: HealthService;
  buildingsService: BuildingsService; // Added
}

constructor(
  private readonly healthService: HealthService,
  private readonly buildingsService: BuildingsService, // Added
) {
  // Initialize MCP tools with proper dependencies
  this.buildingsMcpHttpTool = new BuildingsMcpHttpTool(this.buildingsService, loggerService);
}
```

**CRITICAL CHECKLIST for AI Assistants:**
- [ ] **ALWAYS use async/await** for service calls in MCP tool methods
- [ ] **ALWAYS add try/catch** error handling in every tool method
- [ ] **ALWAYS validate input parameters** before using them
- [ ] **ALWAYS await async tool calls** in McpServerService handlers
- [ ] **ALWAYS use proper TypeScript typing** for tool definitions
- [ ] **ALWAYS inject services** in TransportDependencies and McpServerService

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
- [ ] **TRACE LOGGING**: EVERY method MUST start with `this.logger.trace('methodName()', { params })`

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

### CRITICAL: MCP Testing Best Practices

**AI Assistant MUST implement comprehensive MCP tests to avoid runtime failures:**

#### Unit Tests for MCP Tools
```typescript
describe('BuildingsMcpHttpTool', () => {
  let tool: BuildingsMcpHttpTool;
  let buildingsService: jest.Mocked<BuildingsService>;

  beforeEach(async () => {
    const mockBuildingsService = { findAll: jest.fn() };
    const mockLogger = { child: jest.fn().mockReturnThis(), trace: jest.fn(), error: jest.fn() };
    
    // CRITICAL: Proper mocking setup
    buildingsService = mockBuildingsService as jest.Mocked<BuildingsService>;
    tool = new BuildingsMcpHttpTool(buildingsService, mockLogger as any);
  });

  it('should handle service errors gracefully', async () => {
    // CRITICAL: Test error scenarios
    const error = new Error('Database connection failed');
    buildingsService.findAll.mockRejectedValue(error);

    const result = await tool.searchBuildingsBasic({ cadastral_code: 'CAD001' });

    // CRITICAL: Verify error response structure
    expect((result.content[0] as any).text).toContain('Failed to search buildings');
    expect((result.content[0] as any).text).toContain('Database connection failed');
  });

  it('should validate input parameters', async () => {
    // CRITICAL: Test input validation
    const result = await tool.searchBuildingsSpatial({});
    expect((result.content[0] as any).text).toContain('polygon parameter is required');
  });
});
```

#### E2E Tests for MCP Integration
```typescript
describe('Buildings MCP Integration (e2e)', () => {
  let app: INestApplication;
  let databaseService: DatabaseService;

  beforeEach(async () => {
    // CRITICAL: Clean up test data before each test
    await databaseService.queryNone('DELETE FROM public.buildings WHERE cadastral_code LIKE $1', ['TEST_%']);
    
    // CRITICAL: Insert test data for consistent testing
    await databaseService.queryNone(`INSERT INTO public.buildings (...) VALUES (...)`);
  });

  afterEach(async () => {
    // CRITICAL: Clean up test data after each test
    await databaseService.queryNone('DELETE FROM public.buildings WHERE cadastral_code LIKE $1', ['TEST_%']);
  });

  it('should execute MCP tools via HTTP transport', async () => {
    const response = await request(app.getHttpServer())
      .post('/mcapi/mcp/tools/call')
      .send({
        name: 'search_buildings_basic',
        arguments: { cadastral_code: 'TEST_CAD001' }
      })
      .expect(200);

    // CRITICAL: Verify response structure and content
    expect(response.body.content).toBeDefined();
    expect(response.body.content[0].type).toBe('text');
    
    const buildings = JSON.parse(response.body.content[0].text);
    expect(buildings).toHaveLength(1);
    expect(buildings[0].cadastral_code).toBe('TEST_CAD001');
  });

  it('should handle invalid tool parameters', async () => {
    const response = await request(app.getHttpServer())
      .post('/mcapi/mcp/tools/call')
      .send({
        name: 'search_buildings_spatial',
        arguments: {} // Missing required polygon parameter
      })
      .expect(200);

    const result = JSON.parse(response.body.content[0].text);
    expect(result.error).toBe('Failed to search buildings spatially');
    expect(result.message).toContain('polygon parameter is required');
  });
});
```

**CRITICAL Testing Checklist:**
- [ ] **Unit tests** for all MCP tool methods with error scenarios
- [ ] **Input validation tests** for all tool parameters
- [ ] **Service error handling tests** with mocked failures
- [ ] **E2E tests** for complete MCP tool execution via HTTP
- [ ] **Database integration tests** with real data setup/cleanup
- [ ] **Error response format validation** for consistent error handling

### Code Quality Requirements

- [ ] ESLint rules enforced (no `console.log`, use `??` not `||`, explicit return types)
- [ ] **TRACE LOGGING**: Every method starts with trace log containing method name and parameters
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