/**
 * @jest-environment jsdom
 * 로그인 페이지 (bnk-mes 스타일): 제목, 이메일/비밀번호 입력, 로그인 버튼
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useLocation: () => ({ state: null }),
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    fetchMe: jest.fn(),
  }),
}));

describe('로그인 페이지 (bnk-mes 스타일)', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('제목 "로그인"을 렌더링한다', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument();
  });

  it('이메일(아이디) 라벨과 입력 필드를 렌더링한다', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
    expect(screen.getByLabelText('이메일 (아이디)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('이메일을 입력하세요')).toBeInTheDocument();
  });

  it('비밀번호 라벨과 입력 필드를 렌더링한다', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
    expect(screen.getByLabelText('비밀번호')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('비밀번호를 입력하세요')).toBeInTheDocument();
  });

  it('로그인 버튼을 렌더링한다', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();
  });

  it('비밀번호 찾기와 회원가입 링크를 렌더링한다', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
    expect(screen.getByText('비밀번호 찾기')).toBeInTheDocument();
    expect(screen.getByText('회원가입')).toBeInTheDocument();
  });
});
