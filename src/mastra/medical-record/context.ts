import { type Ctx, userIdOf } from '../lib/demo-user';

export const MEDICAL_USER_KEY = 'baymaxMedicalUser';
type ToolContext = { requestContext?: { get: (key: string) => unknown } };
/** Set only by server middleware; never accept a user id in a tool's input. */
export function medicalContext(context?: ToolContext): Ctx {
  const id = context?.requestContext?.get(MEDICAL_USER_KEY);
  return { userId: typeof id === 'string' ? id : userIdOf() };
}
export function conversationOf(context?: ToolContext): string | undefined {
  const id = context?.requestContext?.get('conversationId');
  return typeof id === 'string' && id.length <= 100 ? id : undefined;
}
