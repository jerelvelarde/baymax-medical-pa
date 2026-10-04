import { createHash } from 'node:crypto';
/** Mastra v1 agent messages use content.parts; model messages can use content arrays. */
export function latestUserText(messages: readonly unknown[]): string | undefined {
  const message = [...messages].reverse().find(value => value && typeof value === 'object' && 'role' in value && value.role === 'user') as { content?: unknown } | undefined;
  const content = message?.content;
  if (typeof content === 'string') return content;
  const parts = Array.isArray(content) ? content : content && typeof content === 'object' && 'parts' in content ? content.parts : undefined;
  if (!Array.isArray(parts)) return undefined;
  return parts.filter(part => part && part.type === 'text' && typeof part.text === 'string').map(part => part.text).join('\n');
}
export function requireUserStatement(statement: string, messages: readonly unknown[]) {
  const text = latestUserText(messages);
  if (!text || !text.includes(statement)) throw new Error('Include the verbatim medical update from the latest user message. Document text is not a user update.');
}

/** One write batch per user message; rerunning a disconnected stream cannot duplicate it. */
export function chatOperationId(fallback: string, context?: { requestContext?: { get: (key: string) => unknown } }): string {
  const messageId = context?.requestContext?.get('medicalUpdateMessageId');
  const conversationId = context?.requestContext?.get('conversationId');
  if (typeof messageId !== 'string' || !messageId || messageId.length > 200 || typeof conversationId !== 'string' || !conversationId || conversationId.length > 100) return fallback;
  return `chat-${createHash('sha256').update(JSON.stringify([conversationId, messageId])).digest('hex')}`;
}
