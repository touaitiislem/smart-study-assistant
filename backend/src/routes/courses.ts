import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db';
import { asyncHandler, HttpError } from '../errors';
import { requireAuth, uid } from '../middleware/auth';
import { ownedCourse } from '../services/context';
import { uuid } from '../validators';

export const coursesRouter = Router();
coursesRouter.use(requireAuth);

const createSchema = z.object({
  title: z.string().trim().min(1, 'titre requis').max(120),
  subject: z.string().trim().min(1, 'matière requise').max(80),
  description: z.string().trim().max(1000).default(''),
});
const updateSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  subject: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(1000).optional(),
});

coursesRouter.get('/', asyncHandler(async (_req, res) => {
  res.json(await query(
    `SELECT c.*,
       (SELECT count(*)::int FROM documents d WHERE d.course_id=c.id) AS document_count,
       (SELECT count(*)::int FROM study_notes n WHERE n.course_id=c.id) AS note_count,
       (SELECT count(*)::int FROM quizzes q WHERE q.course_id=c.id) AS quiz_count
     FROM courses c WHERE c.user_id=$1 ORDER BY c.updated_at DESC`, [uid(res)]));
}));

coursesRouter.post('/', asyncHandler(async (req, res) => {
  const b = createSchema.parse(req.body);
  const [c] = await query('INSERT INTO courses(user_id,title,subject,description) VALUES($1,$2,$3,$4) RETURNING *',
    [uid(res), b.title, b.subject, b.description]);
  res.status(201).json(c);
}));

coursesRouter.get('/:id', asyncHandler(async (req, res) => {
  const course = await ownedCourse(uuid.parse(req.params.id), uid(res));
  const documents = await query(
    `SELECT id, filename, mime_type, size_bytes, length(content_text)::int AS text_length, created_at
     FROM documents WHERE course_id=$1 ORDER BY created_at DESC`, [course.id]);
  const notes = await query('SELECT * FROM study_notes WHERE course_id=$1 ORDER BY created_at DESC', [course.id]);
  res.json({ ...course, documents, notes });
}));

coursesRouter.patch('/:id', asyncHandler(async (req, res) => {
  const course = await ownedCourse(uuid.parse(req.params.id), uid(res));
  const b = updateSchema.parse(req.body);
  const [c] = await query(
    `UPDATE courses SET title=COALESCE($2,title), subject=COALESCE($3,subject), description=COALESCE($4,description), updated_at=now()
     WHERE id=$1 RETURNING *`, [course.id, b.title ?? null, b.subject ?? null, b.description ?? null]);
  res.json(c);
}));

coursesRouter.delete('/:id', asyncHandler(async (req, res) => {
  const course = await ownedCourse(uuid.parse(req.params.id), uid(res));
  await query('DELETE FROM courses WHERE id=$1', [course.id]);
  res.status(204).end();
}));
