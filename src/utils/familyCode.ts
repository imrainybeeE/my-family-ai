import { MemberRole } from '../types';

export const ALLOWED_ROLES: MemberRole[] = [
  'Me',
  'Mum',
  'Dad',
  'Brother',
  'Sister',
  'Grandparent',
  'Other',
];

export const ROLE_ICONS: Record<MemberRole, string> = {
  Me: '🎒',
  Mum: '🌸',
  Dad: '🛠️',
  Brother: '🎮',
  Sister: '🎨',
  Grandparent: '👓',
  Other: '⭐',
};

export const AVATAR_PALETTE = [
  '#F59E0B', // Warm Amber
  '#10B981', // Emerald Sage
  '#3B82F6', // Sky Blue
  '#EC4899', // Rose
  '#8B5CF6', // Purple
  '#14B8A6', // Teal
  '#F97316', // Tangerine
  '#6366F1', // Indigo
];

/**
 * Sanitizes letters input to 3 uppercase A-Z characters
 */
export function cleanLettersInput(input: string): string {
  return input.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
}

/**
 * Sanitizes digits input to 4 digits 0-9
 */
export function cleanDigitsInput(input: string): string {
  return input.replace(/[^0-9]/g, '').slice(0, 4);
}

/**
 * Generates a random 4-digit string from 1000 to 9999
 */
export function generateRandomDigits(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return num.toString();
}

/**
 * Builds standard Family Code string: AX-[3 letters]-[4 digits]
 */
export function formatFamilyCode(letters: string, digits: string): string {
  const cleanL = cleanLettersInput(letters);
  const cleanD = cleanDigitsInput(digits);
  return `AX-${cleanL}-${cleanD}`;
}

/**
 * Validates a complete Family Code string
 */
export function validateFamilyCode(code: string): { isValid: boolean; error?: string } {
  if (!code || typeof code !== 'string') {
    return { isValid: false, error: 'Family Code is required.' };
  }

  const trimmed = code.trim().toUpperCase();
  const regex = /^AX-[A-Z]{3}-[0-9]{4}$/;

  if (!regex.test(trimmed)) {
    if (!trimmed.startsWith('AX-')) {
      return { isValid: false, error: 'Code must start with AX- prefix.' };
    }
    const parts = trimmed.split('-');
    if (parts.length !== 3) {
      return { isValid: false, error: 'Code format must be AX-[3 letters]-[4 digits].' };
    }
    if (parts[1].length !== 3 || !/^[A-Z]{3}$/.test(parts[1])) {
      return { isValid: false, error: 'Letters section must be exactly 3 English letters (e.g. PAN).' };
    }
    if (parts[2].length !== 4 || !/^[0-9]{4}$/.test(parts[2])) {
      return { isValid: false, error: 'Digits section must be exactly 4 numbers (e.g. 4827).' };
    }
    return { isValid: false, error: 'Invalid Family Code format.' };
  }

  return { isValid: true };
}

/**
 * Validates a member role and optional nickname
 */
export function validateMemberInput(member: { role: string; nickname?: string }): { isValid: boolean; error?: string } {
  if (!member.role || !ALLOWED_ROLES.includes(member.role as MemberRole)) {
    return { isValid: false, error: 'Please choose a valid family role.' };
  }

  if (member.nickname) {
    const trimmedNick = member.nickname.trim();
    if (trimmedNick.length > 30) {
      return { isValid: false, error: 'Nickname must be 30 characters or fewer.' };
    }
    // Discourage full names (space-separated first & last name) for privacy
    if (trimmedNick.includes(' ') && trimmedNick.split(/\s+/).length > 2) {
      return { isValid: false, error: 'Please keep it to a short nickname (no full names).' };
    }
  }

  return { isValid: true };
}
