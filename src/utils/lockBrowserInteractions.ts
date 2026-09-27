/** Class on `<html>` that turns on the no-select rules in `src/react/index.scss`. */
export const LOCKED_INTERACTIONS_CLASS = 'lock-browser-interactions';

const isEditable = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable || target.closest('input, textarea') !== null);

const preventUnlessEditable = (event: Event) => {
  if (!isEditable(event.target)) event.preventDefault();
};

/**
 * Stops the page from behaving like a document: no text selection, no long-press callout,
 * no right-click menu, no dragging images or links. Production only, so devtools'
 * "Inspect" menu and copying debug text keep working in dev.
 */
export function lockBrowserInteractions(): void {
  document.documentElement.classList.add(LOCKED_INTERACTIONS_CLASS);
  document.addEventListener('contextmenu', preventUnlessEditable);
  document.addEventListener('selectstart', preventUnlessEditable);
  document.addEventListener('dragstart', preventUnlessEditable);
}
