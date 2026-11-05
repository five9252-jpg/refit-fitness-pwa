(() => {
  'use strict';

  // An exercise-specific image shows that exercise's two positions. Area art only
  // identifies the body region and must never be described as a technique guide.
  const exerciseFiles = {
    '벤치프레스': 'pacefit-barbell-bench-press.jpg',
    '컨벤셔널(바벨) 데드리프트': 'pacefit-conventional-deadlift.jpg',
    '오버헤드 프레스': 'pacefit-overhead-press.jpg',
    '바벨 백스쿼트': 'pacefit-barbell-back-squat.jpg',
    '풀업': 'pacefit-pull-up.jpg',
    '런지': 'pacefit-lunge.jpg',
    '바벨 컬': 'pacefit-barbell-curl.jpg',
    '바벨 로우': 'pacefit-barbell-row.jpg',
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
  if (typeof exerciseAtlasCell !== 'undefined') {
    Object.entries(exerciseFiles).forEach(([name, file]) => { exerciseAtlasCell[name] = { file }; });
  }
  window.PacefitAreaImages = Object.fromEntries(
    Object.entries(areaFiles).map(([area, file]) => [area, `./assets/exercises/${file}`])
  );

  if (typeof renderPlan === 'function') {
    const previousRenderPlan = renderPlan;
    renderPlan = function (...args) {
      const result = previousRenderPlan.apply(this, args);
      document.querySelectorAll('.exercise').forEach(row => {
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
