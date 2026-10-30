import 'dotenv/config';

const nodeEnv = process.env.NODE_ENV ?? 'development';
const jwtSecret = process.env.JWT_SECRET ?? (nodeEnv === 'production' ? '' : 'dev-secret-change-me');
if (!jwtSecret || jwtSecret === 'change-me') {
  if (nodeEnv === 'production') throw new Error('JWT_SECRET doit être défini en production.');
}

export const config = {
  nodeEnv,
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://study:study@localhost:5432/study',
  jwtSecret,
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? '',
  model: process.env.LLM_MODEL ?? 'claude-sonnet-5-5',
  apiUrl: process.env.LLM_API_URL ?? 'https://api.anthropic.com/v1/messages',
};
