import { Test, TestingModule } from '@nestjs/testing';
import { NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    // Set test environment variables to avoid database connection issues
    process.env.DB_CHECK = 'false';
    process.env.MCP_ENABLED = 'false';
    process.env.APP_LOG_LEVEL = 'error'; // Reduce log noise during tests
    
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    
    // Set the global prefix like in main.ts
    const configService = app.get(ConfigService);
    const appConfig = configService.get('app');
    app.setGlobalPrefix(appConfig.apiPrefix);
    
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/mcapi/project/health/ping (GET)', () => {
    return request(app.getHttpServer())
      .get('/mcapi/project/health/ping')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('status');
        expect(res.body.status).toBe('ok');
        expect(res.body).toHaveProperty('version');
      });
  });

  it('should handle 404 for unknown routes', () => {
    return request(app.getHttpServer())
      .get('/mcapi/unknown-route')
      .expect(404);
  });

  it('should handle 404 for template routes (empty controller)', () => {
    return request(app.getHttpServer())
      .get('/mcapi/project/template')
      .expect(404);
  });
});