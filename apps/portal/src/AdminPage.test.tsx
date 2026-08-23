import { describe, expect, it, vi } from 'vitest';
import { acceptsOwnerResponse, clampCmsPage, nextCreateAttempt } from './AdminPage';

describe('Admin CMS state safeguards', () => {
  it('keeps one idempotency key for an exact retry and rotates it when the payload changes', () => {
    const createKey = vi.fn().mockReturnValueOnce('key-1').mockReturnValueOnce('key-2');
    const first = nextCreateAttempt(null, { ownerId: 'user-1', name: 'App' }, createKey);
    const retry = nextCreateAttempt(first, { ownerId: 'user-1', name: 'App' }, createKey);
    const changed = nextCreateAttempt(retry, { ownerId: 'user-2', name: 'App' }, createKey);

    expect(retry.key).toBe('key-1');
    expect(changed.key).toBe('key-2');
    expect(createKey).toHaveBeenCalledTimes(2);
  });

  it('ignores stale owner-search responses', () => {
    expect(acceptsOwnerResponse(1, 2)).toBe(false);
    expect(acceptsOwnerResponse(2, 2)).toBe(true);
  });

  it('clamps a page after filtered or deleted data shrinks', () => {
    expect(clampCmsPage(3, 20, 20)).toBe(1);
    expect(clampCmsPage(2, 21, 20)).toBe(2);
  });
});
