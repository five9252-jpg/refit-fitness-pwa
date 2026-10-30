# 페이스핏 — 한 세트부터, 내 페이스로

헬스를 처음 시작했거나 혼자 운동 계획을 이어가기 어려운 사람을 위한 브라우저 시제품입니다.

## 화면에 구현한 기능

- 최근 운동 기록을 참고해 상체/하체 기초 루틴과 종목별 시작 무게를 표시합니다.
- 추천 중량과 실제 기록 입력을 분리해 보고, 실제 무게·세트 수·세트당 횟수를 각각 입력해 운동 기록으로 저장할 수 있습니다.
- 날짜별 운동일지에서 세션을 펼쳐 종목별 무게·세트·실제 반복 횟수를 보고, 월~일 기준 주간 운동 날짜와 월간 세션 수도 확인할 수 있습니다.
- 첫 실행 시 이름·운동 경험·목표·주간 운동일을 설정할 수 있습니다. 운동 경험과 목표에는 “기타”와 직접 입력란이 있으며, “주 5회 이상” 목표도 선택할 수 있습니다. 키·체중은 선택 입력입니다.
- 스쿼트·데드리프트·벤치 프레스·오버헤드 프레스의 최근 세트 무게와 2~10회 반복 수를 선택 입력하면 Epley 식으로 추정 1RM과 시작 참고 범위를 표시합니다. 최대중량 시험을 요구하지 않으며, 추정치는 실제 최대중량이 아닙니다.
- 운동일지를 최근 1일, 7일, 14일, 30일로 나누어 볼 수 있습니다.
- 상체 A, 하체 A, 상체 B, 하체 B, 상체 C, 하체 C의 6개 루틴에서 총 20종목을 기본 추천하고, 8종목 프리웨이트 라이브러리에서 추가할 수 있습니다. 저장한 가장 최근 루틴 다음 순서로 순환하고, 기존 운동일지와 기록 키는 유지합니다.
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
