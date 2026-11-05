# Supabase 연결 준비

페이스핏은 정적 PWA라서 Supabase Auth와 PostgreSQL을 브라우저에서 연결할 수 있습니다. 브라우저에는 프로젝트 URL과 publishable/anon key만 둡니다. `service_role`/secret key는 절대 `backend-config.js`, GitHub, HTML에 넣지 마세요.

프로젝트 리전은 서울(`ap-northeast-2`)입니다. 탈퇴 후 1년 복구 보관은 자동 삭제 등록을 보류하여 비활성화했습니다. 현재 탈퇴는 계정과 서버 기록을 즉시 삭제합니다. `recovery.sql`의 보관 경로는 서버에서도 차단되어 있습니다. 운영자 표시명과 연락처는 `backend-config.js`에서 관리합니다.

## 설정 순서

1. Supabase에서 프로젝트를 만들고 Auth의 이메일 가입을 활성화합니다.
2. Auth의 URL Configuration에서 Site URL과 Redirect URLs에 실제 Pages 주소를 등록합니다. 이메일 인증을 켜면 확인 링크가 이 주소로 돌아와야 합니다.
3. 프로젝트 생성 시 서울(`ap-northeast-2`)을 선택하는 방안을 권합니다. Supabase는 선택한 리전에 주 데이터베이스/Auth/백업을 둔다고 설명하지만, 운영/지원 정보 일부는 다른 지역에서 처리될 수 있으니 그 범위를 확인해야 합니다.
4. SQL Editor에서 `schema.sql`, `trainer.sql`, `recovery.sql`, `diet.sql`을 순서대로 실행합니다. 각 파일은 RLS를 켜고 회원·트레이너·운영자의 데이터 접근을 구분합니다. 식단 기록과 사진은 별도 동의 후 회원과 운영자만 볼 수 있고, 트레이너 정책에는 포함되지 않습니다.
5. `backend-config.js`에 Project URL, publishable key, 개인정보처리자 표시명, 문의 이메일, 실제 보유 기간, 선택한 데이터 리전, 실제 처리/국외 이전 안내를 입력합니다. 정책 정보가 비어 있으면 서버 계정 모드는 차단됩니다. 현재 설정은 서울 리전 프로젝트를 가리킵니다.
6. 앱에서 운영자 이메일로 먼저 가입하고 이메일 확인을 마친 뒤, `schema.sql` 마지막의 관리자 등록 문장에서 이메일을 바꿔 SQL Editor에서 실행합니다.
7. GitHub Pages를 다시 배포합니다. 회원 계정 2개, 트레이너 계정 1개, 운영자 계정 1개로 아래 권한 시험을 통과한 뒤 실제 회원을 초대합니다. 운영자 화면은 계정 메뉴의 **운영자 데이터 보기**에서 엽니다.

## 트레이너 연결과 코멘트

- 트레이너는 계정에서 표시 이름과 공유 코드를 만듭니다. 자격을 검증하는 기능은 아직 없습니다.
- 회원이 코드를 입력해야 트레이너가 회원의 서버 운동 기록을 볼 수 있습니다. 대리 기록은 회원이 별도 체크로 허용합니다.
- 회원은 언제든 대리 기록 권한만 끄거나 연결 전체를 해제할 수 있습니다. 운동·신체 정보의 서버 저장 동의를 철회하면 트레이너의 열람·코멘트·작성 권한도 차단됩니다.
- 회원과 연결된 트레이너는 기록마다 코멘트를 남길 수 있습니다. 코멘트에는 작성 계정과 시간이 저장됩니다. 트레이너가 대신 작성한 운동 기록은 회원 일지에 ‘트레이너 작성’으로 표시되며, 실제 작성 계정은 `trainer_log_entries.trainer_id`에 남습니다.
- 기록 사진은 여전히 회원 기기에만 저장됩니다. 트레이너 화면과 운영자 화면에 표시되지 않습니다.

권한 시험: (1) 연결 전 트레이너가 회원 데이터 읽기 실패, (2) 열람만 허용한 트레이너의 대리 기록 삽입 실패, (3) 작성 허용 후 기록과 코멘트 저장 성공, (4) 연결 해제 후 트레이너 읽기·쓰기 실패, (5) 다른 트레이너와 회원의 데이터 읽기 실패, (6) 운영자만 전체 데이터 조회 성공.

## 데이터 범위

- 계정: 이메일은 Supabase Auth가 처리합니다.
- 앱 데이터: 닉네임/목표/경험/주간 목표/선택 입력한 신체 치수와 운동 일지가 `user_app_data.payload` JSONB에 저장됩니다.
- 동의 이력: 버전, 항목별 동의 여부, 시각, 고지문에 표시한 운영자/연락처/보유기간이 `consent_events`에 기록됩니다.
- 운동 사진 Blob은 현재 IndexedDB에만 남습니다. 서버로 전송되지 않습니다.
- 식단 기록은 `diet_entries`, 식단 저장/AI 전송 동의는 `diet_consents`, 식단 사진은 비공개 `diet-photos` Storage bucket에 저장됩니다. 서버 저장과 AI 사진 전송은 각각 별도 동의이며, 사진 인식 전송은 OpenAI API로 갑니다. 운영자 공간은 서버 저장 동의가 있는 기록만 보여줍니다. 트레이너는 식단 데이터에 접근하지 못합니다.
- K-FIND 식품 영양 DB는 `food_nutrients` 테이블에 저장합니다. `diet-kfind-sync` Edge Function이 관리자 요청으로 한 번에 최대 500개씩 동기화하며, 운영자 화면의 K-FIND 버튼에서 다음 페이지를 요청할 수 있습니다. 동기화는 자동 예약이 아니라 수동입니다.
- 트레이너 연결과 대리 작성 기록은 `trainer_member_links`, `trainer_log_entries`, `record_comments`에 따로 저장됩니다. 코멘트 및 대리 작성 이력은 회원 기록의 로컬 JSON과 구분되어 서버에 보관됩니다.

최초 실행 배포 전에 고지문에 표시되는 운영자 이름, 연락처, 실제 데이터 보유 기간을 확정해야 합니다. Supabase 프로젝트 생성 후 URL/key를 설정하기 전까지는 앱이 기존 기기 저장 방식으로 동작하며, 운영자 데이터 조회나 계정 간 동기화는 되지 않습니다.

## 식단 기능 활성화 준비

1. Supabase SQL Editor에서 `diet.sql`을 실행합니다. 기존 `recovery.sql`을 이전에 실행한 프로젝트에서는 수정된 파일도 다시 실행해 탈퇴 시 비공개 식단 사진 객체가 삭제되게 합니다.
2. Supabase Edge Functions에 `diet-food-search`, `diet-photo-analyze`, `diet-kfind-sync`를 배포합니다. 브라우저에 API 비밀키를 두지 않습니다.
3. Supabase Dashboard의 Edge Function Secrets에 `FOOD_SAFETY_API_KEY`, `OPENAI_API_KEY`, `OPENAI_VISION_MODEL`을 직접 등록합니다. `diet-kfind-sync`는 서비스 키를 사용하며, 운영자 확인 후에만 실행합니다. `service_role`은 함수 환경에만 둡니다. AI 비밀값 등록 후에만 `backend-config.js`의 `features.dietPhotoAnalysisEnabled`를 `true`로 바꿉니다.
4. 식품의약품안전처 식품영양성분 DB API 키는 [K-FIND Open API 안내](https://various.foodsafetykorea.go.kr/nutrient/industry/openApi/info.do) 및 식의약 데이터 포털에서 신청합니다. 최초 동기화 후 운영자 화면의 **K-FIND 영양 DB 500건 가져오기** 버튼을 반복해 전체 페이지를 가져옵니다. 동기화가 끝나면 `backend-config.js`의 `features.dietFoodSearchEnabled`를 `true`로 바꿉니다. API 응답 필드나 키 제공 상태가 바뀌면 함수의 필드 매핑을 점검해야 합니다.
5. 음식 사진 추정은 서버에서 `OPENAI_API_KEY`와 `OPENAI_VISION_MODEL`이 설정된 경우에만 활성화됩니다. 사용자가 별도 동의하고 사진을 선택해야 호출되며, 추정값은 자동 저장되지 않고 기록 저장 전에 사용자가 확인·수정합니다.
6. 먼저 Supabase 프로젝트에 `diet.sql`과 세 함수를 반영하고, 그 다음 앱 파일을 GitHub Pages에 배포해야 실제 서버 저장/검색/분석이 작동합니다. 현재 로컬 코드만으로는 공개 웹이나 서버 설정이 바뀌지 않습니다.

## 가입·인증 메일을 Resend로 전환

Supabase Auth의 Send Email Hook을 Resend로 전환했습니다. 발송 성공을 확인할 때까지 기존 Brevo SMTP 설정은 그대로 둡니다.

1. `auth.myfacefit.co.kr` 도메인의 DNS 인증 레코드를 Hosting.kr에 등록했고 Resend에서 Verified 상태를 확인했습니다. Resend 도메인은 도쿄(`ap-northeast-1`) 발송 리전을 사용합니다.
2. Supabase Edge Function `send-auth-email`을 배포했습니다. 함수는 Supabase Auth Hook 서명을 검증한 뒤 Resend API로 메일을 보냅니다.
3. Supabase Edge Function Secrets에는 `PACEFIT_AUTH_FROM`, `RESEND_API_KEY`, `SEND_EMAIL_HOOK_SECRET`이 등록되어 있습니다. 비밀값은 소스 저장소나 채팅에 올리지 않습니다.
4. HTTPS Send Email Hook이 `send-auth-email` 주소를 사용하도록 설정되어 활성화되었습니다. 실제 인증 이메일 발송과 확인 링크 흐름은 아직 end-to-end로 확인하지 않았습니다. 테스트 전까지 기존 Supabase SMTP 설정을 보존합니다.
5. 개인정보 안내 초안은 Resend 처리 정보로 업데이트되었습니다. Resend 안내에는 미국 내 저장·처리(도쿄 리전은 발송 위치만 제어), Free 플랜의 이메일·로그 데이터 30일 보유, 서비스 이용 종료 후 남은 고객 데이터 최대 90일 내 삭제 안내를 반영합니다. 계정 요금제나 제공업체 정책이 바뀌면 다시 확인합니다. 웹에 공개하기 전 문구를 검토하고 개인정보 고지 변경에 따른 동의 갱신이 필요한지 확인합니다.

이 Edge Function은 Supabase Send Email Hook 서명을 검사하고, 메일의 인증 URL을 Supabase `/auth/v1/verify`로 구성합니다. 확인·초대·비밀번호 재설정·로그인 링크·이메일 변경·재인증 액션을 지원하며, 토큰/이메일/요청 본문은 로그에 기록하지 않습니다. Hook이 활성화된 동안 SMTP는 자동 대체 경로로 동작하지 않습니다. 오류가 나면 Hook을 끄고 기존 SMTP 설정으로 되돌린 뒤 원인을 확인합니다. 함수 코드는 `functions/send-auth-email/index.ts`에 있습니다.

Supabase의 현재 문서상 `ap-northeast-2`는 서울 리전입니다. 선택한 리전은 주 데이터 저장 위치를 제어하지만 모든 운영 처리까지 해당 리전 내로 한정한다는 보장은 아니므로, 국외 이전/위탁 안내는 실제 프로젝트와 계약 조건에 맞춰 검토해야 합니다.
