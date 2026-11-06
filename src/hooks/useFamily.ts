import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHousehold } from '../context/HouseholdContext';
import { DiscoveryStyleId, HouseholdMember } from '../types';
import { memberName } from '../utils/member';
import { hashBrief } from '../services/brief';

export interface FamilyPerson {
  member: HouseholdMember;
  id: string;
  name: string;
  style?: DiscoveryStyleId;
  second?: DiscoveryStyleId;
  isYou: boolean;
}

/** People in the household with their flowers, plus a name lookup for AI attributions. */
export function useFamily() {
  const { members, responses, activeMember } = useHousehold();
  const people = useMemo<FamilyPerson[]>(
    () =>
      members.map((m) => ({
        member: m,
        id: m.id,
        name: memberName(m),
        style: responses[m.id]?.discoveryProfile?.primaryStyle,
        second: responses[m.id]?.discoveryProfile?.secondaryStyle,
        isYou: m.id === activeMember?.id,
      })),
    [members, responses, activeMember?.id]
  );
  const byName = useCallback(
    (name: string) => people.find((p) => p.name.toLowerCase() === name.trim().toLowerCase()),
    [people]
  );
  const bloomed = people.filter((p) => p.style);
  return { people, byName, bloomed };
}

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable: the result simply isn't cached.
  }
}

/**
 * Loads an AI result once per distinct input and keeps it on this device, so the family
 * isn't billed again for the same answers. `refresh` asks for a fresh one.
 */
export function useAiResource<T>(kind: string, input: unknown, fetcher: (signal: AbortSignal) => Promise<T>, enabled = true) {
  const key = `mfa:${kind}:${hashBrief(input)}`;
  const [state, setState] = useState<{ key: string; data: T | null; loading: boolean; error: unknown }>(() => ({
    key,
    data: readCache<T>(key),
    loading: false,
    error: null,
  }));
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const cached = nonce === 0 ? readCache<T>(key) : null;
    if (cached) {
      setState({ key, data: cached, loading: false, error: null });
      return;
    }
    const controller = new AbortController();
    setState((s) => ({ key, data: s.key === key ? s.data : null, loading: true, error: null }));
    fetcherRef
      .current(controller.signal)
      .then((data) => {
        writeCache(key, data);
        setState({ key, data, loading: false, error: null });
      })
      .catch((error) => {
        if ((error as Error)?.name === 'AbortError') return;
        setState((s) => ({ ...s, loading: false, error }));
      });
    return () => controller.abort();
  }, [key, enabled, nonce]);

  const data = state.key === key ? state.data : null;
  return { data, loading: state.loading, error: state.error, refresh: () => setNonce((n) => n + 1) };
}
