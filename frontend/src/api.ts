export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  let r: Response;
  const isForm = body instanceof FormData;
  try {
    r = await fetch('/api' + path, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Serveur injoignable. Vérifiez que le backend est lancé (npm run dev dans backend/).');
  }
  if (r.status === 204) return undefined as T;
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(r.status, data.error ?? 'Une erreur est survenue.');
  return data as T;
}

export const api = {
  get: <T,>(p: string) => req<T>('GET', p),
  post: <T,>(p: string, b: unknown = {}) => req<T>('POST', p, b),
  put: <T,>(p: string, b: unknown) => req<T>('PUT', p, b),
  patch: <T,>(p: string, b: unknown) => req<T>('PATCH', p, b),
  del: (p: string) => req<void>('DELETE', p),
  upload: <T,>(p: string, form: FormData) => req<T>('POST', p, form),
};

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Une erreur est survenue.');
