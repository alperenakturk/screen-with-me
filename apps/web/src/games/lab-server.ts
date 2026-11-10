// LAB2: the server's lab powers (skip a phase, set a position, end a game …) exist only on a local test server
// (`SWM_LAB_SERVER`, `apps/server/src/lab.ts`: localhost only, never live). On the live site those commands answer
// "local test server only" instead of sending a message the server ignores.
import type { LabText } from '../debug-lab.ts';

export const LOCAL_ONLY: LabText = { en: 'local test server only (on the live site the server ignores it)', tr: 'sadece yerel test sunucusunda (canlı sitede sunucu bunu yok sayar)' };
/** True when this page talks to a server that may have the lab powers. */
export const labServerHere = (): boolean => /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
