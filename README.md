# Wedding Message Wall

덕담을 서버에 저장하지 않고, 프로젝트에 포함된 CSV 파일로 보여주는 정적 웹페이지입니다.

## 파일 구성

- `data/messages.csv`: 표시할 덕담 원본 데이터
- `messages-data.js`: CSV를 읽어 화면에서 사용할 데이터로 변환
- `guest.html` / `guest.js`: 하객용 덕담 전광판
- `admin.html` / `admin.js`: CSV 덕담 목록과 브라우저 내 추첨 화면
- `styles.css`: 공통 스타일

## 사용 방법

정적 웹 서버로 프로젝트 폴더를 열면 됩니다. GitHub Pages에도 그대로 배포할 수 있습니다.

덕담을 바꾸려면 `data/messages.csv`를 같은 열 구조(`id`, `nickname`, `message`, `is_visible` 등)로 교체하세요. `is_visible` 값이 `true`인 항목만 표시됩니다.

## 제한 사항

- 새 덕담 접수와 실시간 갱신은 제공하지 않습니다.
- 관리자 화면에서 추첨하거나 접수 상태를 바꾼 결과는 현재 브라우저에서만 유지되며, 새로고침하면 CSV 원본 상태로 돌아갑니다.
