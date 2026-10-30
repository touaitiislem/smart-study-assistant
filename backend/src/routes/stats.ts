import { Router } from 'express';
import { query } from '../db';
import { asyncHandler } from '../errors';
import { requireAuth, uid } from '../middleware/auth';

export const statsRouter = Router();
statsRouter.use(requireAuth);

statsRouter.get('/', asyncHandler(async (_req, res) => {
  const u = uid(res);
  const [counts] = await query(
    `SELECT (SELECT count(*)::int FROM courses WHERE user_id=$1) AS courses,
            (SELECT count(*)::int FROM documents WHERE user_id=$1) AS documents,
            (SELECT count(*)::int FROM quiz_results WHERE user_id=$1) AS quizzes_taken,
            (SELECT COALESCE(round(avg(score*100.0/total))::int, 0) FROM quiz_results WHERE user_id=$1) AS average_score,
            (SELECT count(*)::int FROM tasks WHERE user_id=$1 AND status<>'done') AS tasks_open,
            (SELECT count(*)::int FROM tasks WHERE user_id=$1 AND status='done') AS tasks_done`, [u]);
  const scoreHistory = (await query(
    `SELECT r.created_at, q.title, round(r.score*100.0/r.total)::int AS percent
     FROM quiz_results r JOIN quizzes q ON q.id=r.quiz_id WHERE r.user_id=$1 ORDER BY r.created_at DESC LIMIT 20`, [u])).reverse();
  const perCourse = await query(
    `SELECT c.id, c.title,
       (SELECT count(*)::int FROM study_notes n WHERE n.course_id=c.id) AS notes,
       (SELECT count(*)::int FROM quiz_results r JOIN quizzes q ON q.id=r.quiz_id WHERE q.course_id=c.id) AS quizzes_taken,
       (SELECT round(avg(r.score*100.0/r.total))::int FROM quiz_results r JOIN quizzes q ON q.id=r.quiz_id WHERE q.course_id=c.id) AS average_score
     FROM courses c WHERE c.user_id=$1 ORDER BY c.title LIMIT 12`, [u]);
  const tasksByStatus = await query('SELECT status, count(*)::int AS count FROM tasks WHERE user_id=$1 GROUP BY status', [u]);
  res.json({ ...counts, scoreHistory, perCourse, tasksByStatus });
}));
