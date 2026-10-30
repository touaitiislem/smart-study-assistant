import { Router } from 'express';
import { query } from '../db';
import { asyncHandler, HttpError } from '../errors';
import { requireAuth, uid } from '../middleware/auth';
import { uuid } from '../validators';

export const conversationsRouter = Router();
conversationsRouter.use(requireAuth);

conversationsRouter.get('/', asyncHandler(async (_req, res) => {
  res.json(await query(
    `SELECT v.*, c.title AS course_title FROM conversations v LEFT JOIN courses c ON c.id=v.course_id
     WHERE v.user_id=$1 ORDER BY v.updated_at DESC LIMIT 100`, [uid(res)]));
}));

conversationsRouter.get('/:id', asyncHandler(async (req, res) => {
  const [c] = await query('SELECT * FROM conversations WHERE id=$1 AND user_id=$2', [uuid.parse(req.params.id), uid(res)]);
  if (!c) throw new HttpError(404, 'Conversation introuvable.');
  const messages = await query('SELECT id, role, content, created_at FROM messages WHERE conversation_id=$1 ORDER BY created_at', [c.id]);
  res.json({ ...c, messages });
}));

conversationsRouter.delete('/:id', asyncHandler(async (req, res) => {
  const rows = await query('DELETE FROM conversations WHERE id=$1 AND user_id=$2 RETURNING id', [uuid.parse(req.params.id), uid(res)]);
  if (!rows[0]) throw new HttpError(404, 'Conversation introuvable.');
  res.status(204).end();
}));
