(() => {
  'use strict';

  // An exercise-specific image shows that exercise's two positions. Area art only
  // identifies the body region and must never be described as a technique guide.
  const exerciseFiles = {
    '벤치프레스': 'pacefit-bench-press-v2.jpg',
    '컨벤셔널(바벨) 데드리프트': 'pacefit-deadlift-v2.jpg',
    '오버헤드 프레스': 'pacefit-overhead-press-v2.jpg',
    '바벨 백스쿼트': 'pacefit-barbell-back-squat-v2.jpg',
    '스쿼트': 'pacefit-barbell-back-squat-v2.jpg',
    '풀업': 'pacefit-pull-up-v2.jpg',
    '런지': 'pacefit-lunge-v2.jpg',
    '바벨 컬': 'pacefit-barbell-curl-v2.jpg',
    '바벨 로우': 'pacefit-barbell-row-v2.jpg',
    '힙 쓰러스트': 'pacefit-hip-thrust-v2.jpg',
    '덤벨 레터럴 레이즈': 'pacefit-lateral-raise-v2.jpg',
    '프론트 스쿼트': 'pacefit-front-squat-v2.jpg',
    '덤벨 불가리안 스플릿 스쿼트': 'pacefit-bulgarian-split-squat-v2.jpg',
    '덤벨 고블릿 스쿼트': 'pacefit-goblet-squat-v2.jpg',
    '점프 스쿼트': 'pacefit-jump-squat-v2.jpg',
    '루마니안 데드리프트': 'pacefit-romanian-deadlift-v2.jpg',
    '스모 데드리프트': 'pacefit-sumo-deadlift-v2.jpg',
    '레그 프레스': 'pacefit-leg-press-v2.jpg',
    '시티드 레그 컬': 'pacefit-seated-leg-curl-v2.jpg',
    '레그 컬': 'pacefit-seated-leg-curl-v2.jpg',
    '레그 익스텐션': 'pacefit-leg-extension-v2.jpg',
    '스탠딩 카프 레이즈': 'pacefit-standing-calf-raise-v2.jpg',
    '핵 스쿼트 머신': 'pacefit-hack-squat-v2.jpg',
    '힙 어덕션 머신': 'pacefit-hip-adduction-v2.jpg',
    '힙 어브덕션 머신': 'pacefit-hip-abduction-v2.jpg',
    '시티드 카프 레이즈': 'pacefit-seated-calf-raise-v2.jpg',
    '노르딕 햄스트링 컬': 'pacefit-nordic-hamstring-curl-v2.jpg',
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
    '프론트 스쿼트': { main: '대퇴사두근', assist: '둔근 · 코어 · 등 상부' },
    '덤벨 불가리안 스플릿 스쿼트': { main: '대퇴사두근 · 둔근', assist: '햄스트링 · 종아리' },
    '덤벨 고블릿 스쿼트': { main: '대퇴사두근 · 둔근', assist: '코어 · 내전근' },
    '점프 스쿼트': { main: '대퇴사두근 · 둔근', assist: '햄스트링 · 종아리' },
    '루마니안 데드리프트': { main: '햄스트링 · 둔근', assist: '척추기립근 · 광배근' },
    '스모 데드리프트': { main: '둔근 · 내전근', assist: '대퇴사두근 · 햄스트링' },
    '시티드 레그 컬': { main: '햄스트링', assist: '종아리 · 둔근' },
    '스탠딩 카프 레이즈': { main: '종아리 비복근', assist: '가자미근 · 발목 안정근' },
    '핵 스쿼트 머신': { main: '대퇴사두근', assist: '둔근 · 햄스트링' },
    '힙 어덕션 머신': { main: '고관절 내전근', assist: '둔근 · 코어 안정근' },
    '힙 어브덕션 머신': { main: '중둔근 · 소둔근', assist: '대퇴근막장근 · 코어 안정근' },
    '시티드 카프 레이즈': { main: '가자미근', assist: '비복근 · 발목 안정근' },
    '노르딕 햄스트링 컬': { main: '햄스트링', assist: '둔근 · 종아리' },
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
  const inferMuscles = (item) => {
    const name = item.name || '';
    const category = item.category || '';
    const has = pattern => pattern.test(name);
    if (category === '하체') {
      if (has(/데드리프트|힙힌지|굿모닝|풀.?스루|랙풀/)) return { main: '둔근 · 햄스트링', assist: '척추기립근 · 광배근' };
      if (has(/레그.?프레스/)) return { main: '대퇴사두근', assist: '둔근 · 햄스트링' };
      if (has(/레그.?컬|햄스트링.?컬|원레그.?컬/)) return { main: '햄스트링', assist: '종아리 · 둔근' };
      if (has(/레그.?익스텐션|원레그.?익스텐션/)) return { main: '대퇴사두근', assist: '무릎 주변 안정근' };
      if (has(/카프|종아리/)) return { main: '종아리', assist: '가자미근 · 발목 안정근' };
      if (has(/런지|스텝업|스플릿/)) return { main: '대퇴사두근 · 둔근', assist: '햄스트링 · 종아리' };
      if (has(/어브덕션|어덕션|클램|파이어 하이드런트/)) return { main: '둔근 · 내전근', assist: '대퇴근막장근 · 코어' };
      if (has(/힙 쓰러스트|글루트|킥백|브릿지/)) return { main: '둔근', assist: '햄스트링 · 코어' };
      return { main: '대퇴사두근 · 둔근', assist: '햄스트링 · 내전근 · 코어' };
    }
    if (category === '가슴') return { main: has(/플라이/) ? '대흉근' : '대흉근', assist: '앞어깨 · 삼두' };
    if (category === '등') {
      if (has(/데드리프트|랙풀|하이퍼|익스텐션/)) return { main: '척추기립근 · 둔근', assist: '햄스트링 · 광배근' };
      if (has(/풀업|친업|풀다운|랫풀|풀.?다운/)) return { main: '광배근', assist: '이두 · 대원근' };
      return { main: '광배근 · 등 중간', assist: '이두 · 뒤어깨 · 승모근' };
    }
    if (category === '어깨') {
      if (has(/레터럴|리어|후면|리버스 플라이|페이스 풀/)) return { main: '어깨 옆·뒤', assist: '승모근 · 회전근개' };
      if (has(/슈러그/)) return { main: '승모근', assist: '견갑거근 · 전완근' };
      return { main: '어깨 앞·옆', assist: '삼두 · 윗가슴' };
    }
    if (category === '팔') {
      if (has(/삼두|트라이셉|푸시.?다운|스컬 크러셔|JM 프레스/)) return { main: '삼두', assist: '팔꿈치 안정근 · 어깨' };
      if (has(/리스트|악력|롤러|파머스/)) return { main: '전완근 · 악력', assist: '승모근 · 코어' };
      return { main: '이두 · 상완근', assist: '전완근 · 어깨 안정근' };
    }
    if (category === '복근') {
      if (has(/플랭크|데드버그|버드독/)) return { main: '복횡근 · 코어', assist: '둔근 · 어깨 안정근' };
      if (has(/트위스트|로테이션|사이드|러시안/)) return { main: '복사근', assist: '복직근 · 코어' };
      return { main: '복직근', assist: '복사근 · 고관절 굴곡근' };
    }
    if (category === '역도') return { main: '둔근 · 대퇴사두근', assist: '승모근 · 어깨 · 코어' };
    if (category === '유산소') {
      if (has(/로잉|스키 머신/)) return { main: '등 · 대퇴사두근', assist: '둔근 · 이두 · 코어' };
      if (has(/싸이클|바이크|자전거/)) return { main: '대퇴사두근', assist: '둔근 · 햄스트링 · 종아리' };
      return { main: '대퇴사두근 · 둔근', assist: '햄스트링 · 종아리 · 코어' };
    }
    return { main: '전신 · 둔근', assist: '대퇴사두근 · 코어 · 어깨 안정근' };
  };
  if (Array.isArray(window.PACEFIT_LIBRARY)) {
    window.PACEFIT_LIBRARY.forEach(item => { if (!muscleInfo[item.name]) muscleInfo[item.name] = inferMuscles(item); });
  }
  window.PacefitMuscles = muscleInfo;
  const muscleStyle = document.createElement('style');
  muscleStyle.textContent = `
    .exercise-muscles,.library-muscles{display:flex;flex-wrap:wrap;gap:4px 10px;color:#607875;font-size:10px;line-height:1.45}
    .exercise-muscles{margin-top:3px}.exercise-muscles b,.library-muscles b{color:#023F46;font-size:9px;font-weight:850}
    .library-muscles{margin-top:5px}.library-muscles i{font-style:normal;color:#95aaa2}
    .library-detail-visual+.library-muscles{font-size:12px;margin:12px 0 8px}.library-detail-visual+.library-muscles b{font-size:10px}
    @media(max-width:600px){.exercise-muscles{font-size:9px;gap:3px 7px}.exercise-muscles b{font-size:8px}}
  `;
  document.head.append(muscleStyle);
  if (typeof exerciseAtlasCell !== 'undefined') {
    Object.entries(exerciseFiles).forEach(([name, file]) => { exerciseAtlasCell[name] = { file: window.PacefitExerciseArt?.[file] || file }; });
    const representativeImage = (item) => {
      const name = item.name || '';
      const category = item.category || '';
      const match = (pattern) => pattern.test(name);
      if (category === '하체') {
        if (match(/데드리프트|힙힌지|굿모닝|풀.?스루|랙풀/)) {
          if (match(/스모/)) return 'pacefit-sumo-deadlift-v2.jpg';
          if (match(/루마니안|스티프|원레그|싱글 레그/)) return 'pacefit-romanian-deadlift-v2.jpg';
          return 'pacefit-deadlift-v2.jpg';
        }
        if (match(/레그.?프레스/)) return 'pacefit-leg-press-v2.jpg';
        if (match(/노르딕|글루트 햄/)) return 'pacefit-nordic-hamstring-curl-v2.jpg';
        if (match(/레그.?컬|햄스트링.?컬|원레그.?컬/)) return 'pacefit-seated-leg-curl-v2.jpg';
        if (match(/레그.?익스텐션|원레그.?익스텐션/)) return 'pacefit-leg-extension-v2.jpg';
        if (match(/카프|종아리/)) return match(/시티드|로터리/) ? 'pacefit-seated-calf-raise-v2.jpg' : 'pacefit-standing-calf-raise-v2.jpg';
        if (match(/힙 어덕션|내전/)) return 'pacefit-hip-adduction-v2.jpg';
        if (match(/어브덕션|외전|클램|파이어 하이드런트/)) return 'pacefit-hip-abduction-v2.jpg';
        if (match(/런지|스텝.?업/)) return 'pacefit-lunge-v2.jpg';
        if (match(/불가리안|스플릿 스쿼트/)) return 'pacefit-bulgarian-split-squat-v2.jpg';
        if (match(/힙 쓰러스트|글루트|킥백|브릿지|덩키/)) return 'pacefit-hip-thrust-v2.jpg';
        if (match(/핵 스쿼트|브이 스쿼트|펜듈럼|레버리지|벨트 스쿼트/)) return 'pacefit-hack-squat-v2.jpg';
        if (match(/점프 스쿼트/)) return 'pacefit-jump-squat-v2.jpg';
        if (match(/프론트 스쿼트/)) return 'pacefit-front-squat-v2.jpg';
        if (match(/고블릿|스모 스쿼트/)) return 'pacefit-goblet-squat-v2.jpg';
        if (match(/스쿼트/)) return /맨몸|에어|피스톨|시시/.test(name) ? 'pacefit-goblet-squat-v2.jpg' : 'pacefit-barbell-back-squat-v2.jpg';
        return 'pacefit-hip-thrust-v2.jpg';
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
      if (category === '복근') return 'bodyweight-squat-muscle-map.jpg';
      if (category === '역도') return 'conventional-deadlift-muscle-map.jpg';
      if (category === '유산소') return 'dumbbell-step-up-muscle-map.jpg';
      if (category === '기타') return 'bodyweight-squat-muscle-map.jpg';
      return 'bodyweight-squat-muscle-map.jpg';
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

