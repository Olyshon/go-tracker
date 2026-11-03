import { describe, expect, it } from 'vitest';
import { authError, passwordSchema, recoveryStore, setRecoveryUser } from '../auth-ux';

describe('existing password policy', () => {
  it('requires six characters', () => {
    expect(passwordSchema.safeParse('abcde').success).toBe(false);
    expect(passwordSchema.safeParse('abcdef').success).toBe(true);
  });
  it('does not require character classes', () => {
    expect(passwordSchema.safeParse('123456').success).toBe(true);
    expect(passwordSchema.safeParse('абвгде').success).toBe(true);
  });
  it('handles HIBP rejection without exposing service details', () => {
    expect(authError({code: 'weak_password', message: 'secret internal detail'}, 'signup')).not.toContain('secret');
    expect(authError({code: 'weak_password'}, 'signup')).toContain('утечках');
  });
  it('starts with no recovery authorization and clears it', () => {
    setRecoveryUser(null);
    expect(recoveryStore.getSnapshot()).toBe(null);
    setRecoveryUser('test-user');
    expect(recoveryStore.getSnapshot()).toBe('test-user');
    setRecoveryUser(null);
    expect(recoveryStore.getSnapshot()).toBe(null);
  });
});