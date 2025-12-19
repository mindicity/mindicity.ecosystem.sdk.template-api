---
inclusion: always
---

# Mindicity API Development Guide

## 🚨 MANDATORY PROJECT CREATION PROCESS

**CRITICAL REQUIREMENT:** All new Mindicity API REST projects MUST be created using the bootstrap process.

### Required Bootstrap Process

**Step 1: Clone Base API Repository**
```bash
# Clone this base API repository as your starting point
git clone <mindicity-api-base-repository-url> your-new-api-project
cd your-new-api-project
```

**Step 2: Follow Bootstrap Steering Guide**
- **MANDATORY:** Use the `mindicity-api-bootstrap-steering.md` process
- **NO EXCEPTIONS:** Do not create APIs from scratch or other templates
- **AUTOMATED:** The bootstrap process handles all renaming and configuration

**Step 3: Add Your API Module**
```bash
# After bootstrap, add your specific API module
nest generate module modules/your-api-name --no-spec
nest generate controller modules/your-api-name --no-spec  
nest generate service modules/your-api-name --no-spec
```

### Why This Process is Mandatory

1. **Consistency:** Ensures all APIs follow the same architecture patterns
2. **Quality:** Pre-tested, production-ready foundation with all tests passing
3. **Speed:** No setup time - immediate development start
4. **Compliance:** Automatic adherence to all Mindicity standards
5. **Maintenance:** Easier updates and security patches across all APIs

### What You Get from Bootstrap

- ✅ **Clean Template Module:** Ready-to-customize placeholder module
- ✅ **Infrastructure Setup:** Database, logging, configuration pre-configured
- ✅ **Testing Framework:** Unit and E2E tests already working
- ✅ **Documentation:** Swagger, JSDoc, and README templates
- ✅ **CI/CD Ready:** GitLab CI, linting, formatting, and quality gates
- ✅ **Security Baseline:** Gateway auth pattern, no hardcoded secrets

**⚠️ VIOLATION POLICY:** Projects not following this bootstrap process will be rejected in code review.

## Tech Stack & Architecture

**Stack:** Node.js + NestJS + Fastify + Pino + Zod + TypeScript (strict mode)

**Key Requirements:**
- Project name defines `APP_API_SCOPE_PREFIX` 
- Module names define API endpoints (e.g., template, health)
- Gateway-level authentication (no auth guards in endpoints)
- Context-aware logging with correlation IDs
- Infrastructure isolation in `src/infrastructure/`

## Core Architecture Rules

**CRITICAL PATTERNS:**
1. **Data Flow:** `DTO (Controller) → Interface (Service) → Entity/Raw (Infrastructure)`
2. **Security:** Gateway handles auth/rate limiting - NO guards in endpoints
3. **Logging:** Always use `ContextLoggerService`, never `console.log` or `PinoLogger`
4. **Infrastructure:** DB/MQTT/WebSocket/Cache services go in `src/infrastructure/`
5. **DTOs:** Only for Controllers (Zod validation), Services use interfaces

## Module Structure

**Standard Module Layout:**
```
src/modules/{module-name}/
├── {module-name}.module.ts          # NestJS module definition
├── {module-name}.controller.ts      # HTTP endpoints (DTOs only)
├── {module-name}.service.ts         # Business logic (interfaces only)
├── {module-name}.controller.spec.ts # Controller tests
├── {module-name}.service.spec.ts    # Service tests
├── dto/                             # Request/Response DTOs (Zod)
├── interfaces/                      # Internal interfaces
└── test/{module-name}.e2e-spec.ts   # E2E tests
```

**Infrastructure Services (src/infrastructure/):**
- `database/` - Raw SQL queries, connections
- `mqtt/` - Message brokers, pub/sub
- `websocket/` - Real-time communication  
- `cache/` - Redis, in-memory caching
- `message-broker/` - Queue systems
## Implementation Patterns

**NOTE:** These patterns apply AFTER completing the mandatory bootstrap process described at the top of this document.

### Module Creation Commands
```bash
nest generate module modules/{module-name} --no-spec
nest generate controller modules/{module-name} --no-spec  
nest generate service modules/{module-name} --no-spec
mkdir -p src/modules/{module-name}/{dto,interfaces,test}
```

### Module Definition
```typescript
@Module({
  imports: [DatabaseModule], // Import infrastructure modules
  controllers: [{ModuleName}Controller],
  providers: [{ModuleName}Service, ContextLoggerService],
  exports: [{ModuleName}Service],
})
export class {ModuleName}Module {}
```

### Controller Pattern
**CRITICAL:** No auth guards - gateway handles authentication!

```typescript
@ApiTags('{module-name}')
@ApiBearerAuth() // Swagger docs only - NOT actual auth
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
  @ApiResponse({ status: 200, type: [{Entity}ResponseDto] })
  async findAll(@Query() query: Query{Entity}Dto): Promise<{Entity}ResponseDto[]> {
    this.logger.trace('findAll()', { query });
    
    // Convert DTO to interface for service
    const entities = await this.{moduleName}Service.findAll(query);
    
    // Convert back to DTO for response
    return entities.map(entity => ({ ...entity }));
  }
}
```

### Service Pattern
**CRITICAL:** Use child logger and interfaces (not DTOs). DO NOT log infrastructure operations.

```typescript
import { SqlQueryBuilder } from '../../common/utils/sql-query-builder.util';

@Injectable()
export class {ModuleName}Service {
  private readonly logger: ContextLoggerService;

  constructor(
    loggerService: ContextLoggerService,
    private readonly databaseService: DatabaseService,
  ) {
    // Create child logger with service context
    this.logger = loggerService.child({ serviceContext: {ModuleName}Service.name });
    this.logger.setContext({ModuleName}Service.name);
  }

  async findAll(query: {Entity}Query): Promise<{Entity}Data[]> {
    this.logger.trace('findAll()', { query });

    const correlationId = ContextUtil.getCorrelationId();
    const userId = ContextUtil.getUserId();

    try {
      // ✅ CORRECT: Use SqlQueryBuilder for standard queries
      const { query: sql, params } = SqlQueryBuilder
        .create()
        .select(['id', 'name', 'email', 'status', 'created_at', 'updated_at'])
        .from('{table_name}')
        .where('status = $1', ['active'])
        .orderBy('created_at', 'DESC')
        .limit(query.limit ?? 20)
        .offset(((query.page ?? 1) - 1) * (query.limit ?? 20))
        .build();

      // NO logging of query details - DatabaseService handles this centrally
      const results = await this.databaseService.queryMany<{Entity}Data>(sql, params);
      
      // DEBUG: Business logic context only (NOT query performance)
      this.logger.debug('{entities} retrieved for business logic', { 
        requestedBy: userId, 
        correlationId 
      });
      return results;
    } catch (error) {
      // ERROR: Business context only
      this.logger.error('failed to retrieve {entities}', { 
        requestedBy: userId,
        err: error, 
        correlationId 
      });
      throw error;
    }
  }
}
```
### DTOs (Controllers Only)
**Request DTOs (Zod validation):**
```typescript
const Create{Entity}Schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

export class Create{Entity}Dto extends createZodDto(Create{Entity}Schema) {}
```

**Query DTOs (class-validator):**
```typescript
export class Query{Entity}Dto {
  @IsOptional() @IsString()
  search?: string;

  @IsOptional() @Transform(({ value }) => parseInt(value, 10)) @IsNumber() @Min(1)
  page?: number = 1;
}
```

### Interfaces (Services Only)
```typescript
export interface {Entity}Data {
  id: string;
  name: string;
  email?: string;
  status: 'active' | 'inactive';
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface {Entity}Query {
  search?: string;
  status?: 'active' | 'inactive';
  page?: number;
  limit?: number;
}
```

## Database Query Guidelines

### SQL Query Builder Usage

**MANDATORY RULE:** All simple to moderately complex database queries MUST use the `SqlQueryBuilder` utility class. Raw SQL queries are only permitted for highly complex scenarios involving CTEs, window functions, or advanced PostgreSQL features.

#### When to Use SqlQueryBuilder (REQUIRED)

Use `SqlQueryBuilder` for:
- Simple SELECT, INSERT, UPDATE, DELETE operations
- Basic JOINs (INNER, LEFT, RIGHT)
- WHERE clauses with AND/OR conditions
- ORDER BY, GROUP BY, HAVING clauses
- LIMIT/OFFSET pagination
- Basic aggregations (COUNT, SUM, AVG, etc.)

#### SqlQueryBuilder Pattern (MANDATORY)

```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly databaseService: DatabaseService,
    loggerService: ContextLoggerService,
  ) {
    this.logger = loggerService.child({ serviceContext: UserService.name });
  }

  async findUsers(query: UserQuery): Promise<UserData[]> {
    this.logger.trace('findUsers()', { query });

    // ✅ CORRECT: Use SqlQueryBuilder for standard queries
    const { query: sql, params } = SqlQueryBuilder
      .create()
      .select(['id', 'name', 'email', 'status', 'created_at', 'updated_at'])
      .from('users')
      .where('status = $1', ['active'])
      .andWhere('created_at >= $1', [query.fromDate])
      .orderBy('created_at', 'DESC')
      .limit(query.limit ?? 20)
      .offset(((query.page ?? 1) - 1) * (query.limit ?? 20))
      .build();

    return this.databaseService.queryMany<UserData>(sql, params);
  }

  async findUsersByRole(roleId: string): Promise<UserData[]> {
    // ✅ CORRECT: Use SqlQueryBuilder for JOINs
    const { query: sql, params } = SqlQueryBuilder
      .create()
      .select(['u.id', 'u.name', 'u.email', 'r.name as role_name'])
      .from('users u')
      .join('INNER', 'user_roles ur', 'u.id = ur.user_id')
      .join('INNER', 'roles r', 'ur.role_id = r.id')
      .where('r.id = $1', [roleId])
      .andWhere('u.status = $1', ['active'])
      .orderBy('u.name')
      .build();

    return this.databaseService.queryMany<UserData>(sql, params);
  }
}
```

#### When Raw SQL is Permitted (EXCEPTIONS)

Raw SQL queries are allowed ONLY for:

1. **Common Table Expressions (CTEs)**
2. **Window Functions**
3. **Advanced PostgreSQL Features** (arrays, JSON operations, full-text search)
4. **Complex Recursive Queries**
5. **Performance-Critical Queries** with database-specific optimizations

#### Raw SQL Pattern (EXCEPTIONS ONLY)

```typescript
@Injectable()
export class AnalyticsService {
  async getHierarchicalData(): Promise<HierarchyData[]> {
    // ✅ ACCEPTABLE: Complex CTE requires raw SQL
    const sql = `
      WITH RECURSIVE category_hierarchy AS (
        -- Base case: root categories
        SELECT id, name, parent_id, 0 as level, ARRAY[id] as path
        FROM categories 
        WHERE parent_id IS NULL
        
        UNION ALL
        
        -- Recursive case: child categories
        SELECT c.id, c.name, c.parent_id, ch.level + 1, ch.path || c.id
        FROM categories c
        INNER JOIN category_hierarchy ch ON c.parent_id = ch.id
        WHERE NOT c.id = ANY(ch.path) -- Prevent cycles
      )
      SELECT id, name, level, path
      FROM category_hierarchy
      ORDER BY path;
    `;

    return this.databaseService.queryMany<HierarchyData>(sql);
  }

  async getWindowFunctionData(): Promise<RankedData[]> {
    // ✅ ACCEPTABLE: Window functions require raw SQL
    const sql = `
      SELECT 
        id,
        name,
        score,
        ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY score DESC) as rank,
        LAG(score) OVER (PARTITION BY category_id ORDER BY score DESC) as prev_score
      FROM users
      WHERE status = $1
      ORDER BY category_id, rank;
    `;

    return this.databaseService.queryMany<RankedData>(sql, ['active']);
  }
}
```

#### Code Review Requirements

**CRITICAL:** All raw SQL queries MUST include:

1. **Justification Comment**: Explain why QueryBuilder cannot be used
2. **Code Review Approval**: Raw SQL requires explicit approval from senior developer
3. **Performance Testing**: Complex queries must include performance benchmarks
4. **Security Review**: All raw SQL must be reviewed for injection vulnerabilities

#### Violation Examples (FORBIDDEN)

```typescript
// ❌ WRONG: Simple query using raw SQL
async findActiveUsers(): Promise<UserData[]> {
  const sql = 'SELECT * FROM users WHERE status = $1 ORDER BY name';
  return this.databaseService.queryMany(sql, ['active']);
}

// ❌ WRONG: Basic JOIN using raw SQL
async findUsersWithRoles(): Promise<UserData[]> {
  const sql = `
    SELECT u.*, r.name as role_name 
    FROM users u 
    LEFT JOIN roles r ON u.role_id = r.id 
    WHERE u.status = $1
  `;
  return this.databaseService.queryMany(sql, ['active']);
}

// ❌ WRONG: Pagination using raw SQL
async findUsersPaginated(page: number, limit: number): Promise<UserData[]> {
  const offset = (page - 1) * limit;
  const sql = 'SELECT * FROM users LIMIT $1 OFFSET $2';
  return this.databaseService.queryMany(sql, [limit, offset]);
}
```

#### Benefits of SqlQueryBuilder

1. **Type Safety**: Compile-time parameter validation
2. **SQL Injection Prevention**: Automatic parameter binding
3. **Maintainability**: Readable, chainable API
4. **Consistency**: Standardized query patterns across codebase
5. **Testing**: Easier to mock and test query logic
6. **Debugging**: Built-in query logging and parameter tracking

#### Migration Strategy

**For Existing Projects:**
1. Identify all raw SQL queries in services
2. Categorize as "simple" (must migrate) or "complex" (can remain)
3. Migrate simple queries to SqlQueryBuilder in phases
4. Add justification comments to remaining raw SQL
5. Update code review checklist to enforce these rules

## Testing Requirements

### Unit Tests (>80% coverage)
**Service Test Pattern:**
```typescript
describe('{ModuleName}Service', () => {
  let service: {ModuleName}Service;
  let databaseService: DatabaseService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        {ModuleName}Service,
        { provide: DatabaseService, useValue: { queryMany: jest.fn() } },
        { provide: ContextLoggerService, useValue: { trace: jest.fn(), child: jest.fn().mockReturnThis() } },
      ],
    }).compile();
    service = module.get({ModuleName}Service);
    databaseService = module.get(DatabaseService);
  });

  it('should return entities', async () => {
    jest.spyOn(databaseService, 'queryMany').mockResolvedValue([mockData]);
    const result = await service.findAll({});
    expect(result).toEqual([mockData]);
  });
});
```

### E2E Tests
```typescript
describe('{ModuleName}Controller (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(new FastifyAdapter());
    await app.init();
  });

  it('GET /mcapi/{module-name}', () => {
    return request(app.getHttpServer())
      .get('/mcapi/{module-name}')
      .expect(200)
      .expect(res => expect(Array.isArray(res.body)).toBe(true));
  });
});
```
## Code Standards

### Naming Conventions
- **Files**: kebab-case.ts (`user-service.ts`)
- **Classes**: PascalCase (`UserService`, `CreateUserDto`)
- **Variables/Functions**: camelCase (`userData`, `findUser`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_ATTEMPTS`)
- **Interfaces**: PascalCase with suffix (`UserData`, `UserQuery`)

### Import Order
```typescript
// 1. Node.js built-ins
import { readFileSync } from 'fs';

// 2. External libraries (alphabetical)
import { Injectable } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

// 3. Internal common (alphabetical)
import { ContextLoggerService } from '../../common/services/context-logger.service';
import { ContextUtil } from '../../common/utils/context.util';

// 4. Infrastructure
import { DatabaseService } from '../../infrastructure/database/database.service';

// 5. Local module
import { UserData } from './interfaces/user.interface';
import { CreateUserDto } from './dto';
```

### Class Organization
**Services:** Constructor → Public methods (alphabetical) → Private methods (alphabetical)
**Controllers:** Constructor → HTTP methods (GET, POST, PUT, DELETE order)

## Logging Rules

**CRITICAL:** Always use `ContextLoggerService`, never `console.log` or `PinoLogger`

### Logger Setup
```typescript
constructor(loggerService: ContextLoggerService) {
  this.logger = loggerService.child({ serviceContext: ExampleService.name });
  this.logger.setContext(ExampleService.name);
}
```

### Log Levels & Infrastructure Logging

#### Service Layer Logging
- **trace**: Method entry/exit (`this.logger.trace('methodName()', { param })`)
- **debug**: Business logic steps with correlation ID (NOT infrastructure operations)
- **error**: Exceptions with full context (`{ err: error, correlationId }`)

#### Infrastructure Layer Logging (CENTRALIZED)

**CRITICAL RULE:** Database queries, MQTT messages, WebSocket events, and cache operations MUST be logged ONLY in their respective infrastructure providers. DO NOT re-log these operations in business services.

**Database Provider Logging:**
```typescript
@Injectable()
export class DatabaseService {
  private readonly logger: ContextLoggerService;

  async queryMany<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const startTime = Date.now();
    const correlationId = ContextUtil.getCorrelationId();
    
    // TRACE: Log query details (centralized)
    this.logger.trace('executing query', { 
      sql: sql.replace(/\s+/g, ' ').trim(), 
      params, 
      correlationId 
    });

    try {
      const results = await this.pool.query(sql, params);
      const duration = Date.now() - startTime;
      
      // DEBUG: Log performance metrics only (centralized)
      this.logger.debug('query completed', { 
        duration: `${duration}ms`, 
        rowCount: results.length, 
        correlationId 
      });
      
      return results;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('query failed', { 
        sql: sql.replace(/\s+/g, ' ').trim(),
        duration: `${duration}ms`,
        err: error, 
        correlationId 
      });
      throw error;
    }
  }
}
```

**MQTT Provider Logging:**
```typescript
@Injectable()
export class MqttService {
  async publish(topic: string, payload: unknown): Promise<void> {
    const startTime = Date.now();
    const correlationId = ContextUtil.getCorrelationId();
    
    // TRACE: Log message details (centralized)
    this.logger.trace('publishing message', { 
      topic, 
      payloadSize: JSON.stringify(payload).length, 
      correlationId 
    });

    try {
      await this.client.publish(topic, JSON.stringify(payload));
      const duration = Date.now() - startTime;
      
      // DEBUG: Log performance only (centralized)
      this.logger.debug('message published', { 
        topic, 
        duration: `${duration}ms`, 
        correlationId 
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('publish failed', { 
        topic, 
        duration: `${duration}ms`,
        err: error, 
        correlationId 
      });
      throw error;
    }
  }
}
```

**WebSocket Provider Logging:**
```typescript
@Injectable()
export class WebSocketService {
  async sendMessage(connectionId: string, message: unknown): Promise<void> {
    const startTime = Date.now();
    const correlationId = ContextUtil.getCorrelationId();
    
    // TRACE: Log message details (centralized)
    this.logger.trace('sending websocket message', { 
      connectionId, 
      messageType: typeof message, 
      correlationId 
    });

    try {
      await this.gateway.sendToConnection(connectionId, message);
      const duration = Date.now() - startTime;
      
      // DEBUG: Log performance only (centralized)
      this.logger.debug('websocket message sent', { 
        connectionId, 
        duration: `${duration}ms`, 
        correlationId 
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('websocket send failed', { 
        connectionId, 
        duration: `${duration}ms`,
        err: error, 
        correlationId 
      });
      throw error;
    }
  }
}
```

#### Business Service Logging (NO Infrastructure Details)

**CORRECT - Business Logic Only:**
```typescript
@Injectable()
export class UserService {
  async findAll(query: UserQuery): Promise<UserData[]> {
    this.logger.trace('findAll()', { query });

    const correlationId = ContextUtil.getCorrelationId();
    const userId = ContextUtil.getUserId();

    try {
      // NO logging of SQL query - handled by DatabaseService
      const results = await this.databaseService.queryMany<UserData>(sqlQuery);
      
      // DEBUG: Business logic result only
      this.logger.debug('users retrieved for business logic', { 
        requestedBy: userId, 
        correlationId 
      });
      
      return results;
    } catch (error) {
      // ERROR: Business context only
      this.logger.error('failed to retrieve users', { 
        requestedBy: userId,
        err: error, 
        correlationId 
      });
      throw error;
    }
  }
}
```

**WRONG - Don't Re-log Infrastructure:**
```typescript
// ❌ WRONG: Don't log database operations in services
async findAll(query: UserQuery): Promise<UserData[]> {
  this.logger.trace('executing SQL query', { sql }); // ❌ Wrong - DatabaseService logs this
  const results = await this.databaseService.queryMany(sql);
  this.logger.debug('query returned rows', { count: results.length }); // ❌ Wrong - DatabaseService logs this
  return results;
}
```

### Context Usage
```typescript
const correlationId = ContextUtil.getCorrelationId();
const userId = ContextUtil.getUserId();

this.logger.debug('processing business request', { requestedBy: userId, correlationId });
```

## Code Quality Rules

### ESLint Configuration - Production Ready Standards

**CRITICAL:** All projects MUST use the complete ESLint configuration with these enforced rules:

#### TypeScript Rules (Strict Mode)
- `@typescript-eslint/explicit-function-return-type`: 'error' - All functions must have explicit return types
- `@typescript-eslint/explicit-module-boundary-types`: 'error' - Module boundaries must be typed
- `@typescript-eslint/no-explicit-any`: 'error' - No `any` type allowed, use specific types or `unknown`
- `@typescript-eslint/no-unused-vars`: 'error' - No unused variables (allow underscore prefix for ignored)
- `@typescript-eslint/prefer-nullish-coalescing`: 'error' - Use `??` instead of `||` for defaults
- `@typescript-eslint/prefer-optional-chain`: 'error' - Use optional chaining `?.` when possible
- `@typescript-eslint/no-floating-promises`: 'error' - All promises must be awaited or handled
- `@typescript-eslint/await-thenable`: 'error' - Only await thenable values
- `@typescript-eslint/no-misused-promises`: 'error' - Prevent promise misuse in conditionals

#### Code Complexity Limits
- `max-lines-per-function`: 80 lines (skipBlankLines: true, skipComments: true)
- `max-params`: 5 parameters maximum per function
- `max-depth`: 4 levels maximum nesting depth
- `complexity`: 10 maximum cyclomatic complexity
- `max-lines`: 300 lines per file (warning)
- `max-nested-callbacks`: 4 levels maximum

#### Naming Conventions (Enforced)
```typescript
// Variables: camelCase, UPPER_CASE, PascalCase allowed
const userData = {};
const MAX_RETRY_ATTEMPTS = 3;
const UserService = class {};

// Classes/Types: PascalCase
class UserService {}
interface UserData {}
type UserQuery = {};

// Enum Members: UPPER_CASE
enum Status { ACTIVE, INACTIVE }

// Parameters: camelCase (leading underscore allowed for unused)
function process(userData: UserData, _unusedParam: string) {}
```

#### Import Organization (Enforced)
```typescript
// 1. Node.js built-ins
import { readFileSync } from 'fs';

// 2. External libraries (alphabetical, @nestjs first)
import { Injectable } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

// 3. Internal (@/ paths)
import { ContextLoggerService } from '@/common/services/context-logger.service';

// 4. Relative imports (parent, sibling, index)
import { UserData } from './interfaces/user.interface';
import { CreateUserDto } from './dto';
```

#### Security Rules (Enforced)
- `no-console`: 'error' - Use `ContextLoggerService` only
- `no-eval`: 'error' - Never use eval or implied eval
- `security/detect-unsafe-regex`: 'error' - Prevent ReDoS attacks
- `security/detect-buffer-noassert`: 'error' - Buffer safety
- `security/detect-non-literal-require`: 'error' - Dynamic requires prohibited

#### Code Quality (SonarJS)
- `sonarjs/cognitive-complexity`: 15 maximum
- `sonarjs/no-duplicate-string`: 5 threshold for string duplication
- `sonarjs/no-identical-functions`: 'error' - Prevent code duplication
- `sonarjs/prefer-immediate-return`: 'warn' - Simplify return patterns

#### Documentation Requirements
- `jsdoc/require-jsdoc`: Classes, interfaces, types, enums must have JSDoc
- Public methods should have JSDoc with `@param`, `@returns`, `@throws`

### Test File Rules (Relaxed)
**Unit Tests (*.spec.ts):**
- `max-lines-per-function`: 300 lines
- `max-params`: 6 parameters
- `@typescript-eslint/no-explicit-any`: 'warn' (relaxed)
- `no-console`: 'off' (allowed in tests)

**E2E Tests (test/*.ts):**
- `max-lines-per-function`: 500 lines
- `max-params`: 8 parameters
- Most rules disabled for flexibility

### Nullish Coalescing Rule
**CRITICAL:** Use `??` instead of `||` for default values

```typescript
// ❌ Wrong - fails if value is 0, "", false
const config = userConfig || defaultConfig;
const count = userInput || 10;

// ✅ Correct - only triggers on null/undefined
const config = userConfig ?? defaultConfig;
const count = userInput ?? 10;
const pageSize = query.limit ?? 10;
```

### Security Rules
```typescript
// ❌ Prohibited
console.log('Debug'); // Use this.logger instead
const secret = 'hardcoded'; // Use ConfigService
eval(userInput); // Never use eval
process.env.SECRET; // Use ConfigService

// ✅ Correct
this.logger.debug('Debug', { context });
const secret = this.configService.get<string>('secret');
```
## Documentation Requirements

### JSDoc for Classes/Methods
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

### Swagger API Documentation
```typescript
@ApiTags('users')
@ApiBearerAuth() // Swagger docs only - auth handled by gateway
@Controller('users')
export class UserController {
  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    // Implementation
  }
}
```

## Security & Authentication

**CRITICAL:** Gateway handles ALL authentication and rate limiting - NO guards in endpoints!

### What NOT to Do
```typescript
// ❌ WRONG: No auth guards
@UseGuards(AuthGuard('jwt'))
@Get()
async findAll() { }

// ❌ WRONG: No rate limiting guards  
@UseGuards(ThrottlerGuard)
@Get()
async findAll() { }

// ❌ WRONG: No manual JWT validation
const decoded = jwt.verify(token, secret);
```

### What TO Do
```typescript
// ✅ CORRECT: Only @ApiBearerAuth() for Swagger docs
@ApiBearerAuth() // Swagger documentation ONLY
@Controller('users')
export class UserController {
  @Get()
  @ApiResponse({ status: 401, description: 'Unauthorized (handled by gateway)' })
  async findAll() {
    // Access user context from gateway headers
    const userId = ContextUtil.getUserId();
    const correlationId = ContextUtil.getCorrelationId();
    
    this.logger.trace('findAll()', { requestedBy: userId, correlationId });
  }
}
```

## Infrastructure Integration

### Module Imports
```typescript
// Import infrastructure modules in business modules
@Module({
  imports: [DatabaseModule, MqttModule], // Infrastructure modules
  controllers: [UserController],
  providers: [UserService, ContextLoggerService],
})
export class UserModule {}
```

### Service Injection
```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly mqttService: MqttService, // If needed
    loggerService: ContextLoggerService,
  ) {}

  async create(data: UserData): Promise<UserData> {
    // Use infrastructure services
    const result = await this.databaseService.queryOne('INSERT...', [data]);
    await this.mqttService.publish('user.created', { userId: result.id });
    return result;
  }
}
```

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

**Code Quality:**
- [ ] ESLint configuration applied with all production-ready rules
- [ ] Use `??` instead of `||` for defaults (enforced by ESLint)
- [ ] No `console.log` - use `ContextLoggerService` (enforced by ESLint)
- [ ] Explicit return types on public methods (enforced by ESLint)
- [ ] Import order: Node.js → External → Internal → Local (enforced by ESLint)
- [ ] Max function length: 80 lines (enforced by ESLint)
- [ ] Max parameters: 5 per function (enforced by ESLint)
- [ ] Max nesting depth: 4 levels (enforced by ESLint)
- [ ] Naming conventions: camelCase/PascalCase/UPPER_CASE (enforced by ESLint)

**Database Queries:**
- [ ] Use SqlQueryBuilder for all simple to moderate queries (SELECT, JOIN, WHERE, ORDER BY)
- [ ] Raw SQL only for complex scenarios (CTEs, window functions, advanced PostgreSQL features)
- [ ] All raw SQL includes justification comment explaining why QueryBuilder cannot be used
- [ ] Raw SQL queries reviewed for security and performance

**Logging:**
- [ ] Infrastructure operations logged ONLY in providers (Database, MQTT, WebSocket)
- [ ] Services log business logic only, NOT infrastructure performance
- [ ] Use trace/debug/error levels appropriately
- [ ] Include correlation ID in all log entries

**Testing:**
- [ ] Unit tests >80% coverage with mocked dependencies
- [ ] E2E tests for all endpoints
- [ ] Follow AAA pattern (Arrange, Act, Assert)

**Documentation:**
- [ ] JSDoc on public methods with `@param`, `@returns`, `@throws`
- [ ] Swagger decorators: `@ApiOperation`, `@ApiResponse`