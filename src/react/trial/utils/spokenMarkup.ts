/**
 * Inline emphasis inside spoken lines — `statement.sentences[].text` and `scenario.introduction`.
 *
 * Authored in the same grammar the tutorial overlay uses (`**bold**`, `[accent]…[/accent]` and
 * the other tones), so there is one syntax to learn rather than two. Only the wizard panel
 * renders it, through {@link SpokenRichText}; everywhere else a line appears as prose — the
 * debate log, the recap modals, the analysis modal's sentence cards, the option previews and
 * the screen-reader announcer — it goes through this stripper first.
 *
 * A span must stay inside one authored sentence. The wizard reveals a statement one authored
 * sentence at a time (`revealChunks` maps them 1:1), so a tag opened in one and closed in the
 * next would leave both chunks unbalanced and print the markup literally.
 */
import { parseTutorialRichInline, type RichNode } from '../../tutorial/tutorialRichTextGrammar';

function flatten(nodes: RichNode[]): string {
  return nodes.map((node) => (node.type === 'text' ? node.value : flatten(node.children))).join('');
}

/**
 * The line as prose, with every tag resolved — including `[[` for a literal `[`, so this and
 * {@link SpokenRichText} always agree on what the text says and on how long it is.
 *
 * Text with no markup in it comes back unchanged, which is what makes this safe to apply to
 * every spoken line rather than only to the authored-with-emphasis ones.
 */
export function plainSpokenText(text: string): string {
  return flatten(parseTutorialRichInline(text, 0, text.length));
}
