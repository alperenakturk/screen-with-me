/**
 * The WAI-ARIA menu button pattern for our small menus (card A11y, K3): the menu opens with the focus on its first item,
 * ↑ / ↓ move (wrapping), Home / End jump, Esc closes and gives the focus back to the button, Tab closes and moves on.
 */
export function menuKeys(menu: HTMLElement, button: HTMLElement, close: () => void): { focusFirst: () => void } {
  const items = () => [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')].filter((e) => e.getClientRects().length > 0);
  menu.addEventListener('keydown', (event) => {
    const list = items();
    if (!list.length) return;
    const at = list.indexOf(document.activeElement as HTMLElement);
    let next: number;
    if (event.key === 'ArrowDown') next = (at + 1) % list.length;
    else if (event.key === 'ArrowUp') next = (at - 1 + list.length) % list.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = list.length - 1;
    else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
      button.focus();
      return;
    } else {
      if (event.key === 'Tab') close();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    list[next]?.focus();
  });
  return { focusFirst: () => items()[0]?.focus() };
}
