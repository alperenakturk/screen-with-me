import { load } from '../storage.ts';

/** "Show this when I'm alone in a room" (on by default). Kept apart from ui/invite.ts so the room can check it without
 * loading the invite window (and its QR encoder) until it is opened. */
export const AUTO_INVITE_KEY = 'opt:autoInvite';
/**
 * Automated browsers (the test harnesses) only get it when they ask for it (`opt:autoInvite` = '1'): a window that
 * opens by itself would cover what they click.
 */
export const autoInviteOn = () => (navigator.webdriver ? load(AUTO_INVITE_KEY) === '1' : load(AUTO_INVITE_KEY) !== '0');
