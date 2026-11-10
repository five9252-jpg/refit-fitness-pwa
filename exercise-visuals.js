(() => {
  'use strict';

  // An exercise-specific image shows that exercise's two positions. Area art only
  // identifies the body region and must never be described as a technique guide.
  const exerciseFiles = {
    '벤치프레스': 'bench-press-muscle-map.jpg',
    '컨벤셔널(바벨) 데드리프트': 'conventional-deadlift-muscle-map.jpg',
    '오버헤드 프레스': 'overhead-press-muscle-map.jpg',
    '바벨 백스쿼트': 'barbell-back-squat-muscle-map.jpg',
    '풀업': 'pull-up-muscle-map.jpg',
    '런지': 'lunge-muscle-map.jpg',
    '바벨 컬': 'barbell-curl-muscle-map.jpg',
    '바벨 로우': 'barbell-row-muscle-map.jpg',
  };
  const areaFiles = {
    '가슴': 'pacefit-area-chest.jpg',
    '등': 'pacefit-area-back.jpg',
    '어깨': 'pacefit-area-shoulders.jpg',
    '팔': 'pacefit-area-arms.jpg',
    '하체': 'pacefit-area-legs.jpg',
    '복근': 'pacefit-area-core.jpg',
    '역도': 'pacefit-area-whole-body.jpg',
    '유산소': 'pacefit-area-whole-body.jpg',
    '기타': 'pacefit-area-whole-body.jpg',
  };
  const muscleInfo = {
    '체스트 프레스': { main: '가슴', assist: '앞어깨 · 삼두' },
    '랫 풀다운': { main: '광배근', assist: '이두 · 대원근' },
    '시티드 로우': { main: '등 중간', assist: '이두 · 뒤어깨' },
    '레그 프레스': { main: '대퇴사두근', assist: '둔근 · 햄스트링' },
    '레그 컬': { main: '햄스트링', assist: '종아리' },
    '레그 익스텐션': { main: '대퇴사두근', assist: '무릎 주변 안정근' },
    '덤벨 숄더 프레스': { main: '어깨 앞·옆', assist: '삼두 · 윗가슴' },
    '덤벨 바이셉스 컬': { main: '이두', assist: '상완근 · 전완근' },
    '머신 글루트 프레스': { main: '둔근', assist: '햄스트링 · 대퇴사두근' },
    '머신 레터럴 레이즈': { main: '어깨 옆', assist: '가시위근 · 승모근' },
    '머신 카프 레이즈': { main: '종아리', assist: '가자미근' },
    '시티드 하이백 로우': { main: '뒤어깨 · 등 중간', assist: '이두 · 승모근' },
    '인클라인 덤벨 프레스': { main: '윗가슴', assist: '앞어깨 · 삼두' },
    '덤벨 힙힌지': { main: '햄스트링 · 둔근', assist: '척추기립근' },
    '벤트오버 레터럴 레이즈': { main: '뒤어깨', assist: '등 중간 · 승모근' },
    '페이스 풀': { main: '뒤어깨 · 회전근개', assist: '등 중간 · 이두' },
    '덤벨 플라이': { main: '가슴', assist: '앞어깨' },
    '힙 어브덕션 머신': { main: '중둔근', assist: '소둔근 · 대퇴근막장근' },
    '힐 엘리베이티드 고블릿 스쿼트': { main: '대퇴사두근', assist: '둔근 · 코어' },
    '스쿼트': { main: '대퇴사두근 · 둔근', assist: '햄스트링 · 내전근' },
    '케이블 트라이셉스 푸시다운': { main: '삼두', assist: '팔꿈치 안정근' },
    '덤벨 체스트 프레스': { main: '가슴', assist: '앞어깨 · 삼두' },
    '벤치 지지 원암 덤벨 로우': { main: '광배근 · 등 중간', assist: '이두 · 뒤어깨' },
    '덤벨 스텝업': { main: '둔근 · 대퇴사두근', assist: '햄스트링 · 종아리' },
    '덤벨 프런트 레이즈': { main: '어깨 앞', assist: '윗가슴 · 승모근' },
    '해머 컬': { main: '상완근 · 전완근', assist: '이두' },
    '덤벨 트라이셉스 킥백': { main: '삼두', assist: '뒤어깨 · 코어 안정근' },
    '덤벨 사이드 런지': { main: '둔근 · 내전근', assist: '대퇴사두근 · 햄스트링' },
    '파머스 캐리': { main: '전완 · 악력', assist: '승모근 · 코어' },
    '벤치프레스': { main: '가슴', assist: '앞어깨 · 삼두' },
    '컨벤셔널(바벨) 데드리프트': { main: '둔근 · 햄스트링', assist: '척추기립근 · 광배근' },
    '오버헤드 프레스': { main: '어깨 앞·옆', assist: '삼두 · 윗가슴' },
    '바벨 백스쿼트': { main: '대퇴사두근 · 둔근', assist: '햄스트링 · 내전근' },
    '풀업': { main: '광배근', assist: '이두 · 대원근' },
    '런지': { main: '대퇴사두근 · 둔근', assist: '햄스트링 · 종아리' },
    '바벨 컬': { main: '이두', assist: '상완근 · 전완근' },
    '바벨 로우': { main: '광배근 · 등 중간', assist: '이두 · 뒤어깨' },
  };
  window.PacefitMuscles = muscleInfo;
  const muscleStyle = document.createElement('style');
  muscleStyle.textContent = `
    .exercise-muscles,.library-muscles{display:flex;flex-wrap:wrap;gap:4px 10px;color:#607875;font-size:10px;line-height:1.45}
    .exercise-muscles{margin-top:3px}.exercise-muscles b,.library-muscles b{color:#315f4c;font-size:9px;font-weight:850}
    .library-muscles{margin-top:5px}.library-muscles i{font-style:normal;color:#95aaa2}
    .library-detail-visual+.library-muscles{font-size:12px;margin:12px 0 8px}.library-detail-visual+.library-muscles b{font-size:10px}
    @media(max-width:600px){.exercise-muscles{font-size:9px;gap:3px 7px}.exercise-muscles b{font-size:8px}}
  `;
  document.head.append(muscleStyle);
  if (typeof exerciseAtlasCell !== 'undefined') {
    Object.entries(exerciseFiles).forEach(([name, file]) => { exerciseAtlasCell[name] = { file }; });
    const representativeImage = (item) => {
      const name = item.name || '';
      const category = item.category || '';
      const match = (pattern) => pattern.test(name);
      if (category === '하체') {
        if (match(/데드리프트|힙힌지|굿모닝|풀.?스루|랙풀/)) return 'conventional-deadlift-muscle-map.jpg';
        if (match(/레그.?프레스/)) return 'leg-press-muscle-map.jpg';
        if (match(/레그.?컬|햄스트링.?컬|원레그.?컬/)) return 'leg-curl-muscle-map.jpg';
        if (match(/레그.?익스텐션|원레그.?익스텐션/)) return 'leg-extension-muscle-map.jpg';
        if (match(/카프|종아리/)) return 'calf-raise-muscle-map.jpg';
        if (match(/런지|스텝업|스플릿 스쿼트/)) return /스텝업/.test(name) ? 'dumbbell-step-up-muscle-map.jpg' : 'lunge-muscle-map.jpg';
        if (match(/힙 어브덕션|힙 어덕션|클램|파이어 하이드런트/)) return 'hip-abduction-machine-muscle-map.jpg';
        if (match(/힙 쓰러스트|글루트|킥백|브릿지/)) return 'glute-press-muscle-map.jpg';
        if (match(/스쿼트/)) return /맨몸|에어/.test(name) ? 'bodyweight-squat-muscle-map.jpg' : 'barbell-back-squat-muscle-map.jpg';
        return 'heel-elevated-goblet-squat-muscle-map.jpg';
      }
      if (category === '가슴') {
        if (match(/플라이/)) return 'dumbbell-fly-muscle-map.jpg';
        if (match(/인클라인/)) return 'incline-dumbbell-press-muscle-map.jpg';
        if (match(/체스트 프레스|펙덱|딥스/)) return 'chest-press-muscle-map.jpg';
        return 'bench-press-muscle-map.jpg';
      }
      if (category === '등') {
        if (match(/풀업|친업/)) return 'pull-up-muscle-map.jpg';
        if (match(/풀다운|랫풀/)) return 'lat-pulldown-muscle-map.jpg';
        if (match(/데드리프트|랙풀|하이퍼|익스텐션/)) return 'conventional-deadlift-muscle-map.jpg';
        if (match(/로우/)) return 'barbell-row-muscle-map.jpg';
        return 'seated-row-muscle-map.jpg';
      }
      if (category === '어깨') {
        if (match(/레터럴/)) return 'lateral-raise-muscle-map.jpg';
        if (match(/프론트 레이즈/)) return 'dumbbell-front-raise-muscle-map.jpg';
        if (match(/페이스 풀|리버스 플라이|리어 델토이드/)) return 'face-pull-muscle-map.jpg';
        if (match(/슈러그/)) return 'barbell-row-muscle-map.jpg';
        return 'overhead-press-muscle-map.jpg';
      }
      if (category === '팔') {
        if (match(/리스트|악력|롤러|파머스/)) return 'farmers-carry-muscle-map.jpg';
        if (match(/삼두|트라이셉|푸시.?다운|푸시다운|스컬 크러셔|JM 프레스/)) return 'triceps-pushdown-muscle-map.jpg';
        if (match(/해머/)) return 'hammer-curl-muscle-map.jpg';
        return 'barbell-curl-muscle-map.jpg';
      }
      if (category === '복근') return 'pacefit-area-core.jpg';
      if (category === '역도' || category === '유산소' || category === '기타') return 'pacefit-area-whole-body.jpg';
      return 'pacefit-area-whole-body.jpg';
    };
    if (Array.isArray(window.PACEFIT_LIBRARY)) {
      window.PACEFIT_LIBRARY.forEach(item => {
        if (!exerciseAtlasCell[item.name]) exerciseAtlasCell[item.name] = { file: representativeImage(item), representative: true };
      });
    }
  }
  window.PacefitAreaImages = Object.fromEntries(
    Object.entries(areaFiles).map(([area, file]) => [area, `./assets/exercises/${file}`])
  );

  if (typeof renderPlan === 'function') {
    const previousRenderPlan = renderPlan;
    renderPlan = function (...args) {
      const result = previousRenderPlan.apply(this, args);
      document.querySelectorAll('.exercise').forEach(row => {
        const info = muscleInfo[row.dataset.name];
        const meta = row.querySelector('.exercise-meta');
        if (info && meta && !row.querySelector('.exercise-muscles')) {
          meta.insertAdjacentHTML('afterend', `<div class="exercise-muscles"><span><b>주동근</b> ${info.main}</span><span><b>협력근</b> ${info.assist}</span></div>`);
        }
        if (exerciseAtlasCell[row.dataset.name]?.file) return;
        const tile = row.querySelector('.exercise-sketch-tile');
        if (!tile) return;
        const item = typeof allExercisePool !== 'undefined'
          ? allExercisePool.find(exercise => exercise.name === row.dataset.name) : null;
        const area = item && typeof exerciseCategory === 'function' ? exerciseCategory(item) : '기타';
        const image = window.PacefitAreaImages[area] || window.PacefitAreaImages['기타'];
        tile.innerHTML = `<img class="exercise-sketch" src="${image}" alt="" loading="lazy" decoding="async" title="${area} 부위 안내 그림 · 종목별 자세 그림은 준비 중">`;
      });
      return result;
    };
    renderPlan();
  }
})();


