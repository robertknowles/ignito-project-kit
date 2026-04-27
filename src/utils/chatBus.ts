/**
 * Lightweight cross-component bridge for firing chat messages from outside
 * the ChatPanel subtree (e.g. dashboard property cards triggering an AI
 * re-plan when the BA changes a property type).
 *
 * Uses a window CustomEvent so we don't have to lift `useChatConversation`
 * into a global context. ChatPanel listens; anything can dispatch.
 */

export const CHAT_SEND_EVENT = 'proppath:chat-send';

export interface ChatSendDetail {
  message: string;
}

export const dispatchChatSend = (message: string): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<ChatSendDetail>(CHAT_SEND_EVENT, { detail: { message } })
  );
};
