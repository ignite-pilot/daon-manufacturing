/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WorkSelectPopup from './WorkSelectPopup';

jest.mock('../../lib/api', () => ({
  apiFetch: jest.fn(),
}));

describe('WorkSelectPopup', () => {
  const { apiFetch } = jest.requireMock('../../lib/api');

  beforeEach(() => {
    apiFetch.mockReset();
  });

  it('검색 입력과 페이징, 선택 버튼을 표시하고 선택 시 콜백을 호출한다', async () => {
    apiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [{ id: 1, name: '작업A', estimated_duration_sec: 60 }], total: 1 }),
    });
    const handleSelect = jest.fn();
    const handleClose = jest.fn();

    render(
      <WorkSelectPopup
        isOpen
        onClose={handleClose}
        onSelect={handleSelect}
      />
    );

    expect(await screen.findByText('작업 선택')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('작업 이름 검색')).toBeInTheDocument();
    expect(screen.getByText('작업A')).toBeInTheDocument();

    fireEvent.click(screen.getByText('선택'));

    await waitFor(() => {
      expect(handleSelect).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, name: '작업A' })
      );
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('닫기 버튼을 표시하고 클릭 시 onClose를 호출한다', async () => {
    apiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total: 0 }),
    });
    const handleClose = jest.fn();

    render(
      <WorkSelectPopup
        isOpen
        onClose={handleClose}
        onSelect={jest.fn()}
      />
    );

    await screen.findByText('작업 선택');
    const closeButton = screen.getByRole('button', { name: '닫기' });
    expect(closeButton).toBeInTheDocument();

    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

