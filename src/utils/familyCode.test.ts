import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanLettersInput,
  cleanDigitsInput,
  generateRandomDigits,
  formatFamilyCode,
  validateFamilyCode,
  validateMemberInput,
  ALLOWED_ROLES,
} from './familyCode';

test('cleanLettersInput uppercases and keeps only 3 letters', () => {
  assert.equal(cleanLettersInput('pan'), 'PAN');
  assert.equal(cleanLettersInput('p-a_n!123'), 'PAN');
  assert.equal(cleanLettersInput('FAMILY'), 'FAM');
  assert.equal(cleanLettersInput('a'), 'A');
});

test('cleanDigitsInput filters non-digits and truncates to 4', () => {
  assert.equal(cleanDigitsInput('4827'), '4827');
  assert.equal(cleanDigitsInput('482799'), '4827');
  assert.equal(cleanDigitsInput('4a8b2c7'), '4827');
  assert.equal(cleanDigitsInput('12'), '12');
});

test('generateRandomDigits returns 4 numeric characters between 1000 and 9999', () => {
  for (let i = 0; i < 20; i++) {
    const digits = generateRandomDigits();
    assert.equal(digits.length, 4);
    const num = parseInt(digits, 10);
    assert.ok(num >= 1000 && num <= 9999);
  }
});

test('formatFamilyCode creates standard AX-XXX-#### string', () => {
  assert.equal(formatFamilyCode('pan', '4827'), 'AX-PAN-4827');
  assert.equal(formatFamilyCode('SUN', '9012'), 'AX-SUN-9012');
});

test('validateFamilyCode passes valid codes', () => {
  assert.deepEqual(validateFamilyCode('AX-PAN-4827'), { isValid: true });
  assert.deepEqual(validateFamilyCode('AX-JOY-1029'), { isValid: true });
  assert.deepEqual(validateFamilyCode('AX-CAT-0001'), { isValid: true });
});

test('validateFamilyCode rejects invalid codes with helpful errors', () => {
  assert.equal(validateFamilyCode('').isValid, false);
  assert.equal(validateFamilyCode('BX-PAN-4827').isValid, false);
  assert.equal(validateFamilyCode('AX-PA-4827').isValid, false);
  assert.equal(validateFamilyCode('AX-PANN-4827').isValid, false);
  assert.equal(validateFamilyCode('AX-PAN-482').isValid, false);
  assert.equal(validateFamilyCode('AX-PAN-48279').isValid, false);
  assert.equal(validateFamilyCode('AX-123-4827').isValid, false);
});

test('validateMemberInput checks role validity and nickname length', () => {
  for (const role of ALLOWED_ROLES) {
    assert.deepEqual(validateMemberInput({ role }), { isValid: true });
  }

  assert.deepEqual(validateMemberInput({ role: 'Me', nickname: 'Alex' }), { isValid: true });
  assert.equal(validateMemberInput({ role: 'Alien' as any }).isValid, false);

  const longNick = 'A'.repeat(35);
  assert.equal(validateMemberInput({ role: 'Me', nickname: longNick }).isValid, false);
});
