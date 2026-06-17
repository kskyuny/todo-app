# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git 규칙

- 커밋 병합 시 **rebase 금지 — merge만 사용**
- 작업 범위는 이 디렉토리(`day02/todo/`) 이하 파일로만 한정. 상위 디렉토리나 다른 프로젝트 파일을 읽거나 수정하지 말 것.

## 앱 실행

서버 없이 브라우저에서 직접 열면 된다.

```bash
# WSL2에서 Windows 브라우저로 열기
explorer.exe index.html

# 또는 로컬 HTTP 서버 (선택)
python3 -m http.server 8080
```

## 테스트

브라우저 headless 실행 불가 환경이므로 jsdom으로 검증한다.

```bash
# 테스트 실행 (jsdom이 /tmp/pw_test/node_modules에 설치되어 있어야 함)
node /tmp/pw_test/test_v2.js
```

jsdom이 없으면 먼저 설치:

```bash
mkdir -p /tmp/pw_test && cd /tmp/pw_test && npm install jsdom
```

## 아키텍처

순수 HTML/CSS/JS 3-파일 구성 — 빌드 도구, 프레임워크, 번들러 없음.

| 파일 | 역할 |
|------|------|
| `index.html` | 구조 (App Bar, 입력 카드, 필터 칩, 목록, 푸터) |
| `style.css` | Material Design 3 스타일 (CSS 변수 기반, 반응형) |
| `app.js` | 전체 로직 (상태, 렌더, CRUD, 드래그, 필터, localStorage) |

### 상태 흐름

```
todos[]  ←─ localStorage (초기 로드)
   │
   ├── addTodo / toggleDone / deleteTodo / changePriority
   │        └─ save() → localStorage
   └── render() → DOM 재생성 (currentFilter 적용)
```

### 주요 데이터 구조

```js
// todos 배열 원소
{ id: number, text: string, done: boolean, priority: 'high'|'medium'|'low' }
```

### 드래그 앤 드롭

`dragSrcId`(전역)로 드래그 출처를 추적하고, `drop` 이벤트에서 `todos.splice`로 배열 순서를 바꾼 뒤 `render()`를 호출한다. 필터가 켜져 있으면 보이지 않는 항목도 배열에 그대로 유지된다.

### CSS 커스텀 프로퍼티 위치

`style.css` 최상단 `:root` 블록에 MD3 색상 토큰, 우선순위 색상, elevation 값이 모두 선언되어 있다.
