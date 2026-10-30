import { query } from '../db';
import { HttpError } from '../errors';
import { clip } from '../utils';

export async function ownedCourse(courseId: string, userId: string) {
  const [c] = await query('SELECT * FROM courses WHERE id=$1 AND user_id=$2', [courseId, userId]);
  if (!c) throw new HttpError(404, 'Cours introuvable.');
  return c as { id: string; title: string; subject: string; description: string };
}

/** Texte des documents d'un cours, prêt à être injecté dans un prompt. */
export async function courseContext(courseId: string, userId: string, opts: { documentId?: string; maxChars?: number } = {}) {
  const course = await ownedCourse(courseId, userId);
  const docs = await query<{ filename: string; content_text: string }>(
    `SELECT filename, content_text FROM documents WHERE course_id=$1 AND user_id=$2 AND length(content_text) > 0
     ${opts.documentId ? 'AND id=$3' : ''} ORDER BY created_at`,
    opts.documentId ? [courseId, userId, opts.documentId] : [courseId, userId]);
  const text = clip(docs.map((d) => `### Document : ${d.filename}\n${d.content_text}`).join('\n\n'), opts.maxChars ?? 60_000);
  return { course, text, hasText: docs.length > 0 };
}

export const NO_TEXT = "Ce cours n'a pas encore de document exploitable. Importez un PDF contenant du texte dans la page du cours.";
