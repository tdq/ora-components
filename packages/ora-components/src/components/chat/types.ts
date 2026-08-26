/** Who authored a chat message. */
export type ChatRole = 'user' | 'assistant';

/**
 * A single chat message.
 *
 * `id` is the reconciliation key: the panel diffs the rendered rows by `id`, so a
 * streaming response is expressed as repeated emissions of the same list where one
 * message keeps its `id` and grows its `content`.
 *
 * An assistant message with an empty `content` renders as a typing indicator.
 */
export interface ChatMessage {
    id: string;
    role: ChatRole;
    content: string;
    timestamp?: number;
}

/**
 * A quick-reply chip offered above the composer.
 *
 * `caption` is the visible label, `text` is what is sent when the chip is clicked — they
 * differ when a short label stands in for a longer prompt.
 */
export interface ChatSuggestion {
    caption: string;
    text: string;
}
