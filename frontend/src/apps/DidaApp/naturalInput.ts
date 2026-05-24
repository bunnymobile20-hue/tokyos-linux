interface ParsedNaturalTask {
  title: string;
  dueDate?: string;
  isAllDay: boolean;
  reminder?: string;
}

const DATE_REGEX = /Depois de amanhã|depois de amanhã|amanhã|hoje|essa noite|próxima semana[Um, dois, três, quatro, cinco, seis dias]/g;
const PERIOD_REGEX = /de manhã cedo|Manhã|manhã|meio-dia|tarde|noite/g;
const TIME_COLON_REGEX = /\d{1,2}[:：]\d{1,2}/g;
const TIME_DOT_REGEX = /\d{1,2}apontar(Metade|momento|três quartos|\d{1,2}apontar?)?/g;

function normalizeText(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

function parseDayOffset(text: string): number | null {
  if (text.includes('Depois de amanhã')) return 3;
  if (text.includes('depois de amanhã')) return 2;
  if (text.includes('amanhã')) return 1;
  if (text.includes('hoje') || text.includes('essa noite')) return 0;
  return null;
}

function parseNextWeekday(text: string, now: Date): Date | null {
  const match = text.match(/próxima semana([Um, dois, três, quatro, cinco, seis dias])/);
  if (!match) return null;

  const weekdayMap: Record<string, number> = {
    um: 1,
    dois: 2,
    três: 3,
    Quatro: 4,
    cinco: 5,
    seis: 6,
    dia: 0,
    céu: 0,
  };

  const targetWeekday = weekdayMap[match[1]];
  const base = new Date(now);
  base.setHours(0, 0, 0, 0);

  const currentWeekday = base.getDay();
  const toNextMonday = ((8 - currentWeekday) % 7) || 7;
  base.setDate(base.getDate() + toNextMonday);

  const mondayBased = targetWeekday === 0 ? 6 : targetWeekday - 1;
  base.setDate(base.getDate() + mondayBased);

  return base;
}

function parseTime(text: string): { hour: number; minute: number } | null {
  const colonMatch = text.match(/(de manhã cedo|Manhã|manhã|meio-dia|tarde|noite)?\s*(\d{1,2})[:：](\d{1,2})/);
  if (colonMatch) {
    const period = colonMatch[1] || (text.includes('essa noite') ? 'noite' : '');
    let hour = Number(colonMatch[2]);
    const minute = Number(colonMatch[3]);

    if ((period === 'tarde' || period === 'noite') && hour < 12) hour += 12;
    if (period === 'meio-dia' && hour < 11) hour += 12;
    if (period === 'de manhã cedo' && hour === 12) hour = 0;

    return { hour, minute };
  }

  const dotMatch = text.match(/(de manhã cedo|Manhã|manhã|meio-dia|tarde|noite)?\s*(\d{1,2})apontar(Metade|momento|três quartos|(\d{1,2})apontar?)?/);
  if (!dotMatch) return null;

  const period = dotMatch[1] || (text.includes('essa noite') ? 'noite' : '');
  let hour = Number(dotMatch[2]);
  let minute = 0;
  const tail = dotMatch[3] || '';

  if (tail === 'Metade') minute = 30;
  else if (tail === 'momento') minute = 15;
  else if (tail === 'três quartos') minute = 45;
  else if (dotMatch[4]) minute = Number(dotMatch[4]);

  if ((period === 'tarde' || period === 'noite') && hour < 12) hour += 12;
  if (period === 'meio-dia' && hour < 11) hour += 12;
  if (period === 'de manhã cedo' && hour === 12) hour = 0;

  return { hour, minute };
}

function cleanupTitle(rawInput: string): string {
  const text = rawInput
    .replace(DATE_REGEX, ' ')
    .replace(PERIOD_REGEX, ' ')
    .replace(TIME_COLON_REGEX, ' ')
    .replace(TIME_DOT_REGEX, ' ')
    .replace(/(^|\s)(ir|querer|existir)(?=[\u4e00-\u9fa5])/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text || normalizeText(rawInput);
}

export function getNaturalTimeFragments(input: string): string[] {
  const text = normalizeText(input);
  if (!text) return [];

  const fragments = [
    ...(text.match(DATE_REGEX) || []),
    ...(text.match(PERIOD_REGEX) || []),
    ...(text.match(TIME_COLON_REGEX) || []),
    ...(text.match(TIME_DOT_REGEX) || []),
  ];

  return Array.from(new Set(fragments));
}

export function parseNaturalTaskInput(input: string, now: Date = new Date()): ParsedNaturalTask {
  const normalized = normalizeText(input);
  if (!normalized) {
    return { title: '', isAllDay: true };
  }

  const nextWeekdayDate = parseNextWeekday(normalized, now);
  const dayOffset = parseDayOffset(normalized);
  const time = parseTime(normalized);

  const dueBase = nextWeekdayDate
    ? new Date(nextWeekdayDate)
    : dayOffset !== null
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset)
      : null;

  let dueDate: string | undefined;
  let isAllDay = true;
  let reminder: string | undefined;

  if (dueBase) {
    if (time) {
      dueBase.setHours(time.hour, time.minute, 0, 0);
      isAllDay = false;
      reminder = '0';
    } else {
      dueBase.setHours(0, 0, 0, 0);
    }
    dueDate = dueBase.toISOString();
  }

  return {
    title: cleanupTitle(normalized),
    dueDate,
    isAllDay,
    reminder,
  };
}
