import { describe, expect, it } from 'vitest';
import { daysUntil, dueLabel, fmtSize, todayStr } from './lib';

const shift = (days: number) => { const d = new Date(todayStr() + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };

describe('dates d’échéance', () => {
  it('calcule les jours restants', () => {
    expect(daysUntil(todayStr())).toBe(0);
    expect(daysUntil(shift(3))).toBe(3);
    expect(daysUntil(shift(-2))).toBe(-2);
  });
  it('formate les libellés', () => {
    expect(dueLabel(null)).toBe('Sans échéance');
    expect(dueLabel(todayStr())).toBe("Aujourd'hui");
    expect(dueLabel(shift(1))).toBe('Demain');
    expect(dueLabel(shift(-2))).toBe('En retard de 2 j');
  });
  it('formate les tailles', () => {
    expect(fmtSize(500)).toBe('1 Ko');
    expect(fmtSize(2 * 1024 * 1024)).toBe('2.0 Mo');
  });
});
