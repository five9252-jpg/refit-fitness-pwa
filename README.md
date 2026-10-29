# 리핏 — 운동 메이트

헬스를 처음 시작했거나 혼자 운동 계획을 이어가기 어려운 사람을 위한 브라우저 시제품입니다.

## 화면에 구현한 기능

- 최근 운동 기록을 참고해 상체/하체 기초 루틴과 종목별 시작 무게를 표시합니다.
- 추천 중량과 실제 기록 입력을 분리해 보고, 실제 무게·세트 수·세트당 횟수를 각각 입력해 운동 기록으로 저장할 수 있습니다.
- 날짜별 운동일지에서 세션을 펼쳐 종목별 무게·세트·실제 반복 횟수를 보고, 월~일 기준 주간 운동 날짜와 월간 세션 수도 확인할 수 있습니다.
- 첫 실행 시 이름·운동 경험·목표·주간 운동일을 설정할 수 있습니다. 운동 경험과 목표에는 “기타”와 직접 입력란이 있으며, “주 5회 이상” 목표도 선택할 수 있습니다. 키·체중은 선택 입력입니다.
- 스쿼트·데드리프트·벤치 프레스·오버헤드 프레스의 최근 세트 무게와 2~10회 반복 수를 선택 입력하면 Epley 식으로 추정 1RM과 시작 참고 범위를 표시합니다. 최대중량 시험을 요구하지 않으며, 추정치는 실제 최대중량이 아닙니다.
- 운동일지를 최근 1일, 7일, 14일, 30일로 나누어 볼 수 있습니다.
- 상체 A, 하체 A, 상체 B, 하체 B의 4개 루틴에서 총 14종목을 추천합니다. 저장한 가장 최근 루틴 다음 순서로 순환하고, 기존 운동일지와 기록 키는 유지합니다.
- 운동 카드와 자세 보기 창에서 종목마다 다른 로컬 3D 운동 일러스트를 표시합니다. 파일은 `assets/exercises/`에 포함되어 있고 홈페이지와 PWA 오프라인 캐시에 사용됩니다. 카드 썸네일은 96px, 모바일은 78px이며 원본 프레임을 자르지 않습니다.
- 신규 운동 6종(머신 글루트 프레스, 머신 레터럴 레이즈, 머신 카프 레이즈, 시티드 하이백 로우, 인클라인 덤벨 프레스, 덤벨 힙힌지)의 자세 큐와 안내 출처는 ACE Exercise Library를 참고했습니다. [ACE 초보자 운동 목록](https://www.acefitness.org/resources/everyone/exercise-library/experience/beginner/) · [머신 목록](https://www.acefitness.org/resources/everyone/exercise-library/equipment/weight-machines-selectorized/) · [글루트 프레스](https://www.acefitness.org/resources/everyone/exercise-library/293/glute-press/) · [레터럴 레이즈](https://www.acefitness.org/resources/everyone/exercise-library/295/lateral-shoulder-raise/) · [카프 레이즈](https://www.acefitness.org/resources/everyone/exercise-library/294/calf-raise/) · [하이백 로우](https://www.acefitness.org/resources/everyone/exercise-library/169/seated-high-back-rows/) · [인클라인 프레스](https://www.acefitness.org/resources/everyone/exercise-library/25/incline-chest-press/) · [힙힌지](https://www.acefitness.org/resources/everyone/exercise-library/33/hip-hinge/)
- 루틴 저장과 기록 추가에서 웃는 얼굴과 텍스트를 함께 보여주는 운동 난이도 선택을 제공합니다. 기록 추가 창에서 운동·날짜·무게·세트·횟수도 입력하며, 형식과 범위를 확인합니다.
- 운동 기록에는 세션 메모와 사진을 최대 3장까지 붙일 수 있습니다. 사진은 브라우저 IndexedDB에 Blob으로 저장하고, 로그에는 ID만 저장합니다. 사진은 1280px 이하·압축 후 장당 2MB까지 제한하며 저장 공간/API 오류 때에는 사진 없이 메모와 기록을 저장합니다.
- 추천은 종목명과 입력한 기구 이름이 모두 같은 기록만 참고합니다. 새 기록에는 선택형 RIR과 자세 안정 체크가 있고, 같은 기구의 2회 연속 기록에서 목표 반복·RIR 1–2·자세 안정이 확인되어야 2.5% 증가를 제안합니다. 0.5kg 최소 증가가 기존 무게의 10%를 넘으면 증가를 멈춥니다. 통증 기록은 자동 추천을 중단하며, 다른 종목·기구의 중량은 환산하지 않습니다. 기록은 계속 사용자가 조정해야 하는 참고 정보입니다.
- 프로필 요약과 일지는 각각 접기/펼치기 방식으로 볼 수 있습니다.
- 처음에는 빈 일지로 시작합니다. 예시 기록은 버튼으로 따로 불러올 수 있고 화면에 샘플 표시가 붙습니다.
- 샘플 기록 상태에서 실제 세션을 저장하면 샘플 기록을 실제 일지에서 분리하고, 사용자가 입력한 세션만 남깁니다.

## 데이터와 추천 범위

프로필과 운동 기록 텍스트는 현재 브라우저의 `localStorage`에 저장되고, 사진 Blob은 `IndexedDB`에 별도로 저장됩니다. 계정, 온라인 데이터베이스, 운영자 대시보드, AI 연동은 없습니다. 따라서 서로 다른 사용자 기록을 수집하거나 운영자가 원격으로 확인할 수 없습니다. 브라우저 저장소를 지우거나 브라우저를 바꾸면 데이터에 접근하지 못할 수 있습니다.

기구 운동 추천은 종목명과 사용자가 입력한 기구 이름이 모두 일치하는 기록만 비교합니다. 같은 기구의 마지막 무게를 참고값으로 표시하며, 과거 로그에 기구 식별 정보가 없으면 장비 미기록으로 표시하고 자동 증량에 쓰지 않습니다. 리프트 추정은 Epley 식(무게 × (1 + 반복수 ÷ 30))으로 2~10회 기록만 계산하며, 세트가 한계에 가까웠는지에 따라 오차가 달라질 수 있습니다. 50–60% e1RM 범위는 앱이 고른 보수적 시작 참고 범위이며 ACSM의 일반 고정 처방이 아닙니다. ACSM FITT 표 링크는 특정 고혈압군 자료입니다. 불편하거나 자세가 흐트러지면 무게를 낮추거나 중단하세요. 이 시제품은 운동 처방을 검증한 것이 아니며 자동 증량이나 의학적·재활 지침을 제공하지 않습니다.

브라우저 저장소의 손상되거나 형식이 맞지 않는 운동 기록은 불러올 때 걸러냅니다. 다만 브라우저 저장소가 차단되었거나 용량이 부족하면 기록을 유지할 수 없으며, 화면에 저장 실패를 표시합니다.

프로필의 이름, 운동 목표, 주간 목표, 경험, 선택적으로 입력한 키·체중도 현재 브라우저에만 저장됩니다. 여러 기기 동기화와 운영자 조회는 제공하지 않습니다.

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

현재 프로필·운동일지는 각 브라우저의 `localStorage`, 사진은 `IndexedDB`에 저장됩니다. PWA 배포만으로 계정, 서버 동기화, 운영자 조회가 생기지 않으며, 사용자마다 자기 브라우저에 저장된 데이터만 봅니다. 기기·브라우저를 바꾸거나 브라우저 저장소를 지우면 기록이 사라질 수 있습니다. 기존 `file://` 주소에 입력한 데이터도 새 HTTPS 주소로 자동 이전되지 않습니다. 여러 사용자 기록을 운영자가 확인하거나 여러 기기에서 동기화하려면 별도의 인증·서버·데이터베이스가 필요합니다.

### 오프라인과 업데이트

서비스 워커는 앱 화면과 14개 운동 이미지를 포함한 정적 파일을 설치 시 캐시해 오프라인에서도 앱과 운동 이미지를 열 수 있도록 합니다. 새 버전을 배포할 때는 `sw.js`의 `CACHE_NAME` 끝 번호를 올려 오래된 화면 캐시를 교체하세요. 첫 방문에는 네트워크 연결이 필요합니다.

추정 근거: [Epley 예측식 연구](https://pubmed.ncbi.nlm.nih.gov/12741856/) · [ACSM FITT 표(고혈압군)](https://www.acsm.org/wp-content/uploads/2025/01/fitt-recommendations-for-hypertension_update.pdf) · [ACSM 저항운동 요약](https://acsm.org/science-spotlight-acsm-releases-new-position-stand-on-resistance-training/)

추천 근거: [점진적 저항운동 부하 원칙 연구](https://pubmed.ncbi.nlm.nih.gov/19204579/) · [ACSM 저항운동 요약](https://acsm.org/science-spotlight-acsm-releases-new-position-stand-on-resistance-training/)

