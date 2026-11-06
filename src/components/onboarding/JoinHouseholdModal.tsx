import React, { useState } from 'react';
import {
  X,
  Smartphone,
  ArrowRight,
  Loader2,
  AlertCircle,
  UserCheck,
  Plus,
} from 'lucide-react';
import {
  cleanLettersInput,
  cleanDigitsInput,
  formatFamilyCode,
  validateFamilyCode,
  ALLOWED_ROLES,
  ROLE_ICONS,
} from '../../utils/familyCode';
import { useHousehold } from '../../context/HouseholdContext';
import { HouseholdMember, MemberRole } from '../../types';

interface JoinHouseholdModalProps {
  onClose: () => void;
}

export const JoinHouseholdModal: React.FC<JoinHouseholdModalProps> = ({ onClose }) => {
  const { joinWithCode, selectActiveMember, addMember } = useHousehold();

  const [letters, setLetters] = useState('');
  const [digits, setDigits] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Once household is found
  const [foundMembers, setFoundMembers] = useState<HouseholdMember[] | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // Inline "Add myself" state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newRole, setNewRole] = useState<MemberRole>('Brother');
  const [newNickname, setNewNickname] = useState('');

  const fullCode = formatFamilyCode(letters, digits);

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const val = validateFamilyCode(fullCode);
    if (!val.isValid) {
      setErrorMsg(val.error || 'Please enter a valid Family Code (e.g. AX-PAN-4827)');
      return;
    }

    try {
      setIsSearching(true);
      const membersList = await joinWithCode(fullCode);
      if (membersList.length === 0) {
        setErrorMsg('Household found, but has no members yet.');
      } else {
        setFoundMembers(membersList);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Household not found.';
      setErrorMsg(msg);
    } finally {
      setIsSearching(false);
    }
  };

  const handleChooseProfile = async (memberId: string) => {
    try {
      setIsSelecting(true);
      await selectActiveMember(memberId);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to select profile.';
      setErrorMsg(msg);
    } finally {
      setIsSelecting(false);
    }
  };

  const handleCreateAndSelectNew = async () => {
    try {
      setIsSelecting(true);
      await addMember(newRole, newNickname);
      const updated = await joinWithCode(fullCode);
      const created = updated[updated.length - 1];
      if (created) {
        await selectActiveMember(created.id);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add profile.';
      setErrorMsg(msg);
    } finally {
      setIsSelecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-[400px] max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Join with Family Code
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {foundMembers ? 'Select your profile' : 'Enter the code from another device'}
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

        {/* Content */}
        <div className="p-5 overflow-y-auto no-scrollbar space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!foundMembers ? (
            /* Step 1: Enter Family Code */
            <form onSubmit={handleLookup} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Enter Family Code
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Format: <span className="font-mono-code font-semibold text-slate-700 dark:text-slate-300">AX-[3 letters]-[4 digits]</span>
                </p>
              </div>

              {/* Input grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="join-letters" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    3 letters
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono-code text-slate-400 font-bold">
                      AX-
                    </span>
                    <input
                      id="join-letters"
                      type="text"
                      maxLength={3}
                      value={letters}
                      onChange={(e) => setLetters(cleanLettersInput(e.target.value))}
                      placeholder="PAN"
                      className="w-full pl-9 pr-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-center font-mono-code font-bold uppercase text-sm tracking-wider focus:ring-2 focus:ring-indigo-500 outline-none"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="join-digits" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    4 digits
                  </label>
                  <input
                    id="join-digits"
                    type="text"
                    maxLength={4}
                    value={digits}
                    onChange={(e) => setDigits(cleanDigitsInput(e.target.value))}
                    placeholder="4827"
                    className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-center font-mono-code font-bold text-sm tracking-wider focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="text-center">
                <span className="inline-block text-xs font-mono-code font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                  Target: {fullCode}
                </span>
              </div>

              <button
                type="submit"
                disabled={isSearching || letters.length < 3 || digits.length < 4}
                className="w-full py-3 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Looking up household...</span>
                  </>
                ) : (
                  <span>Find household</span>
                )}
              </button>
            </form>
          ) : (
            /* Step 2: Pick Profile */
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  Found household
                </span>
                <span className="text-sm font-mono-code font-bold text-slate-900 dark:text-slate-100">
                  {fullCode}
                </span>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Who is using this phone?
                </label>

                <div className="space-y-1.5">
                  {foundMembers.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      disabled={isSelecting}
                      onClick={() => handleChooseProfile(m.id)}
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 bg-white dark:bg-slate-900 transition flex items-center justify-between group active:scale-98 text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-2xs shrink-0"
                          style={{ backgroundColor: m.avatarColor }}
                        >
                          {ROLE_ICONS[m.role] || '👤'}
                        </span>
                        <div>
                          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                            {m.nickname ? `${m.nickname} (${m.role})` : m.role}
                          </div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500">
                            Household member
                          </div>
                        </div>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center text-slate-400 dark:text-slate-300 transition">
                        <UserCheck className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Add New Profile Accordion */}
              {!isAddingNew ? (
                <button
                  type="button"
                  onClick={() => setIsAddingNew(true)}
                  className="w-full py-2.5 border border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 bg-slate-50/50 dark:bg-slate-800/40 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Not listed? Add yourself</span>
                </button>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Add new member profile
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingNew(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                        Your role
                      </label>
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as MemberRole)}
                        className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 outline-none"
                      >
                        {ALLOWED_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_ICONS[r]} {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                        Nickname
                      </label>
                      <input
                        type="text"
                        maxLength={25}
                        value={newNickname}
                        onChange={(e) => setNewNickname(e.target.value)}
                        placeholder="e.g. Sam"
                        className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-xs outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isSelecting}
                    onClick={handleCreateAndSelectNew}
                    className="w-full py-2 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    {isSelecting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Save and select profile</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
