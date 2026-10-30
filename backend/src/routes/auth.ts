import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { query } from '../db';
import { asyncHandler, HttpError } from '../errors';
import { COOKIE, requireAuth, signToken, uid } from '../middleware/auth';

export const authRouter = Router();

authRouter.use(['/login', '/register'],
  rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, message: { error: 'Trop de tentatives, patientez quelques minutes.' } }));

const password = z.string().min(8, 'au moins 8 caractères').max(100);
const registerSchema = z.object({
  name: z.string().trim().min(2, 'au moins 2 caractères').max(60),
  email: z.string().trim().toLowerCase().email('adresse e-mail invalide').max(200),
  password,
});
const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(100) });
const profileSchema = z.object({
  name: z.string().trim().min(2, 'au moins 2 caractères').max(60),
  school: z.string().trim().max(120).default(''),
  field: z.string().trim().max(120).default(''),
});

function setSession(res: Response, userId: string) {
  res.cookie(COOKIE, signToken(userId), { httpOnly: true, sameSite: 'lax', secure: config.nodeEnv === 'production', maxAge: 7 * 24 * 3600 * 1000 });
}
const publicUser = (u: any) => ({ id: u.id, name: u.name, email: u.email, school: u.school, field: u.field, created_at: u.created_at });

authRouter.post('/register', asyncHandler(async (req, res) => {
  const b = registerSchema.parse(req.body);
  if ((await query('SELECT 1 FROM users WHERE email=$1', [b.email]))[0]) throw new HttpError(409, 'Un compte existe déjà avec cette adresse e-mail.');
  const hash = await bcrypt.hash(b.password, 12);
  const [user] = await query('INSERT INTO users(email,name,password_hash) VALUES($1,$2,$3) RETURNING *', [b.email, b.name, hash]);
  setSession(res, user.id);
  res.status(201).json(publicUser(user));
}));

authRouter.post('/login', asyncHandler(async (req, res) => {
  const b = loginSchema.parse(req.body);
  const [user] = await query('SELECT * FROM users WHERE email=$1', [b.email]);
  if (!user || !(await bcrypt.compare(b.password, user.password_hash))) throw new HttpError(401, 'E-mail ou mot de passe incorrect.');
  setSession(res, user.id);
  res.json(publicUser(user));
}));

authRouter.post('/logout', (_req, res) => { res.clearCookie(COOKIE); res.status(204).end(); });

authRouter.get('/me', requireAuth, asyncHandler(async (_req, res) => {
  const [user] = await query('SELECT * FROM users WHERE id=$1', [uid(res)]);
  if (!user) throw new HttpError(401, 'Compte introuvable.');
  res.json(publicUser(user));
}));

authRouter.patch('/me', requireAuth, asyncHandler(async (req, res) => {
  const b = profileSchema.parse(req.body);
  const [user] = await query('UPDATE users SET name=$2, school=$3, field=$4 WHERE id=$1 RETURNING *', [uid(res), b.name, b.school, b.field]);
  res.json(publicUser(user));
}));

authRouter.post('/password', requireAuth, asyncHandler(async (req, res) => {
  const b = z.object({ current: z.string().min(1).max(100), next: password }).parse(req.body);
  const [user] = await query('SELECT * FROM users WHERE id=$1', [uid(res)]);
  if (!(await bcrypt.compare(b.current, user.password_hash))) throw new HttpError(400, 'Le mot de passe actuel est incorrect.');
  await query('UPDATE users SET password_hash=$2 WHERE id=$1', [user.id, await bcrypt.hash(b.next, 12)]);
  res.status(204).end();
}));
