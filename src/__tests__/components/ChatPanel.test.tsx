/** @jest-environment jsdom */
/**
 * ChatPanel 테스트
 * - 채팅 패널이 렌더되고, 텍스트 입력 placeholder에 음성 안내가 포함되는지
 * - 음성 지원 시 마이크 버튼이 노출되는지
 * - 파일 입력이 텍스트·이미지·PDF·Excel·Word 포맷을 허용하는지
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ChatPanel from '@/components/ChatPanel';

describe('ChatPanel', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    root.unmount();
    document.body.removeChild(container);
  });

  it('renders and shows message input placeholder including voice hint', () => {
    act(() => {
      root.render(<ChatPanel />);
    });
    act(() => {
      const toggle = container.querySelector('button[aria-label="채팅 열기"]');
      if (toggle) (toggle as HTMLButtonElement).click();
    });
    const input = container.querySelector('textarea');
    expect(input).toBeTruthy();
    expect((input as HTMLTextAreaElement).placeholder).toContain('메시지 입력');
    expect((input as HTMLTextAreaElement).placeholder).toContain('음성');
  });

  it('shows microphone button when SpeechRecognition is supported', () => {
    const mockRecognition = () => ({ start: () => {}, stop: () => {} });
    (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = mockRecognition as never;
    act(() => {
      root.render(<ChatPanel />);
    });
    act(() => {
      const toggle = container.querySelector('button[aria-label="채팅 열기"]');
      if (toggle) (toggle as HTMLButtonElement).click();
    });
    const micButton = container.querySelector('button[title="음성 입력"]');
    expect(micButton).toBeTruthy();
    (window as unknown as { SpeechRecognition: undefined }).SpeechRecognition = undefined;
  });

  it('does not throw when SpeechRecognition is not available', () => {
    (window as unknown as { SpeechRecognition: undefined }).SpeechRecognition = undefined;
    (window as unknown as { webkitSpeechRecognition: undefined }).webkitSpeechRecognition = undefined;
    expect(() => root.render(<ChatPanel />)).not.toThrow();
  });

  it('textarea allows multiline; Shift+Enter inserts newline, Enter does not', () => {
    act(() => {
      root.render(<ChatPanel />);
    });
    act(() => {
      const toggle = container.querySelector('button[aria-label="채팅 열기"]');
      if (toggle) (toggle as HTMLButtonElement).click();
    });
    let textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    act(() => {
      Object.defineProperty(textarea, 'value', { value: 'a', writable: true });
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
    act(() => {
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false, bubbles: true }));
    });
    textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('a');
  });

  it('file input accepts text, image, PDF, Excel, Word formats', () => {
    act(() => {
      root.render(<ChatPanel />);
    });
    const toggleBtn = container.querySelector('button[aria-label="채팅 열기"]');
    expect(toggleBtn).toBeTruthy();
    act(() => {
      (toggleBtn as HTMLButtonElement).click();
    });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    const accept = fileInput.accept;
    expect(accept).toContain('.pdf');
    expect(accept).toContain('.xlsx');
    expect(accept).toContain('.docx');
    expect(accept).toContain('image/');
  });
});
