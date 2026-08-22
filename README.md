# 단하네 가계부 — 배포 전 꼭 해야 할 것

## 1. Firebase 프로젝트 준비
1. [Firebase 콘솔](https://console.firebase.google.com) → 프로젝트 추가
2. 왼쪽 메뉴 **Firestore Database** → 데이터베이스 만들기 (프로덕션 모드로 시작해도 됨, 아래 2번에서 규칙을 다시 넣을 거예요)
3. 프로젝트 설정(⚙️) → 일반 → 내 앱 → 웹 앱(</>) 추가 → 나오는 `firebaseConfig` 값을 복사

4. `js/firebase-config.js` 파일을 열어서 플레이스홀더 값들을 방금 복사한 값으로 교체
   - **이 파일을 안 바꾸면 앱이 전혀 동작하지 않아요.**

## 2. Firestore 보안 규칙 넣기
Firebase 콘솔 → Firestore Database → **규칙(Rules)** 탭 → `firestore.rules` 파일 내용을 그대로 붙여넣고 게시(Publish)

> ⚠️ 로그인 기능이 없는 앱이라, 이 링크를 아는 사람은 누구나 읽고 쓸 수 있어요.
> 링크를 다른 사람과 공유하지 않는 것으로 접근을 제한하는 구조입니다.
> (나중에 비밀번호나 간단한 인증을 추가하고 싶으면 말씀해주세요.)

## 3. 배포 (Netlify 또는 GitHub Pages)
이 폴더 전체(index.html, manifest.json, service-worker.js, css/, js/, icons/)를
평소 쓰시던 방식대로 그대로 올리면 됩니다. **HTTPS로 배포되어야** 홈 화면 설치가 정상 동작해요.
(로컬에서 `index.html`을 그냥 더블클릭해서 열면 Firebase 연결이나 설치가 안 될 수 있어요.)

## 4. 폰에 앱처럼 설치하기 (아이콘 생성 + 주소창 없이 실행)
배포된 주소로 접속한 뒤:
- **갤럭시 (크롬)**: 우측 상단 메뉴(⋮) → "앱 설치" 또는 "홈 화면에 추가"
- 설치하면 홈 화면에 "단하네 가계부" 아이콘이 생기고, 그 아이콘으로 열면 주소창 없이 앱처럼 실행돼요.
- 폴드8 펼친 화면에서는 자동으로 2단 레이아웃으로 보여요.

## 파일 구조
```
index.html          메인 화면
manifest.json        PWA 설정(아이콘, 앱 이름, standalone 실행)
service-worker.js     설치 가능하게 해주는 최소 서비스워커
firestore.rules       Firebase 콘솔에 붙여넣을 보안 규칙
css/style.css         전체 스타일
js/firebase-config.js Firebase 프로젝트 설정값 (★ 교체 필요)
js/db.js              Firestore 저장/실시간 구독
js/summary.js         기간 계산 · 합계 계산 (순수 계산 로직)
js/ui.js              화면 렌더링 · 자동저장 처리
js/main.js            위 모듈들을 연결하는 진입점
icons/                앱 아이콘 (192, 512, maskable)
```

## 자동저장 동작 방식
카테고리 · 금액 · 작성자(선영/현우/공용) 세 가지가 모두 채워지는 순간 자동으로 저장돼요.
저장 후에는 카테고리·금액만 비워지고, 날짜·결제수단·작성자는 그대로 남아있어서
같은 사람이 이어서 여러 건 기록할 때 편하게 만들었어요.
"기록하기" 버튼은 수동으로 확인하고 싶을 때 눌러도 됩니다.
