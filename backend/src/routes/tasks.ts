import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db';
import { asyncHandler, HttpError } from '../errors';
import { requireAuth, uid } from '../middleware/auth';
import { PRIORITIES, STATUSES } from '../constants';
import { ownedCourse } from '../services/context';
import { dateStr, uuid } from '../validators';

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

const createSchema = z.object({
  title: z.string().trim().min(1, 'titre requis').max(150),
  description: z.string().trim().max(1000).default(''),
  due_date: dateStr.nullable().default(null),
  priority: z.enum(PRIORITIES).default('medium'),
  status: z.enum(STATUSES).default('todo'),
  course_id: uuid.nullable().default(null),
});
const updateSchema = z.object({
  title: z.string().trim().min(1).max(150).optional(),
  description: z.string().trim().max(1000).optional(),
  due_date: dateStr.nullable().optional(),
  priority: z.enum(PRIORITIES).optional(),
  status: z.enum(STATUSES).optional(),
  course_id: uuid.nullable().optional(),
});

const SELECT = `SELECT t.*, c.title AS course_title FROM tasks t LEFT JOIN courses c ON c.id=t.course_id`;

tasksRouter.get('/', asyncHandler(async (_req, res) => {
  res.json(await query(`${SELECT} WHERE t.user_id=$1 ORDER BY (t.status='done'), t.due_date NULLS LAST, t.created_at DESC`, [uid(res)]));
}));

tasksRouter.get('/upcoming', asyncHandler(async (_req, res) => {
  res.json(await query(`${SELECT} WHERE t.user_id=$1 AND t.status<>'done' AND t.due_date IS NOT NULL ORDER BY t.due_date LIMIT 8`, [uid(res)]));
}));

tasksRouter.post('/', asyncHandler(async (req, res) => {
  const b = createSchema.parse(req.body);
  if (b.course_id) await ownedCourse(b.course_id, uid(res));
  const [t] = await query(
    'INSERT INTO tasks(user_id,course_id,title,description,due_date,priority,status) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id',
    [uid(res), b.course_id, b.title, b.description, b.due_date, b.priority, b.status]);
  res.status(201).json((await query(`${SELECT} WHERE t.id=$1`, [t.id]))[0]);
}));

tasksRouter.patch('/:id', asyncHandler(async (req, res) => {
  const id = uuid.parse(req.params.id);
  const b = updateSchema.parse(req.body);
  const fields = Object.entries(b).filter(([, v]) => v !== undefined);
  if (!fields.length) throw new HttpError(400, 'Aucune modification fournie.');
  if (b.course_id) await ownedCourse(b.course_id, uid(res));
  // Les noms de colonnes viennent du schéma Zod (liste blanche), jamais de l'utilisateur.
  const sets = fields.map(([k], i) => `${k}=$${i + 3}`).join(', ');
  const rows = await query(`UPDATE tasks SET ${sets}, updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING id`,
    [id, uid(res), ...fields.map(([, v]) => v)]);
  if (!rows[0]) throw new HttpError(404, 'Tâche introuvable.');
  res.json((await query(`${SELECT} WHERE t.id=$1`, [id]))[0]);
}));

tasksRouter.delete('/:id', asyncHandler(async (req, res) => {
  const rows = await query('DELETE FROM tasks WHERE id=$1 AND user_id=$2 RETURNING id', [uuid.parse(req.params.id), uid(res)]);
  if (!rows[0]) throw new HttpError(404, 'Tâche introuvable.');
  res.status(204).end();
}));
