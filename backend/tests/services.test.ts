import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { clip, extractJson } from '../src/utils';
import { gradeQuiz, parseQuiz } from '../src/services/quiz';
import { detectKind, extractText, safeFilename } from '../src/services/documents';

const fixture = () => readFileSync(join(__dirname, 'fixtures', 'cours.pdf'));

describe('extraction de documents', () => {
  it('extrait le texte d’un PDF', async () => {
    const buf = fixture();
    expect(detectKind(buf, 'application/octet-stream', 'cours.pdf')).toBe('pdf');
    expect(await extractText(buf, 'pdf')).toContain('Photosynthese');
  });
  it('refuse un PDF corrompu', async () => {
    await expect(extractText(Buffer.from('%PDF-1.4 nimportequoi'), 'pdf')).rejects.toThrow(/PDF/);
  });
  it('accepte le texte brut et supprime les caractères NUL', async () => {
    expect(detectKind(Buffer.from('Bonjour'), 'text/plain', 'a.txt')).toBe('text');
    expect(await extractText(Buffer.from('a\u0000b\n\n\n\nc'), 'text')).toBe('ab\n\nc');
  });
  it('refuse un exécutable déguisé en .txt ou en PDF', () => {
    expect(() => detectKind(Buffer.from([0x4d, 0x5a, 0, 0]), 'text/plain', 'virus.txt')).toThrow(/Format non supporté/);
    expect(() => detectKind(Buffer.from('<html>'), 'application/pdf', 'faux.pdf')).toThrow(/Format non supporté/);
  });
  it('nettoie les noms de fichiers', () => {
    expect(safeFilename('../../etc/passwd')).toBe('.._.._etc_passwd');
    expect(safeFilename('')).toBe('document');
  });
});

describe('quiz', () => {
  const raw = '```json\n' + JSON.stringify({ title: 'T', questions: [
    { question: 'Capitale de la France ?', options: ['Paris', 'Rome', 'Madrid', 'Berlin'], correctIndex: 0, explanation: 'Paris.' },
    { question: '2+2 ?', options: ['3', '4', '5', '6'], correctIndex: 1, explanation: '4.' },
  ] }) + '\n```';
  it('valide et mélange en conservant la bonne réponse', () => {
    const q = parseQuiz(raw, 5, () => 0.3);
    expect(q.questions).toHaveLength(2);
    expect(q.questions[0].options[q.questions[0].correctIndex]).toBe('Paris');
    expect(q.questions[1].options[q.questions[1].correctIndex]).toBe('4');
  });
  it('limite au nombre demandé', () => expect(parseQuiz(raw, 1).questions).toHaveLength(1));
  it('refuse un quiz mal formé (3 options)', () => {
    const bad = JSON.stringify({ questions: [{ question: 'Q ?', options: ['a', 'b', 'c'], correctIndex: 0 }] });
    expect(() => parseQuiz(bad, 5)).toThrow();
  });
  it('corrige et calcule le score', () => {
    const g = gradeQuiz([0, 2, 1, 3], [0, 1, 1, null]);
    expect(g).toMatchObject({ score: 2, total: 4, percent: 50, perQuestion: [true, false, true, false] });
  });
});

describe('utils', () => {
  it('extractJson tolère du texte autour', () => expect(extractJson('Voici {"a":1} fin')).toEqual({ a: 1 }));
  it('clip tronque', () => expect(clip('abcdef', 3)).toContain('tronqué'));
});
