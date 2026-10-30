import { config } from '../config';
import { HttpError } from '../errors';

export type ChatMsg = { role: 'user' | 'assistant'; content: string };

/** Appelle l'API du modèle. La clé reste strictement côté serveur. */
export async function complete(system: string, messages: ChatMsg[], maxTokens = 4096): Promise<string> {
  if (!config.anthropicKey) {
    throw new HttpError(503, "L'API IA n'est pas configurée : ajoutez ANTHROPIC_API_KEY dans backend/.env puis redémarrez le serveur.");
  }
  const r = await fetch(config.apiUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': config.anthropicKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: config.model, max_tokens: maxTokens, system, messages }),
    signal: AbortSignal.timeout(120_000),
  }).catch(() => null);
  if (!r) throw new HttpError(504, 'Le service IA est injoignable ou trop lent. Réessayez.');
  if (!r.ok) {
    console.error('Erreur API IA', r.status, await r.text().catch(() => ''));
    throw new HttpError(502,
      r.status === 401 ? 'Clé API IA invalide.' :
      r.status === 429 ? 'Limite du service IA atteinte, réessayez dans un instant.' :
      'Le service IA a renvoyé une erreur.');
  }
  const data = (await r.json()) as { content: { type: string; text?: string }[] };
  return data.content.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('');
}
