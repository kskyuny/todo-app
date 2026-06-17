# Supabase 마이그레이션 가이드 (localStorage → Supabase)

## 1. 가입 및 프로젝트 생성

1. [https://supabase.com](https://supabase.com) 접속 → **Start your project** (GitHub 계정으로 가입 권장)
2. 대시보드에서 **New project** 클릭
3. 아래 항목 입력:

   | 항목 | 권장값 |
   |------|--------|
   | Organization | 개인 org 선택 |
   | Name | `todo-app` |
   | Database Password | 안전한 비밀번호 (저장 필수) |
   | Region | **Northeast Asia (Seoul)** — `ap-northeast-2` |
   | Pricing Plan | Free |

4. **Create new project** → 프로비저닝 완료까지 약 1~2분 대기

---

## 2. API 키 확인

프로젝트 생성 후 **Project Settings → API** 메뉴에서 아래 두 값을 복사:

```
Project URL   : https://xxxxxxxxxxxx.supabase.co
anon key      : eyJhbGciOiJIUzI1NiIsInR5cCI6...  (공개 가능한 키)
```

> `anon key`는 브라우저 JS에서 사용해도 안전하지만, RLS(Row Level Security)를 반드시 설정해야 합니다.  
> `service_role key`는 절대 프론트엔드에 노출하지 마세요.

---

## 3. 테이블 구조

**SQL Editor** (`Database → SQL Editor → New query`)에 아래 쿼리를 붙여넣고 실행:

```sql
-- todos 테이블
CREATE TABLE todos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  text        TEXT        NOT NULL CHECK (char_length(text) BETWEEN 1 AND 500),
  done        BOOLEAN     NOT NULL DEFAULT false,
  priority    TEXT        NOT NULL DEFAULT 'medium'
                          CHECK (priority IN ('high', 'medium', 'low')),
  sort_order  INTEGER     NOT NULL DEFAULT 0,   -- 드래그앤드롭 순서 보존
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER todos_updated_at
  BEFORE UPDATE ON todos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- sort_order 인덱스 (렌더링 순서 쿼리 최적화)
CREATE INDEX idx_todos_sort_order ON todos (sort_order ASC);
```

### 컬럼 설명

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | PK — `Date.now()` 대신 UUID 사용 (충돌 방지) |
| `text` | TEXT | 할일 내용 |
| `done` | BOOLEAN | 완료 여부 |
| `priority` | TEXT | `high` / `medium` / `low` |
| `sort_order` | INTEGER | 드래그앤드롭으로 변경된 순서 저장 |
| `created_at` | TIMESTAMPTZ | 생성 시각 |
| `updated_at` | TIMESTAMPTZ | 마지막 수정 시각 (트리거 자동 갱신) |

---

## 4. Row Level Security (RLS) 설정

현재 앱은 로그인 없는 단일 사용자 구조이므로 **anon 역할에 모든 권한** 부여:

```sql
-- RLS 활성화
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- anon(비로그인) 사용자 CRUD 허용
CREATE POLICY "anon full access"
  ON todos FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
```

> **나중에 로그인 기능을 추가할 경우** 위 policy를 삭제하고 아래로 교체:
> ```sql
> -- 로그인한 사용자는 자신의 할일만 접근
> ALTER TABLE todos ADD COLUMN user_id UUID REFERENCES auth.users(id);
> CREATE POLICY "owner access"
>   ON todos FOR ALL
>   TO authenticated
>   USING (user_id = auth.uid())
>   WITH CHECK (user_id = auth.uid());
> ```

---

## 5. 앱 연동 방법 (CDN 방식 — 빌드 도구 없음)

`index.html` `<head>`에 Supabase JS 클라이언트 추가:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

`app.js` 상단에 클라이언트 초기화 추가:

```js
const SUPABASE_URL = 'https://xxxxxxxxxxxx.supabase.co';  // 본인 URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6...';  // 본인 anon key

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### localStorage → Supabase API 대응표

| 현재 (localStorage) | Supabase 대응 |
|---------------------|---------------|
| `JSON.parse(localStorage.getItem('todos'))` | `await db.from('todos').select('*').order('sort_order')` |
| `todos.push({...})` | `await db.from('todos').insert({text, done, priority, sort_order})` |
| `todos.map(t => t.id === id ? {...t, done: !t.done} : t)` | `await db.from('todos').update({done}).eq('id', id)` |
| `todos.filter(t => t.id !== id)` | `await db.from('todos').delete().eq('id', id)` |
| 드래그 후 배열 재정렬 | 각 항목의 `sort_order` 값을 일괄 upsert |

### sort_order 업데이트 예시 (드래그앤드롭 완료 시)

```js
// todos 배열 순서 변경 후 DB 반영
async function saveOrder(todos) {
  const updates = todos.map((t, i) => ({ id: t.id, sort_order: i }));
  await db.from('todos').upsert(updates, { onConflict: 'id' });
}
```

---

## 6. 마이그레이션 순서 (체크리스트)

- [ ] Supabase 가입 및 프로젝트 생성
- [ ] SQL Editor에서 테이블 + 트리거 생성
- [ ] RLS policy 설정
- [ ] Project URL / anon key 복사
- [ ] `index.html`에 Supabase CDN 스크립트 추가
- [ ] `app.js`에서 `save()` / 초기 로드 로직을 async Supabase 호출로 교체
- [ ] localStorage 관련 코드 제거
- [ ] 기존 localStorage 데이터 Supabase로 이전 (선택)

---

## 7. 기존 데이터 이전 (선택)

브라우저 콘솔에서 한 번만 실행:

```js
const old = JSON.parse(localStorage.getItem('todos') || '[]');
if (old.length) {
  const rows = old.map((t, i) => ({
    text: t.text,
    done: t.done,
    priority: t.priority ?? 'medium',
    sort_order: i
  }));
  await db.from('todos').insert(rows);
  localStorage.removeItem('todos');
  console.log(`${rows.length}개 이전 완료`);
}
```
