import { Router } from 'express';
import { z } from 'zod';
import { query, tx } from '../db';
import { asyncHandler, HttpError } from '../errors';
import { requireAuth, uid } from '../middleware/auth';
import { DIFFICULTIES } from '../constants';
import { courseContext } from '../services/context';
import { complete } from '../services/llm';
import { prompts } from '../services/prompts';
import { gradeQuiz, parseQuiz } from '../services/quiz';
import { uuid } from '../validators';

export const quizzesRouter = Router();
quizzesRouter.use(requireAuth);

quizzesRouter.get('/', asyncHandler(async (_req, res) => {
  res.json(await query(
    `SELECT q.id, q.title, q.difficulty, q.created_at, c.title AS course_title,
       (SELECT count(*)::int FROM questions x WHERE x.quiz_id=q.id) AS question_count,
       (SELECT count(*)::int FROM quiz_results r WHERE r.quiz_id=q.id) AS attempts,
       (SELECT max(round(r.score*100.0/r.total))::int FROM quiz_results r WHERE r.quiz_id=q.id) AS best_percent
     FROM quizzes q JOIN courses c ON c.id=q.course_id WHERE q.user_id=$1 ORDER BY q.created_at DESC`, [uid(res)]));
}));

quizzesRouter.post('/generate', asyncHandler(async (req, res) => {
  const b = z.object({
    courseId: uuid, difficulty: z.enum(DIFFICULTIES).default('moyen'),
    count: z.coerce.number().int().min(3, 'minimum 3 questions').max(20, 'maximum 20 questions').default(5),
    topic: z.string().trim().max(200).optional(),
  }).parse(req.body);
  const { course, text, hasText } = await courseContext(b.courseId, uid(res));
  if (!hasText) throw new HttpError(422, "Ce cours n'a pas de document exploitable : importez un PDF avec du texte pour générer un quiz.");
  const raw = await complete(prompts.quiz(b.count, b.difficulty), [{ role: 'user',
    content: `Cours : ${course.title} (${course.subject})${b.topic ? `\nThème ciblé : ${b.topic}` : ''}\n\n<documents>\n${text}\n</documents>` }], 6000);
  let parsed: ReturnType<typeof parseQuiz>;
  try { parsed = parseQuiz(raw, b.count); }
  catch { throw new HttpError(502, "L'IA a renvoyé un quiz inexploitable. Réessayez."); }

  const quiz = await tx(async (c) => {
    const { rows } = await c.query('INSERT INTO quizzes(user_id,course_id,title,difficulty) VALUES($1,$2,$3,$4) RETURNING *',
      [uid(res), course.id, parsed.title ?? `Quiz — ${course.title}`, b.difficulty]);
    for (const [i, q] of parsed.questions.entries()) {
      await c.query('INSERT INTO questions(quiz_id,position,text,options,correct_index,explanation) VALUES($1,$2,$3,$4,$5,$6)',
        [rows[0].id, i, q.text, JSON.stringify(q.options), q.correctIndex, q.explanation]);
    }
    return rows[0];
  });
  res.status(201).json({ ...quiz, question_count: parsed.questions.length });
}));

quizzesRouter.get('/results', asyncHandler(async (_req, res) => {
  res.json(await query(
    `SELECT r.id, r.quiz_id, r.score, r.total, round(r.score*100.0/r.total)::int AS percent, r.created_at,
            q.title, q.difficulty, c.title AS course_title
     FROM quiz_results r JOIN quizzes q ON q.id=r.quiz_id JOIN courses c ON c.id=q.course_id
     WHERE r.user_id=$1 ORDER BY r.created_at DESC LIMIT 100`, [uid(res)]));
}));

async function ownedQuiz(id: string, userId: string) {
  const [q] = await query('SELECT * FROM quizzes WHERE id=$1 AND user_id=$2', [uuid.parse(id), userId]);
  if (!q) throw new HttpError(404, 'Quiz introuvable.');
  return q;
}

/** Les bonnes réponses ne sont volontairement PAS envoyées avant la soumission. */
quizzesRouter.get('/:id', asyncHandler(async (req, res) => {
  const quiz = await ownedQuiz(req.params.id, uid(res));
  const questions = await query('SELECT id, position, text, options FROM questions WHERE quiz_id=$1 ORDER BY position', [quiz.id]);
  res.json({ ...quiz, questions });
}));

quizzesRouter.post('/:id/submit', asyncHandler(async (req, res) => {
  const quiz = await ownedQuiz(req.params.id, uid(res));
  const questions = await query<{ id: string; text: string; options: string[]; correct_index: number; explanation: string }>(
    'SELECT id, text, options, correct_index, explanation FROM questions WHERE quiz_id=$1 ORDER BY position', [quiz.id]);
  const b = z.object({ answers: z.array(z.number().int().min(0).max(3).nullable()).length(questions.length, 'une réponse (ou null) par question') }).parse(req.body);
  const g = gradeQuiz(questions.map((q) => q.correct_index), b.answers);
  const [r] = await query<{ id: string }>('INSERT INTO quiz_results(quiz_id,user_id,score,total,answers) VALUES($1,$2,$3,$4,$5) RETURNING id',
    [quiz.id, uid(res), g.score, g.total, JSON.stringify(b.answers)]);
  res.json({
    resultId: r.id, score: g.score, total: g.total, percent: g.percent,
    details: questions.map((q, i) => ({ questionId: q.id, text: q.text, options: q.options, selected: b.answers[i],
      correctIndex: q.correct_index, correct: g.perQuestion[i], explanation: q.explanation })),
  });
}));

quizzesRouter.delete('/:id', asyncHandler(async (req, res) => {
  const quiz = await ownedQuiz(req.params.id, uid(res));
  await query('DELETE FROM quizzes WHERE id=$1', [quiz.id]);
  res.status(204).end();
}));
