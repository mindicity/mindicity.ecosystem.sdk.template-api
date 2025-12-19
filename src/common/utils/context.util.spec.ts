import { ContextUtil, RequestContext } from './context.util';

describe('ContextUtil', () => {
  describe('run', () => {
    it('should execute callback with request context', () => {
      const context: RequestContext = {
        correlationId: 'test-correlation-id',
        userId: 'test-user-id',
        userEmail: 'test@example.com',
        userRole: 'admin',
      };

      const result = ContextUtil.run(context, () => {
        return ContextUtil.getContext();
      });

      expect(result).toEqual(context);
    });

    it('should handle async callbacks', async () => {
      const context: RequestContext = {
        correlationId: 'async-correlation-id',
        userId: 'async-user-id',
      };

      const result = await ContextUtil.run(context, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return ContextUtil.getCorrelationId();
      });

      expect(result).toBe('async-correlation-id');
    });

    it('should maintain context across async operations', async () => {
      const context: RequestContext = {
        correlationId: 'persistent-correlation-id',
        userId: 'persistent-user-id',
      };

      await ContextUtil.run(context, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(ContextUtil.getCorrelationId()).toBe('persistent-correlation-id');

        await Promise.resolve();
        expect(ContextUtil.getUserId()).toBe('persistent-user-id');
      });
    });
  });

  describe('getContext', () => {
    it('should return current context when inside run', () => {
      const context: RequestContext = {
        correlationId: 'test-correlation-id',
        userId: 'test-user-id',
      };

      ContextUtil.run(context, () => {
        expect(ContextUtil.getContext()).toEqual(context);
      });
    });

    it('should return undefined when outside context', () => {
      expect(ContextUtil.getContext()).toBeUndefined();
    });
  });

  describe('getCorrelationId', () => {
    it('should return correlation ID from context', () => {
      const context: RequestContext = {
        correlationId: 'test-correlation-id',
        userId: 'test-user-id',
      };

      ContextUtil.run(context, () => {
        expect(ContextUtil.getCorrelationId()).toBe('test-correlation-id');
      });
    });

    it('should return "system" when outside context', () => {
      expect(ContextUtil.getCorrelationId()).toBe('system');
    });
  });

  describe('getUserId', () => {
    it('should return user ID from context', () => {
      const context: RequestContext = {
        correlationId: 'test-correlation-id',
        userId: 'test-user-id',
      };

      ContextUtil.run(context, () => {
        expect(ContextUtil.getUserId()).toBe('test-user-id');
      });
    });

    it('should return "system" when outside context', () => {
      expect(ContextUtil.getUserId()).toBe('system');
    });
  });

  describe('getUserEmail', () => {
    it('should return user email from context', () => {
      const context: RequestContext = {
        correlationId: 'test-correlation-id',
        userId: 'test-user-id',
        userEmail: 'test@example.com',
      };

      ContextUtil.run(context, () => {
        expect(ContextUtil.getUserEmail()).toBe('test@example.com');
      });
    });

    it('should return undefined when not set', () => {
      const context: RequestContext = {
        correlationId: 'test-correlation-id',
        userId: 'test-user-id',
      };

      ContextUtil.run(context, () => {
        expect(ContextUtil.getUserEmail()).toBeUndefined();
      });
    });

    it('should return undefined when outside context', () => {
      expect(ContextUtil.getUserEmail()).toBeUndefined();
    });
  });

  describe('getUserRole', () => {
    it('should return user role from context', () => {
      const context: RequestContext = {
        correlationId: 'test-correlation-id',
        userId: 'test-user-id',
        userRole: 'admin',
      };

      ContextUtil.run(context, () => {
        expect(ContextUtil.getUserRole()).toBe('admin');
      });
    });

    it('should return undefined when not set', () => {
      const context: RequestContext = {
        correlationId: 'test-correlation-id',
        userId: 'test-user-id',
      };

      ContextUtil.run(context, () => {
        expect(ContextUtil.getUserRole()).toBeUndefined();
      });
    });

    it('should return undefined when outside context', () => {
      expect(ContextUtil.getUserRole()).toBeUndefined();
    });
  });

  describe('updateContext', () => {
    it('should update existing context', () => {
      const context: RequestContext = {
        correlationId: 'test-correlation-id',
        userId: 'test-user-id',
      };

      ContextUtil.run(context, () => {
        ContextUtil.updateContext({ userEmail: 'updated@example.com' });
        expect(ContextUtil.getUserEmail()).toBe('updated@example.com');
        expect(ContextUtil.getUserId()).toBe('test-user-id'); // Should preserve existing values
      });
    });

    it('should handle partial updates', () => {
      const context: RequestContext = {
        correlationId: 'test-correlation-id',
        userId: 'test-user-id',
        userEmail: 'original@example.com',
        userRole: 'user',
      };

      ContextUtil.run(context, () => {
        ContextUtil.updateContext({ userRole: 'admin' });
        expect(ContextUtil.getUserRole()).toBe('admin');
        expect(ContextUtil.getUserEmail()).toBe('original@example.com'); // Should preserve
      });
    });

    it('should do nothing when outside context', () => {
      // Should not throw error
      expect(() => {
        ContextUtil.updateContext({ userEmail: 'test@example.com' });
      }).not.toThrow();
    });
  });

  describe('getLogPrefix', () => {
    it('should return formatted log prefix with context', () => {
      const context: RequestContext = {
        correlationId: 'test-correlation-id',
        userId: 'test-user-id',
      };

      ContextUtil.run(context, () => {
        expect(ContextUtil.getLogPrefix()).toBe('[test-correlation-id](test-user-id)');
      });
    });

    it('should return system values when outside context', () => {
      expect(ContextUtil.getLogPrefix()).toBe('[system](system)');
    });
  });

  describe('nested contexts', () => {
    it('should handle nested run contexts', () => {
      const outerContext: RequestContext = {
        correlationId: 'outer-correlation-id',
        userId: 'outer-user-id',
      };

      const innerContext: RequestContext = {
        correlationId: 'inner-correlation-id',
        userId: 'inner-user-id',
      };

      ContextUtil.run(outerContext, () => {
        expect(ContextUtil.getCorrelationId()).toBe('outer-correlation-id');

        ContextUtil.run(innerContext, () => {
          expect(ContextUtil.getCorrelationId()).toBe('inner-correlation-id');
          expect(ContextUtil.getUserId()).toBe('inner-user-id');
        });

        // Should restore outer context
        expect(ContextUtil.getCorrelationId()).toBe('outer-correlation-id');
        expect(ContextUtil.getUserId()).toBe('outer-user-id');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty string values', () => {
      const context: RequestContext = {
        correlationId: '',
        userId: '',
        userEmail: '',
        userRole: '',
      };

      ContextUtil.run(context, () => {
        // Empty strings are returned as-is (not converted to 'system')
        expect(ContextUtil.getCorrelationId()).toBe('');
        expect(ContextUtil.getUserId()).toBe('');
        expect(ContextUtil.getUserEmail()).toBe('');
        expect(ContextUtil.getUserRole()).toBe('');
      });
    });

    it('should handle special characters in values', () => {
      const context: RequestContext = {
        correlationId: 'test-correlation-id@#$%',
        userId: 'test-user-id!@#',
        userEmail: 'test+tag@example.com',
        userRole: 'admin-super',
      };

      ContextUtil.run(context, () => {
        expect(ContextUtil.getCorrelationId()).toBe('test-correlation-id@#$%');
        expect(ContextUtil.getUserId()).toBe('test-user-id!@#');
        expect(ContextUtil.getUserEmail()).toBe('test+tag@example.com');
        expect(ContextUtil.getUserRole()).toBe('admin-super');
      });
    });
  });
});
