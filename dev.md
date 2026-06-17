# 이메일 인증 추가 개발 계획

## 목표

Supabase Auth를 이용해 이메일/비밀번호 회원가입·로그인을 추가하고,
각 사용자가 자신의 할일만 보고 수정할 수 있도록 격리한다.

---

## 현재 상태 분석

| 항목 | 현재 |
|------|------|
| 인증 | 없음 (anon 전체 접근) |
| todos RLS | `anon full access` — 누구나 모든 데이터 접근 가능 |
| todos 소유자 구분 | 없음 (`user_id` 컬럼 없음) |
| 파일 구성 | `index.html` / `style.css` / `app.js` |

---

## 변경 범위

### 신규 파일
- `login.html` — 로그인 페이지
- `signup.html` — 회원가입 페이지
- `auth.js` — 인증 공통 로직 (signUp / signIn / signOut / 세션 확인)

### 수정 파일
- `index.html` — App Bar에 사용자 이메일·로그아웃 버튼 추가
- `app.js` — 인증 가드, `user_id` 기반 CRUD 수정
- `style.css` — 로그인/회원가입 폼 스타일 추가
- `supabase.md` — RLS 변경 내용 반영

---

## Step 1. Supabase Dashboard 설정

### 1-1. Email Auth 확인
1. Supabase 대시보드 → **Authentication → Providers**
2. **Email** 항목이 **Enabled** 상태인지 확인 (기본값 활성화)
3. **Confirm email** 옵션:
   - 개발 중에는 **OFF** 권장 (이메일 확인 없이 즉시 로그인 가능)
   - 운영 시에는 **ON** 전환

### 1-2. Site URL 설정
1. **Authentication → URL Configuration**
2. **Site URL** 을 GitHub Pages 주소로 변경:
   ```
   https://kskyuny.github.io/todo-app
   ```
3. **Redirect URLs** 에 추가:
   ```
   https://kskyuny.github.io/todo-app/
   https://kskyuny.github.io/todo-app/login.html
   ```

---

## Step 2. DB 마이그레이션

Supabase **SQL Editor** 에서 순서대로 실행한다.

### 2-1. user_id 컬럼 추가
```sql
ALTER TABLE todos
  ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
```

### 2-2. 기존 RLS 정책 제거 및 교체
```sql
-- 기존 anon 전체 허용 정책 삭제
DROP POLICY IF EXISTS "anon full access" ON todos;

-- 로그인한 사용자는 자신의 할일만 접근
CREATE POLICY "owner access"
  ON todos FOR ALL
  TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### 2-3. 기존 데이터 처리
기존 데이터(`user_id = NULL`)는 정책에 걸려 조회되지 않으므로 필요 시 삭제:
```sql
DELETE FROM todos WHERE user_id IS NULL;
```

---

## Step 3. auth.js 작성

인증 관련 함수를 모아 둔 공통 모듈.

```
주요 함수:
- getSession()       현재 세션 반환. null이면 비로그인
- signUp(email, pw)  회원가입
- signIn(email, pw)  로그인
- signOut()          로그아웃 후 login.html로 이동
- requireAuth()      세션 없으면 login.html로 리다이렉트
```

`index.html`과 `login.html`, `signup.html` 모두 이 파일을 공통으로 사용한다.

---

## Step 4. login.html 작성

- 이메일 / 비밀번호 입력 폼
- **로그인** 버튼 → `signIn()` 호출 → 성공 시 `index.html` 이동
- **회원가입 페이지로** 링크
- 오류 메시지 인라인 표시 (alert 대신)

---

## Step 5. signup.html 작성

- 이메일 / 비밀번호 / 비밀번호 확인 입력 폼
- 클라이언트 유효성 검사 (비밀번호 일치, 최소 6자)
- **가입하기** 버튼 → `signUp()` 호출 → 성공 시 `index.html` 이동
- **로그인 페이지로** 링크

---

## Step 6. index.html 수정

App Bar에 추가:
```html
<span id="userEmail" class="app-bar__user"></span>
<button id="signOutBtn" class="icon-btn" title="로그아웃">
  <span class="material-icons-round">logout</span>
</button>
```

---

## Step 7. app.js 수정

### 7-1. 페이지 진입 시 인증 가드
```js
// 페이지 로드 시 세션 확인 → 없으면 login.html 이동
const { data: { session } } = await db.auth.getSession();
if (!session) { location.href = 'login.html'; }
```

### 7-2. CRUD에 user_id 포함
```js
// insert 시 user_id 추가
await db.from('todos').insert({ text, done, priority, sort_order, user_id: session.user.id });
```

### 7-3. 로그아웃 버튼 이벤트
```js
document.getElementById('signOutBtn').addEventListener('click', signOut);
```

### 7-4. 사용자 이메일 표시
```js
document.getElementById('userEmail').textContent = session.user.email;
```

---

## Step 8. style.css 수정

로그인/회원가입 페이지용 스타일 추가:
- `.auth-container` — 중앙 정렬 카드 레이아웃
- `.auth-form` — 폼 필드 간격
- `.error-msg` — 인라인 오류 메시지 (빨간색)
- `.auth-link` — 페이지 전환 링크

---

## 파일별 작업 순서 (체크리스트)

- [ ] **Step 1** Supabase Dashboard — Email Auth 확인, Site URL 설정
- [ ] **Step 2** SQL Editor — `user_id` 컬럼 추가, RLS 정책 교체
- [ ] **Step 3** `auth.js` 신규 작성
- [ ] **Step 4** `login.html` 신규 작성
- [ ] **Step 5** `signup.html` 신규 작성
- [ ] **Step 6** `index.html` — App Bar 수정
- [ ] **Step 7** `app.js` — 인증 가드 + user_id CRUD 수정
- [ ] **Step 8** `style.css` — 인증 폼 스타일 추가
- [ ] `dev.md` Step 완료 체크 후 commit & push

---

## 완료 기준

1. 미로그인 상태에서 `index.html` 접속 시 `login.html`로 자동 이동
2. 회원가입 후 즉시 로그인되어 `index.html`로 이동
3. 로그인한 사용자는 자신의 할일만 조회·추가·수정·삭제 가능
4. 다른 계정으로 로그인하면 다른 할일 목록이 표시됨
5. 로그아웃 버튼 클릭 시 `login.html`로 이동
