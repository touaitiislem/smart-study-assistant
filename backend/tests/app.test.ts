import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

const app = createApp();

describe('API (sans base de données)', () => {
  it('GET /api/health', async () => {
    const r = await request(app).get('/api/health');
    expect(r.status).toBe(200);
  });

  it.each(['/api/courses', '/api/tasks', '/api/tasks/upcoming', '/api/quizzes', '/api/quizzes/results',
    '/api/conversations', '/api/stats', '/api/auth/me', '/api/documents/x/file'])('401 sans connexion sur %s', async (url) => {
    expect((await request(app).get(url)).status).toBe(401);
  });

  it.each([['/api/ai/summary'], ['/api/ai/chat'], ['/api/quizzes/generate'], ['/api/courses/x/documents']])(
    '401 sur POST %s sans connexion', async (url) => {
      expect((await request(app).post(url).send({})).status).toBe(401);
    });

  it("valide l'inscription", async () => {
    const r = await request(app).post('/api/auth/register').send({ name: 'Ada', email: 'ada@test.io', password: '123' });
    expect(r.status).toBe(400);
    expect(r.body.error).toContain('Données invalides');
  });

  it('valide la connexion', async () => {
    expect((await request(app).post('/api/auth/login').send({ email: 'pas-un-mail', password: 'x' })).status).toBe(400);
  });

  it('404 sur route inconnue', async () => {
    expect((await request(app).get('/api/nope')).status).toBe(404);
  });
});
