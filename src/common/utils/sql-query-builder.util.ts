/**
 * SQL Query Builder utility for constructing PostgreSQL queries programmatically.
 * Provides a fluent interface for building SELECT, INSERT, UPDATE, and DELETE queries.
 */
export class SqlQueryBuilder {
  private selectFields: string[] = [];
  private fromTable: string = '';
  private joinClauses: string[] = [];
  private whereClauses: string[] = [];
  private groupByFields: string[] = [];
  private havingClauses: string[] = [];
  private orderByFields: string[] = [];
  private limitValue?: number;
  private offsetValue?: number;
  private parameters: unknown[] = [];
  private parameterIndex: number = 1;

  /**
   * Creates a new SQL query builder instance.
   * @returns New SqlQueryBuilder instance
   * 
   * @example
   * ```typescript
   * const query = SqlQueryBuilder.create()
   *   .select(['id', 'name', 'email'])
   *   .from('users')
   *   .where('active = $1', [true])
   *   .orderBy('name', 'ASC')
   *   .build();
   * ```
   */
  static create(): SqlQueryBuilder {
    return new SqlQueryBuilder();
  }

  /**
   * Adds SELECT fields to the query.
   * @param fields - Array of field names or expressions
   * @returns SqlQueryBuilder instance for chaining
   * 
   * @example
   * ```typescript
   * builder.select(['id', 'name', 'COUNT(*) as total'])
   * builder.select(['*']) // Select all fields
   * ```
   */
  select(fields: string[]): SqlQueryBuilder {
    this.selectFields = [...this.selectFields, ...fields];
    return this;
  }

  /**
   * Sets the FROM table for the query.
   * @param table - Table name (can include schema)
   * @returns SqlQueryBuilder instance for chaining
   * 
   * @example
   * ```typescript
   * builder.from('users')
   * builder.from('weather.live')
   * ```
   */
  from(table: string): SqlQueryBuilder {
    this.fromTable = table;
    return this;
  }

  /**
   * Adds a JOIN clause to the query.
   * @param type - Type of join (INNER, LEFT, RIGHT, FULL)
   * @param table - Table to join
   * @param condition - Join condition
   * @returns SqlQueryBuilder instance for chaining
   * 
   * @example
   * ```typescript
   * builder.join('INNER', 'profiles', 'users.id = profiles.user_id')
   * builder.join('LEFT', 'orders', 'users.id = orders.customer_id')
   * ```
   */
  join(type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL', table: string, condition: string): SqlQueryBuilder {
    this.joinClauses.push(`${type} JOIN ${table} ON ${condition}`);
    return this;
  }

  /**
   * Adds a WHERE clause to the query.
   * @param condition - WHERE condition with parameter placeholders
   * @param params - Parameters for the condition
   * @returns SqlQueryBuilder instance for chaining
   * 
   * @example
   * ```typescript
   * builder.where('age > $1', [18])
   * builder.where('name ILIKE $1', ['%john%'])
   * ```
   */
  where(condition: string, params: unknown[] = []): SqlQueryBuilder {
    const updatedCondition = this.updateParameterPlaceholders(condition, params);
    this.whereClauses.push(updatedCondition);
    return this;
  }

  /**
   * Adds an AND WHERE clause to the query.
   * @param condition - WHERE condition with parameter placeholders
   * @param params - Parameters for the condition
   * @returns SqlQueryBuilder instance for chaining
   * 
   * @example
   * ```typescript
   * builder.where('age > $1', [18]).andWhere('city = $1', ['New York'])
   * ```
   */
  andWhere(condition: string, params: unknown[] = []): SqlQueryBuilder {
    if (this.whereClauses.length === 0) {
      return this.where(condition, params);
    }
    const updatedCondition = this.updateParameterPlaceholders(condition, params);
    this.whereClauses.push(`AND ${updatedCondition}`);
    return this;
  }

  /**
   * Adds an OR WHERE clause to the query.
   * @param condition - WHERE condition with parameter placeholders
   * @param params - Parameters for the condition
   * @returns SqlQueryBuilder instance for chaining
   * 
   * @example
   * ```typescript
   * builder.where('age > $1', [18]).orWhere('status = $1', ['premium'])
   * ```
   */
  orWhere(condition: string, params: unknown[] = []): SqlQueryBuilder {
    if (this.whereClauses.length === 0) {
      return this.where(condition, params);
    }
    const updatedCondition = this.updateParameterPlaceholders(condition, params);
    this.whereClauses.push(`OR ${updatedCondition}`);
    return this;
  }

  /**
   * Adds GROUP BY fields to the query.
   * @param fields - Array of field names to group by
   * @returns SqlQueryBuilder instance for chaining
   * 
   * @example
   * ```typescript
   * builder.groupBy(['city', 'status'])
   * ```
   */
  groupBy(fields: string[]): SqlQueryBuilder {
    this.groupByFields = [...this.groupByFields, ...fields];
    return this;
  }

  /**
   * Adds a HAVING clause to the query.
   * @param condition - HAVING condition with parameter placeholders
   * @param params - Parameters for the condition
   * @returns SqlQueryBuilder instance for chaining
   * 
   * @example
   * ```typescript
   * builder.groupBy(['city']).having('COUNT(*) > $1', [5])
   * ```
   */
  having(condition: string, params: unknown[] = []): SqlQueryBuilder {
    const updatedCondition = this.updateParameterPlaceholders(condition, params);
    this.havingClauses.push(updatedCondition);
    return this;
  }

  /**
   * Adds ORDER BY fields to the query.
   * @param field - Field name to order by
   * @param direction - Sort direction (ASC or DESC)
   * @returns SqlQueryBuilder instance for chaining
   * 
   * @example
   * ```typescript
   * builder.orderBy('name', 'ASC').orderBy('created_at', 'DESC')
   * ```
   */
  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): SqlQueryBuilder {
    this.orderByFields.push(`${field} ${direction}`);
    return this;
  }

  /**
   * Sets the LIMIT for the query.
   * @param limit - Maximum number of rows to return
   * @returns SqlQueryBuilder instance for chaining
   * 
   * @example
   * ```typescript
   * builder.limit(10)
   * ```
   */
  limit(limit: number): SqlQueryBuilder {
    this.limitValue = limit;
    return this;
  }

  /**
   * Sets the OFFSET for the query.
   * @param offset - Number of rows to skip
   * @returns SqlQueryBuilder instance for chaining
   * 
   * @example
   * ```typescript
   * builder.offset(20).limit(10) // Skip 20, take 10
   * ```
   */
  offset(offset: number): SqlQueryBuilder {
    this.offsetValue = offset;
    return this;
  }

  /**
   * Adds pagination to the query.
   * @param page - Page number (1-based)
   * @param pageSize - Number of items per page
   * @returns SqlQueryBuilder instance for chaining
   * 
   * @example
   * ```typescript
   * builder.paginate(2, 10) // Page 2, 10 items per page (skip 10, take 10)
   * ```
   */
  paginate(page: number, pageSize: number): SqlQueryBuilder {
    const offset = (page - 1) * pageSize;
    return this.offset(offset).limit(pageSize);
  }

  /**
   * Updates parameter placeholders in a condition and adds parameters to the list.
   * @param condition - SQL condition with $1, $2, etc. placeholders
   * @param params - Parameters to add
   * @returns Updated condition with correct parameter indices
   */
  private updateParameterPlaceholders(condition: string, params: unknown[]): string {
    let updatedCondition = condition;
    
    // Replace $1, $2, etc. with the correct parameter indices
    for (let i = 0; i < params.length; i++) {
      const placeholder = `$${i + 1}`;
      const newPlaceholder = `$${this.parameterIndex}`;
      updatedCondition = updatedCondition.replace(placeholder, newPlaceholder);
      this.parameters.push(params[i]);
      this.parameterIndex++;
    }
    
    return updatedCondition;
  }

  /**
   * Builds and returns the final SQL query and parameters.
   * @returns Object containing the SQL query string and parameters array
   * 
   * @example
   * ```typescript
   * const { query, params } = builder.build();
   * const result = await db.query(query, params);
   * ```
   */
  build(): { query: string; params: unknown[] } {
    if (!this.fromTable) {
      throw new Error('FROM table is required');
    }

    const parts: string[] = [];

    // SELECT clause
    if (this.selectFields.length === 0) {
      parts.push('SELECT *');
    } else {
      parts.push(`SELECT ${this.selectFields.join(', ')}`);
    }

    // FROM clause
    parts.push(`FROM ${this.fromTable}`);

    // JOIN clauses
    if (this.joinClauses.length > 0) {
      parts.push(...this.joinClauses);
    }

    // WHERE clause
    if (this.whereClauses.length > 0) {
      parts.push(`WHERE ${this.whereClauses.join(' ')}`);
    }

    // GROUP BY clause
    if (this.groupByFields.length > 0) {
      parts.push(`GROUP BY ${this.groupByFields.join(', ')}`);
    }

    // HAVING clause
    if (this.havingClauses.length > 0) {
      parts.push(`HAVING ${this.havingClauses.join(' AND ')}`);
    }

    // ORDER BY clause
    if (this.orderByFields.length > 0) {
      parts.push(`ORDER BY ${this.orderByFields.join(', ')}`);
    }

    // LIMIT clause
    if (this.limitValue !== undefined) {
      parts.push(`LIMIT ${this.limitValue}`);
    }

    // OFFSET clause
    if (this.offsetValue !== undefined) {
      parts.push(`OFFSET ${this.offsetValue}`);
    }

    const query = parts.join('\n');
    
    return {
      query,
      params: this.parameters,
    };
  }

  /**
   * Returns the SQL query string without parameters (for logging/debugging).
   * @returns SQL query string
   */
  toSql(): string {
    return this.build().query;
  }

  /**
   * Returns the parameters array.
   * @returns Parameters array
   */
  getParams(): unknown[] {
    return [...this.parameters];
  }

  /**
   * Resets the query builder to initial state.
   * @returns SqlQueryBuilder instance for chaining
   */
  reset(): SqlQueryBuilder {
    this.selectFields = [];
    this.fromTable = '';
    this.joinClauses = [];
    this.whereClauses = [];
    this.groupByFields = [];
    this.havingClauses = [];
    this.orderByFields = [];
    this.limitValue = undefined;
    this.offsetValue = undefined;
    this.parameters = [];
    this.parameterIndex = 1;
    return this;
  }
}