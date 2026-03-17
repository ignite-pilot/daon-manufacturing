/**
 * @jest-environment jsdom
 * PRD 공정: 필수(공장, 대상 완제품, 공정 이름, 전체 소요시간), 선택(공정 설명), 세부 공정 Drag&Drop
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProcessForm from './ProcessForm';

describe('ProcessForm (PRD 공정 정보)', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/factories')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/works')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/config/product-codes')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      return Promise.reject(new Error('unknown'));
    });
  });

  it('필수 항목: 공장, 대상 완제품, 공정 이름 라벨을 표시한다', async () => {
    render(
      <MemoryRouter initialEntries={['/processes/new']}>
        <Routes>
          <Route path="/processes/new" element={<ProcessForm />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('공장');
    expect(screen.getByText('대상 완제품')).toBeInTheDocument();
    expect(screen.getByText('공정 이름')).toBeInTheDocument();
    expect(screen.getByText('완제품 명')).toBeInTheDocument();
  });

  it('선택 항목: 공정 설명을 표시한다', async () => {
    render(
      <MemoryRouter initialEntries={['/processes/new']}>
        <Routes>
          <Route path="/processes/new" element={<ProcessForm />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('공정 설명');
    expect(screen.getByText('(선택)')).toBeInTheDocument();
  });

  it('공정 상세에 완제품과 단계 추가(+) 버튼을 표시하고, 단계는 아래로 나열한다', async () => {
    render(
      <MemoryRouter initialEntries={['/processes/new']}>
        <Routes>
          <Route path="/processes/new" element={<ProcessForm />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('공정 상세');
    expect(screen.getByText('완제품 명')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /단계 추가/ })).toBeInTheDocument();
    // 작업 추가 버튼은 화면에서 제외됨
    expect(screen.queryByRole('button', { name: /작업 추가/ })).not.toBeInTheDocument();
  });

  it('단계 이름 입력은 한글 15자 이내로 제한된다', async () => {
    render(
      <MemoryRouter initialEntries={['/processes/new']}>
        <Routes>
          <Route path="/processes/new" element={<ProcessForm />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('공정 상세');
    screen.getByRole('button', { name: /단계 추가/ }).click();
    const nameInput = await screen.findByPlaceholderText('단계명');
    expect(nameInput).toHaveAttribute('maxLength', '15');
  });

  it('단계에서 설명 클릭 시 설명 입력 레이어 팝업이 열린다', async () => {
    render(
      <MemoryRouter initialEntries={['/processes/new']}>
        <Routes>
          <Route path="/processes/new" element={<ProcessForm />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('공정 상세');
    const addStageBtn = screen.getByRole('button', { name: /단계 추가/ });
    addStageBtn.click();
    const descBtn = await screen.findByRole('button', { name: /설명/ });
    descBtn.click();
    expect(screen.getByRole('dialog', { name: /설명 입력/ })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('설명을 입력하세요')).toBeInTheDocument();
  });

  it('공정 상세 완제품 영역에 완제품 명, 총 시간(XX분XX초), 단계추가 버튼을 표시한다', async () => {
    render(
      <MemoryRouter initialEntries={['/processes/new']}>
        <Routes>
          <Route path="/processes/new" element={<ProcessForm />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('공정 상세');
    expect(screen.getByText('완제품 명')).toBeInTheDocument();
    expect(screen.getByText(/총 시간:\s*0분\s*0초/)).toBeInTheDocument();
    const addStepBtn = screen.getByRole('button', { name: /단계 추가/ });
    expect(addStepBtn).toBeInTheDocument();
    expect(addStepBtn).toHaveTextContent('단계추가');
  });

  it('수정 시 수정일자·수정자를 표시한다', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/factories')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/works')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/config/product-codes')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/processes/1')) return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          id: 1,
          factory_id: 1,
          product_name: 'P',
          process_name: '공정',
          total_duration_sec: 1800,
          description: '',
          steps: [],
          updated_at: '2026-03-13T00:00:00Z',
          updated_by: 'admin',
        }),
      });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <MemoryRouter initialEntries={['/processes/1/edit']}>
        <Routes>
          <Route path="/processes/:id/edit" element={<ProcessForm />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByDisplayValue('공정');
    expect(screen.getByText('수정일자')).toBeInTheDocument();
    expect(screen.getByText('수정자')).toBeInTheDocument();
  });

  it('작업 추가 시 해당 작업의 예상 소요시간(초)을 기본값으로 넣는다', async () => {
    const workItem = { id: 1, name: '헤드램프 초음파 장비 로딩', estimated_duration_sec: 90 };
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/factories')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/works')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [workItem], total: 1 }) });
      if (url.includes('/api/config/product-codes')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <MemoryRouter initialEntries={['/processes/new']}>
        <Routes>
          <Route path="/processes/new" element={<ProcessForm />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('공정 상세');
    const addWorkBtn = screen.getByRole('button', { name: /작업 추가/ });
    addWorkBtn.click();
    const selectBtn = await screen.findByRole('button', { name: '선택' });
    selectBtn.click();
    const durationInput = await screen.findByDisplayValue('90');
    expect(durationInput).toHaveAttribute('placeholder', '초');
  });

  it('단계 내 2번째 작업부터도 소요시간이 올바른 step 인덱스로 저장된다', async () => {
    const works = [
      { id: 1, name: '작업1', estimated_duration_sec: 60 },
      { id: 2, name: '작업2', estimated_duration_sec: 120 },
    ];
    let postBody = null;
    global.fetch.mockImplementation((url, opts) => {
      if (url.includes('/api/factories')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [{ id: 1, name: 'F1' }] }) });
      if (url.includes('/api/works')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: works, total: 2 }) });
      if (url.includes('/api/config/product-codes')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: ['P1'] }) });
      if (url.includes('/api/processes') && opts?.method === 'POST') {
        postBody = opts.body ? JSON.parse(opts.body) : null;
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 1 }) });
      }
      return Promise.reject(new Error('unknown'));
    });
    render(
      <MemoryRouter initialEntries={['/processes/new']}>
        <Routes>
          <Route path="/processes/new" element={<ProcessForm />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('공정 상세');
    const selects = document.querySelectorAll('select');
    if (selects[0]) fireEvent.change(selects[0], { target: { value: '1' } });
    if (selects[1]) fireEvent.change(selects[1], { target: { value: 'P1' } });
    const processInput = document.querySelector('input[type="text"]');
    if (processInput) fireEvent.change(processInput, { target: { value: '공정이름' } });
    const addWorkBtn = screen.getByRole('button', { name: /작업 추가/ });
    fireEvent.click(addWorkBtn);
    let selectBtns = await screen.findAllByRole('button', { name: '선택' });
    fireEvent.click(selectBtns[0]);
    await screen.findByText('작업1');
    fireEvent.click(addWorkBtn);
    selectBtns = await screen.findAllByRole('button', { name: '선택' });
    fireEvent.click(selectBtns[0]);
    await screen.findByText('작업2');
    const durationInputs = screen.getAllByPlaceholderText('초');
    expect(durationInputs.length).toBeGreaterThanOrEqual(2);
    fireEvent.change(durationInputs[1], { target: { value: '180' } });
    const submitBtn = screen.getByRole('button', { name: /저장/ });
    fireEvent.click(submitBtn);
    await new Promise((r) => setTimeout(r, 150));
    expect(postBody).not.toBeNull();
    expect(Array.isArray(postBody.steps)).toBe(true);
    expect(postBody.steps.length).toBe(2);
    expect(postBody.steps[1].work_id).toBe(2);
    expect(postBody.steps[1].actual_duration_sec).toBe(180);
  });

  it('단계 영역에 하위 작업 토글 버튼(숨기기/보이기) 1개를 표시하고, 클릭 시 열림·닫힘이 토글된다', async () => {
    render(
      <MemoryRouter initialEntries={['/processes/new']}>
        <Routes>
          <Route path="/processes/new" element={<ProcessForm />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('공정 상세');
    const toggleBtn = screen.getByRole('button', { name: /하위 작업 숨기기/ });
    expect(toggleBtn).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /하위 작업 보이기/ })).not.toBeInTheDocument();
    fireEvent.click(toggleBtn);
    expect(screen.getByRole('button', { name: /하위 작업 보이기/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /하위 작업 숨기기/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /하위 작업 보이기/ }));
    expect(screen.getByRole('button', { name: /하위 작업 숨기기/ })).toBeInTheDocument();
  });

  it('작업 명 옆 작업 변경 아이콘 클릭 시 작업 선택 팝업이 열린다', async () => {
    const workItem = { id: 1, name: '테스트 작업', estimated_duration_sec: 60 };
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/factories')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/works')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [workItem], total: 1 }) });
      if (url.includes('/api/config/product-codes')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      return Promise.reject(new Error('unknown'));
    });
    render(
      <MemoryRouter initialEntries={['/processes/new']}>
        <Routes>
          <Route path="/processes/new" element={<ProcessForm />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('공정 상세');
    const addWorkBtn = screen.getByRole('button', { name: /작업 추가/ });
    addWorkBtn.click();
    const selectBtns = await screen.findAllByRole('button', { name: '선택' });
    fireEvent.click(selectBtns[0]);
    await screen.findByText('테스트 작업');
    const editWorkBtn = screen.getByRole('button', { name: /작업 변경/ });
    expect(editWorkBtn).toBeInTheDocument();
    fireEvent.click(editWorkBtn);
    expect(screen.getByText('작업 선택')).toBeInTheDocument();
  });
});
