# SQL Query Builder Documentation

## Overview

The `SqlQueryBuilder` utility provides a fluent interface for constructing PostgreSQL queries programmatically. It offers type-safe query building with proper parameter handling and supports complex queries with joins, subqueries, and pagination.

## Features

- **Fluent Interface**: Chain methods to build queries step by step
- **Parameter Safety**: Automatic parameter numbering and SQL injection prevention
- **Complex Queries**: Support for joins, subqueries, grouping, and ordering
- **Pagination**: Built-in pagination support with offset/limit
- **Type Safety**: TypeScript support with proper type inference
- **Debugging**: Query inspection and logging capabilities

## Basic Usage

### Simple Select Query

```typescript
import { SqlQueryBuilder } from '../common/utils/sql-query-builder.util';

const { query, params } = SqlQueryBuilder.create()
  .select(['id', 'name', 'email'])
  .from('users')
  .where('active = $1', [true])
  .orderBy('name', 'ASC')
  .build();

// Result:
// query: "SELECT id, name, email FROM users WHERE active = $1 ORDER BY name ASC"
// params: [true]
```

### Query with Filters

```typescript
const { query, params } = SqlQueryBuilder.create()
  .select(['*'])
  .from('users')
  .where('created_at >= $1', ['2025-01-01'])
  .andWhere('status = $1', ['active'])
  .orderBy('name')
  .build();

// Result:
// query: "SELECT * FROM users WHERE created_at >= $1 AND status = $2 ORDER BY name ASC"
// params: ['2025-01-01', 'active']
```

## Advanced Features

### Joins

```typescript
const { query, params } = SqlQueryBuilder.create()
  .select(['u.name', 'p.bio', 'COUNT(o.id) as order_count'])
  .from('users u')
  .join('INNER', 'profiles p', 'u.id = p.user_id')
  .join('LEFT', 'orders o', 'u.id = o.customer_id')
  .where('u.active = $1', [true])
  .groupBy(['u.id', 'u.name', 'p.bio'])
  .having('COUNT(o.id) > $1', [0])
  .orderBy('order_count', 'DESC')
  .build();
```

### Pagination

```typescript
const { query, params } = SqlQueryBuilder.create()
  .select(['id', 'name', 'email'])
  .from('users')
  .where('age > $1', [18])
  .orderBy('created_at', 'DESC')
  .paginate(2, 10) // Page 2, 10 items per page
  .build();

// Automatically adds: LIMIT 10 OFFSET 10
```

### Complex Conditions

```typescript
const { query, params } = SqlQueryBuilder.create()
  .select(['*'])
  .from('users')
  .where('age > $1', [18])
  .andWhere('city = $1', ['New York'])
  .orWhere('status = $1 AND verified = $2', ['premium', true])
  .build();

// Result:
// WHERE age > $1 AND city = $2 OR status = $3 AND verified = $4
// params: [18, 'New York', 'premium', true]
```

## API Reference

### Core Methods

#### `select(fields: string[]): SqlQueryBuilder`
Adds SELECT fields to the query.

```typescript
builder.select(['id', 'name', 'COUNT(*) as total'])
builder.select(['*']) // Select all fields
```

#### `from(table: string): SqlQueryBuilder`
Sets the FROM table for the query.

```typescript
builder.from('users')
builder.from('public.users') // Schema.table format
```

#### `where(condition: string, params?: any[]): SqlQueryBuilder`
Adds a WHERE clause to the query.

```typescript
builder.where('age > $1', [18])
builder.where('name ILIKE $1', ['%john%'])
```

#### `andWhere(condition: string, params?: any[]): SqlQueryBuilder`
Adds an AND WHERE clause to the query.

```typescript
builder.where('age > $1', [18]).andWhere('city = $1', ['New York'])
```

#### `orWhere(condition: string, params?: any[]): SqlQueryBuilder`
Adds an OR WHERE clause to the query.

```typescript
builder.where('age > $1', [18]).orWhere('status = $1', ['premium'])
```

### Join Methods

#### `join(type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL', table: string, condition: string): SqlQueryBuilder`
Adds a JOIN clause to the query.

```typescript
builder.join('INNER', 'profiles', 'users.id = profiles.user_id')
builder.join('LEFT', 'orders', 'users.id = orders.customer_id')
```

### Grouping and Ordering

#### `groupBy(fields: string[]): SqlQueryBuilder`
Adds GROUP BY fields to the query.

```typescript
builder.groupBy(['city', 'status'])
```

#### `having(condition: string, params?: any[]): SqlQueryBuilder`
Adds a HAVING clause to the query.

```typescript
builder.groupBy(['city']).having('COUNT(*) > $1', [5])
```

#### `orderBy(field: string, direction?: 'ASC' | 'DESC'): SqlQueryBuilder`
Adds ORDER BY fields to the query.

```typescript
builder.orderBy('name', 'ASC').orderBy('created_at', 'DESC')
```

### Pagination Methods

#### `limit(limit: number): SqlQueryBuilder`
Sets the LIMIT for the query.

```typescript
builder.limit(10)
```

#### `offset(offset: number): SqlQueryBuilder`
Sets the OFFSET for the query.

```typescript
builder.offset(20)
```

#### `paginate(page: number, pageSize: number): SqlQueryBuilder`
Adds pagination to the query.

```typescript
builder.paginate(2, 10) // Page 2, 10 items per page (skip 10, take 10)
```

### Utility Methods

#### `build(): { query: string; params: any[] }`
Builds and returns the final SQL query and parameters.

```typescript
const { query, params } = builder.build();
const result = await db.query(query, params);
```

#### `toSql(): string`
Returns the SQL query string without parameters (for logging/debugging).

```typescript
const sql = builder.toSql();
console.log('Generated SQL:', sql);
```

#### `getParams(): any[]`
Returns the parameters array.

```typescript
const params = builder.getParams();
console.log('Parameters:', params);
```

#### `reset(): SqlQueryBuilder`
Resets the query builder to initial state.

```typescript
builder.reset(); // Clear all previous settings
```

## Integration with DatabaseService

### Service Implementation

```typescript
import { Injectable } from '@nestjs/common';
import { SqlQueryBuilder } from '../../common/utils/sql-query-builder.util';
import { DatabaseService } from '../../infrastructure/database/database.service';

@Injectable()
export class UserService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getActiveUsers(departmentFilter?: string): Promise<UserData[]> {
    const queryBuilder = SqlQueryBuilder.create()
      .select(['id', 'name', 'email', 'created_at as "createdAt"'])
      .from('users');

    queryBuilder.where('active = $1', [true]);

    if (departmentFilter) {
      queryBuilder.andWhere('department = $1', [departmentFilter]);
    }

    queryBuilder.orderBy('name');

    const { query, params } = queryBuilder.build();
    return await this.databaseService.queryMany<UserData>(query, params);
  }
}
```

## Best Practices

### 1. Parameter Safety
Always use parameterized queries to prevent SQL injection:

```typescript
// ✅ Good - Parameterized
builder.where('name = $1', [userInput])

// ❌ Bad - String concatenation
builder.where(`name = '${userInput}'`)
```

### 2. Query Logging
Use the logging capabilities for debugging:

```typescript
const { query, params } = builder.build();
this.logger.trace('Executing query', {
  query: query.replace(/\s+/g, ' ').trim(),
  params,
});
```

### 3. Complex Conditions
Break down complex conditions for readability:

```typescript
const builder = SqlQueryBuilder.create()
  .select(['*'])
  .from('users');

if (filters.age) {
  builder.andWhere('age > $1', [filters.age]);
}

if (filters.city) {
  builder.andWhere('city = $1', [filters.city]);
}

if (filters.status) {
  builder.andWhere('status = $1', [filters.status]);
}
```

### 4. Reusable Query Components
Create reusable query building functions:

```typescript
private addUserFilters(builder: SqlQueryBuilder, filters: UserFilters): SqlQueryBuilder {
  if (filters.active !== undefined) {
    builder.andWhere('active = $1', [filters.active]);
  }
  
  if (filters.search) {
    builder.andWhere('(name ILIKE $1 OR email ILIKE $1)', [`%${filters.search}%`]);
  }
  
  return builder;
}
```

## Error Handling

The query builder will throw errors for invalid configurations:

```typescript
try {
  const { query, params } = SqlQueryBuilder.create()
    .select(['id', 'name'])
    // Missing .from() - will throw error
    .build();
} catch (error) {
  console.error('Query builder error:', error.message);
  // Error: "FROM table is required"
}
```

## Performance Considerations

1. **Query Complexity**: Keep queries as simple as possible for better performance
2. **Parameter Count**: PostgreSQL has a limit on the number of parameters (typically 65535)
3. **Subqueries**: Use subqueries judiciously as they can impact performance
4. **Indexing**: Ensure proper database indexes for WHERE and ORDER BY clauses

## Testing

The SQL Query Builder includes comprehensive tests covering all functionality:

```bash
npm test -- --testPathPatterns="sql-query-builder.util.spec.ts"
```

Test coverage includes:
- Basic query building
- Parameter handling
- Complex queries with joins
- Pagination
- Error conditions
- Utility methods

## Migration from Raw SQL

### Before (Raw SQL)
```typescript
let sqlQuery = `
  SELECT id, name, email, created_at as "createdAt"
  FROM users
  WHERE active = $1
  ${departmentFilter ? 'AND department = $2' : ''}
`;

sqlQuery += ' ORDER BY name';

const params = departmentFilter ? [true, departmentFilter] : [true];
```

### After (Query Builder)
```typescript
const queryBuilder = SqlQueryBuilder.create()
  .select(['id', 'name', 'email', 'created_at as "createdAt"'])
  .from('users');

queryBuilder.where('active = $1', [true]);

if (departmentFilter) {
  queryBuilder.andWhere('department = $1', [departmentFilter]);
}

const { query, params } = queryBuilder.orderBy('name').build();
```

## Conclusion

The SQL Query Builder provides a powerful, type-safe way to construct PostgreSQL queries programmatically. It eliminates common SQL injection vulnerabilities, improves code readability, and provides excellent debugging capabilities through proper logging integration.