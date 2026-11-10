# 페이스핏 — 한 세트부터, 내 페이스로

헬스를 처음 시작했거나 혼자 운동 계획을 이어가기 어려운 사람을 위한 브라우저 시제품입니다.

## 식단 기록 기능

- YouTube 운동 동기부여 영상 영역과 관련 이벤트 처리를 제거했습니다.
- 식단 입력은 끼니, 음식 검색, 섭취량(g), 메모, 사진을 한 기록에 묶습니다. K-FIND 검색 결과를 고르면 해당 기준 영양값을 섭취량에 맞춰 계산해 하루 열량·단백질·탄수화물·지방 합계에 반영합니다. 직접 입력 음식은 영양성분이 확인되지 않으므로 합계에서 제외합니다.
- 음식 사진 인식은 음식 종류와 분량의 AI 추정 기능입니다. OpenAI API로 사진을 보내기 전 별도 동의를 받고, 추정값은 검토·수정 후 사용하도록 설계했습니다. AI API key나 모델 설정이 없으면 인식 기능은 비활성입니다.
- 식단 데이터 서버 저장과 AI 사진 전송 동의를 따로 받습니다. 서버 저장 동의가 없으면 식단 기록·사진은 이 브라우저에만 저장합니다. 서버 저장 기록은 회원과 운영자만 볼 수 있고 트레이너는 접근할 수 없습니다. 탈퇴 시 계정 데이터와 diet-photos 저장 객체를 제거하도록 `recovery.sql`을 갱신했습니다.
- 현재 저장·검색·인식 연결은 코드에 포함되어 있지만 Supabase에 새 SQL/Edge Functions를 반영하기 전에는 서버 기능이 활성화되지 않습니다. 적용 순서는 [`supabase/README.md`](supabase/README.md)의 “식단 기능 활성화 준비”를 참고하세요.

## 화면에 구현한 기능

- 오늘 운동 메모, 자유 운동 기록 메모, 트레이너 대리 기록 메모에는 지원 브라우저에서 한국어 음성 입력 버튼이 보입니다. 인식된 글을 확인한 뒤 기록 저장 버튼을 눌러야 일지에 저장됩니다. 브라우저의 음성 인식 서비스가 음성을 처리할 수 있으며, 페이스핏은 음성 파일을 보관하지 않습니다. 지원되지 않는 브라우저에서는 키보드 입력을 사용합니다.
- 운영자 계정은 계정 메뉴의 **운영자 데이터 보기**에서 별도 화면을 열어 저장 계정·활성 트레이너 연결·대리 기록·코멘트 수를 확인하고, 회원별 일지와 연결 내역을 볼 수 있습니다. 서버 DB의 `admin_memberships`에 수동 등록된 계정에만 열립니다.
- 서버 계정 연결 시 회원은 트레이너 코드를 등록하고 기록 열람과 대리 작성 권한을 각각 선택할 수 있습니다. 회원과 연결된 트레이너는 운동 기록에 코멘트를 남기거나 다음 운동의 종목·세트·횟수·참고 무게를 제안할 수 있습니다. 회원이 제안을 직접 적용하면 오늘 운동에 반영됩니다. 작성 권한을 받은 트레이너는 회원 운동 기록을 대신 작성할 수 있습니다. 기록에는 작성자와 시각이 남고, 회원은 권한을 변경하거나 연결을 해제할 수 있습니다. 실제 계정 간 공유는 `backend-config.js` 설정과 `supabase/schema.sql`, `supabase/trainer.sql`, `supabase/trainer-plans.sql` 적용 후 활성화됩니다.
- 저장 안내와 동의 뒤 첫 화면에서 **개인** 또는 **트레이너**를 선택합니다. 개인 화면은 추천 루틴과 일지로 들어가고, 트레이너 화면은 연결된 회원 이름을 선택해 기록을 보거나 대리 작성할 수 있습니다. 대리 작성 버튼은 해당 회원이 권한을 허용한 경우에만 활성화됩니다. 화면은 상단의 **화면 선택**으로 다시 바꿀 수 있습니다.
- **운동 찾기**에서 [번핏의 공개 운동 라이브러리](https://burnfit.io/라이브러리/)에 열거된 409종을 부위별로 검색할 수 있습니다. 가슴·등·어깨·팔·하체 운동은 사용자가 오늘 루틴에 직접 추가할 수 있습니다. 운동명은 참고 목록이며, 준비·동작·주의 문구는 페이스핏이 새로 작성한 **초안**입니다. 주요 21종은 개별 초안, 나머지 388종은 운동군별 공통 초안이며, 409종 각각의 자세 검증이 끝난 상태가 아닙니다. 종목별 이미지는 기존 페이스핏 자산과 이름이 맞는 항목에만 연결하고, 다른 항목은 부위 표시 그림을 보여줍니다. 번핏의 설명·이미지는 복제하지 않았습니다.
- 개인 첫 화면과 운동 화면에서 가슴·등·어깨·팔·하체 중 오늘 운동할 부위를 직접 선택합니다. 해당 부위에서 최근에 기록한 종목을 먼저 보여주고, 기록이 부족하면 기본 종목으로 채웁니다. 같은 종목·기구의 이전 기록은 시작 무게 참고값에 사용합니다.
- 추천 중량과 실제 기록 입력을 분리해 봅니다. 실제 기록은 세트마다 무게와 횟수를 적으며, 다음 세트를 자동으로 열거나 버튼으로 추가할 수 있습니다. 이전 세트와 무게가 같다면 체크 상태로 복사하고, 다르면 체크를 풀어 무게를 바꿀 수 있습니다. 기존 기록도 계속 읽을 수 있습니다.
- 운동일지는 월별 달력에서 날짜와 그날의 난이도 표정을 보여주고, 날짜를 눌러 세트별 기록과 유산소 내용을 펼쳐볼 수 있습니다. 아래에는 최근 7일의 기록만 텍스트로 표시합니다.
- 운동 종목 추가에는 이름 검색과 가슴·등·어깨·팔·하체 선택을 제공합니다. 오늘 운동 끝에는 걷기·러닝·실내 자전거 등 유산소 시간과 선택적 거리를 기록할 수 있습니다.
- 운동 기록 변화에는 같은 운동·기구의 최근 12회 기록에서 세트 최고 무게와 그 무게의 반복 횟수를 그래프로 표시합니다. 해석 기준은 [별첨](docs/운동기록-변화-근거.md)에 정리했습니다.
- 첫 실행 시 이름·운동 경험·목표·주간 운동일을 설정할 수 있습니다. 운동 경험과 목표에는 “기타”와 직접 입력란이 있으며, “주 5회 이상” 목표도 선택할 수 있습니다. 성별·키·체중·기초대사량은 선택 입력입니다.
- 근력 운동 시간과 유산소 시간을 기록하고 프로필 체중이 있으면 2024 Adult Compendium의 대표 MET 값으로 예상 운동 소모 칼로리를 표시합니다. 성별·키·기초대사량은 칼로리 계산에 사용하지 않으며, 기록 당시의 추정치를 일지에 남깁니다. [계산 근거와 한계](docs/운동-칼로리-추정-근거.md)
- 스쿼트·데드리프트·벤치 프레스·오버헤드 프레스의 최근 세트 무게와 2~10회 반복 수를 선택 입력하면 Epley 식으로 추정 1RM과 시작 참고 범위를 표시합니다. 최대중량 시험을 요구하지 않으며, 추정치는 실제 최대중량이 아닙니다.
- 최근 7일 기록 외의 날짜는 달력에서 선택해 확인할 수 있습니다.
- 과거 A·B·C 루틴의 운동 자료와 8종목 프리웨이트 자료는 종목 목록으로 유지합니다. 화면에서는 A·B·C 순환을 사용하지 않고 선택한 부위의 최근 운동을 먼저 추천합니다.
- 오늘 추천된 루틴에서 운동을 직접 빼거나 28개 운동 카탈로그의 종목을 추가할 수 있습니다. 추가 메뉴는 가슴·등·어깨·팔·하체 순으로 나뉩니다. 루틴별 수정 내용은 현재 브라우저 기기의 저장소에 보관되며, 운동 기록 저장에도 사용자가 조정한 종목이 반영됩니다.
- 운동 카드와 자세 보기 창은 운동별 개별 이미지 파일을 불러옵니다. 모든 종목은 짙은 배경·은회색 남성 3D 근육 인체·운동 부위 붉은 강조·검은 반바지·준비와 수행 2자세의 같은 스타일입니다. 새 운동을 넣을 때도 이미지 파일과 `exerciseAtlasFiles` 연결을 갱신하세요. 운동별 이미지는 PWA 오프라인 캐시에 포함됩니다.
- FitnessProgramer를 참고해 기존 6종목을 운동 라이브러리에 포함하고, ACE 자료를 참고한 프리웨이트 8종을 추가 운동 목록에 넣었습니다. 자세 큐는 초보자가 이해하기 쉽도록 요약했으며, FitnessProgramer의 저작권 이미지/GIF는 복사하지 않고 각 운동에 맞춘 오리지널 이미지로 구성합니다. [벤트오버 레터럴 레이즈](https://fitnessprogramer.com/exercise/bent-over-lateral-raise/) · [페이스 풀](https://fitnessprogramer.com/exercise/face-pull/) · [덤벨 플라이](https://fitnessprogramer.com/exercise/dumbbell-fly/) · [힙 어브덕션 머신](https://fitnessprogramer.com/exercise/hip-abduction-machine/) · [힐 엘리베이티드 고블릿 스쿼트](https://fitnessprogramer.com/exercise/heel-elevated-goblet-squat/) · [푸시다운](https://fitnessprogramer.com/exercise/push-down/). 자세 큐와 안내 출처에는 기존 운동에서 사용한 ACE 자료도 포함합니다. [ACE 초보자 운동 목록](https://www.acefitness.org/resources/everyone/exercise-library/experience/beginner/) · [머신 목록](https://www.acefitness.org/resources/everyone/exercise-library/equipment/weight-machines-selectorized/) · [글루트 프레스](https://www.acefitness.org/resources/everyone/exercise-library/293/glute-press/) · [레터럴 레이즈](https://www.acefitness.org/resources/everyone/exercise-library/295/lateral-shoulder-raise/) · [카프 레이즈](https://www.acefitness.org/resources/everyone/exercise-library/294/calf-raise/) · [하이백 로우](https://www.acefitness.org/resources/everyone/exercise-library/169/seated-high-back-rows/) · [인클라인 프레스](https://www.acefitness.org/resources/everyone/exercise-library/25/incline-chest-press/) · [힙힌지](https://www.acefitness.org/resources/everyone/exercise-library/33/hip-hinge/)
- 루틴 저장과 기록 추가에서 웃는 얼굴과 텍스트를 함께 보여주는 운동 난이도 선택을 제공합니다. 기록 추가 창에서 운동·날짜·무게·세트·횟수도 입력하며, 형식과 범위를 확인합니다.
- 운동 기록에는 세션 메모와 사진을 최대 3장까지 붙일 수 있습니다. 사진은 브라우저 IndexedDB에 Blob으로 저장하고, 로그에는 ID만 저장합니다. 사진은 1280px 이하·압축 후 장당 2MB까지 제한하며 저장 공간/API 오류 때에는 사진 없이 메모와 기록을 저장합니다.
- 추천은 종목명과 입력한 기구 이름이 모두 같은 기록만 참고합니다. 새 기록에는 선택형 RIR과 자세 안정 체크가 있고, 같은 기구의 2회 연속 기록에서 목표 반복·RIR 1–2·자세 안정이 확인되어야 2.5% 증가를 제안합니다. 0.5kg 최소 증가가 기존 무게의 10%를 넘으면 증가를 멈춥니다. 통증 기록은 자동 추천을 중단하며, 다른 종목·기구의 중량은 환산하지 않습니다. 기록은 계속 사용자가 조정해야 하는 참고 정보입니다.
- 프로필 요약과 일지는 각각 접기/펼치기 방식으로 볼 수 있습니다.
- 처음에는 빈 일지로 시작합니다. 예시 기록은 버튼으로 따로 불러올 수 있고 화면에 샘플 표시가 붙습니다.
- 샘플 기록 상태에서 실제 세션을 저장하면 샘플 기록을 실제 일지에서 분리하고, 사용자가 입력한 세션만 남깁니다.

## 데이터와 추천 범위

기본 모드는 프로필과 운동 기록 텍스트를 현재 브라우저의 `localStorage`에, 사진 Blob을 `IndexedDB`에 저장합니다. Supabase 연결 값과 개인정보 안내가 완성된 경우에만 계정·서버 동기화 모드가 열립니다. 연결을 마치기 전에는 운영자가 데이터를 원격으로 볼 수 없습니다.

기구 운동 추천은 종목명과 사용자가 입력한 기구 이름이 모두 일치하는 기록만 비교합니다. 같은 기구의 마지막 무게를 참고값으로 표시하며, 과거 로그에 기구 식별 정보가 없으면 장비 미기록으로 표시하고 자동 증량에 쓰지 않습니다. 리프트 추정은 Epley 식(무게 × (1 + 반복수 ÷ 30))으로 2~10회 기록만 계산하며, 세트가 한계에 가까웠는지에 따라 오차가 달라질 수 있습니다. 50–60% e1RM 범위는 앱이 고른 보수적 시작 참고 범위이며 ACSM의 일반 고정 처방이 아닙니다. ACSM FITT 표 링크는 특정 고혈압군 자료입니다. 불편하거나 자세가 흐트러지면 무게를 낮추거나 중단하세요. 이 시제품은 운동 처방을 검증한 것이 아니며 자동 증량이나 의학적·재활 지침을 제공하지 않습니다.

브라우저 저장소의 손상되거나 형식이 맞지 않는 운동 기록은 불러올 때 걸러냅니다. 다만 브라우저 저장소가 차단되었거나 용량이 부족하면 기록을 유지할 수 없으며, 화면에 저장 실패를 표시합니다.

Supabase 연결 후 필수 동의와 별도 운동·신체 정보 동의를 받습니다. 동의한 데이터는 `user_app_data`에 저장되고, RLS 정책으로 사용자 본인과 수동 지정된 운영자만 접근합니다. 운동·신체 정보 동의를 거절하면 기본 프로필만 동기화하고 운동 기록은 서버에 올리지 않습니다. 사진은 계속 이 기기에만 남습니다. 서버 계정 기능을 켜려면 [Supabase 설정 안내](./supabase/README.md)를 따르세요.

## 실행

`index.html`을 브라우저에서 열어 화면을 미리 볼 수 있습니다. PWA 설치와 오프라인 캐시는 `localhost` 또는 HTTPS 주소에서 제공됩니다.

## 웹 배포 준비 (PWA)

이 폴더는 빌드 단계가 필요 없는 정적 웹 앱입니다. `index.html`, `manifest.webmanifest`, `sw.js`, `pwa-register.js`, `assets/`를 같은 배포 경로에 올리면 됩니다.

### GitHub Pages 배포

1. 프로젝트 파일을 GitHub 저장소의 루트에 올립니다.
2. 저장소의 **Settings → Pages**에서 배포 원본으로 `Deploy from a branch`를 고르고 기본 브랜치와 `/ (root)`를 선택합니다.
3. Pages가 보여주는 HTTPS 주소로 접속해 설치와 오프라인 동작을 확인합니다. 서비스 워커는 HTTPS 또는 `localhost`에서만 등록됩니다.

Cloudflare Pages 등 다른 정적 호스팅도 빌드 명령 없이 프로젝트 루트의 파일을 게시하면 됩니다. 배포 후에는 HTTPS가 활성화되어 있는지 확인하세요.

### 데이터 범위

Supabase 설정이 비어 있으면 기존 로컬 저장 모드로 동작하고 첫 방문에 기기 내 저장 안내를 보여줍니다. 서버 모드는 프로젝트 URL·publishable key·처리자/문의/보유기간·서버 지역·처리 안내가 모두 설정되어야 켜집니다. 계정 인증은 Supabase Auth를 사용하고, 프로필·일지는 PostgreSQL에 동기화합니다. 관리자 권한은 SQL Editor에서 운영자 계정을 직접 지정해야 합니다. 서버 동기화가 완료되기 전에는 운영자가 기록을 볼 수 없습니다. 로컬 `file://` 기록은 자동 이전하지 않습니다.

연결 파일은 `backend-config.js`, `account.js`, `supabase/schema.sql`입니다. 공개 publishable/anon key는 브라우저에 둘 수 있지만, `service_role`/secret key는 절대로 공개 저장소에 올리지 않습니다. 사진은 IndexedDB에만 저장하고 서버에 업로드하지 않습니다. 최초 온라인 배포 전에 운영자 정보, 데이터 보유기간과 처리 위치 안내를 실제 운영 정책에 맞게 확정해야 합니다.

### 오프라인과 업데이트

서비스 워커는 앱 화면과 28개 운동 이미지를 포함한 정적 파일을 설치 시 캐시해 오프라인에서도 앱과 운동 이미지를 열 수 있도록 합니다. 새 버전을 배포할 때는 `sw.js`의 `CACHE_NAME` 끝 번호를 올려 오래된 화면 캐시를 교체하세요. 첫 방문에는 네트워크 연결이 필요합니다.

추정 근거: [Epley 예측식 연구](https://pubmed.ncbi.nlm.nih.gov/12741856/) · [ACSM FITT 표(고혈압군)](https://www.acsm.org/wp-content/uploads/2025/01/fitt-recommendations-for-hypertension_update.pdf) · [ACSM 저항운동 요약](https://acsm.org/science-spotlight-acsm-releases-new-position-stand-on-resistance-training/)

추천 근거: [점진적 저항운동 부하 원칙 연구](https://pubmed.ncbi.nlm.nih.gov/19204579/) · [ACSM 저항운동 요약](https://acsm.org/science-spotlight-acsm-releases-new-position-stand-on-resistance-training/)


### 프리웨이트 추가 종목

기본 ABC 루틴은 길이를 유지하고, 운동 추가 메뉴에 ACE Exercise Library를 참고한 프리웨이트 8종을 더했습니다. 덤벨 체스트 프레스, 벤치 지지 원암 덤벨 로우, 덤벨 스텝업, 덤벨 프런트 레이즈, 해머 컬, 덤벨 트라이셉스 킥백, 덤벨 사이드 런지, 파머스 캐리입니다. 초보자는 가벼운 무게나 맨몸으로 동작을 먼저 익히도록 안내합니다. 운동별 생성 이미지는 ssets/exercises/ 안의 개별 파일이며 서비스 워커에서 오프라인 캐시합니다.

자세 자료: [ACE Chest Press](https://www.acefitness.org/resources/everyone/exercise-library/19/chest-press/) · [Single Arm Row](https://www.acefitness.org/resources/everyone/exercise-library/126/single-arm-row/) · [Step Up](https://www.acefitness.org/resources/everyone/exercise-library/28/step-up/) · [Front Raise](https://www.acefitness.org/resources/everyone/exercise-library/54/front-raise/) · [Hammer Curl](https://www.acefitness.org/resources/everyone/exercise-library/10/hammer-curl/) · [Triceps Kickback](https://www.acefitness.org/resources/everyone/exercise-library/55/triceps-kickback/) · [Lateral Lunge](https://www.acefitness.org/resources/everyone/exercise-library/364/lateral-lunge/) · [Farmer's Carry](https://www.acefitness.org/resources/everyone/exercise-library/359/farmer-s-carry/).
