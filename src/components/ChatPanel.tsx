'use client';

import React, { useState, useEffect } from 'react';

export type PartsAction =
  | { type: 'search'; partName?: string; processId?: string; workId?: string; machineId?: string }
  | { type: 'reset' }
  | { type: 'openRegister' }
  | { type: 'excelDownload' }
  | { type: 'openEdit'; partId?: number; partName?: string }
  | { type: 'delete'; partId?: number; partName?: string }
  | { type: 'setPage'; page: number }
  | { type: 'nextPage' }
  | { type: 'prevPage' }
  | { type: 'firstPage' }
  | { type: 'lastPage' }
  | { type: 'setPageSize'; pageSize: number }
  | { type: 'bulkRegister'; items: unknown[]; default_factory_id?: number };

interface ChatPanelProps {
  pageContext?: string;
  onPartsAction?: (action: PartsAction) => void;
}

export default function ChatPanel({ pageContext, onPartsAction }: ChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [hasSpeech, setHasSpeech] = useState(false);
  useEffect(() => {
    setHasSpeech(typeof window !== 'undefined' && !!(window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition);
  }, []);

  return (
    <div className="chat-layer-wrap-next">
      <button
        type="button"
        aria-label="채팅 열기"
        onClick={() => setOpen((o) => !o)}
        className="chat-toggle-btn-next"
      >
        {open ? '✕' : '💬'}
      </button>
      {open && (
        <div className="absolute right-0 bottom-14 w-80 border border-gray-200 rounded-lg shadow-xl bg-white p-3">
          <div className="flex flex-col gap-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                }
              }}
              placeholder="메시지 입력 (음성 지원)"
              className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full resize-y min-h-[2.5rem] max-h-40"
              rows={Math.max(1, message.split('\n').length)}
            />
            <input
              type="file"
              accept=".pdf,.xlsx,.docx,image/*"
              className="text-sm"
              aria-label="파일 첨부"
            />
            {hasSpeech && (
              <button type="button" title="음성 입력" className="text-sm text-gray-600 self-start">
                🎤
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
