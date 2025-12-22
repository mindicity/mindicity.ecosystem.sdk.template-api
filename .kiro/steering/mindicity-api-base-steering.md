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
4. **Compliance:** Mandatory adherence to all Mindicity standards
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

1. **Code Review Approval**: Raw SQL requires explicit approval from senior developer
2. **Performance Testing**: Complex queries must include performance benchmarks
3. **Security Review**: All raw SQL must be reviewed for injection vulnerabilities

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
2. **SQL Injection Prevention**: Mandatory parameter binding
3. **Maintainability**: Readable, chainable API
4. **Consistency**: Standardized query patterns across codebase
5. **Testing**: Easier to mock and test query logic
6. **Debugging**: Built-in query logging and parameter tracking

#### Migration Strategy

**For Existing Projects:**
1. Identify all raw SQL queries in services
2. Categorize as "simple" (must migrate) or "complex" (can remain)
3. Migrate simple queries to SqlQueryBuilder in phases
4. Update code review checklist to enforce these rules

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
- **debug**: Business logic steps with full context
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

## MCP (Model Context Protocol) Integration

**CRITICAL REQUIREMENT:** Every new API module MUST be integrated with MCP by adding corresponding tools that expose the module's functionality to AI agents.

### 🚨 MANDATORY MCP TOOL IMPLEMENTATION RULES

**CRITICAL REQUIREMENT:** When creating new API modules with endpoints, MCP tools MUST be implemented according to these mandatory rules:

#### **Default Implementation: HTTP Transport**
- **IF NO TRANSPORT SPECIFIED**: MCP tools MUST be implemented for **HTTP transport** (default)
- **REASON**: HTTP provides complete functionality, production-ready error handling, and MCP Inspector compatibility

#### **Explicit SSE Implementation**
- **IF SSE EXPLICITLY REQUESTED**: MCP tools MUST be implemented **ONLY for SSE transport**
- **USAGE**: Only when real-time event streaming is specifically required
- **LIMITATION**: SSE transport provides basic connectivity only

#### **Implementation Decision Matrix**

| User Request | MCP Implementation | Transport Used | Functionality |
|-------------|-------------------|----------------|---------------|
| "Create users API module" | ✅ **MANDATORY HTTP** | HTTP | Complete tools + resources |
| "Create users API with endpoints X, Y, Z" | ✅ **MANDATORY HTTP** | HTTP | Complete tools + resources |
| "Create users API module for SSE" | ✅ **MANDATORY SSE Only** | SSE | Basic connectivity only |
| "Create users API with SSE transport" | ✅ **MANDATORY SSE Only** | SSE | Basic connectivity only |
| "Create users API with real-time events" | ✅ **MANDATORY SSE Only** | SSE | Basic connectivity only |

#### **Mandatory Tool Generation Rules**

**CRITICAL:** For each API endpoint created, corresponding MCP tools MUST be implemented:

```typescript
// Example: Users API Module
// Endpoints → MANDATORY MCP Tools

GET    /users           → 'get_users_list'
POST   /users           → 'create_user'  
GET    /users/:id       → 'get_user_by_id'
PUT    /users/:id       → 'update_user'
DELETE /users/:id       → 'delete_user'
GET    /users/search    → 'search_users'

// Orders API Module  
GET    /orders          → 'get_orders_list'
POST   /orders          → 'create_order'
GET    /orders/:id      → 'get_order_by_id'
PUT    /orders/:id/status → 'update_order_status'
POST   /orders/:id/cancel → 'cancel_order'
```

**Tool Naming Convention (MANDATORY):**
- Pattern: `{action}_{module}_{entity}[_{qualifier}]`
- Use snake_case for all tool names
- Be specific and intention-based

### MCP Transport Architecture

**Default Transport: HTTP (Recommended)**

All MCP tools and resources are implemented via **HTTP transport by default**, providing:

- ✅ **Complete MCP functionality** - All tools and resources available
- ✅ **Production ready** - Robust error handling and comprehensive logging
- ✅ **MCP Inspector compatible** - Works with all MCP debugging tools
- ✅ **Easy testing** - Use any HTTP client (curl, Postman, MCP Inspector)
- ✅ **RESTful integration** - Standard HTTP requests/responses

**Optional Transports:**

- **STDIO**: Complete functionality via standard input/output (command-line integration)
- **SSE**: Basic connectivity only, redirects to HTTP for tools/resources (limited use)

#### **When to Use SSE Transport (EXPLICIT REQUEST ONLY)**

**SSE transport should ONLY be implemented when explicitly requested for these specific use cases:**

```typescript
// ✅ EXPLICIT SSE REQUESTS - Implement SSE transport
"Create users API with SSE transport"
"Create users API for real-time notifications" 
"Create users API with server-sent events"
"Create users API module for SSE"
"Create users API with real-time updates"

// ✅ DEFAULT HTTP REQUESTS - Implement HTTP transport  
"Create users API module"
"Create users API with endpoints"
"Create users API"
"Add users module with CRUD operations"
"Implement users management API"
```

**SSE Implementation Characteristics:**
- **Limited Functionality**: Only `initialize` method supported
- **Basic Connectivity**: Provides connection status and server info
- **Real-time Events**: Suitable for live notifications and updates
- **Redirect Pattern**: Tools and resources redirect to HTTP transport

**HTTP Implementation Characteristics (DEFAULT):**
- **Complete Functionality**: All tools and resources available
- **Production Ready**: Full error handling and logging
- **MCP Inspector Compatible**: Works with all debugging tools
- **RESTful Integration**: Standard HTTP requests/responses

### MCP Architecture Overview

The MCP integration provides AI agents with structured access to API functionality through:
- **Tools**: Specific actions that agents can perform (one tool per endpoint/intention)
- **Resources**: Dynamic data sources that agents can read
- **Multiple Transports**: HTTP (default), SSE, and STDIO support for different use cases

### MCP Integration Rules

#### 1. One Tool Per Endpoint/Intention (MANDATORY)

**CRITICAL:** Each API endpoint must have a corresponding MCP tool with a specific, clear intention.

```typescript
// ✅ CORRECT: Specific, intention-based tools
const tools = [
  'get_api_health',           // GET /health - Check API health status
  'get_users_list',           // GET /users - Retrieve list of users
  'create_user',              // POST /users - Create a new user
  'get_user_by_id',          // GET /users/:id - Get specific user
  'update_user',             // PUT /users/:id - Update user data
  'delete_user',             // DELETE /users/:id - Remove user
  'search_users_by_email',   // GET /users/search?email= - Find users by email
];

// ❌ WRONG: Generic or unclear tools
const badTools = [
  'api_call',                // Too generic
  'user_operations',         // Multiple intentions
  'database_query',          // Infrastructure-level, not business logic
];
```

#### 2. Use Services, Not Direct Logic (MANDATORY)

**CRITICAL:** MCP tools MUST delegate to existing service methods, never implement business logic directly.

```typescript
// ✅ CORRECT: Delegate to service
this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case 'get_users_list': {
      // Delegate to existing service method
      const users = await this.userService.findAll(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(users) }],
      };
    }
    
    case 'create_user': {
      // Validate and delegate to service
      const userData = this.validateUserData(args);
      const newUser = await this.userService.create(userData);
      return {
        content: [{ type: 'text', text: JSON.stringify(newUser) }],
      };
    }
  }
});

// ❌ WRONG: Implement logic in MCP handler
this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case 'get_users_list': {
      // ❌ Don't implement database queries here
      const sql = 'SELECT * FROM users WHERE status = $1';
      const users = await this.databaseService.queryMany(sql, ['active']);
      return { content: [{ type: 'text', text: JSON.stringify(users) }] };
    }
  }
});
```

#### 3. Transport Dependencies Pattern (MANDATORY)

**CRITICAL:** All transports (HTTP, SSE) that need business logic access MUST use the dependency injection pattern.

```typescript
// ✅ CORRECT: Transport Dependencies Pattern
// src/infrastructure/mcp/transports/transport-dependencies.ts
export interface TransportDependencies {
  healthService: HealthService;
  userService?: UserService;        // Add new services here
  orderService?: OrderService;      // Add new services here
  // Future services can be added without breaking existing code
}

export function createTransportDependencies(deps: {
  healthService: HealthService;
  userService?: UserService;
  orderService?: OrderService;
}): TransportDependencies {
  // Validate required dependencies
  if (!deps.healthService) {
    throw new Error('HealthService is required for MCP transports');
  }
  
  return deps;
}

// Transport Factory Integration
export class TransportFactory {
  static createTransport(
    config: McpConfig,
    dependencies: TransportDependencies  // Inject dependencies
  ): McpTransport {
    switch (config.transport) {
      case 'http':
        return new HttpTransport(config, dependencies);
      case 'sse':
        return new SseTransport(config, dependencies);
      case 'stdio':
        return new StdioTransport(config);
      default:
        throw new Error(`Unsupported transport: ${config.transport}`);
    }
  }
}
```

#### 4. MCP Server Service Integration (MANDATORY)

**CRITICAL:** When adding new modules, update the MCP server service to include the new service dependencies.

```typescript
// src/infrastructure/mcp/mcp-server.service.ts
@Injectable()
export class McpServerService implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly configService: ConfigService,
    private readonly healthService: HealthService,
    // ✅ ADD: Inject new services here
    private readonly userService: UserService,
    private readonly orderService: OrderService,
    loggerService: ContextLoggerService,
  ) {
    this.logger = loggerService.child({ serviceContext: McpServerService.name });
    this.logger.setContext(McpServerService.name);
    this.mcpConfig = this.configService.get<McpConfig>('mcp');
  }

  private async startMcpServer(): Promise<void> {
    try {
      // ✅ CREATE: Dependencies with all services
      const dependencies = createTransportDependencies({
        healthService: this.healthService,
        userService: this.userService,      // Add new services
        orderService: this.orderService,    // Add new services
      });

      // Create transport with dependencies
      this.transport = TransportFactory.createTransport(this.mcpConfig, dependencies);
      
      // Setup tool handlers for all modules
      this.setupToolHandlers();
      
      await this.transport.connect(this.server);
    } catch (error) {
      this.logger.error('failed to start MCP server', { err: error });
      throw error;
    }
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      this.logger.trace('MCP tool called', { toolName: name, args });

      try {
        switch (name) {
          // Health module tools
          case 'get_api_health':
            return await this.handleGetApiHealth();
          
          // ✅ ADD: User module tools
          case 'get_users_list':
            return await this.handleGetUsersList(args);
          case 'create_user':
            return await this.handleCreateUser(args);
          case 'get_user_by_id':
            return await this.handleGetUserById(args);
          
          // ✅ ADD: Order module tools
          case 'get_orders_list':
            return await this.handleGetOrdersList(args);
          case 'create_order':
            return await this.handleCreateOrder(args);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        this.logger.error('MCP tool execution failed', { 
          toolName: name, 
          err: error 
        });
        throw error;
      }
    });
  }

  // ✅ ADD: Tool handler methods for each module
  private async handleGetUsersList(args: any): Promise<CallToolResult> {
    const users = await this.userService.findAll(args);
    return {
      content: [{ 
        type: 'text', 
        text: JSON.stringify(users, null, 2) 
      }],
    };
  }

  private async handleCreateUser(args: any): Promise<CallToolResult> {
    const newUser = await this.userService.create(args);
    return {
      content: [{ 
        type: 'text', 
        text: JSON.stringify(newUser, null, 2) 
      }],
    };
  }

  private async handleGetUserById(args: any): Promise<CallToolResult> {
    const { id } = args;
    const user = await this.userService.findOne(id);
    return {
      content: [{ 
        type: 'text', 
        text: JSON.stringify(user, null, 2) 
      }],
    };
  }
}
```

#### 5. Tool Registration Pattern (MANDATORY)

**CRITICAL:** All tools must be properly registered with descriptive schemas for AI agents.

```typescript
// Setup tool list handler
this.server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Health module tools
      {
        name: 'get_api_health',
        description: 'Get the current health status of the API server',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      
      // ✅ ADD: User module tools
      {
        name: 'get_users_list',
        description: 'Retrieve a list of users with optional filtering and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number for pagination' },
            limit: { type: 'number', description: 'Number of items per page' },
            search: { type: 'string', description: 'Search term for filtering users' },
            status: { type: 'string', enum: ['active', 'inactive'], description: 'Filter by user status' },
          },
          required: [],
        },
      },
      {
        name: 'create_user',
        description: 'Create a new user account',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Full name of the user' },
            email: { type: 'string', format: 'email', description: 'Email address' },
            role: { type: 'string', enum: ['admin', 'user'], description: 'User role' },
          },
          required: ['name', 'email'],
        },
      },
      {
        name: 'get_user_by_id',
        description: 'Retrieve a specific user by their ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Unique user identifier' },
          },
          required: ['id'],
        },
      },
      
      // ✅ ADD: Order module tools (example)
      {
        name: 'get_orders_list',
        description: 'Retrieve a list of orders with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'Filter orders by user ID' },
            status: { type: 'string', enum: ['pending', 'completed', 'cancelled'], description: 'Filter by order status' },
            fromDate: { type: 'string', format: 'date', description: 'Filter orders from this date' },
          },
          required: [],
        },
      },
    ],
  };
});
```

#### 6. Module Integration Checklist (MANDATORY)

When adding a new module to the API, follow this checklist for MCP integration:

**Service Integration:**
- [ ] Add service to `TransportDependencies` interface
- [ ] Update `createTransportDependencies` function
- [ ] Inject service in `McpServerService` constructor
- [ ] Pass service to `createTransportDependencies` call

**Tool Implementation:**
- [ ] Define one tool per endpoint/intention with clear naming
- [ ] Add tool cases to `setupToolHandlers` switch statement
- [ ] Implement handler methods that delegate to service methods
- [ ] Add comprehensive tool descriptions to `ListToolsRequestSchema`

**Transport Support:**
- [ ] Ensure HTTP transport can access the service via dependencies
- [ ] Ensure SSE transport can access the service via dependencies
- [ ] Test all transports with the new tools

**Documentation:**
- [ ] Update MCP documentation with new tools
- [ ] Add examples of tool usage
- [ ] Document input/output schemas

#### 7. MCP Tool Naming Conventions (MANDATORY)

**CRITICAL:** Follow consistent naming patterns for MCP tools:

```typescript
// ✅ CORRECT: Clear, intention-based naming
const toolNamingPatterns = {
  // Pattern: {action}_{module}_{entity}[_{qualifier}]
  'get_users_list',           // GET /users
  'get_user_by_id',          // GET /users/:id
  'create_user',             // POST /users
  'update_user',             // PUT /users/:id
  'delete_user',             // DELETE /users/:id
  'search_users_by_email',   // GET /users/search?email=
  
  'get_orders_list',         // GET /orders
  'get_order_by_id',        // GET /orders/:id
  'create_order',           // POST /orders
  'update_order_status',    // PUT /orders/:id/status
  'cancel_order',           // POST /orders/:id/cancel
  
  'get_api_health',         // GET /health
  'get_api_metrics',        // GET /metrics
};

// ❌ WRONG: Unclear or inconsistent naming
const badNaming = {
  'users',                  // Missing action
  'getUserData',            // camelCase instead of snake_case
  'user-list',              // kebab-case instead of snake_case
  'api_call',               // Too generic
  'database_query',         // Infrastructure-level
};
```

#### 8. Error Handling in MCP Tools (MANDATORY)

**CRITICAL:** All MCP tools must handle errors consistently and provide meaningful feedback to AI agents.

```typescript
private async handleCreateUser(args: any): Promise<CallToolResult> {
  try {
    // Validate input
    if (!args.name || !args.email) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'Validation failed',
            message: 'Name and email are required fields',
            code: 'VALIDATION_ERROR'
          }, null, 2)
        }],
        isError: true,
      };
    }

    // Delegate to service
    const newUser = await this.userService.create(args);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: newUser,
          message: 'User created successfully'
        }, null, 2)
      }],
    };
  } catch (error) {
    this.logger.error('failed to create user via MCP', { 
      args, 
      err: error 
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'Internal server error',
          message: error.message,
          code: 'INTERNAL_ERROR'
        }, null, 2)
      }],
      isError: true,
    };
  }
}
```

### MCP Testing Requirements

**CRITICAL:** All MCP integrations must include comprehensive testing:

```typescript
// E2E MCP Tests
describe('MCP Integration (e2e)', () => {
  it('should handle get_users_list tool', async () => {
    const response = await mcpClient.callTool('get_users_list', {
      page: 1,
      limit: 10
    });
    
    expect(response.content[0].text).toContain('users');
    expect(JSON.parse(response.content[0].text)).toHaveProperty('data');
  });

  it('should handle create_user tool', async () => {
    const response = await mcpClient.callTool('create_user', {
      name: 'Test User',
      email: 'test@example.com'
    });
    
    const result = JSON.parse(response.content[0].text);
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('id');
  });
});
```

## MCP (Model Context Protocol) Integration

**CRITICAL:** All Mindicity APIs MUST implement MCP integration following these mandatory patterns for AI agent connectivity.

### MCP Architecture Rules

**MANDATORY PATTERNS:**
1. **One Tool Per Endpoint:** Each MCP tool maps to exactly one specific business intention
2. **Service Delegation:** MCP tools MUST delegate to existing services, never replicate business logic
3. **Multi-Transport Support:** All tools MUST work identically across HTTP, SSE, and STDIO transports
4. **Centralized Configuration:** All MCP settings managed through environment variables and validation
5. **Infrastructure Isolation:** MCP implementation isolated in `src/infrastructure/mcp/`

### MCP Module Structure

**Required MCP Infrastructure Layout:**
```
src/infrastructure/mcp/
├── mcp.module.ts                    # NestJS module for MCP
├── mcp-server.service.ts            # Core MCP server logic
├── mcp-server.service.spec.ts       # MCP server tests
├── transports/                      # Transport implementations
│   ├── transport-factory.ts         # Transport creation factory
│   ├── transport-dependencies.ts    # Dependency injection helper
│   ├── stdio-transport.ts           # STDIO transport (CLI/terminal)
│   ├── http-transport.ts            # HTTP transport (REST API)
│   ├── sse-transport.ts             # SSE transport (Server-Sent Events)
│   └── *.spec.ts                    # Transport tests
src/config/
├── mcp.config.ts                    # MCP configuration schema
└── mcp-validation.integration.spec.ts # MCP config validation tests
```

### MCP Configuration Pattern

**Environment Variables (MANDATORY):**
```bash
# MCP Server Configuration
MCP_ENABLED=true                     # Enable/disable MCP server
MCP_TRANSPORT=http                   # Transport type: stdio|http|sse (default: http)
MCP_HOST=localhost                   # Host for HTTP/SSE transports
MCP_PORT=3235                        # Port for HTTP/SSE transports
MCP_SERVER_NAME=your-api-name        # Server name for MCP identification
MCP_SERVER_VERSION=1.0.0             # Server version
```

**Configuration Schema (src/config/mcp.config.ts):**
```typescript
import { z } from 'zod';
import { EnvUtil } from '../common/utils/env.util';

const McpConfigSchema = z.object({
  enabled: z.boolean(),
  transport: z.enum(['stdio', 'http', 'sse']),
  host: z.string().min(1).optional(),
  port: z.number().min(1).max(65535).optional(),
  serverName: z.string().min(1),
  serverVersion: z.string().min(1),
});

export type McpConfig = z.infer<typeof McpConfigSchema>;

export const mcpConfig = (): McpConfig => {
  const config = {
    enabled: EnvUtil.parseBoolean(process.env.MCP_ENABLED, true),
    transport: EnvUtil.parseEnum(process.env.MCP_TRANSPORT, ['stdio', 'http', 'sse'], 'http'),
    host: EnvUtil.parseString(process.env.MCP_HOST, 'localhost'),
    port: EnvUtil.parseNumber(process.env.MCP_PORT, 3235),
    serverName: EnvUtil.parseString(process.env.MCP_SERVER_NAME, process.env.npm_package_name, 'nestjs-api'),
    serverVersion: EnvUtil.parseString(process.env.MCP_SERVER_VERSION, process.env.npm_package_version, '1.0.0'),
  };

  // Validation with detailed error messages
  const result = McpConfigSchema.safeParse(config);
  if (!result.success) {
    const errorMessages = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
    console.error(`❌ MCP Configuration validation failed: ${errorMessages}`);
    throw new Error(`Invalid MCP configuration: ${errorMessages}`);
  }

  return result.data;
};
```

### MCP Tool Implementation Pattern

**CRITICAL RULE:** Each MCP tool MUST delegate to existing services and follow this exact pattern:

```typescript
// In mcp-server.service.ts
@Injectable()
export class McpServerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: ContextLoggerService;
  private server: Server | null = null;
  private transport: McpTransport | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly healthService: HealthService, // Inject business services
    loggerService: ContextLoggerService,
  ) {
    this.logger = loggerService.child({ serviceContext: McpServerService.name });
  }

  private setupDynamicHandlers(): void {
    // ✅ CORRECT: One tool per business intention
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      switch (name) {
        case 'get_api_health':
          return await this.handleGetApiHealth(args);
        case 'get_api_detailed_health':
          return await this.handleGetDetailedApiHealth(args);
        // Add more tools here - each delegates to a service method
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  // ✅ CORRECT: Delegate to service, add MCP-specific formatting only
  private async handleGetApiHealth(args: unknown): Promise<CallToolResult> {
    this.logger.trace('MCP tool: get_api_health', { args });
    
    try {
      // Delegate to existing service - NO business logic duplication
      const healthData = await this.healthService.getSimpleHealthStatus();
      
      return {
        content: [
          {
            type: 'text',
            text: `API Health Status: ${healthData.status}\nServer: ${healthData.server}\nVersion: ${healthData.version}\nTimestamp: ${healthData.timestamp}`,
          },
        ],
      };
    } catch (error) {
      this.logger.error('MCP tool get_api_health failed', { err: error });
      throw error;
    }
  }

  private async handleGetDetailedApiHealth(args: unknown): Promise<CallToolResult> {
    this.logger.trace('MCP tool: get_api_detailed_health', { args });
    
    try {
      // Delegate to existing service method
      const healthData = await this.healthService.getHealthStatus();
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(healthData, null, 2),
          },
        ],
      };
    } catch (error) {
      this.logger.error('MCP tool get_api_detailed_health failed', { err: error });
      throw error;
    }
  }
}
```

### MCP Transport Factory Pattern

**MANDATORY:** All transports MUST be created through the factory with dependency injection:

```typescript
// transport-dependencies.ts
export interface TransportDependencies {
  healthService: HealthService;
  // Add other services as needed
}

export function createTransportDependencies(services: {
  healthService: HealthService;
  // Add other services here
}): TransportDependencies {
  if (!services.healthService) {
    throw new Error('HealthService is required for MCP transports');
  }
  
  return {
    healthService: services.healthService,
  };
}

// transport-factory.ts
export class TransportFactory {
  static createTransport(
    config: McpConfig,
    dependencies: TransportDependencies,
    logger: ContextLoggerService,
  ): McpTransport {
    switch (config.transport) {
      case 'stdio':
        return new StdioTransport(config, logger);
      case 'http':
        if (!config.host || !config.port) {
          throw new Error('HTTP transport requires host and port configuration');
        }
        return new HttpTransport(config, dependencies, logger);
      case 'sse':
        if (!config.host || !config.port) {
          throw new Error('SSE transport requires host and port configuration');
        }
        return new SseTransport(config, dependencies, logger);
      default:
        throw new Error(`Unsupported transport type: ${config.transport}`);
    }
  }
}
```

### MCP Transport Implementation Rules

**CRITICAL:** All transports MUST implement the same interface and provide identical functionality:

```typescript
// Base transport interface
export interface McpTransport {
  connect(server: Server): Promise<void>;
  disconnect(): Promise<void>;
  getTransportInfo(): TransportInfo;
}

// HTTP Transport Pattern
export class HttpTransport implements McpTransport {
  constructor(
    private readonly config: McpConfig,
    private readonly dependencies: TransportDependencies,
    private readonly logger: ContextLoggerService,
  ) {}

  async connect(server: Server): Promise<void> {
    // ✅ CORRECT: Store server reference for request handling
    this.server = server;
    
    // Create HTTP server with request routing
    this.httpServer = createServer((req, res) => {
      this.handleRequest(req, res);
    });
    
    // Listen on configured port
    await new Promise<void>((resolve, reject) => {
      this.httpServer.listen(this.config.port, this.config.host, resolve);
      this.httpServer.on('error', reject);
    });
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // ✅ CORRECT: Route MCP requests to server.request()
    if (req.method === 'POST' && req.url === '/mcp') {
      const body = await this.readRequestBody(req);
      const mcpRequest = JSON.parse(body);
      
      // Delegate to MCP server for processing
      const response = await this.server.request(mcpRequest);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
    }
  }
}

// SSE Transport Pattern  
export class SseTransport implements McpTransport {
  private clients = new Set<ServerResponse>();

  async connect(server: Server): Promise<void> {
    this.server = server;
    
    // ✅ CORRECT: Same routing logic as HTTP, plus SSE event streaming
    this.httpServer = createServer((req, res) => {
      if (req.url === '/mcp/events') {
        this.handleSseConnection(req, res);
      } else if (req.method === 'POST' && req.url === '/mcp') {
        this.handleMcpRequest(req, res);
      }
    });
  }

  private handleSseConnection(req: IncomingMessage, res: ServerResponse): void {
    // ✅ CORRECT: Standard SSE headers and connection management
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    this.clients.add(res);
    
    // Send initial connection event
    res.write('event: connected\ndata: {"status":"connected"}\n\n');
    
    req.on('close', () => {
      this.clients.delete(res);
    });
  }
}
```

### MCP Module Integration

**MANDATORY:** MCP module MUST be imported in AppModule with proper dependency injection:

```typescript
// mcp.module.ts
@Module({
  imports: [ConfigModule], // For MCP configuration
  providers: [
    McpServerService,
    ContextLoggerService,
  ],
  exports: [McpServerService],
})
export class McpModule {}

// app.module.ts
@Module({
  imports: [
    // ... other modules
    McpModule, // ✅ CORRECT: Import MCP module
  ],
  // ... rest of module configuration
})
export class AppModule {}
```

### MCP Testing Requirements

**MANDATORY:** All MCP components MUST have comprehensive tests:

```typescript
// mcp-server.service.spec.ts
describe('McpServerService', () => {
  let service: McpServerService;
  let healthService: HealthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        McpServerService,
        { provide: HealthService, useValue: { getSimpleHealthStatus: jest.fn() } },
        { provide: ContextLoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get(McpServerService);
    healthService = module.get(HealthService);
  });

  it('should delegate get_api_health to HealthService', async () => {
    const mockHealth = { status: 'healthy', server: 'test', version: '1.0.0' };
    jest.spyOn(healthService, 'getSimpleHealthStatus').mockResolvedValue(mockHealth);

    const result = await service['handleGetApiHealth']({});
    
    expect(healthService.getSimpleHealthStatus).toHaveBeenCalled();
    expect(result.content[0].text).toContain('healthy');
  });
});

// E2E tests for each transport
describe('MCP E2E Tests', () => {
  it('should handle MCP requests via HTTP transport', async () => {
    // Test HTTP transport functionality (complete tools and resources)
  });

  it('should handle MCP requests via SSE transport', async () => {
    // Test SSE transport functionality (basic connectivity only)
    // Note: SSE only supports initialize, tools/resources redirect to HTTP
  });

  it('should handle MCP requests via STDIO transport', async () => {
    // Test STDIO transport functionality (complete tools and resources)
  });
});
```

### MCP Development Checklist

**MCP Implementation:**
- [ ] MCP module created in `src/infrastructure/mcp/`
- [ ] Configuration schema with validation in `src/config/mcp.config.ts`
- [ ] Environment variables documented and validated
- [ ] Transport factory with dependency injection
- [ ] All three transports implemented (STDIO, HTTP, SSE)
- [ ] Each MCP tool delegates to existing service methods
- [ ] No business logic duplication in MCP layer
- [ ] Comprehensive logging with correlation IDs
- [ ] Unit tests for all MCP components (>80% coverage)
- [ ] E2E tests for all transport types
- [ ] Integration tests for configuration validation

**MCP Tool Design:**
- [ ] One tool per specific business intention
- [ ] Tools delegate to existing services, never replicate logic
- [ ] Consistent tool behavior across all transports
- [ ] Proper error handling and logging
- [ ] Input validation using existing DTOs/interfaces
- [ ] Output formatting appropriate for AI agents

**MCP Documentation:**
- [ ] MCP integration documented in `docs/mcp-integration.md`
- [ ] Transport examples in `docs/mcp-transport-examples.md`
- [ ] Resource documentation in `docs/mcp-resources.md`
- [ ] Test scripts in `scripts/mcp/` directory
- [ ] Environment variable documentation updated

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

**MCP Integration (MANDATORY):**
- [ ] **MANDATORY IMPLEMENTATION**: MCP tools MUST be implemented for HTTP transport (default)
- [ ] **SSE ONLY IF REQUESTED**: Implement SSE transport only when explicitly requested
- [ ] **ONE TOOL PER ENDPOINT**: Each API endpoint MUST have corresponding MCP tool implemented
- [ ] **TOOL NAMING**: Follow `{action}_{module}_{entity}` pattern (snake_case)
- [ ] Add service to `TransportDependencies` interface in `transport-dependencies.ts`
- [ ] Update `createTransportDependencies` function to include new service
- [ ] Inject service in `McpServerService` constructor
- [ ] Pass service to `createTransportDependencies` call in `startMcpServer`
- [ ] Define one MCP tool per endpoint/intention with clear snake_case naming
- [ ] Add tool cases to `setupToolHandlers` switch statement
- [ ] Implement handler methods that delegate to service methods (no direct logic)
- [ ] Add comprehensive tool descriptions to `ListToolsRequestSchema` handler
- [ ] Ensure HTTP and SSE transports can access service via dependencies
- [ ] Test all MCP tools with HTTP transport (primary)
- [ ] Test basic connectivity with SSE transport (secondary)
- [ ] Test STDIO transport if command-line integration needed
- [ ] Add MCP E2E tests for all new tools
- [ ] Update MCP documentation with new tools and examples

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
- [ ] MCP E2E tests for all tools
- [ ] Follow AAA pattern (Arrange, Act, Assert)

**Documentation:**
- [ ] JSDoc on public methods with `@param`, `@returns`, `@throws`
- [ ] Swagger decorators: `@ApiOperation`, `@ApiResponse`
- [ ] MCP tool documentation with input/output examples