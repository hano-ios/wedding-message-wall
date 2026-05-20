# Wedding Message Wall

결혼식 식전 안내용 덕담 메시지월입니다.

정적 호스팅은 GitHub Pages로, 저장과 실시간 동기화는 Supabase로 처리하는 구조를 기준으로 잡았습니다.

## 파일 구성

- `index.html`: 시작 화면
- `guest.html`: 하객용 메시지월
- `admin.html`: 사회자용 관리자 화면
- `styles.css`: 공통 스타일
- `guest.js`: 하객용 메시지 등록, 목록 조회, 실시간 구독
- `admin.js`: 관리자 로그인, 접수 제어, 랜덤 추첨
- `supabase-client.js`: Supabase 클라이언트 생성
- `supabase-config.js`: 프로젝트 URL, anon key 설정
- `supabase-schema.sql`: 테이블과 RLS 정책 생성 SQL

## 시작 순서

1. Supabase 프로젝트 생성
2. SQL Editor에서 `supabase-schema.sql` 실행
3. `supabase-admin-setup.sql`에서 관리자 비밀번호 문자열을 바꾼 뒤 실행
4. `supabase-config.js`에 프로젝트 URL과 anon key 입력
5. `guest.html`, `admin.html`을 브라우저에서 열어 동작 확인

## 관리자 접근

관리자 화면은 Supabase Auth 계정 대신, 행사 당일용 간단 비밀번호를 사용합니다.

실제 비밀번호 검증과 설정 변경은 Supabase RPC 함수에서 처리합니다. 프론트는 비밀번호를 전달만 하고, DB에는 bcrypt 해시만 저장됩니다.

## 배포 메모

- GitHub Pages에 그대로 배포 가능
- `supabase-config.js`의 anon key는 공개되어도 괜찮지만, service role key는 절대 넣으면 안 됨
- 행사 직전에는 실제 휴대폰으로 QR 진입과 동시 접속 테스트 권장
