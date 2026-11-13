/** Only skip restoration when the browser proves this origin has no saved identity.
 * Older/restricted browsers conservatively take the normal Firebase restore path.
 */
export async function mayHaveSavedSession(): Promise<boolean> {
  try {
    if (localStorage.getItem('myfamilyai_last_session') || localStorage.getItem('my_family_device_uid')) return true;
    for (const storage of [localStorage, sessionStorage]) {
      for (let i = 0; i < storage.length; i++) {
        if (storage.key(i)?.startsWith('firebase:')) return true;
      }
    }
    if (!indexedDB.databases) return true;
    // IndexedDB is Firebase Auth's preferred persistence. Any existing database
    // is enough to require restoration; no SDK-internal store names are assumed.
    return (await indexedDB.databases()).length > 0;
  } catch {
    return true;
  }
}
