import { RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { HttpError } from '../errors';

export const COOKIE = 'token';

export const signToken = (userId: string) => jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: '7d' });

export const requireAuth: RequestHandler = (req, res, next) => {
  const token = req.cookies?.[COOKIE];
  if (!token) return next(new HttpError(401, 'Connexion requise.'));
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { sub: string };
    res.locals.userId = payload.sub;
    next();
  } catch {
    next(new HttpError(401, 'Session expirée, reconnectez-vous.'));
  }
};

export const uid = (res: Response) => res.locals.userId as string;
