/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Full URL of a hosted AI server, for static builds. */
  readonly VITE_AI_URL?: string;
  /** Set for static builds (GitHub Pages), which have no AI server of their own. */
  readonly VITE_STATIC?: string;
}
