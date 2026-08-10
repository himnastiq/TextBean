/**
 * Message formatting utilities for TextBean.
 *
 * Provides helpers for:
 * - Truncating message previews (conversation list)
 * - Stripping basic HTML tags (bridge messages may contain HTML)
 * - Parsing text for URL detection (message bubble link highlighting)
 */

/* ─── URL Detection ──────────────────────────────────────── */

const URL_REGEX = /https?:\/\/[^\s<>]+/gi;

/** A parsed segment of message text — either plain text or a URL. */
interface TextSegment {
  text: string;
  isUrl: boolean;
}

/**
 * Split message text into alternating plain-text and URL segments.
 * Used by MessageBubble to render tappable links.
 *
 * @param text  Raw message content
 * @returns     Array of { text, isUrl } segments
 */
function parseTextWithLinks(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_REGEX)) {
    if (match.index != null && match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), isUrl: false });
    }
    segments.push({ text: match[0], isUrl: true });
    lastIndex = (match.index ?? 0) + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), isUrl: false });
  }

  return segments.length === 0 ? [{ text, isUrl: false }] : segments;
}

/* ─── Text Processing ────────────────────────────────────── */

/**
 * Strip basic HTML tags from a string.
 * Bridges (especially Telegram/Discord) may send HTML-formatted messages.
 * This provides a clean plaintext version for previews and search.
 *
 * @param html  Input string potentially containing HTML
 * @returns     Plain text with tags removed
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')          // <br> → newline
    .replace(/<\/p>/gi, '\n')               // </p> → newline
    .replace(/<[^>]+>/g, '')                // strip remaining tags
    .replace(/&amp;/g, '&')                 // decode common entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')             // collapse excessive newlines
    .trim();
}

/**
 * Truncate a message string for display as a preview.
 * Replaces newlines with spaces and clips to `maxLength` characters.
 *
 * @param text       Message content
 * @param maxLength  Maximum characters (default 120)
 * @returns          Truncated string, with "…" appended if clipped
 */
function truncatePreview(text: string, maxLength: number = 120): string {
  // Flatten newlines for single-line display
  const flat = text.replace(/\n+/g, ' ').trim();
  if (flat.length <= maxLength) return flat;
  return flat.slice(0, maxLength).trimEnd() + '…';
}

/**
 * Build a sender-prefixed message preview for group conversations.
 *
 * @param content      Message text
 * @param senderName   Sender display name (null for DMs)
 * @param isDirect     Whether this is a 1:1 conversation
 * @param maxLength    Maximum preview length
 */
function buildMessagePreview(
  content: string,
  senderName: string | null,
  isDirect: boolean,
  maxLength: number = 120,
): string {
  const body = truncatePreview(stripHtml(content), maxLength);
  if (isDirect || !senderName) return body;
  const firstName = senderName.split(' ')[0];
  return `${firstName}: ${body}`;
}

export {
  parseTextWithLinks,
  stripHtml,
  truncatePreview,
  buildMessagePreview,
  type TextSegment,
};
