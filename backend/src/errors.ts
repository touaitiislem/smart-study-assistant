import { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => `${i.path.join('.') || 'corps'} : ${i.message}`).join(' ; ');
    return res.status(400).json({ error: `Données invalides — ${details}` });
  }
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if ((err as any)?.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON invalide.' });
  if ((err as any)?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Fichier trop volumineux (10 Mo maximum).' });
  if ((err as any)?.code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).json({ error: 'Envoyez un seul fichier dans le champ « file ».' });
  if ((err as any)?.type === 'entity.too.large') return res.status(413).json({ error: 'Contenu trop volumineux.' });
  console.error(err);
  res.status(500).json({ error: 'Erreur interne du serveur. Réessayez dans un instant.' });
}
