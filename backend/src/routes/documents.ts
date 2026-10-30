import { Router } from 'express';
import multer from 'multer';
import { query } from '../db';
import { asyncHandler, HttpError } from '../errors';
import { requireAuth, uid } from '../middleware/auth';
import { ownedCourse } from '../services/context';
import { detectKind, extractText, safeFilename } from '../services/documents';
import { uuid } from '../validators';

export const documentsRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } });

documentsRouter.post('/courses/:courseId/documents', requireAuth, upload.single('file'), asyncHandler(async (req, res) => {
  const course = await ownedCourse(uuid.parse(req.params.courseId), uid(res));
  const file = req.file;
  if (!file) throw new HttpError(400, 'Aucun fichier reçu (champ « file »).');
  const filename = safeFilename(file.originalname);
  const kind = detectKind(file.buffer, file.mimetype, filename);
  const text = await extractText(file.buffer, kind);
  const [doc] = await query(
    `INSERT INTO documents(user_id,course_id,filename,mime_type,size_bytes,content_text,data) VALUES($1,$2,$3,$4,$5,$6,$7)
     RETURNING id, filename, mime_type, size_bytes, length(content_text)::int AS text_length, created_at`,
    [uid(res), course.id, filename, kind === 'pdf' ? 'application/pdf' : 'text/plain', file.size, text, file.buffer]);
  await query('UPDATE courses SET updated_at=now() WHERE id=$1', [course.id]);
  res.status(201).json({ ...doc, warning: text ? null : "Aucun texte n'a pu être extrait (PDF scanné ?). L'IA ne pourra pas utiliser ce document." });
}));

documentsRouter.get('/documents/:id/file', requireAuth, asyncHandler(async (req, res) => {
  const [d] = await query('SELECT filename, mime_type, data FROM documents WHERE id=$1 AND user_id=$2', [uuid.parse(req.params.id), uid(res)]);
  if (!d) throw new HttpError(404, 'Document introuvable.');
  const disposition = req.query.download ? 'attachment' : 'inline';
  res.setHeader('Content-Type', d.mime_type === 'application/pdf' ? 'application/pdf' : 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `${disposition}; filename*=UTF-8''${encodeURIComponent(d.filename)}`);
  res.send(d.data);
}));

documentsRouter.delete('/documents/:id', requireAuth, asyncHandler(async (req, res) => {
  const rows = await query('DELETE FROM documents WHERE id=$1 AND user_id=$2 RETURNING id', [uuid.parse(req.params.id), uid(res)]);
  if (!rows[0]) throw new HttpError(404, 'Document introuvable.');
  res.status(204).end();
}));

documentsRouter.delete('/notes/:id', requireAuth, asyncHandler(async (req, res) => {
  const rows = await query('DELETE FROM study_notes WHERE id=$1 AND user_id=$2 RETURNING id', [uuid.parse(req.params.id), uid(res)]);
  if (!rows[0]) throw new HttpError(404, 'Note introuvable.');
  res.status(204).end();
}));
