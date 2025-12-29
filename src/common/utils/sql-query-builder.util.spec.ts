import { SqlQueryBuilder } from './sql-query-builder.util';

describe('SqlQueryBuilder', () => {
  let builder: SqlQueryBuilder;

  beforeEach(() => {
    builder = SqlQueryBuilder.create();
  });

  describe('create', () => {
    it('should create a new SqlQueryBuilder instance', () => {
      const newBuilder = SqlQueryBuilder.create();
      expect(newBuilder).toBeInstanceOf(SqlQueryBuilder);
    });
  });

  describe('select', () => {
    it('should add select fields', () => {
      const { query } = builder
        .select(['id', 'name', 'email'])
        .from('users')
        .build();

      expect(query).toContain('SELECT id, name, email');
    });

    it('should default to SELECT * when no fields specified', () => {
      const { query } = builder
        .from('users')
        .build();

      expect(query).toContain('SELECT *');
    });

    it('should allow multiple select calls', () => {
      const { query } = builder
        .select(['id', 'name'])
        .select(['email', 'created_at'])
        .from('users')
        .build();

      expect(query).toContain('SELECT id, name, email, created_at');
    });
  });

  describe('from', () => {
    it('should set the FROM table', () => {
      const { query } = builder
        .from('users')
        .build();

      expect(query).toContain('FROM users');
    });

    it('should support schema.table format', () => {
      const { query } = builder
        .from('weather.live')
        .build();

      expect(query).toContain('FROM weather.live');
    });

    it('should throw error when FROM is not specified', () => {
      expect(() => builder.build()).toThrow('FROM table is required');
    });
  });

  describe('join', () => {
    it('should add INNER JOIN clause', () => {
      const { query } = builder
        .from('users')
        .join('INNER', 'profiles', 'users.id = profiles.user_id')
        .build();

      expect(query).toContain('INNER JOIN profiles ON users.id = profiles.user_id');
    });

    it('should add LEFT JOIN clause', () => {
      const { query } = builder
        .from('users')
        .join('LEFT', 'orders', 'users.id = orders.customer_id')
        .build();

      expect(query).toContain('LEFT JOIN orders ON users.id = orders.customer_id');
    });

    it('should support multiple joins', () => {
      const { query } = builder
        .from('users')
        .join('INNER', 'profiles', 'users.id = profiles.user_id')
        .join('LEFT', 'orders', 'users.id = orders.customer_id')
        .build();

      expect(query).toContain('INNER JOIN profiles ON users.id = profiles.user_id');
      expect(query).toContain('LEFT JOIN orders ON users.id = orders.customer_id');
    });
  });

  describe('where', () => {
    it('should add WHERE clause without parameters', () => {
      const { query, params } = builder
        .from('users')
        .where('active = true')
        .build();

      expect(query).toContain('WHERE active = true');
      expect(params).toEqual([]);
    });

    it('should add WHERE clause with parameters', () => {
      const { query, params } = builder
        .from('users')
        .where('age > $1', [18])
        .build();

      expect(query).toContain('WHERE age > $1');
      expect(params).toEqual([18]);
    });

    it('should handle multiple parameters', () => {
      const { query, params } = builder
        .from('users')
        .where('age > $1 AND city = $2', [18, 'New York'])
        .build();

      expect(query).toContain('WHERE age > $1 AND city = $2');
      expect(params).toEqual([18, 'New York']);
    });
  });

  describe('andWhere', () => {
    it('should add AND WHERE clause', () => {
      const { query, params } = builder
        .from('users')
        .where('age > $1', [18])
        .andWhere('city = $1', ['New York'])
        .build();

      expect(query).toContain('WHERE age > $1 AND city = $2');
      expect(params).toEqual([18, 'New York']);
    });

    it('should act as WHERE when no previous WHERE exists', () => {
      const { query, params } = builder
        .from('users')
        .andWhere('age > $1', [18])
        .build();

      expect(query).toContain('WHERE age > $1');
      expect(params).toEqual([18]);
    });
  });

  describe('orWhere', () => {
    it('should add OR WHERE clause', () => {
      const { query, params } = builder
        .from('users')
        .where('age > $1', [18])
        .orWhere('status = $1', ['premium'])
        .build();

      expect(query).toContain('WHERE age > $1 OR status = $2');
      expect(params).toEqual([18, 'premium']);
    });

    it('should act as WHERE when no previous WHERE exists', () => {
      const { query, params } = builder
        .from('users')
        .orWhere('age > $1', [18])
        .build();

      expect(query).toContain('WHERE age > $1');
      expect(params).toEqual([18]);
    });
  });

  describe('groupBy', () => {
    it('should add GROUP BY clause', () => {
      const { query } = builder
        .from('users')
        .groupBy(['city', 'status'])
        .build();

      expect(query).toContain('GROUP BY city, status');
    });

    it('should support multiple groupBy calls', () => {
      const { query } = builder
        .from('users')
        .groupBy(['city'])
        .groupBy(['status'])
        .build();

      expect(query).toContain('GROUP BY city, status');
    });
  });

  describe('having', () => {
    it('should add HAVING clause', () => {
      const { query, params } = builder
        .from('users')
        .groupBy(['city'])
        .having('COUNT(*) > $1', [5])
        .build();

      expect(query).toContain('HAVING COUNT(*) > $1');
      expect(params).toEqual([5]);
    });

    it('should support multiple having clauses', () => {
      const { query, params } = builder
        .from('users')
        .groupBy(['city'])
        .having('COUNT(*) > $1', [5])
        .having('AVG(age) < $1', [30])
        .build();

      expect(query).toContain('HAVING COUNT(*) > $1 AND AVG(age) < $2');
      expect(params).toEqual([5, 30]);
    });
  });

  describe('orderBy', () => {
    it('should add ORDER BY clause with ASC direction', () => {
      const { query } = builder
        .from('users')
        .orderBy('name', 'ASC')
        .build();

      expect(query).toContain('ORDER BY name ASC');
    });

    it('should add ORDER BY clause with DESC direction', () => {
      const { query } = builder
        .from('users')
        .orderBy('created_at', 'DESC')
        .build();

      expect(query).toContain('ORDER BY created_at DESC');
    });

    it('should default to ASC direction', () => {
      const { query } = builder
        .from('users')
        .orderBy('name')
        .build();

      expect(query).toContain('ORDER BY name ASC');
    });

    it('should support multiple order by fields', () => {
      const { query } = builder
        .from('users')
        .orderBy('name', 'ASC')
        .orderBy('created_at', 'DESC')
        .build();

      expect(query).toContain('ORDER BY name ASC, created_at DESC');
    });
  });

  describe('limit', () => {
    it('should add LIMIT clause', () => {
      const { query } = builder
        .from('users')
        .limit(10)
        .build();

      expect(query).toContain('LIMIT 10');
    });
  });

  describe('offset', () => {
    it('should add OFFSET clause', () => {
      const { query } = builder
        .from('users')
        .offset(20)
        .build();

      expect(query).toContain('OFFSET 20');
    });
  });

  describe('paginate', () => {
    it('should add pagination with correct offset and limit', () => {
      const { query } = builder
        .from('users')
        .paginate(2, 10) // Page 2, 10 items per page
        .build();

      expect(query).toContain('LIMIT 10');
      expect(query).toContain('OFFSET 10'); // (2-1) * 10 = 10
    });

    it('should handle first page correctly', () => {
      const { query } = builder
        .from('users')
        .paginate(1, 10) // Page 1, 10 items per page
        .build();

      expect(query).toContain('LIMIT 10');
      expect(query).toContain('OFFSET 0'); // (1-1) * 10 = 0
    });
  });

  describe('complex queries', () => {
    it('should build a complex query with all clauses', () => {
      const { query, params } = builder
        .select(['u.id', 'u.name', 'p.bio', 'COUNT(o.id) as order_count'])
        .from('users u')
        .join('INNER', 'profiles p', 'u.id = p.user_id')
        .join('LEFT', 'orders o', 'u.id = o.customer_id')
        .where('u.active = $1', [true])
        .andWhere('u.age > $1', [18])
        .groupBy(['u.id', 'u.name', 'p.bio'])
        .having('COUNT(o.id) > $1', [0])
        .orderBy('u.name', 'ASC')
        .orderBy('order_count', 'DESC')
        .limit(20)
        .offset(10)
        .build();

      expect(query).toContain('SELECT u.id, u.name, p.bio, COUNT(o.id) as order_count');
      expect(query).toContain('FROM users u');
      expect(query).toContain('INNER JOIN profiles p ON u.id = p.user_id');
      expect(query).toContain('LEFT JOIN orders o ON u.id = o.customer_id');
      expect(query).toContain('WHERE u.active = $1 AND u.age > $2');
      expect(query).toContain('GROUP BY u.id, u.name, p.bio');
      expect(query).toContain('HAVING COUNT(o.id) > $3');
      expect(query).toContain('ORDER BY u.name ASC, order_count DESC');
      expect(query).toContain('LIMIT 20');
      expect(query).toContain('OFFSET 10');
      expect(params).toEqual([true, 18, 0]);
    });

    it('should build weather query similar to the original', () => {
      const { query, params } = builder
        .select([
          'datetime',
          'city',
          'temp',
          'updated_at as "updatedAt"'
        ])
        .from('weather.live')
        .where('datetime = (SELECT MAX(datetime) FROM weather.live WHERE city = $1)', ['New York'])
        .andWhere('city = $1', ['New York'])
        .orderBy('city')
        .build();

      expect(query).toContain('SELECT datetime, city, temp, updated_at as "updatedAt"');
      expect(query).toContain('FROM weather.live');
      expect(query).toContain('WHERE datetime = (SELECT MAX(datetime) FROM weather.live WHERE city = $1) AND city = $2');
      expect(query).toContain('ORDER BY city ASC');
      expect(params).toEqual(['New York', 'New York']);
    });
  });

  describe('utility methods', () => {
    it('should return SQL string with toSql()', () => {
      const sql = builder
        .select(['id', 'name'])
        .from('users')
        .where('active = $1', [true])
        .toSql();

      expect(sql).toContain('SELECT id, name');
      expect(sql).toContain('FROM users');
      expect(sql).toContain('WHERE active = $1');
    });

    it('should return parameters with getParams()', () => {
      builder
        .from('users')
        .where('age > $1', [18])
        .andWhere('city = $1', ['New York']);

      const params = builder.getParams();
      expect(params).toEqual([18, 'New York']);
    });

    it('should reset builder state', () => {
      builder
        .select(['id', 'name'])
        .from('users')
        .where('active = $1', [true])
        .reset();

      const { query, params } = builder.from('posts').build();
      
      expect(query).toBe('SELECT *\nFROM posts');
      expect(params).toEqual([]);
    });
  });

  describe('parameter handling', () => {
    it('should correctly renumber parameters across multiple conditions', () => {
      const { query, params } = builder
        .from('users')
        .where('age > $1 AND status = $2', [18, 'active'])
        .andWhere('city = $1', ['New York'])
        .orWhere('country = $1 AND verified = $2', ['USA', true])
        .build();

      expect(query).toContain('WHERE age > $1 AND status = $2 AND city = $3 OR country = $4 AND verified = $5');
      expect(params).toEqual([18, 'active', 'New York', 'USA', true]);
    });

    it('should handle empty parameter arrays', () => {
      const { query, params } = builder
        .from('users')
        .where('active = true', [])
        .andWhere('deleted_at IS NULL', [])
        .build();

      expect(query).toContain('WHERE active = true AND deleted_at IS NULL');
      expect(params).toEqual([]);
    });
  });
});
    it('should handle empty conditions gracefully', () => {
      // Arrange
      const builder = SqlQueryBuilder.create()
        .select(['*'])
        .from('users');

      // Act
      const result = builder.where('').toSql();

      // Assert
      expect(result).toBe('SELECT *\nFROM users\nWHERE ');
    });

    it('should handle null parameters in where clause', () => {
      // Arrange
      const builder = SqlQueryBuilder.create()
        .select(['*'])
        .from('users');

      // Act
      const result = builder.where('id IS NULL');
      const sql = result.toSql();
      const params = result.getParams();

      // Assert
      expect(sql).toBe('SELECT *\nFROM users\nWHERE id IS NULL');
      expect(params).toEqual([]);
    });