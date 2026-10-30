# Supabase 연결 준비

리핏은 정적 PWA라서 Supabase Auth와 PostgreSQL을 브라우저에서 연결할 수 있습니다. 브라우저에는 프로젝트 URL과 publishable/anon key만 둡니다. `service_role`/secret key는 절대 `backend-config.js`, GitHub, HTML에 넣지 마세요.

## 설정 순서

1. Supabase에서 프로젝트를 만들고 Auth의 이메일 가입을 활성화합니다.
2. Auth의 URL Configuration에서 Site URL과 Redirect URLs에 실제 Pages 주소를 등록합니다. 이메일 인증을 켜면 확인 링크가 이 주소로 돌아와야 합니다.
3. 프로젝트 생성 시 서울(`ap-northeast-2`)을 선택하는 방안을 권합니다. Supabase는 선택한 리전에 주 데이터베이스/Auth/백업을 둔다고 설명하지만, 운영/지원 정보 일부는 다른 지역에서 처리될 수 있으니 그 범위를 확인해야 합니다.
4. SQL Editor에서 `schema.sql` 전체를 실행합니다. 이 스키마는 RLS를 켜고 각 계정의 데이터만 읽고 쓰도록 제한합니다. 운영자 권한은 수동으로 지정한 `admin_memberships` 사용자만 갖습니다.
5. `backend-config.js`에 Project URL, publishable key, 개인정보처리자 표시명, 문의 이메일, 실제 보유 기간, 선택한 데이터 리전, 실제 처리/국외 이전 안내를 입력합니다. 정책 정보가 비어 있으면 서버 계정 모드는 차단됩니다.
6. 앱에서 운영자 이메일로 먼저 가입하고 이메일 확인을 마친 뒤, `schema.sql` 마지막의 관리자 등록 문장에서 이메일을 바꿔 SQL Editor에서 실행합니다.
7. GitHub Pages를 다시 배포하고 테스트 계정 두 개로 데이터 격리를 확인합니다.

## 데이터 범위

- 계정: 이메일은 Supabase Auth가 처리합니다.
- 앱 데이터: 닉네임/목표/경험/주간 목표/선택 입력한 신체 치수와 운동 일지가 `user_app_data.payload` JSONB에 저장됩니다.
- 동의 이력: 버전, 항목별 동의 여부, 시각, 고지문에 표시한 운영자/연락처/보유기간이 `consent_events`에 기록됩니다.
- 운동 사진 Blob은 현재 IndexedDB에만 남습니다. 서버로 전송되지 않습니다.

최초 실행 배포 전에 고지문에 표시되는 운영자 이름, 연락처, 실제 데이터 보유 기간을 확정해야 합니다. Supabase 프로젝트 생성 후 URL/key를 설정하기 전까지는 앱이 기존 기기 저장 방식으로 동작하며, 운영자 데이터 조회나 계정 간 동기화는 되지 않습니다.

Supabase의 현재 문서상 `ap-northeast-2`는 서울 리전입니다. 선택한 리전은 주 데이터 저장 위치를 제어하지만 모든 운영 처리까지 해당 리전 내로 한정한다는 보장은 아니므로, 국외 이전/위탁 안내는 실제 프로젝트와 계약 조건에 맞춰 검토해야 합니다.
