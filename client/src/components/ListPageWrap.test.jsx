/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ListPageWrap, TableHeader, Th, ActionCell } from './ListPageWrap';

describe('ListPageWrap', () => {
  it('페이지 제목을 렌더링한다', () => {
    render(
      <ListPageWrap title="공장 정보" totalCount={0}>
        <table><tbody><tr><td>내용</td></tr></tbody></table>
      </ListPageWrap>
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('공장 정보');
  });

  it('총 건수를 표시한다', () => {
    render(
      <ListPageWrap title="테스트" totalCount={5}>
        <table><tbody /></table>
      </ListPageWrap>
    );
    expect(screen.getByText('총 5건')).toBeInTheDocument();
  });

  it('primaryAction과 secondaryAction을 렌더링한다', () => {
    render(
      <ListPageWrap
        title="테스트"
        totalCount={0}
        primaryAction={<button type="button">등록</button>}
        secondaryAction={<a href="/excel">엑셀</a>}
      >
        <table><tbody /></table>
      </ListPageWrap>
    );
    expect(screen.getByRole('button', { name: '등록' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '엑셀' })).toBeInTheDocument();
  });

  it('페이지네이션: 이전/다음과 페이지 번호(최대 10개)를 렌더링한다', () => {
    render(
      <ListPageWrap title="테스트" totalCount={1} currentPage={1}>
        <table><tbody /></table>
      </ListPageWrap>
    );
    expect(screen.getByRole('button', { name: '이전' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다음' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
  });

  it('페이지가 10개 초과일 때 최대 10개의 번호만 노출한다', () => {
    render(
      <ListPageWrap title="테스트" totalCount={100} pageSize={5} currentPage={1}>
        <table><tbody /></table>
      </ListPageWrap>
    );
    const pageButtons = screen.getAllByRole('button', { name: /^\d+$/ });
    expect(pageButtons.length).toBeLessThanOrEqual(10);
    expect(pageButtons.map((b) => b.textContent)).toContain('1');
  });
});

describe('TableHeader', () => {
  it('thead와 tr을 렌더링한다', () => {
    render(
      <table>
        <TableHeader>
          <Th>컬럼1</Th>
        </TableHeader>
        <tbody />
      </table>
    );
    const th = screen.getByText('컬럼1');
    expect(th.tagName).toBe('TH');
    expect(th.closest('thead')).toBeInTheDocument();
  });
});

describe('ActionCell', () => {
  it('수정 링크와 삭제 버튼을 렌더링한다', () => {
    const onDelete = jest.fn();
    render(
      <MemoryRouter>
        <table>
          <tbody>
            <tr>
              <ActionCell editTo="/factories/1/edit" onDelete={onDelete} />
            </tr>
          </tbody>
        </table>
      </MemoryRouter>
    );
    const editLink = screen.getByRole('link', { name: '수정' });
    expect(editLink).toHaveAttribute('href', '/factories/1/edit');
    const deleteBtn = screen.getByRole('button', { name: '삭제' });
    deleteBtn.click();
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
