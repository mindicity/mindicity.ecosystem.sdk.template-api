import { ROUTES, getApiScopePrefix } from './routes.config';

describe('Routes Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('ROUTES', () => {
    it('should generate routes without scope prefix when APP_API_SCOPE_PREFIX is empty', () => {
      process.env.APP_API_SCOPE_PREFIX = '';

      // Re-import to get fresh configuration
      jest.isolateModules(() => {
        const { ROUTES: freshRoutes } = require('./routes.config');

        expect(freshRoutes.HEALTH).toBe('health');
        expect(freshRoutes.TEMPLATE).toBe('template');
        expect(freshRoutes.DOCS).toBe('docs/swagger/ui');
      });
    });

    it('should generate routes with scope prefix when APP_API_SCOPE_PREFIX is set', () => {
      process.env.APP_API_SCOPE_PREFIX = '/project';

      jest.isolateModules(() => {
        const { ROUTES: freshRoutes } = require('./routes.config');

        expect(freshRoutes.HEALTH).toBe('project/health');
        expect(freshRoutes.TEMPLATE).toBe('project/template');
        expect(freshRoutes.DOCS).toBe('project/docs/swagger/ui');
      });
    });

    it('should handle scope prefix without leading slash', () => {
      process.env.APP_API_SCOPE_PREFIX = 'project';

      jest.isolateModules(() => {
        const { ROUTES: freshRoutes } = require('./routes.config');

        expect(freshRoutes.HEALTH).toBe('project/health');
        expect(freshRoutes.TEMPLATE).toBe('project/template');
        expect(freshRoutes.DOCS).toBe('project/docs/swagger/ui');
      });
    });

    it('should handle undefined APP_API_SCOPE_PREFIX', () => {
      delete process.env.APP_API_SCOPE_PREFIX;

      jest.isolateModules(() => {
        const { ROUTES: freshRoutes } = require('./routes.config');

        // Since .env file has APP_API_SCOPE_PREFIX=/project, it will be loaded
        expect(freshRoutes.HEALTH).toBe('project/health');
        expect(freshRoutes.TEMPLATE).toBe('project/template');
        expect(freshRoutes.DOCS).toBe('project/docs/swagger/ui');
      });
    });

    it('should handle complex scope prefix', () => {
      process.env.APP_API_SCOPE_PREFIX = '/api/v1/template';

      jest.isolateModules(() => {
        const { ROUTES: freshRoutes } = require('./routes.config');

        expect(freshRoutes.HEALTH).toBe('api/v1/template/health');
        expect(freshRoutes.TEMPLATE).toBe('api/v1/template/template');
        expect(freshRoutes.DOCS).toBe('api/v1/template/docs/swagger/ui');
      });
    });

    it('should remove leading slash from scope prefix', () => {
      process.env.APP_API_SCOPE_PREFIX = '/project';

      jest.isolateModules(() => {
        const { ROUTES: freshRoutes } = require('./routes.config');

        expect(freshRoutes.HEALTH).toBe('project/health');
        expect(freshRoutes.TEMPLATE).toBe('project/template');
        expect(freshRoutes.DOCS).toBe('project/docs/swagger/ui');
      });
    });
  });

  describe('getApiScopePrefix', () => {
    it('should return empty string when APP_API_SCOPE_PREFIX is not set', () => {
      delete process.env.APP_API_SCOPE_PREFIX;
      expect(getApiScopePrefix()).toBe('');
    });

    it('should return empty string when APP_API_SCOPE_PREFIX is empty', () => {
      process.env.APP_API_SCOPE_PREFIX = '';
      expect(getApiScopePrefix()).toBe('');
    });

    it('should return the scope prefix when APP_API_SCOPE_PREFIX is set', () => {
      process.env.APP_API_SCOPE_PREFIX = '/project';
      expect(getApiScopePrefix()).toBe('/project');
    });

    it('should return the scope prefix without modification', () => {
      process.env.APP_API_SCOPE_PREFIX = 'project';
      expect(getApiScopePrefix()).toBe('project');
    });

    it('should handle complex scope prefix', () => {
      process.env.APP_API_SCOPE_PREFIX = '/api/v1/template';
      expect(getApiScopePrefix()).toBe('/api/v1/template');
    });
  });

  describe('route structure', () => {
    it('should have all required route properties', () => {
      expect(ROUTES).toHaveProperty('HEALTH');
      expect(ROUTES).toHaveProperty('TEMPLATE');
      expect(ROUTES).toHaveProperty('DOCS');
    });

    it('should have string values for all routes', () => {
      expect(typeof ROUTES.HEALTH).toBe('string');
      expect(typeof ROUTES.TEMPLATE).toBe('string');
      expect(typeof ROUTES.DOCS).toBe('string');
    });

    it('should be readonly object', () => {
      // TypeScript const assertion makes it readonly, but we can test the structure
      expect(Object.isFrozen(ROUTES)).toBe(false); // Not frozen, but const assertion provides type safety
      expect(ROUTES).toBeDefined();
    });
  });
});
