import { Test, TestingModule } from '@nestjs/testing';
import { NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('TemplateController (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
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
    await app.close();
  });

  // Template controller is currently empty (placeholder)
  // These tests verify that the routes return 404 as expected
  
  it('/mcapi/project/template (GET) - should return 404 (no endpoints implemented)', () => {
    return request(app.getHttpServer())
      .get('/mcapi/project/template')
      .expect(404);
  });

  it('/mcapi/project/template/:id (GET) - should return 404 (no endpoints implemented)', () => {
    return request(app.getHttpServer())
      .get('/mcapi/project/template/test-id')
      .expect(404);
  });

  it('/mcapi/project/template (POST) - should return 404 (no endpoints implemented)', () => {
    const createDto = {
      name: 'Test Template',
      description: 'Test Description',
    };

    return request(app.getHttpServer())
      .post('/mcapi/project/template')
      .send(createDto)
      .expect(404);
  });

  it('/mcapi/project/template/:id (PUT) - should return 404 (no endpoints implemented)', () => {
    const updateDto = {
      name: 'Updated Template',
      description: 'Updated Description',
    };

    return request(app.getHttpServer())
      .put('/mcapi/project/template/test-id')
      .send(updateDto)
      .expect(404);
  });

  it('/mcapi/project/template/:id (DELETE) - should return 404 (no endpoints implemented)', () => {
    return request(app.getHttpServer())
      .delete('/mcapi/project/template/test-id')
      .expect(404);
  });
});