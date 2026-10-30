export type User = { id: string; name: string; email: string; school: string; field: string };
export type Course = { id: string; title: string; subject: string; description: string; updated_at: string;
  document_count: number; note_count: number; quiz_count: number };
export type Doc = { id: string; filename: string; mime_type: string; size_bytes: number; text_length: number; created_at: string };
export type Note = { id: string; course_id: string; kind: 'summary' | 'explanation' | 'sheet'; title: string; content: string; created_at: string };
export type CourseDetail = Course & { documents: Doc[]; notes: Note[] };

export type Priority = 'low' | 'medium' | 'high';
export type Status = 'todo' | 'in_progress' | 'done';
export type Task = { id: string; title: string; description: string; due_date: string | null; priority: Priority; status: Status;
  course_id: string | null; course_title: string | null };

export type Difficulty = 'facile' | 'moyen' | 'difficile';
export type QuizSummary = { id: string; title: string; difficulty: Difficulty; course_title: string; question_count: number; attempts: number; best_percent: number | null };
export type QuizFull = { id: string; title: string; difficulty: Difficulty; questions: { id: string; position: number; text: string; options: string[] }[] };
export type SubmitResult = { resultId: string; score: number; total: number; percent: number;
  details: { questionId: string; text: string; options: string[]; selected: number | null; correctIndex: number; correct: boolean; explanation: string }[] };
export type QuizResultRow = { id: string; quiz_id: string; score: number; total: number; percent: number; created_at: string; title: string; difficulty: Difficulty; course_title: string };

export type Stats = {
  courses: number; documents: number; quizzes_taken: number; average_score: number; tasks_open: number; tasks_done: number;
  scoreHistory: { created_at: string; title: string; percent: number }[];
  perCourse: { id: string; title: string; notes: number; quizzes_taken: number; average_score: number | null }[];
  tasksByStatus: { status: Status; count: number }[];
};
export type Conversation = { id: string; title: string; course_id: string | null; course_title: string | null; updated_at: string };
export type Message = { id?: string; role: 'user' | 'assistant'; content: string };

export const PRIORITY_LABEL: Record<Priority, string> = { low: 'Basse', medium: 'Moyenne', high: 'Haute' };
export const STATUS_LABEL: Record<Status, string> = { todo: 'À faire', in_progress: 'En cours', done: 'Terminée' };
export const DIFFICULTIES: Difficulty[] = ['facile', 'moyen', 'difficile'];
export const NOTE_LABEL = { summary: 'Résumé', sheet: 'Fiche de révision', explanation: 'Explication' } as const;

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
export const fmtSize = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} Ko` : `${(n / 1024 / 1024).toFixed(1)} Mo`);

const pad = (n: number) => String(n).padStart(2, '0');
export const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
/** Nombre de jours entre aujourd'hui et une date AAAA-MM-JJ (négatif si dépassée). */
export const daysUntil = (due: string) => Math.round((Date.parse(due) - Date.parse(todayStr())) / 86_400_000);
export function dueLabel(due: string | null): string {
  if (!due) return 'Sans échéance';
  const d = daysUntil(due);
  return d < 0 ? `En retard de ${-d} j` : d === 0 ? "Aujourd'hui" : d === 1 ? 'Demain' : `Dans ${d} j`;
}
