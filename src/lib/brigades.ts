// Division-wide brigade configuration (איו"ש Division)
// Binyamin = original brigade (existing system), the rest were added in the divisional expansion

export type BrigadeCode =
  | 'binyamin'
  | 'menashe'
  | 'efraim'
  | 'shomron'
  | 'etzion'
  | 'yehuda';

export interface BrigadeInfo {
  code: BrigadeCode;
  name: string; // Hebrew display name
  shortLabel: string; // shown in pill / header
  authPath: string; // dedicated signup link
}

export const BRIGADES: Record<BrigadeCode, BrigadeInfo> = {
  binyamin: {
    code: 'binyamin',
    name: 'חטיבת בנימין',
    shortLabel: 'פלנ"ג בנימין',
    authPath: '/auth',
  },
  menashe: {
    code: 'menashe',
    name: 'חטיבת מנשה',
    shortLabel: 'פלנ"ג מנשה',
    authPath: '/auth/brigade/menashe',
  },
  efraim: {
    code: 'efraim',
    name: 'חטיבת אפרים',
    shortLabel: 'פלנ"ג אפרים',
    authPath: '/auth/brigade/efraim',
  },
  shomron: {
    code: 'shomron',
    name: 'חטיבת שומרון',
    shortLabel: 'פלנ"ג שומרון',
    authPath: '/auth/brigade/shomron',
  },
  etzion: {
    code: 'etzion',
    name: 'חטיבת עציון',
    shortLabel: 'פלנ"ג עציון',
    authPath: '/auth/brigade/etzion',
  },
  yehuda: {
    code: 'yehuda',
    name: 'חטיבת יהודה',
    shortLabel: 'פלנ"ג יהודה',
    authPath: '/auth/brigade/yehuda',
  },
};

export const BRIGADE_CODES = Object.keys(BRIGADES) as BrigadeCode[];

export const isValidBrigade = (value: unknown): value is BrigadeCode =>
  typeof value === 'string' && value in BRIGADES;

export const getBrigade = (code: string | null | undefined): BrigadeInfo =>
  (code && isValidBrigade(code) ? BRIGADES[code] : BRIGADES.binyamin);

// Special "division" pseudo-brigade representing the מפאו"ג איו"ש HQ itself.
// Users registered through /auth/division get role=division_admin and brigade='division'.
export const DIVISION_BRIGADE_CODE = 'division' as const;
export const DIVISION_AUTH_PATH = '/auth/division';
export const DIVISION_LABEL = 'מפאו"ג איו"ש';

export const getBrigadeLabel = (code: string | null | undefined): string => {
  if (code === DIVISION_BRIGADE_CODE) return DIVISION_LABEL;
  return getBrigade(code).name;
};