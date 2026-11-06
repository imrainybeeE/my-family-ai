import React, { useState } from 'react';
import { Users, UserCheck, Plus, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { MemberRole } from '../../types';
import { ALLOWED_ROLES, ROLE_ICONS, validateMemberInput } from '../../utils/familyCode';

interface FamilyViewProps {
  onOpenFoundation?: (showResult?: boolean) => void;
}

export const FamilyView: React.FC<FamilyViewProps> = ({ onOpenFoundation }) => {
  const { household, members, activeMember, responses, selectActiveMember, addMember } = useHousehold();

  const [isAdding, setIsAdding] = useState(false);
  const [newRole, setNewRole] = useState<MemberRole>('Brother');
  const [newNickname, setNewNickname] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const handleSwitchProfile = async (memberId: string) => {
    try {
      await selectActiveMember(memberId);
      setSuccessToast('Switched active profile on this device.');
      setTimeout(() => setSuccessToast(null), 2000);
    } catch {
      setErrorMsg('Failed to switch profile.');
    }
  };

  const handleAddNewMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const val = validateMemberInput({ role: newRole, nickname: newNickname });
    if (!val.isValid) {
      setErrorMsg(val.error || 'Invalid member details');
      return;
    }

    try {
      setIsSubmitting(true);
      await addMember(newRole, newNickname);
      setIsAdding(false);
      setNewNickname('');
      setSuccessToast(`Added ${newNickname || newRole} to the household.`);
      setTimeout(() => setSuccessToast(null), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not add member';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-5 space-y-4">
      {/* Title & Action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            Family members ({members.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Household code: <span className="font-mono-code font-bold text-slate-800 dark:text-slate-200">{household?.code}</span>
          </p>
        </div>

        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="px-3 py-1.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white active:scale-95 text-white dark:text-slate-900 text-xs font-semibold rounded-xl shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add member</span>
          </button>
        )}
      </div>

      {/* Notifications */}
      {successToast && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Add Member Form */}
      {isAdding && (
        <form
          onSubmit={handleAddNewMember}
          className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">Add a family member</span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Role
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as MemberRole)}
                className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {ALLOWED_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_ICONS[r]} {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Nickname <span className="font-normal text-slate-400">(Optional)</span>
              </label>
              <input
                type="text"
                maxLength={25}
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                placeholder="e.g. Sam"
                className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white active:scale-95 text-white dark:text-slate-900 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition disabled:opacity-60 cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <span>Save member</span>
            )}
          </button>
        </form>
      )}

      {/* Member Cards */}
      <div className="space-y-2.5">
        {members.map((m) => {
          const isActive = m.id === activeMember?.id;
          const mProfile = responses[m.id]?.discoveryProfile;

          return (
            <div
              key={m.id}
              className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                isActive
                  ? 'border-indigo-400 bg-white dark:bg-slate-900 shadow-xs'
                  : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="w-10 h-10 rounded-full flex items-center justify-center text-base shadow-2xs shrink-0"
                    style={{ backgroundColor: m.avatarColor }}
                  >
                    {ROLE_ICONS[m.role] || '👤'}
                  </span>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {m.nickname || m.role}
                      </span>
                      {isActive && (
                        <span className="text-[10px] font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded-md">
                          This phone
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{m.role}</span>
                  </div>
                </div>

                <div>
                  {!isActive ? (
                    <button
                      type="button"
                      onClick={() => handleSwitchProfile(m.id)}
                      className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
                    >
                      Switch to me
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-1 rounded-lg">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Active</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Discovery Profile Badge */}
              <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                {mProfile ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/60">
                      The {mProfile.primaryStyle}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      + The {mProfile.secondaryStyle}
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                    Discovery style not set
                  </span>
                )}

                {isActive && onOpenFoundation && (
                  <button
                    type="button"
                    onClick={() => onOpenFoundation(Boolean(mProfile))}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition cursor-pointer"
                  >
                    {mProfile ? 'View my style' : 'Start discovery'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 text-center pt-2">
        Each phone or tablet can be set to any household profile by tapping "Switch to me".
      </p>
    </div>
  );
};
