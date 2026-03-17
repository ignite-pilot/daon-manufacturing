/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

function TestConsumer() {
  const { user, loading } = useAuth();
  if (loading) return <span>로딩 중</span>;
  return <span>{user ? `user:${user.email}` : 'no-user'}</span>;
}

describe('AuthContext', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('provides null user when /api/auth/me returns no user', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ user: null }) });
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    expect(screen.getByText('로딩 중')).toBeInTheDocument();
    await screen.findByText('no-user');
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/me', expect.any(Object));
  });

  it('provides user when /api/auth/me returns user', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { email: 'a@b.com', name: 'Test' } }),
    });
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await screen.findByText('user:a@b.com');
  });
});
