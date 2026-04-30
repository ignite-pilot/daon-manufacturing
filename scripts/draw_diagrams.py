"""
다온 제조 공정 관리 시스템 — 구성도 3종 생성 (흑백)
출력: docs/diagram_01_architecture.png
        docs/diagram_02_features.png
        docs/diagram_03_integration.png
"""
import os, math
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

OUT = os.path.join(os.path.dirname(__file__), "..", "docs")
os.makedirs(OUT, exist_ok=True)

# ── 공통 스타일 ───────────────────────────────────────────────────────────────
BG        = "white"
FG        = "black"
GRAY_DARK = "#333333"
GRAY_MID  = "#666666"
GRAY_LITE = "#cccccc"
FONT_MAIN = "Malgun Gothic"

def box(ax, x, y, w, h, label, sub="", style="solid", lw=1.2, fs=9, sub_fs=7.5,
        pad=0.3, fill="white", hatch=None):
    rect = FancyBboxPatch(
        (x - w/2, y - h/2), w, h,
        boxstyle=f"round,pad={pad}",
        linewidth=lw,
        edgecolor=FG,
        facecolor=fill,
        linestyle=style,
        hatch=hatch,
    )
    ax.add_patch(rect)
    if sub:
        ax.text(x, y + 0.12, label, ha="center", va="center",
                fontsize=fs, fontweight="bold", color=FG, fontfamily=FONT_MAIN)
        ax.text(x, y - 0.22, sub, ha="center", va="center",
                fontsize=sub_fs, color=GRAY_MID, fontfamily=FONT_MAIN)
    else:
        ax.text(x, y, label, ha="center", va="center",
                fontsize=fs, fontweight="bold", color=FG, fontfamily=FONT_MAIN)

def arrow(ax, x1, y1, x2, y2, label="", lw=1.2, style="->", color=FG, ls="solid"):
    ax.annotate(
        "", xy=(x2, y2), xytext=(x1, y1),
        arrowprops=dict(arrowstyle=style, lw=lw, color=color, linestyle=ls),
    )
    if label:
        mx, my = (x1+x2)/2, (y1+y2)/2
        ax.text(mx + 0.05, my, label, fontsize=7, color=GRAY_MID, ha="left", va="center",
                fontfamily=FONT_MAIN)

def divider(ax, x1, x2, y, lw=0.6):
    ax.plot([x1, x2], [y, y], color=GRAY_LITE, lw=lw, linestyle="--")

# ═══════════════════════════════════════════════════════════════════════════════
# 다이어그램 1: 백엔드 / 프론트엔드 구조도
# ═══════════════════════════════════════════════════════════════════════════════
def draw_architecture():
    fig, ax = plt.subplots(figsize=(16, 11), facecolor=BG)
    ax.set_xlim(0, 16)
    ax.set_ylim(0, 11)
    ax.axis("off")
    ax.set_facecolor(BG)

    # 제목
    ax.text(8, 10.6, "다온 제조 공정 관리 시스템 — 시스템 구조도",
            ha="center", va="center", fontsize=13, fontweight="bold",
            fontfamily=FONT_MAIN, color=FG)

    # ── 영역 레이블 ────────────────────────────────────────────────────────────
    area_kw = dict(ha="center", va="center", fontsize=8.5, color=GRAY_MID,
                   fontfamily=FONT_MAIN, fontstyle="italic")

    # 영역 박스 (얇은 점선 테두리)
    def area_rect(ax, x, y, w, h, label):
        r = mpatches.FancyBboxPatch(
            (x, y), w, h,
            boxstyle="round,pad=0.1",
            linewidth=0.8, edgecolor=GRAY_LITE,
            facecolor="#f8f8f8", linestyle="--", zorder=0
        )
        ax.add_patch(r)
        ax.text(x + w/2, y + h - 0.2, label, **area_kw)

    area_rect(ax, 0.3, 6.8, 4.0, 3.5, "클라이언트 (Browser)")
    area_rect(ax, 5.0, 3.0, 6.2, 7.4, "애플리케이션 서버 (Next.js / Node.js)")
    area_rect(ax, 12.0, 0.5, 3.7, 10.0, "외부 서비스")

    # ── 클라이언트 ──────────────────────────────────────────────────────────────
    box(ax, 2.3, 9.5, 3.2, 0.7, "웹 브라우저", "Vite React SPA (port 80)", fs=9)

    # SPA 내부 페이지들
    pages = [
        ("로그인", 1.0, 8.4),
        ("공장 관리", 2.1, 8.4),
        ("공정 관리", 3.2, 8.4),
        ("작업 관리", 1.0, 7.6),
        ("설비 관리", 2.1, 7.6),
        ("부품 관리", 3.2, 7.6),
        ("도면 관리", 1.55, 6.95),
        ("AI Chat", 2.75, 6.95),
    ]
    for lbl, px, py in pages:
        box(ax, px, py, 0.95, 0.55, lbl, fs=7.5, pad=0.15)

    arrow(ax, 2.3, 9.15, 2.3, 8.7, lw=0.8)

    # ── API 서버 (Next.js Routes) ──────────────────────────────────────────────
    box(ax, 8.1, 9.5, 5.6, 0.7,
        "Next.js API Routes", "REST API 엔드포인트 (port 3000)", fs=9)

    api_items = [
        "POST /api/auth/login  |  GET /api/auth/me",
        "GET|POST|PUT|DELETE /api/factories",
        "GET|POST|PUT|DELETE /api/processes  +  /excel  (일괄 등록)",
        "GET|POST|PUT|DELETE /api/works  +  /bulk  (일괄 등록)",
        "GET|POST|PUT|DELETE /api/machines  |  /api/parts",
        "POST /api/plan  +  /[id]/analyze_cad  +  /[id]/viewer",
        "POST /api/chat  (AI 어시스턴트)",
        "POST /api/upload/presign  (S3 서명 URL)",
        "GET  /api/config/product-codes",
        "GET  /api/health",
    ]
    for i, txt in enumerate(api_items):
        ax.text(8.1, 8.75 - i * 0.42, txt, ha="center", va="center",
                fontsize=7, fontfamily=FONT_MAIN, color=GRAY_DARK,
                bbox=dict(boxstyle="round,pad=0.1", facecolor="white",
                          edgecolor=GRAY_LITE, lw=0.6))

    # ── 라이브러리 레이어 ───────────────────────────────────────────────────────
    box(ax, 6.4, 4.1, 2.5, 0.65,
        "plan-analyzer.ts", "DXF 분석 파이프라인", fs=8, sub_fs=7)
    box(ax, 9.0, 4.1, 2.5, 0.65,
        "bulk-register-*.ts", "Excel/CSV 일괄 등록", fs=8, sub_fs=7)
    box(ax, 11.0, 4.65, 2.0, 0.65,
        "ig-config.ts", "완제품 코드 조회", fs=8, sub_fs=7)
    box(ax, 6.4, 3.3, 2.5, 0.55, "db.ts  /  db-config.ts", "MySQL2 연결 풀", fs=8)
    box(ax, 9.0, 3.3, 2.5, 0.55, "excel.ts  /  spreadsheet-parse.ts", "Excel 파싱", fs=8)

    # ── nginx ──────────────────────────────────────────────────────────────────
    box(ax, 8.1, 1.1, 3.4, 0.6, "nginx (reverse proxy)", "port 8080 → app:3500", fs=8.5)

    # ── 외부 서비스 ─────────────────────────────────────────────────────────────
    ext = [
        (13.85, 9.0,  "MySQL DB",           "AWS RDS / Docker"),
        (13.85, 7.6,  "AWS S3 / MinIO",     "DXF·SVG·메타데이터 저장"),
        (13.85, 6.2,  "AWS Secrets Manager","DB 자격증명 관리"),
        (13.85, 4.8,  "Anthropic Claude API","도면 분석 / AI Chat"),
        (13.85, 3.4,  "ig-config-manager",  "완제품 코드 관리"),
        (13.85, 2.0,  "Python dxf_to_svg.py","DXF→SVG 변환 스크립트"),
    ]
    for ex, ey, el, es in ext:
        box(ax, ex, ey, 3.1, 0.7, el, es, style="solid", lw=1.0, fs=8.5, hatch="//")

    # ── 화살표 ─────────────────────────────────────────────────────────────────
    # 브라우저 → API
    arrow(ax, 4.3, 9.5, 5.3, 9.5, "HTTP/JSON", lw=1.2)
    # API → DB
    arrow(ax, 11.1, 8.9, 12.3, 9.0, lw=1.0, color=GRAY_DARK)
    # API → S3
    arrow(ax, 11.1, 8.2, 12.3, 7.6, lw=1.0, color=GRAY_DARK)
    # API → Secrets
    arrow(ax, 11.1, 7.5, 12.3, 6.2, lw=1.0, color=GRAY_DARK)
    # API → Anthropic
    arrow(ax, 11.1, 6.0, 12.3, 4.8, lw=1.0, color=GRAY_DARK)
    # API → ig-config
    arrow(ax, 11.1, 5.0, 12.3, 3.4, lw=1.0, color=GRAY_DARK)
    # plan-analyzer → Python
    arrow(ax, 7.65, 3.75, 12.3, 2.0, lw=1.0, color=GRAY_DARK)
    # nginx ↔ browser
    arrow(ax, 2.3, 6.7, 2.3, 6.0, "선택: nginx 경유", lw=0.8, ls="dashed", color=GRAY_MID)
    arrow(ax, 8.1, 1.4, 8.1, 4.55, lw=0.8, ls="dashed", color=GRAY_MID)

    # 범례
    ax.text(0.5, 0.4, "  실선 박스: 직접 구현 모듈     빗금 박스: 외부 서비스     점선: 선택적 경로",
            fontsize=7.5, color=GRAY_MID, fontfamily=FONT_MAIN)

    fig.tight_layout(pad=0.3)
    out_path = os.path.join(OUT, "diagram_01_architecture.png")
    fig.savefig(out_path, dpi=150, facecolor=BG, bbox_inches="tight")
    plt.close(fig)
    print(f"[1] 저장: {out_path}")


# ═══════════════════════════════════════════════════════════════════════════════
# 다이어그램 2: 프론트엔드 기능 목록
# ═══════════════════════════════════════════════════════════════════════════════
def draw_features():
    fig, ax = plt.subplots(figsize=(16, 13), facecolor=BG)
    ax.set_xlim(0, 16)
    ax.set_ylim(0, 13)
    ax.axis("off")
    ax.set_facecolor(BG)

    ax.text(8, 12.6, "다온 제조 공정 관리 시스템 — 프론트엔드 기능 목록",
            ha="center", va="center", fontsize=13, fontweight="bold",
            fontfamily=FONT_MAIN, color=FG)

    # 컬럼 정의: (중앙 x, 제목, 기능 목록)
    modules = [
        (2.0, "인증 / 세션", [
            "로그인 (이메일·비밀번호)",
            "로그아웃",
            "JWT 기반 세션 유지",
            "ProtectedRoute (미인증 차단)",
            "AuthContext (전역 사용자 상태)",
        ]),
        (5.8, "공장 관리", [
            "공장 목록 (페이징·검색·정렬)",
            "공장 등록 / 수정 / 삭제",
            "공장 상세 보기",
            "우편번호·주소 검색 (Daum Postcode)",
            "연면적·설명 입력",
            "CAD 도면 연결",
            "Excel 일괄 내보내기",
        ]),
        (9.6, "공정 관리", [
            "공정 목록 (완제품·공장 필터)",
            "공정 등록 / 수정 / 삭제",
            "공정 상세 보기",
            "완제품 선택 (ig-config 연동)",
            "공정 단계(작업) 구성",
            "Excel 일괄 등록 (CSV/XLSX)",
            "Excel 일괄 내보내기",
            "작업 선택 팝업 (MachineSelectPopup)",
        ]),
        (13.4, "작업 관리", [
            "작업 목록 (검색·페이징)",
            "작업 등록 / 수정 / 삭제",
            "작업 상세 보기",
            "작업 유형 (가조립 / 조립)",
            "예상 소요시간 입력",
            "Excel 일괄 등록",
            "Excel 일괄 내보내기",
        ]),
    ]
    modules2 = [
        (3.0, "설비 관리", [
            "설비 목록 (공장별 필터)",
            "설비 등록 / 수정 / 삭제",
            "설비 상세 보기",
            "제조사·AS 연락처 입력",
            "도입 일자·공장 내 위치 기록",
            "사진 URL 등록",
            "Excel 일괄 내보내기",
        ]),
        (7.5, "부품 관리", [
            "부품 목록 (공장별 필터)",
            "부품 등록 / 수정 / 삭제",
            "부품 상세 보기",
            "제조사·AS 연락처 입력",
            "사진 URL 등록",
            "Excel 일괄 내보내기",
        ]),
        (12.0, "도면 관리 (Plans)", [
            "도면 목록 (건물·층 필터)",
            "신규 도면 업로드 (DXF/DWG)",
            "  ├ 업로드 마법사 (UploadWizard)",
            "  └ S3 Presigned URL 직접 업로드",
            "AI 자동 분석 (analyze_cad)",
            "  ├ Claude API로 파라미터 결정",
            "  ├ Python dxf_to_svg.py 실행",
            "  └ SVG + 메타데이터 생성·저장",
            "분석 진행 모달 (AnalyzingModal)",
            "SVG 도면 뷰어 (PlanViewer)",
            "도면 수정 / 삭제",
        ]),
    ]

    def draw_module(cx, title, items, top_y):
        col_w = 3.4
        row_h = 0.42
        n = len(items)
        total_h = 0.7 + n * row_h + 0.3
        # 컬럼 배경
        bg = mpatches.FancyBboxPatch(
            (cx - col_w/2, top_y - total_h), col_w, total_h,
            boxstyle="round,pad=0.1", linewidth=1.2,
            edgecolor=FG, facecolor="#f5f5f5", zorder=0
        )
        ax.add_patch(bg)
        # 제목 배경
        th = mpatches.FancyBboxPatch(
            (cx - col_w/2, top_y - 0.65), col_w, 0.55,
            boxstyle="round,pad=0.05", linewidth=0,
            edgecolor="none", facecolor="#dddddd", zorder=1
        )
        ax.add_patch(th)
        ax.text(cx, top_y - 0.38, title, ha="center", va="center",
                fontsize=10, fontweight="bold", fontfamily=FONT_MAIN, color=FG, zorder=2)
        for i, item in enumerate(items):
            y = top_y - 0.9 - i * row_h
            bullet = "•" if not item.startswith(" ") else " "
            ax.text(cx - col_w/2 + 0.25, y, f"{bullet} {item.strip()}",
                    ha="left", va="center", fontsize=7.8,
                    fontfamily=FONT_MAIN, color=GRAY_DARK, zorder=2)

    for cx, title, items in modules:
        draw_module(cx, title, items, top_y=11.9)

    for cx, title, items in modules2:
        draw_module(cx, title, items, top_y=7.8)

    # AI Chat Panel (공통 컴포넌트)
    box(ax, 8.0, 1.7, 14.5, 1.8,
        "AI 어시스턴트 채팅 패널 (ChatPanel — 모든 화면 공통)",
        "Anthropic Claude API 연동 · 공정/설비/부품 관련 질문 응답 · Streaming 출력 · 대화 히스토리 유지",
        fs=10, sub_fs=8.5, fill="#f0f0f0")

    ax.text(0.5, 0.3,
            "  공통 UI: 사이드바 네비게이션 · 상단 TopNav · 레이어 팝업(ListWithLayerPopup) · 페이징·검색 FilterBar · 페이지 이탈 차단(usePageLeaveBlocker)",
            fontsize=7.5, color=GRAY_MID, fontfamily=FONT_MAIN)

    fig.tight_layout(pad=0.3)
    out_path = os.path.join(OUT, "diagram_02_features.png")
    fig.savefig(out_path, dpi=150, facecolor=BG, bbox_inches="tight")
    plt.close(fig)
    print(f"[2] 저장: {out_path}")


# ═══════════════════════════════════════════════════════════════════════════════
# 다이어그램 3: 입력 데이터 · 소프트웨어 · MAX 연동 구성도
# ═══════════════════════════════════════════════════════════════════════════════
def draw_integration():
    fig, ax = plt.subplots(figsize=(18, 11), facecolor=BG)
    ax.set_xlim(0, 18)
    ax.set_ylim(0, 11)
    ax.axis("off")
    ax.set_facecolor(BG)

    ax.text(9, 10.6, "입력 데이터 · 소프트웨어 · MAX 연동 구성도",
            ha="center", va="center", fontsize=13, fontweight="bold",
            fontfamily=FONT_MAIN, color=FG)

    def area_rect(x, y, w, h, label):
        r = mpatches.FancyBboxPatch(
            (x, y), w, h,
            boxstyle="round,pad=0.15",
            linewidth=1.0, edgecolor=GRAY_MID,
            facecolor="#f5f5f5", linestyle="--", zorder=0
        )
        ax.add_patch(r)
        ax.text(x + w/2, y + h - 0.25, label,
                ha="center", va="center", fontsize=9,
                fontfamily=FONT_MAIN, color=GRAY_DARK,
                fontstyle="italic", fontweight="bold")

    # ── 영역 ────────────────────────────────────────────────────────────────────
    area_rect(0.3,  1.0, 4.2, 9.2, "① 입력 데이터")
    area_rect(5.2,  1.0, 7.6, 9.2, "② 다온 제조 공정 관리 시스템")
    area_rect(13.5, 1.0, 4.2, 9.2, "③ 대상 플랫폼  MAX (max.uipa.or.kr)")

    # ── 입력 데이터 ──────────────────────────────────────────────────────────────
    inputs = [
        (2.4, 9.1,  "CAD 도면 파일",         "DXF / DWG  (AutoCAD 2013+)"),
        (2.4, 7.85, "공정분석 Excel",         "51라인 조립라인 공정분석.xlsx\n(FRT·RR × 6~7 차종)"),
        (2.4, 6.5,  "작업표준서",             "차종별 xlsx × 16개\n(FRT 8종 + RR 8종)"),
        (2.4, 5.2,  "관리 계획서",            "차종별 xlsx × 16개\n(FRT 8종 + RR 8종)"),
        (2.4, 3.95, "완제품 코드 목록",       "ig-config-manager\n(PRODUCT_CODE)"),
        (2.4, 2.8,  "사용자 계정 정보",       "MySQL DB (AWS RDS)"),
    ]
    for bx, by, bl, bs in inputs:
        box(ax, bx, by, 3.6, 0.85, bl, bs, fs=9, sub_fs=7.5, fill="white")

    # ── 소프트웨어 내부 흐름 ────────────────────────────────────────────────────
    sw = [
        (9.0, 9.3,  "도면 업로드 & AI 분석",
                    "① DXF → S3/MinIO 업로드\n② Claude API 파라미터 결정\n③ Python dxf_to_svg.py 실행\n④ SVG + 메타데이터 생성"),
        (9.0, 7.2,  "공정정보 자동 추출",
                    "⑤ Excel/XLSX 파싱\n⑥ Claude AI 공정 항목 구조화\n⑦ process / process_step 테이블 저장"),
        (9.0, 5.25, "설비 / 부품 / 작업 등록",
                    "⑧ 수동 입력 또는 Excel 일괄 등록\n⑨ 공장 단위 그룹핑\n⑩ DB 저장 (machine / part / work)"),
        (9.0, 3.4,  "공정 관리 & 조회",
                    "⑪ 완제품 × 공정 매핑\n⑫ 공정 단계 순서 관리\n⑬ 소요시간 집계"),
        (9.0, 1.9,  "데이터 내보내기",
                    "⑭ Excel 일괄 다운로드 (공장·공정·설비·부품)\n⑮ 대상 플랫폼 연동 형식으로 변환"),
    ]
    for bx, by, bl, bs in sw:
        box(ax, bx, by, 6.8, 1.3, bl, bs, fs=9.5, sub_fs=8, fill="white", lw=1.4)

    # 소프트웨어 내부 수직 흐름 화살표
    sw_ys = [y for _, y, _, _ in sw]
    for i in range(len(sw_ys)-1):
        arrow(ax, 9.0, sw_ys[i] - 0.7, 9.0, sw_ys[i+1] + 0.7, lw=1.0)

    # ── MAX 플랫폼 ───────────────────────────────────────────────────────────────
    max_items = [
        (15.6, 8.8, "제조 공정 정보",      "공정명 · 소요시간 · 단계"),
        (15.6, 7.4, "설비 정보",           "설비명 · 위치 · AS 정보"),
        (15.6, 6.0, "부품 정보",           "부품명 · 제조사 · AS 정보"),
        (15.6, 4.6, "공장 레이아웃 도면",  "SVG 도면 뷰어 연동"),
        (15.6, 3.2, "완제품 기준 정보",    "차종별 공정 구성"),
        (15.6, 1.9, "MAX Smart Factory\nPortal", "제조혁신 관리 플랫폼\nmax.uipa.or.kr"),
    ]
    for bx, by, bl, bs in max_items[:-1]:
        box(ax, bx, by, 3.6, 0.9, bl, bs, fs=9, sub_fs=7.5, fill="white")

    # MAX 메인 박스
    box(ax, 15.6, 1.85, 3.6, 1.1, "MAX Smart Factory Portal",
        "max.uipa.or.kr", fs=9.5, sub_fs=8, fill="#e8e8e8", lw=1.8)

    # 통합 화살표 모음
    for bx, by, bl, bs in max_items[:-1]:
        arrow(ax, 12.5, 1.85, 13.8, by - 0.1, lw=0.8, color=GRAY_MID, ls="dashed")

    # ── 입력→소프트웨어 화살표 ────────────────────────────────────────────────────
    links = [
        (inputs[0], sw[0], "DXF 파일 업로드"),
        (inputs[1], sw[1], "공정분석 Excel"),
        (inputs[2], sw[1], "작업표준서"),
        (inputs[3], sw[1], "관리계획서"),
        (inputs[4], sw[2], "완제품 코드"),
        (inputs[5], sw[3], "사용자 인증"),
    ]
    for (ix, iy, _, _), (sx, sy, _, _), lbl in links:
        arrow(ax, ix + 1.8, iy, sx - 3.5, sy, lbl, lw=0.9)

    # 소프트웨어→MAX 핵심 화살표
    arrow(ax, 12.5, 7.2, 13.8, 7.4, "공정 데이터", lw=1.2)
    arrow(ax, 12.5, 5.25, 13.8, 6.0, "설비·부품", lw=1.2)
    arrow(ax, 12.5, 9.3, 13.8, 4.6, "SVG 도면", lw=1.2, ls="dashed", color=GRAY_MID)
    arrow(ax, 12.5, 3.4, 13.8, 3.2, "완제품 공정", lw=1.2)
    arrow(ax, 12.5, 1.9, 13.8, 1.85, "Excel 내보내기", lw=1.4)

    # 범례
    ax.text(0.5, 0.35,
            "  실선 화살표: 자동 데이터 흐름    점선 화살표: 사용자 수동 업로드 / 내보내기 후 등록",
            fontsize=7.5, color=GRAY_MID, fontfamily=FONT_MAIN)

    fig.tight_layout(pad=0.3)
    out_path = os.path.join(OUT, "diagram_03_integration.png")
    fig.savefig(out_path, dpi=150, facecolor=BG, bbox_inches="tight")
    plt.close(fig)
    print(f"[3] 저장: {out_path}")


if __name__ == "__main__":
    draw_architecture()
    draw_features()
    draw_integration()
    print("완료.")
