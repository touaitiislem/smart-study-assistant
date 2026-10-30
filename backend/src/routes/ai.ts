import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { query, tx } from '../db';
import { asyncHandler, HttpError } from '../errors';
import { requireAuth, uid } from '../middleware/auth';
import { courseContext, NO_TEXT, ownedCourse } from '../services/context';
import { complete } from '../services/llm';
import { prompts } from '../services/prompts';
import { uuid } from '../validators';

export const aiRouter = Router();
aiRouter.use(requireAuth);
aiRouter.use(rateLimit({ windowMs: 60_000, limit: 30, keyGenerator: (_req, res) => (res as any).locals.userId,
  validate: false, message: { error: 'Trop de requêtes IA, attendez une minute.' } }));

async function saveNote(userId: string, courseId: string | null, kind: 'summary' | 'explanation' | 'sheet', title: string, content: string) {
  const [n] = await query('INSERT INTO study_notes(user_id,course_id,kind,title,content) VALUES($1,$2,$3,$4,$5) RETURNING *',
    [userId, courseId, kind, title, content]);
  return n;
}

aiRouter.post('/summary', asyncHandler(async (req, res) => {
  const b = z.object({ courseId: uuid, documentId: uuid.optional() }).parse(req.body);
  const { course, text, hasText } = await courseContext(b.courseId, uid(res), { documentId: b.documentId });
  if (!hasText) throw new HttpError(422, NO_TEXT);
  const content = await complete(prompts.summary, [{ role: 'user', content: `Cours : ${course.title} (${course.subject})\n\n<documents>\n${text}\n</documents>` }]);
  res.json(await saveNote(uid(res), course.id, 'summary', `Résumé — ${course.title}`, content));
}));

aiRouter.post('/sheet', asyncHandler(async (req, res) => {
  const b = z.object({ courseId: uuid }).parse(req.body);
  const { course, text, hasText } = await courseContext(b.courseId, uid(res));
  if (!hasText) throw new HttpError(422, NO_TEXT);
  const content = await complete(prompts.sheet, [{ role: 'user', content: `Cours : ${course.title} (${course.subject})\n\n<documents>\n${text}\n</documents>` }]);
  res.json(await saveNote(uid(res), course.id, 'sheet', `Fiche de révision — ${course.title}`, content));
}));

aiRouter.post('/explain', asyncHandler(async (req, res) => {
  const b = z.object({ concept: z.string().trim().min(3, 'décrivez la notion (3 caractères min.)').max(1000), courseId: uuid.optional() }).parse(req.body);
  let ctx = '';
  let course: { id: string; title: string } | null = null;
  if (b.courseId) { const c = await courseContext(b.courseId, uid(res), { maxChars: 40_000 }); course = c.course; ctx = c.text; }
  const content = await complete(prompts.explain, [{ role: 'user',
    content: `Notion à expliquer : ${b.concept}${ctx ? `\n\nSupport de cours :\n<documents>\n${ctx}\n</documents>` : ''}` }]);
  const note = course ? await saveNote(uid(res), course.id, 'explanation', `Explication — ${b.concept.slice(0, 60)}`, content) : null;
  res.json({ content, note });
}));

aiRouter.post('/chat', asyncHandler(async (req, res) => {
  const b = z.object({ message: z.string().trim().min(1).max(8000), conversationId: uuid.optional(), courseId: uuid.optional() }).parse(req.body);
  const userId = uid(res);
  let convId = b.conversationId;
  let courseId: string | null = b.courseId ?? null;
  if (convId) {
    const [c] = await query('SELECT id, course_id FROM conversations WHERE id=$1 AND user_id=$2', [convId, userId]);
    if (!c) throw new HttpError(404, 'Conversation introuvable.');
    courseId = c.course_id;
  } else {
    if (courseId) await ownedCourse(courseId, userId);
    const [c] = await query<{ id: string }>('INSERT INTO conversations(user_id,course_id,title) VALUES($1,$2,$3) RETURNING id',
      [userId, courseId, b.message.slice(0, 60)]);
    convId = c.id;
  }
  const ctx = courseId ? (await courseContext(courseId, userId)).text : '';
  const history = await query<{ role: 'user' | 'assistant'; content: string }>(
    `SELECT role, content FROM (SELECT role, content, created_at FROM messages WHERE conversation_id=$1
     ORDER BY created_at DESC LIMIT 20) t ORDER BY created_at ASC`, [convId]);
  const reply = await complete(prompts.chat(ctx), [...history, { role: 'user', content: b.message }]);
  await tx(async (c) => {
    await c.query('INSERT INTO messages(conversation_id,role,content) VALUES($1,$2,$3)', [convId, 'user', b.message]);
    await c.query('INSERT INTO messages(conversation_id,role,content) VALUES($1,$2,$3)', [convId, 'assistant', reply]);
    await c.query('UPDATE conversations SET updated_at=now() WHERE id=$1', [convId]);
  });
  res.json({ conversationId: convId, message: reply });
}));
