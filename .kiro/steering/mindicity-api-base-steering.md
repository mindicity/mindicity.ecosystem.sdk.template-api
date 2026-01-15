---
inclusion: always
---

# Mindicity API Development Guide

## Architecture & Tech Stack

**Stack:** Node.js + NestJS + Fastify + Pino + Zod + MCP + TypeScript (strict mode)

**Core Principles:**
- **Module Isolation:** Business logic in `src/modules/`, infrastructure in `src/infrastructure/`
- **Gateway Authentication:** NO auth guards in endpoints - gateway handles security
- **Centralized Logging:** Use `ContextLoggerService` with correlation IDs
- **DTO/Interface Separation:** Controllers use DTOs (Zod), Services use interfaces
- **MCP Integration:** Every module exposes MCP tools for AI agents

## Bootstrap Process (New APIs Only)

**When creating a NEW API project**, bootstrap from the template repository:

```bash
git clone -b master https://github.com/mindicity/mindicity.ecosystem.sdk.template-api.git temp-template
mv temp-template/* . && mv temp-template/.* . 2>/dev/null || true
rm -rf temp-template .git
```

Then follow `mindicity-api-bootstrap-steering.md` for complete setup.

**For existing projects:** Skip bootstrap, follow implementation patterns below.

## Directory Structure

**Core Infrastructure (DO NOT MODIFY):**
```
src/
├── common/           # Shared utilities, interceptors, filters
├── config/           # Configuration schemas (Zod validation)
├── infrastructure/   # Database, MCP, external services
├── app.module.ts     # Main application module
└── main.ts          # Application bootstrap
```

**Business Modules (MODIFY HERE):**
```
src/modules/{module-name}/
├── {module}.module.ts       # NestJS module
├── {module}.controller.ts   # HTTP endpoints (DTOs only)
├── {module}.service.ts      # Business logic (interfaces only)
├── dto/                     # Request/Response DTOs (Zod)
├── interfaces/              # Internal interfaces
├── mcp/                     # MCP tools for AI agents
└── test/                    # E2E tests
```

## Module Creation Workflow

**Generate module structure:**
```bash
nest generate module modules/{module-name} --no-spec
nest generate controller modules/{module-name} --no-spec  
nest generate service modules/{module-name} --no-spec
mkdir -p src/modules/{module-name}/{dto,interfaces,mcp,test}
```

**File naming conventions:**
- Controllers: `{module-name}.controller.ts`
- Services: `{module-name}.service.ts`
- DTOs: `{entity-name}.dto.ts`
- Interfaces: `{entity-name}.interface.ts`
- MCP Tools: `{module-name}-mcp-http.tool.ts`
- Tests: `{file-name}.spec.ts` or `{file-name}.e2e-spec.ts`

## Mandatory Patterns

### 1. Trace Logging (EVERY Method)

**REQUIRED:** Every method must start with trace logging:

```typescript
// ✅ CORRECT
methodName(param1: Type1, param2: Type2): ReturnType {
  this.logger.trace('methodName()', { param1, param2 });
  // Implementation...
}

// ✅ CORRECT: No parameters
getStatus(): Status {
  this.logger.trace('getStatus()');
  // Implementation...
}

// ✅ CORRECT: Static methods skip trace logging
static getDefinitions(): Definition[] {
  // Implementation...
}
```

**Rules:**
- Include ALL parameters in trace log object
- Use exact method name in log string
- Static utility methods don't need trace logging
- Private methods follow same rule as public methods

### 2. Swagger Documentation (EVERY Endpoint)

**REQUIRED:** Every controller endpoint needs complete Swagger docs:

```typescript
import { ApiOperation, ApiResponse, ApiBody, ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('module-name')
@ApiBearerAuth() // Docs only - gateway handles auth
@Controller(ROUTES.MODULE_NAME)
export class ModuleController {
  @Get()
  @ApiOperation({ summary: 'Get all entities' })
  @ApiResponse({ status: 200, description: 'List of entities', type: [EntityResponseDto] })
  async findAll(@Query() query: QueryDto): Promise<EntityResponseDto[]> {
    this.logger.trace('findAll()', { query });
    // Implementation...
  }

  @Post()
  @ApiOperation({ summary: 'Create entity' })
  @ApiBody({ type: CreateEntityDto })
  @ApiResponse({ status: 201, description: 'Entity created', type: EntityResponseDto })
  async create(@Body() dto: CreateEntityDto): Promise<EntityResponseDto> {
    this.logger.trace('create()', { dto });
    // Implementation...
  }
}
```

**Rules:**
- `@ApiOperation` with clear summary
- `@ApiResponse` with status, description, and type
- `@ApiBody` for POST/PUT/PATCH endpoints
- Use `[EntityDto]` for arrays, `EntityDto` for single objects

## Implementation Templates

### Controller Template

```typescript
@ApiTags('module-name')
@ApiBearerAuth()
@Controller(ROUTES.MODULE_NAME)
export class ModuleController {
  constructor(
    private readonly moduleService: ModuleService,
    private readonly logger: ContextLoggerService,
  ) {
    this.logger.setContext(ModuleController.name);
  }

  @Get()
  @ApiOperation({ summary: 'Get all entities' })
  @ApiResponse({ status: 200, description: 'List of entities', type: [EntityResponseDto] })
  async findAll(@Query() query: QueryEntityDto): Promise<EntityResponseDto[]> {
    this.logger.trace('findAll()', { query });
    const entities = await this.moduleService.findAll(query);
    return entities.map(entity => ({ ...entity }));
  }
}
```

### Service Template

```typescript
@Injectable()
export class ModuleService {
  private readonly logger: ContextLoggerService;

  constructor(
    loggerService: ContextLoggerService,
    private readonly databaseService: DatabaseService,
  ) {
    this.logger = loggerService.child({ serviceContext: ModuleService.name });
  }

  async findAll(query: EntityQuery): Promise<EntityData[]> {
    this.logger.trace('findAll()', { query });

    try {
      const { query: sql, params } = SqlQueryBuilder
        .create()
        .select(['id', 'name', 'status'])
        .from('table_name')
        .where('status = $1', ['active'])
        .orderBy('created_at', 'DESC')
        .build();

      const results = await this.databaseService.queryMany<EntityData>(sql, params);
      
      this.logger.debug('retrieved entities', {
        requestedBy: ContextUtil.getUserId(),
        correlationId: ContextUtil.getCorrelationId(),
      });
      
      return results;
    } catch (error) {
      this.logger.error('failed to retrieve entities', { 
        err: error, 
        correlationId: ContextUtil.getCorrelationId()
      });
      throw error;
    }
  }
}
```

**Service Logging Rules:**
- ✅ Log: Method entry/exit, business decisions, user actions, errors
- ❌ Don't log: Query results, SQL details, row counts (DatabaseService handles this)

### Pagination (Only When Requested)

**Default:** Return all matching records without pagination.

**When explicitly requested**, create separate paginated endpoint with this response format:

```typescript
{
  "data": [...],
  "meta": {
    "total": 53127,
    "limit": 20,
    "offset": 0,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

### DTOs and Interfaces

**DTOs (Controllers)** - Zod validation:
```typescript
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const CreateEntitySchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
});
export class CreateEntityDto extends createZodDto(CreateEntitySchema) {}

// Query DTOs - Use z.coerce.number() for numeric querystring params
const QueryEntityPaginatedSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(['active', 'inactive']).optional(),
});
export class QueryEntityPaginatedDto extends createZodDto(QueryEntityPaginatedSchema) {}
```

**Interfaces (Services)** - No validation:
```typescript
export interface EntityData {
  id: string;
  name: string;
  email?: string;
  createdAt: Date;
}

export interface EntityPaginatedQuery {
  limit: number;
  offset: number;
  status?: 'active' | 'inactive';
}
```

## Validation & Security

### Zod Validation Configuration

**REQUIRED:** Use `ZodValidationPipe` from nestjs-zod:

```typescript
import { ZodValidationPipe } from 'nestjs-zod';

// In main.ts
app.useGlobalPipes(new ZodValidationPipe());
```

**❌ WRONG:** Standard ValidationPipe causes "property should not exist" errors with Zod DTOs.

### Zod Query Parameter Rules

**Querystring parameters are always strings** - use `z.coerce.number()` for numeric values:

```typescript
// ✅ CORRECT: Query DTOs
const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),    // "20" → 20
  offset: z.coerce.number().int().min(0).default(0),             // "0" → 0
  minPrice: z.coerce.number().positive().optional(),             // "99.99" → 99.99
  status: z.enum(['active', 'inactive']).optional(),             // Strings don't need coerce
});

// ✅ CORRECT: Request body DTOs (JSON already typed)
const CreateSchema = z.object({
  price: z.number().positive(),           // JSON: {"price": 99.99}
  quantity: z.number().int().min(1),      // JSON: {"quantity": 5}
});
```

**Rule:** Query params = `z.coerce.number()`, Body params = `z.number()`

### Object Injection Security

**FORBIDDEN:** Unsafe bracket notation without validation:

```typescript
// ❌ WRONG
const value = obj[userInput];
const header = req.headers[headerName];
text.replace(dynamicPattern, replacement);
```

**REQUIRED:** Safe property access patterns:

```typescript
// ✅ Method 1: Type-safe with validation
const headerValue = req.headers['x-correlation-id'];
const safeValue = typeof headerValue === 'string' ? headerValue : undefined;

// ✅ Method 2: Const assertions for arrays
const labels = ['Label 1', 'Label 2'] as const;
const label = labels[index] ?? 'Default';

// ✅ Method 3: Assign toLowerCase() to variable
const lowerKey = key.toLowerCase();
if (lowerKey === 'authorization') {
  // Safe to use lowerKey
}

// ✅ Method 4: Object.assign for dynamic properties
Object.assign(sanitized, { [key]: value });

// ✅ Method 5: split/join instead of replace() with dynamic patterns
const parts = text.split(searchStr);
const result = parts.join(replaceStr);
```

## Database Queries

### SqlQueryBuilder (Use for Simple Queries)

```typescript
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

### Raw SQL (Only for Complex Queries)

Use raw SQL only for:
- CTEs (Common Table Expressions)
- Window functions
- Advanced PostgreSQL features
- Complex recursive queries

```typescript
// ✅ Acceptable: Complex CTE
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

## Code Quality Standards

### ESLint Rules

- **TypeScript Strict Mode:** Explicit return types, no `any`
- **Nullish Coalescing:** Use `??` instead of `||` for defaults
- **Security:** No `console.log`, no `eval`, no hardcoded secrets
- **Complexity:** Max 80 lines/function, 5 parameters, 4 nesting levels
- **Import Order:** Node.js → External → Internal → Local

```typescript
// ✅ CORRECT
const pageSize = query.limit ?? 10;
this.logger.debug('message', { context });

// ❌ WRONG
const pageSize = query.limit || 10;  // Fails for 0, "", false
console.log('Debug');                // Use logger
```

### Code Comments

**REQUIRED:** Add inline comments to explain business logic, complex operations, and non-obvious code:

```typescript
// ✅ CORRECT: Comments explain WHY and WHAT
async processOrder(orderId: string): Promise<OrderResult> {
  this.logger.trace('processOrder()', { orderId });

  // Retrieve order with related items and customer data
  const order = await this.getOrderWithDetails(orderId);

  // Apply discount only for premium customers with orders > $100
  if (order.customer.isPremium && order.total > 100) {
    order.total = this.applyDiscount(order.total, 0.1);
  }

  // Lock inventory before payment to prevent overselling
  await this.inventoryService.reserveItems(order.items);

  try {
    // Process payment through external gateway
    const payment = await this.paymentService.charge(order.total);
    
    // Update order status and release inventory lock
    return await this.finalizeOrder(order, payment);
  } catch (error) {
    // Rollback inventory reservation on payment failure
    await this.inventoryService.releaseItems(order.items);
    throw error;
  }
}

// ❌ WRONG: No comments or obvious comments
async processOrder(orderId: string): Promise<OrderResult> {
  this.logger.trace('processOrder()', { orderId });
  const order = await this.getOrderWithDetails(orderId);
  // Get order  ← Useless comment
  if (order.customer.isPremium && order.total > 100) {
    order.total = this.applyDiscount(order.total, 0.1);
  }
  await this.inventoryService.reserveItems(order.items);
  const payment = await this.paymentService.charge(order.total);
  return await this.finalizeOrder(order, payment);
}
```

**Comment Guidelines:**
- Explain business rules and domain logic
- Document complex algorithms or calculations
- Clarify non-obvious type conversions or data transformations
- Note important side effects or state changes
- Explain error handling strategies
- Don't comment obvious code (`// Set variable to 5`)
- Don't duplicate what the code already says clearly

### JSDoc Documentation

**REQUIRED:** Public methods and complex functions need JSDoc:

```typescript
/**
 * Retrieves user by ID with correlation logging.
 * @param id - User identifier (UUID format)
 * @returns Promise resolving to user data or null
 * @throws {ValidationException} When ID format is invalid
 */
async findOne(id: string): Promise<UserData | null> {
  // Implementation
}
```

## MCP Integration (MANDATORY)

Every API module MUST implement MCP tools for AI agent connectivity.

### MCP Implementation Rules

**Default Transport:** HTTP (unless SSE explicitly requested)

**File Naming:**
- Pattern: `{module-name}-mcp-http.tool.ts`
- Test: `{module-name}-mcp-http.tool.spec.ts`
- Export from `mcp/index.ts`

**Tool Naming:** `{action}_{module}_{entity}` (snake_case)
- Examples: `get_users_list`, `create_user`, `get_user_by_id`

### MCP Tool Template

```typescript
export class ModuleMcpHttpTool {
  private readonly logger: ContextLoggerService;

  constructor(
    private readonly moduleService: ModuleService,
    loggerService: ContextLoggerService,
  ) {
    this.logger = loggerService.child({ serviceContext: 'ModuleMcpHttpTool' });
  }

  async toolMethod(args: Record<string, unknown>): Promise<CallToolResult> {
    this.logger.trace('toolMethod()', { args });
    
    try {
      // Validate input parameters
      if (!args.requiredParam || typeof args.requiredParam !== 'string') {
        throw new Error('requiredParam is required and must be a string');
      }

      // Call service method
      const data = await this.moduleService.serviceMethod(args.requiredParam);
      
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      this.logger.error('Error in toolMethod', { err: error, args });
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'Failed to execute toolMethod',
            message: error instanceof Error ? error.message : 'Unknown error',
          }, null, 2),
        }],
      };
    }
  }

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
      name: 'tool_name',
      description: `Comprehensive description of what this tool does.

- Primary functionality and purpose
- Data returned and format
- When and why to use this tool`,
      inputSchema: {
        type: 'object',
        properties: {
          param1: { type: 'string', description: 'Parameter description' },
        },
        required: ['param1'],
      },
    }];
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

### Common MCP Errors to Avoid

**Error 1: Missing async/await**
```typescript
// ❌ WRONG
searchEntities(args: Record<string, unknown>): CallToolResult {
  const data = this.service.findAll(query); // Returns Promise!
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

// ✅ CORRECT
async searchEntities(args: Record<string, unknown>): Promise<CallToolResult> {
  const data = await this.service.findAll(query);
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}
```

**Error 2: Missing error handling**
```typescript
// ❌ WRONG: No try/catch
async searchEntities(args: Record<string, unknown>): Promise<CallToolResult> {
  const data = await this.service.findAll(query); // Can throw!
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

// ✅ CORRECT: Comprehensive error handling
async searchEntities(args: Record<string, unknown>): Promise<CallToolResult> {
  try {
    const data = await this.service.findAll(query);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  } catch (error) {
    this.logger.error('Error in searchEntities', { err: error, args });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'Failed to search entities',
          message: error instanceof Error ? error.message : 'Unknown error',
        }, null, 2),
      }],
    };
  }
}
```

**Error 3: Missing input validation**
```typescript
// ❌ WRONG: No validation
async searchEntities(args: Record<string, unknown>): Promise<CallToolResult> {
  const query = { id: args.id }; // args.id might be undefined or wrong type!
  const data = await this.service.findAll(query);
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

// ✅ CORRECT: Proper validation
async searchEntities(args: Record<string, unknown>): Promise<CallToolResult> {
  try {
    if (!args.id || typeof args.id !== 'string') {
      throw new Error('id parameter is required and must be a string');
    }
    const query = { id: args.id };
    const data = await this.service.findAll(query);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  } catch (error) {
    // Error handling...
  }
}
```

**Error 4: Missing service dependency injection**
```typescript
// ❌ WRONG: Service not added to TransportDependencies
interface TransportDependencies {
  healthService: HealthService;
  // Missing: moduleService: ModuleService;
}

// ✅ CORRECT: Complete dependency injection
interface TransportDependencies {
  healthService: HealthService;
  moduleService: ModuleService; // Added
}

constructor(
  private readonly healthService: HealthService,
  private readonly moduleService: ModuleService, // Added
) {
  this.moduleMcpHttpTool = new ModuleMcpHttpTool(this.moduleService, loggerService);
}
```

## Module Creation Checklist

### Prerequisites
- [ ] For new APIs: Bootstrap from template repository
- [ ] For existing APIs: Follow patterns below

### Module Structure
- [ ] Use NestJS CLI generators
- [ ] Create `dto/`, `interfaces/`, `mcp/`, `test/` directories
- [ ] Follow kebab-case naming conventions

### Implementation
- [ ] Controller: DTOs only, `@ApiBearerAuth()` for docs, NO auth guards
- [ ] Service: Interfaces only, child logger setup, `ContextUtil` usage
- [ ] Module: Import infrastructure modules (DatabaseModule, etc.)
- [ ] TRACE LOGGING: Every method starts with `this.logger.trace('methodName()', { params })`
- [ ] SWAGGER DOCS: Every endpoint has `@ApiOperation`, `@ApiResponse`, `@ApiBody`

### MCP Integration
- [ ] HTTP transport MCP tools implemented
- [ ] One tool per endpoint/intention
- [ ] Tool naming follows `{action}_{module}_{entity}` pattern
- [ ] MCP tools delegate to service methods
- [ ] Service added to `TransportDependencies`
- [ ] Tools registered in `McpServerService`
- [ ] MCP E2E tests created

### Code Quality
- [ ] ESLint rules enforced (no `console.log`, use `??` not `||`)
- [ ] SqlQueryBuilder for simple queries, raw SQL only for complex
- [ ] Unit tests >80% coverage, E2E tests for all endpoints
- [ ] JSDoc on public methods with `@param`, `@returns`, `@throws`

### Final Verification
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] All MCP tools working and tested
- [ ] Documentation updated
