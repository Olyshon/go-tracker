import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 6;
export const passwordSchema = z.string().min(PASSWORD_MIN_LENGTH);
export const emailSchema = z.string().trim().email().max(255);
export const RECOVERY_NOTICE = 'Если адрес зарегистрирован, на него придёт письмо со ссылкой для восстановления пароля.';

export function authError(cause: unknown, mode: 'login' | 'signup' | 'recovery' | 'reset'): string {
  const error = cause as { code?: string; message?: string; status?: number } | null;
  const code = error?.code ?? '';
  const message = error?.message?.toLowerCase() ?? '';
  if (code === 'weak_password' || message.includes('weak password') || message.includes('pwned') || message.includes('compromised'))
    return 'Этот пароль слишком распространён или найден в утечках. Выберите другой пароль.';
  if (code === 'same_password') return 'Новый пароль должен отличаться от предыдущего.';
  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) return 'Подтвердите почту по ссылке в письме.';
  if (code === 'email_address_invalid' || code === 'validation_failed' && message.includes('email')) return 'Проверьте адрес электронной почты.';
  if (code === 'signup_disabled') return 'Регистрация временно недоступна. Попробуйте позже.';
  if (error?.status === 429 || code.startsWith('over_') || message.includes('rate limit')) return 'Слишком много попыток. Подождите и попробуйте снова.';
  if (code === 'user_already_exists' || code === 'email_exists') return 'Не удалось создать аккаунт. Попробуйте войти или восстановить пароль.';
  if (mode === 'login') return 'Не удалось войти. Проверьте почту и пароль.';
  if (mode === 'reset') return 'Ссылка недействительна или истекла. Запросите новое письмо для восстановления.';
  if (mode === 'recovery') return 'Не удалось отправить запрос. Проверьте соединение и попробуйте позже.';
  return 'Не удалось создать аккаунт. Проверьте соединение и попробуйте позже.';
}

// Only the root Auth subscriber may authorize a recovery session.
let recoveryUser: string | null = null;
const listeners = new Set<() => void>();
export function setRecoveryUser(id: string | null) {
  recoveryUser = id;
  listeners.forEach(listener => listener());
}
export const recoveryStore = {
  subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
  getSnapshot: () => recoveryUser,
  getServerSnapshot: () => null,
};