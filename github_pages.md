# GitHub Pages 배포 가이드

## 배포 URL

```
https://kskyuny.github.io/todo-app/
```

---

## 1. GitHub 저장소 생성 (최초 1회)

1. [https://github.com/new](https://github.com/new) 접속
2. 아래와 같이 입력 후 **Create repository**

   | 항목 | 값 |
   |------|-----|
   | Repository name | `todo-app` |
   | Visibility | **Public** (GitHub Pages 무료 사용 조건) |
   | Initialize this repository | **체크 해제** (로컬에서 push할 것이므로) |

---

## 2. 로컬 저장소 → GitHub push

```bash
cd ~/work/todo
git remote add origin https://github.com/kskyuny/todo-app.git
git push -u origin main
```

---

## 3. GitHub Pages 활성화 (최초 1회)

1. `https://github.com/kskyuny/todo-app` → **Settings** 탭
2. 좌측 메뉴 **Pages** 클릭
3. **Source** 섹션에서:
   - Branch: `main`
   - Folder: `/ (root)`
4. **Save** 클릭
5. 약 1~2분 후 상단에 배포 URL 표시

---

## 4. Supabase CORS 허용 설정

GitHub Pages에서 Supabase에 접근하려면 도메인을 허용해야 합니다.

1. [https://supabase.com/dashboard](https://supabase.com/dashboard) → 프로젝트 선택
2. **Project Settings → API**
3. **Allowed Origins (CORS)** 에 추가:
   ```
   https://kskyuny.github.io
   ```
4. **Save** 클릭

---

## 5. 업데이트 배포

소스 수정 후 아래 명령만 실행하면 자동 반영됩니다 (1~2분 소요):

```bash
cd ~/work/todo
git add .
git commit -m "변경 내용 설명"
git push
```

---

## 로컬 파일 구조

```
~/work/todo/
├── index.html       # 앱 구조
├── style.css        # Material Design 3 스타일
├── app.js           # Supabase 연동 로직
├── CLAUDE.md        # Claude Code 가이드
├── supabase.md      # Supabase 설정 가이드
└── github_pages.md  # 이 파일
```
