import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';

const SILENCE_AUTO_SEND_MS = 3000;

function useSpeechRecognition() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);
    setSupported(!!SpeechRecognition);
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'ko-KR';
    }
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  const startListening = useCallback(
    (onResult, onAutoSend) => {
      if (!recognitionRef.current || !supported) return;
      const rec = recognitionRef.current;
      let lastFinal = '';

      const resetSilenceTimer = () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (lastFinal.trim()) {
            onAutoSend(lastFinal.trim());
          }
          setListening(false);
          try {
            rec.stop();
          } catch (_) {}
        }, SILENCE_AUTO_SEND_MS);
      };

      rec.onresult = (event) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }
        if (final) lastFinal = (lastFinal + final).trim();
        onResult(lastFinal + interim);
        resetSilenceTimer();
      };

      rec.onend = () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        setListening(false);
      };

      rec.onerror = () => setListening(false);

      setListening(true);
      rec.start();
      resetSilenceTimer();
    },
    [supported]
  );

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
    setListening(false);
  }, []);

  return { supported, listening, startListening, stopListening };
}

const ACCEPT_FILES = 'image/*,.pdf,.docx,.xlsx,.xls,.csv,.txt';
const CHAT_STORAGE_KEY = 'daon-chat-messages';

function loadStoredMessages() {
  try {
    if (typeof window !== 'undefined') {
      const s = localStorage.getItem(CHAT_STORAGE_KEY);
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch (_) {}
  return [];
}

export default function ChatPanel() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => loadStoredMessages());
  const [input, setInput] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const listEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const { supported: hasSpeech, listening, startListening, stopListening } = useSpeechRecognition();

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
      }
    } catch (_) {}
  }, [messages]);

  const scrollToBottom = () => listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleClearChat = useCallback(() => {
    setMessages([]);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(CHAT_STORAGE_KEY, '[]');
      }
    } catch (_) {}
  }, []);

  const sendMessage = useCallback(
    async (text, file = null) => {
      const trimmed = String(text).trim();
      if ((!trimmed && !file) || loading) return;

      const userContent = trimmed || (file ? `(파일 첨부: ${file.name})` : '');
      setMessages((prev) => [...prev, { role: 'user', content: userContent }]);
      setInput('');
      setAttachedFile(null);
      setLoading(true);

      try {
        const history = [...messages, { role: 'user', content: userContent }];
        let res;
        if (file) {
          const formData = new FormData();
          formData.append('messages', JSON.stringify(history.map((m) => ({ role: m.role, content: m.content }))));
          formData.append('file', file);
          res = await fetch('/api/chat', {
            method: 'POST',
            credentials: 'include',
            body: formData,
          });
        } else {
          res = await apiFetch('/api/chat', {
            method: 'POST',
            body: JSON.stringify({
              messages: history.map((m) => ({ role: m.role, content: m.content })),
            }),
          });
        }
        const data = await res.json();

        if (data.steps && Array.isArray(data.steps) && data.steps.length > 0) {
          const stepMessages = data.steps.map((stepContent) => ({ role: 'assistant', content: stepContent }));
          setMessages((prev) => [...prev, ...stepMessages]);
        } else {
          const content = data.content ?? '응답을 받지 못했습니다.';
          setMessages((prev) => [...prev, { role: 'assistant', content }]);
        }

        if (data.action?.type === 'navigate' && data.action?.path) {
          navigate(data.action.path);
        }
      } catch (_) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: '채팅 서버에 연결할 수 없습니다.' },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading, navigate]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input, attachedFile);
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    setAttachedFile(f || null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleVoiceResult = (text) => setInput(text);
  const handleVoiceAutoSend = (text) => {
    setInput('');
    sendMessage(text);
  };

  const startVoice = () => {
    if (listening) {
      stopListening();
      return;
    }
    startListening(handleVoiceResult, handleVoiceAutoSend);
  };

  const ChatIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="currentColor"/>
    </svg>
  );

  const MicIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  );

  return (
    <>
      {/* 클릭 시 오른쪽에서 슬라이드되는 채팅 패널 */}
      {open && (
        <>
          <div
            className="chat-drawer-overlay"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div className="chat-widget-panel">
            <div className="chat-widget-header">
              <span className="chat-widget-title">채팅</span>
              <div className="chat-widget-header-actions">
                <button
                  type="button"
                  aria-label="채팅 초기화"
                  onClick={handleClearChat}
                  className="chat-widget-reset"
                  title="대화 내용 지우기"
                >
                  초기화
                </button>
                <button
                  type="button"
                  aria-label="채팅 닫기"
                  onClick={() => setOpen(false)}
                  className="chat-widget-close"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="chat-widget-body">
              {messages.length === 0 && (
                <div className="chat-widget-welcome">
                  <p className="chat-widget-greeting">안녕하세요, 고객님!</p>
                  <p className="chat-widget-hint">메뉴 조회·등록·수정·삭제 요청을 도와드립니다.</p>
                  <p className="chat-widget-example">예: 공장 목록 보여줘, 부품 등록 화면으로 가줘</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`chat-widget-msg ${m.role === 'user' ? 'chat-widget-msg-user' : 'chat-widget-msg-bot'}`}
                >
                  {m.content}
                </div>
              ))}
              {loading && (
                <div className="chat-widget-loading">답변 중...</div>
              )}
              <div ref={listEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="chat-widget-form">
              {attachedFile && (
                <div className="chat-widget-attached">
                  <span className="chat-widget-attached-name" title={attachedFile.name}>{attachedFile.name}</span>
                  <button type="button" className="chat-widget-attached-remove" onClick={() => setAttachedFile(null)} aria-label="첨부 취소">✕</button>
                </div>
              )}
              <div className="chat-widget-input-wrap">
                <input ref={fileInputRef} type="file" accept={ACCEPT_FILES} onChange={handleFileChange} className="chat-widget-file-input" aria-label="파일 첨부" />
                <button type="button" className="chat-widget-icon-btn" onClick={() => fileInputRef.current?.click()} title="파일 첨부">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                </button>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder="메시지를 입력해주세요..."
                  className="chat-widget-input chat-widget-textarea"
                  disabled={loading}
                  rows={Math.max(1, input.split('\n').length)}
                />
                {hasSpeech && (
                  <button
                    type="button"
                    title={listening ? '음성 입력 중지' : '음성 입력'}
                    onClick={startVoice}
                    className={`chat-widget-icon-btn ${listening ? 'chat-widget-icon-btn-active' : ''}`}
                  >
                    <MicIcon />
                  </button>
                )}
                <button type="submit" className="chat-widget-send" aria-label="전송">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* 파란색 채팅 아이콘 버튼 (클릭 시 패널 열림) */}
      <div className="chat-layer-wrap flex flex-col items-end">
        <button
          type="button"
          aria-label={open ? '채팅 닫기' : '채팅 열기'}
          onClick={() => setOpen((o) => !o)}
          className={`chat-toggle-btn ${open ? 'chat-toggle-btn-open' : ''}`}
          title={open ? '채팅 닫기' : '채팅 열기'}
        >
          {open ? (
            <span className="chat-close-icon">✕</span>
          ) : (
            <ChatIcon />
          )}
        </button>
      </div>
    </>
  );
}
