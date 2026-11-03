/**
 * Dialog focus for every `.dialog-backdrop` dialog (card A11y, K4): while one is open, Tab and Shift+Tab wrap inside the
 * topmost one instead of walking into the page behind it; when it closes (hidden or removed), the focus goes back to
 * the button that was focused before it opened, unless the focus already moved somewhere on purpose.
 */
const SELECTOR = '.dialog-backdrop:not([hidden])';
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function startDialogFocus(): void {
  let lastOutside: HTMLElement | null = null;
  let opener: HTMLElement | null = null;
  let open = false;
  const top = () => {
    const all = [...document.querySelectorAll<HTMLElement>(SELECTOR)].filter((d) => d.getClientRects().length > 0);
    return all[all.length - 1] ?? null;
  };
  document.addEventListener(
    'focusin',
    (event) => {
      const target = event.target as HTMLElement;
      if (!target.closest?.('.dialog-backdrop')) lastOutside = target;
    },
    true,
  );
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Tab') return;
      const dialog = top();
      if (!dialog) return;
      const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((e) => e.getClientRects().length > 0 && !e.closest('[hidden], [inert]'));
      if (!items.length) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      const inside = !!active && dialog.contains(active);
      if (event.shiftKey ? !inside || active === first : !inside || active === last) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    },
    true,
  );
  const watch = () => {
    const now = top() !== null;
    if (now && !open) opener = lastOutside;
    if (!now && open) {
      const active = document.activeElement;
      const lost = !active || active === document.body || !active.isConnected || active.getClientRects().length === 0;
      if (lost && opener?.isConnected) opener.focus();
      opener = null;
    }
    open = now;
  };
  new MutationObserver(watch).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden'] });
}
