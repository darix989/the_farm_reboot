export function isOpenCodexShortcut(event: KeyboardEvent): boolean {
  return (
    event.code === 'Tab' &&
    !event.shiftKey &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.repeat
  );
}
