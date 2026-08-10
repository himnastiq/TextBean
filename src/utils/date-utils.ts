/**
 * Date/time formatting utilities for TextBean.
 *
 * Centralises all date-related helpers so components don't duplicate
 * formatting logic. Used by ConversationListItem (relative timestamps),
 * DateSeparator (date labels), and MessageBubble (12-hour time).
 */

/* ─── Constants ──────────────────────────────────────────── */

const DAY_MS = 86_400_000;

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const DAY_NAMES_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/* ─── Helpers ────────────────────────────────────────────── */

/** Check if two dates fall on the same calendar day. */
const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/* ─── Public API ─────────────────────────────────────────── */

/**
 * Compact relative timestamp for conversation list rows.
 *
 * Returns: "now" | "5m" | "3h" | "Yesterday" | "Mon" | "Jan 5"
 *
 * @param timestamp  Unix milliseconds
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;

  const date = new Date(timestamp);
  const today = new Date(now);

  // Yesterday
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday)) return 'Yesterday';

  // Within a week — short day name
  if (days < 7) return DAY_NAMES_SHORT[date.getDay()];

  // Older — abbreviated month + day
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
}

/**
 * Human-readable date label for date separators between messages.
 *
 * Returns: "Today" | "Yesterday" | "Monday" | "Jan 5, 2025"
 *
 * @param timestamp  Unix milliseconds
 */
function formatDateLabel(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();

  if (isSameDay(date, now)) return 'Today';

  const yesterday = new Date(now.getTime() - DAY_MS);
  if (isSameDay(date, yesterday)) return 'Yesterday';

  const diff = now.getTime() - timestamp;
  if (diff < 7 * DAY_MS) return DAY_NAMES_LONG[date.getDay()];

  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/**
 * 12-hour time string for message bubbles.
 *
 * Returns: "1:05 PM" | "12:00 AM"
 *
 * @param timestamp  Unix milliseconds
 */
function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m} ${ampm}`;
}

/**
 * Check whether a timestamp falls on the same calendar day as another.
 *
 * @param a  Unix milliseconds
 * @param b  Unix milliseconds
 */
function isSameCalendarDay(a: number, b: number): boolean {
  return isSameDay(new Date(a), new Date(b));
}

export { formatRelativeTime, formatDateLabel, formatTime, isSameCalendarDay };
