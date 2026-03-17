/**
 * @jest-environment jsdom
 */
import { apiFetch, apiGet } from './api';

describe('api', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('apiFetch sends credentials include and Content-Type json', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true });
    await apiFetch('/api/factories');
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/factories',
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    );
  });

  it('apiGet returns parsed json on ok response', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) });
    const data = await apiGet('/api/factories');
    expect(data).toEqual({ items: [] });
  });

  it('apiGet throws on non-ok response', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, text: async () => 'error' });
    await expect(apiGet('/api/factories')).rejects.toThrow();
  });
});
