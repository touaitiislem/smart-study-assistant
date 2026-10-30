import { z } from 'zod';
import { extractJson } from '../utils';

const quizSchema = z.object({
  title: z.string().trim().min(1).max(150).optional(),
  questions: z.array(z.object({
    question: z.string().trim().min(3).max(600),
    options: z.array(z.string().trim().min(1).max(300)).length(4),
    correctIndex: z.number().int().min(0).max(3),
    explanation: z.string().trim().max(1000).default(''),
  })).min(1).max(30),
});

export type GeneratedQuestion = { text: string; options: string[]; correctIndex: number; explanation: string };

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Valide la sortie du modèle et mélange les options (le modèle place trop souvent la bonne réponse en premier). */
export function parseQuiz(raw: string, count: number, rng: () => number = Math.random) {
  const parsed = quizSchema.parse(extractJson(raw));
  const questions: GeneratedQuestion[] = parsed.questions.slice(0, count).map((q) => {
    const order = shuffle([0, 1, 2, 3], rng);
    return { text: q.question, options: order.map((i) => q.options[i]), correctIndex: order.indexOf(q.correctIndex), explanation: q.explanation };
  });
  return { title: parsed.title, questions };
}

export function gradeQuiz(correct: number[], answers: (number | null)[]) {
  const perQuestion = correct.map((c, i) => answers[i] === c);
  const score = perQuestion.filter(Boolean).length;
  return { score, total: correct.length, percent: correct.length ? Math.round((score / correct.length) * 100) : 0, perQuestion };
}
