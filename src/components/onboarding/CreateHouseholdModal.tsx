import React, { useState, useEffect } from 'react';
import {
  X,
  Dice5,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  Users,
  UserCheck,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { MemberRole } from '../../types';
import {
  cleanLettersInput,
  cleanDigitsInput,
  generateRandomDigits,
  formatFamilyCode,
  validateFamilyCode,
  validateMemberInput,
  ALLOWED_ROLES,
  ROLE_ICONS,
  AVATAR_PALETTE,
} from '../../utils/familyCode';
import { checkFamilyCodeAvailability } from '../../services/householdService';
import { useHousehold } from '../../context/HouseholdContext';

interface CreateHouseholdModalProps {
  onClose: () => void;
}

interface TempMember {
  id: string;
  role: MemberRole;
  nickname: string;
  avatarColor: string;
}

export const CreateHouseholdModal: React.FC<CreateHouseholdModalProps> = ({ onClose }) => {
  const { createHousehold } = useHousehold();

  // Wizard step
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Code state
  const [letters, setLetters] = useState('PAN');
  const [digits, setDigits] = useState(() => generateRandomDigits());
  const [householdName, setHouseholdName] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle');
  const [availabilityMsg, setAvailabilityMsg] = useState<string>('');

  // Step 2: Members state
  const [members, setMembers] = useState<TempMember[]>([
    { id: '1', role: 'Me', nickname: '', avatarColor: AVATAR_PALETTE[0] },
    { id: '2', role: 'Mum', nickname: '', avatarColor: AVATAR_PALETTE[1] },
  ]);
  const [selectedMyIndex, setSelectedMyIndex] = useState<number>(0);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fullCode = formatFamilyCode(letters, digits);

  // Availability check
  useEffect(() => {
    const valResult = validateFamilyCode(fullCode);
    if (!valResult.isValid) {
      setAvailabilityStatus('invalid');
      setAvailabilityMsg(valResult.error || 'Invalid code format');
      return;
    }

    let isCurrent = true;
    setAvailabilityStatus('checking');
    setAvailabilityMsg('Checking availability...');

    const timer = setTimeout(async () => {
      try {
        const isFree = await checkFamilyCodeAvailability(fullCode);
        if (!isCurrent) return;
        if (isFree) {
          setAvailabilityStatus('available');
          setAvailabilityMsg('Code is available');
        } else {
          setAvailabilityStatus('taken');
          setAvailabilityMsg('Code already taken. Pick different letters.');
        }
      } catch {
        if (!isCurrent) return;
        setAvailabilityStatus('idle');
        setAvailabilityMsg('');
      }
    }, 350);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [fullCode]);

  const handleRollDigits = () => {
    setDigits(generateRandomDigits());
  };

  const handleAddMember = () => {
    if (members.length >= 8) return;
    const nextRole: MemberRole =
      members.length === 2 ? 'Dad' : members.length === 3 ? 'Brother' : 'Other';
    setMembers((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        role: nextRole,
        nickname: '',
        avatarColor: AVATAR_PALETTE[prev.length % AVATAR_PALETTE.length],
      },
    ]);
  };

  const handleRemoveMember = (idxToRemove: number) => {
    if (members.length <= 1) return;
    setMembers((prev) => prev.filter((_, idx) => idx !== idxToRemove));
    if (selectedMyIndex >= idxToRemove && selectedMyIndex > 0) {
      setSelectedMyIndex((prev) => prev - 1);
    }
  };

  const handleUpdateMember = (
    idx: number,
    field: 'role' | 'nickname' | 'avatarColor',
    value: string
  ) => {
    setMembers((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const handleProceedToMembers = () => {
    const val = validateFamilyCode(fullCode);
    if (!val.isValid) {
      setSubmitError(val.error || 'Please enter a valid Family Code');
      return;
    }
    if (availabilityStatus === 'taken') {
      setSubmitError('This Family Code is already in use. Please pick different letters or roll numbers.');
      return;
    }
    setSubmitError(null);
    setStep(2);
  };

  const handleCreateHousehold = async () => {
    setSubmitError(null);

    // Validate members
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      const val = validateMemberInput({ role: m.role, nickname: m.nickname });
      if (!val.isValid) {
        setSubmitError(`Member #${i + 1}: ${val.error}`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await createHousehold(
        fullCode,
        householdName || undefined,
        members.map((m) => ({
          role: m.role,
          nickname: m.nickname,
          avatarColor: m.avatarColor,
        })),
        selectedMyIndex
      );
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create household. Please retry.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-[400px] max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Create household
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Step {step} of 2: {step === 1 ? 'Family Code' : 'Members'}
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto no-scrollbar space-y-4 flex-1">
          {submitError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <span>{submitError}</span>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Pick your Family Code
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Choose any 3 English letters. We'll add 4 numbers to make it unique across devices.
                </p>
              </div>

              {/* Code Preview Card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center space-y-1.5">
                <div className="text-2xl font-mono-code font-bold text-slate-900 dark:text-slate-100 tracking-wider">
                  {fullCode}
                </div>

                <div className="flex items-center justify-center gap-1.5 text-xs">
                  {availabilityStatus === 'checking' && (
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                      <Loader2 className="w-3 h-3 animate-spin text-slate-400" /> Checking...
                    </span>
                  )}
                  {availabilityStatus === 'available' && (
                    <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1 text-[11px] font-medium">
                      <Check className="w-3.5 h-3.5" /> Code is available
                    </span>
                  )}
                  {availabilityStatus === 'taken' && (
                    <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1 text-[11px] font-medium">
                      <AlertCircle className="w-3.5 h-3.5" /> Code already in use
                    </span>
                  )}
                  {availabilityStatus === 'invalid' && (
                    <span className="text-slate-400 text-[11px]">{availabilityMsg}</span>
                  )}
                </div>
              </div>

              {/* Input Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="code-letters" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Your 3 letters
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono-code text-slate-400 font-bold">
                      AX-
                    </span>
                    <input
                      id="code-letters"
                      type="text"
                      maxLength={3}
                      value={letters}
                      onChange={(e) => setLetters(cleanLettersInput(e.target.value))}
                      placeholder="PAN"
                      className="w-full pl-9 pr-2 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-center font-mono-code font-bold uppercase text-sm tracking-wider focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="code-digits" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      4 digits
                    </label>
                    <button
                      type="button"
                      onClick={handleRollDigits}
                      className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
                    >
                      <Dice5 className="w-3 h-3" /> Roll
                    </button>
                  </div>
                  <input
                    id="code-digits"
                    type="text"
                    maxLength={4}
                    value={digits}
                    onChange={(e) => setDigits(cleanDigitsInput(e.target.value))}
                    placeholder="4827"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-center font-mono-code font-bold text-sm tracking-wider focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              {/* Optional Household Name */}
              <div>
                <label htmlFor="household-name" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Household name <span className="font-normal text-slate-400">(Optional)</span>
                </label>
                <input
                  id="household-name"
                  type="text"
                  maxLength={50}
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  placeholder="e.g. Living Room"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    Members ({members.length})
                  </label>
                  <p className="text-xs text-slate-400">
                    Assign roles and optional nicknames.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddMember}
                  disabled={members.length >= 8}
                  className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              {/* Members List */}
              <div className="space-y-2.5">
                {members.map((mem, idx) => {
                  const isSelectedAsMe = selectedMyIndex === idx;

                  return (
                    <div
                      key={mem.id}
                      className={`p-3 rounded-2xl border transition-all ${
                        isSelectedAsMe
                          ? 'border-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/30'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-7 h-7 rounded-full flex items-center justify-center text-sm shadow-2xs"
                            style={{ backgroundColor: mem.avatarColor }}
                          >
                            {ROLE_ICONS[mem.role] || '👤'}
                          </span>
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            Member #{idx + 1}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedMyIndex(idx)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-medium flex items-center gap-1 transition cursor-pointer ${
                              isSelectedAsMe
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            <UserCheck className="w-3 h-3" />
                            {isSelectedAsMe ? 'This phone' : 'Set as you'}
                          </button>

                          {members.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(idx)}
                              className="p-1 text-slate-400 hover:text-rose-500 rounded transition cursor-pointer"
                              aria-label={`Remove Member ${idx + 1}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Inputs: Role & Nickname */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                            Role
                          </label>
                          <select
                            value={mem.role}
                            onChange={(e) =>
                              handleUpdateMember(idx, 'role', e.target.value as MemberRole)
                            }
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 font-medium outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            {ALLOWED_ROLES.map((role) => (
                              <option key={role} value={role}>
                                {ROLE_ICONS[role]} {role}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                            Nickname <span className="text-slate-400 font-normal">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            maxLength={25}
                            value={mem.nickname}
                            onChange={(e) => handleUpdateMember(idx, 'nickname', e.target.value)}
                            placeholder={mem.role === 'Me' ? 'e.g. Leo' : 'e.g. Mum'}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/90">
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProceedToMembers}
                disabled={availabilityStatus === 'checking' || availabilityStatus === 'taken'}
                className="px-5 py-2.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                <span>Next: Add members</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isSubmitting}
                className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleCreateHousehold}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 transition disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating household...</span>
                  </>
                ) : (
                  <span>Create household</span>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
