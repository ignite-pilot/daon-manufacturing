/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ChatPanel from './ChatPanel';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

let mockFetchResolve;
jest.mock('../lib/api', () => ({
  apiFetch: (url, opts) => {
    if (url === '/api/chat' && opts?.method === 'POST') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockFetchResolve ?? { content: '테스트 응답', action: null }),
      });
    }
    return Promise.reject(new Error('Unknown URL'));
  },
}));

const CHAT_STORAGE_KEY = 'daon-chat-messages';

describe('ChatPanel', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockFetchResolve = { content: '테스트 응답', action: null };
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch (_) {}
  });

  it('채팅 열기 버튼을 렌더링한다', () => {
    render(
      <MemoryRouter>
        <ChatPanel />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: '채팅 열기' })).toBeInTheDocument();
  });

  it('열기 버튼 클릭 시 패널이 열리고 입력창이 보인다', () => {
    render(
      <MemoryRouter>
        <ChatPanel />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: '채팅 열기' }));
    expect(screen.getByPlaceholderText(/메시지 입력/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '채팅 닫기' })).toBeInTheDocument();
  });

  it('메시지 입력 후 전송하면 API를 호출하고 응답을 표시한다', async () => {
    render(
      <MemoryRouter>
        <ChatPanel />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: '채팅 열기' }));
    const input = screen.getByPlaceholderText(/메시지 입력/);
    fireEvent.change(input, { target: { value: '공장 목록 보여줘' } });
    fireEvent.click(screen.getByRole('button', { name: '전송' }));

    await waitFor(() => {
      expect(screen.getByText('공장 목록 보여줘')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('테스트 응답')).toBeInTheDocument();
    });
  });

  it('API 응답에 action이 있으면 navigate를 호출한다', async () => {
    mockFetchResolve = { content: '공장 목록으로 이동합니다.', action: { type: 'navigate', path: '/factories' } };
    render(
      <MemoryRouter>
        <ChatPanel />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: '채팅 열기' }));
    fireEvent.change(screen.getByPlaceholderText(/메시지 입력/), { target: { value: '공장 목록' } });
    fireEvent.click(screen.getByRole('button', { name: '전송' }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/factories');
    });
  });

  it('SpeechRecognition이 없으면 음성 버튼이 보이지 않는다', () => {
    render(
      <MemoryRouter>
        <ChatPanel />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: '채팅 열기' }));
    expect(screen.queryByTitle(/음성 입력/)).not.toBeInTheDocument();
  });

  it('SpeechRecognition이 있으면 음성 버튼을 렌더링한다', () => {
    window.SpeechRecognition = jest.fn().mockImplementation(() => ({
      continuous: false,
      interimResults: false,
      lang: '',
      start: jest.fn(),
      stop: jest.fn(),
      abort: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));
    render(
      <MemoryRouter>
        <ChatPanel />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: '채팅 열기' }));
    expect(screen.getByTitle(/음성 입력/)).toBeInTheDocument();
  });

  it('localStorage에 저장된 대화가 있으면 새로고침 후에도 복원된다', () => {
    const stored = [
      { role: 'user', content: '저장된 메시지' },
      { role: 'assistant', content: '저장된 응답' },
    ];
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(stored));
    render(
      <MemoryRouter>
        <ChatPanel />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: '채팅 열기' }));
    expect(screen.getByText('저장된 메시지')).toBeInTheDocument();
    expect(screen.getByText('저장된 응답')).toBeInTheDocument();
  });

  it('초기화 버튼 클릭 시 대화가 비워지고 localStorage도 비운다', async () => {
    localStorage.setItem(
      CHAT_STORAGE_KEY,
      JSON.stringify([{ role: 'user', content: '지울 메시지' }, { role: 'assistant', content: '지울 응답' }])
    );
    render(
      <MemoryRouter>
        <ChatPanel />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: '채팅 열기' }));
    expect(screen.getByText('지울 메시지')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '채팅 초기화' }));
    expect(screen.queryByText('지울 메시지')).not.toBeInTheDocument();
    expect(screen.getByText(/안녕하세요/)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY))).toEqual([]);
  });

  it('메시지가 추가되면 localStorage에 저장된다', async () => {
    render(
      <MemoryRouter>
        <ChatPanel />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: '채팅 열기' }));
    fireEvent.change(screen.getByPlaceholderText(/메시지/), { target: { value: '저장될 메시지' } });
    fireEvent.click(screen.getByRole('button', { name: '전송' }));

    await waitFor(() => {
      expect(screen.getByText('저장될 메시지')).toBeInTheDocument();
    });
    await waitFor(() => {
      const raw = localStorage.getItem(CHAT_STORAGE_KEY);
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw);
      expect(parsed.some((m) => m.content === '저장될 메시지')).toBe(true);
    });
  });
});
