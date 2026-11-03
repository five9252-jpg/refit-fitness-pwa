(() => {
  'use strict';
  const items = Array.isArray(window.PACEFIT_LIBRARY)
    ? window.PACEFIT_LIBRARY.map((item, index) => ({ id: String(index), ...item })) : [];
  const search = document.getElementById('librarySearch');
  const filters = document.getElementById('libraryFilters');
  const grid = document.getElementById('libraryGrid');
  const count = document.getElementById('libraryCount');
  const more = document.getElementById('libraryMore');
  if (!search || !filters || !grid) return;

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const categories = ['전체', ...new Set(items.map(item => item.category).filter(Boolean))];
  let category = '전체';
  let limit = 36;

  const categoryIcon = (name) => {
    const marks = {
      '하체': '<path d="M21 37l-4 17m14-17 4 17" stroke="#ee6f62" stroke-width="5"/>',
      '가슴': '<path d="M17 19q7 6 14 0" stroke="#ee6f62" stroke-width="5"/>',
      '등': '<path d="M15 20l-3 16m22-16 3 16" stroke="#ee6f62" stroke-width="5"/>',
      '어깨': '<circle cx="14" cy="19" r="4" stroke="#ee6f62" stroke-width="3"/><circle cx="34" cy="19" r="4" stroke="#ee6f62" stroke-width="3"/>',
      '팔': '<path d="M11 24l-5 13m31-13 5 13" stroke="#ee6f62" stroke-width="5"/>',
      '복근': '<path d="M21 26h7m-7 7h7" stroke="#ee6f62" stroke-width="4"/>',
    };
    return `<svg viewBox="0 0 48 64" role="img" aria-label="${esc(name)} 부위 표시"><circle cx="24" cy="8" r="5"/><path d="M18 16l-6 4-4 17m22-21 6 4 4 17M18 16l-2 20 8 4 8-4-2-20M16 36l-2 20m18-20 2 20"/>${marks[name] || '<path d="M17 31h14" stroke="#ee6f62" stroke-width="4"/>'}</svg>`;
  };
  const imagePath = (item) => {
    if (typeof exerciseAtlasCell === 'undefined') return null;
    const file = exerciseAtlasCell[item.name]?.file;
    return file ? `./assets/exercises/${file}` : null;
  };
  const visual = (item, detail = false) => {
    const image = imagePath(item);
    if (image) return `<img src="${esc(image)}" alt="${esc(item.name)} 운동 자세 그림" loading="lazy" decoding="async" />`;
    const areaImage = window.PacefitAreaImages?.[item.category] || window.PacefitAreaImages?.['기타'];
    if (areaImage) return `<img src="${esc(areaImage)}" alt="${esc(item.category || '운동')} 부위 안내 그림" loading="lazy" decoding="async" />`;
    return categoryIcon(item.category || '운동');
  };
  const matching = () => {
    const query = search.value.trim().toLocaleLowerCase('ko-KR');
    return items.filter(item => (category === '전체' || item.category === category)
      && (!query || `${item.name} ${item.equipment || ''}`.toLocaleLowerCase('ko-KR').includes(query)));
  };
  const render = () => {
    const list = matching();
    count.textContent = `검색 결과 ${list.length}개 · 전체 ${items.length}개`;
    grid.innerHTML = list.slice(0, limit).map((item) => `<button class="library-card" type="button" data-library-id="${esc(item.id)}"><span class="library-visual">${visual(item)}</span><span class="library-card-copy"><strong>${esc(item.name)}</strong><small>${esc(item.category)}${item.equipment ? ' · ' + esc(item.equipment) : ''}${imagePath(item) ? ' · 자세 그림' : ' · 부위 그림'}</small></span></button>`).join('') || '<p class="empty">검색 결과가 없어요. 다른 이름이나 부위를 선택해보세요.</p>';
    more.hidden = list.length <= limit;
  };
  const showDetail = (item) => {
    const backdrop = document.getElementById('exerciseBackdrop');
    const title = document.getElementById('exerciseDialogTitle');
    const body = document.getElementById('exerciseDialogBody');
    if (!backdrop || !title || !body) return;
    title.textContent = item.name;
    const source = /^https:\/\/burnfit\.io\//.test(item.sourceUrl || '') ? item.sourceUrl : 'https://burnfit.io/라이브러리/';
    const review = item.reviewStatus === 'individual-draft' ? '개별 설명 초안 · 전문가 검증 전' : '운동군별 공통 안내 초안 · 종목별 자세 검증 전';
    const canAdd = ['가슴', '등', '어깨', '팔', '하체'].includes(item.category);
    body.innerHTML = `<div class="library-detail-visual">${visual(item, true)}</div><p class="library-detail-meta">${review}</p><div class="library-detail-grid"><section><h3>준비 자세</h3><p>${esc(item.setup || '장비와 위치를 확인하고 편안한 시작 자세를 잡으세요.')}</p></section><section><h3>운동 중</h3><p>${esc(item.movement || '동작을 천천히 수행하고 가능한 범위에서 돌아오세요.')}</p></section><section><h3>주의할 점</h3><p>${esc(item.caution || '통증이 있거나 움직임이 불안정하면 중단하고 전문가에게 확인하세요.')}</p></section></div><p class="library-detail-meta">${imagePath(item) ? '페이스핏 운동 자세 그림' : '부위 안내 그림 · 이 운동의 자세를 재현한 이미지는 준비 중'} · ${esc(item.category)}${item.equipment ? ' · ' + esc(item.equipment) : ''}</p>${canAdd ? '<button class="library-add" id="libraryAddToRoutine" type="button">오늘 루틴에 추가</button>' : ''}<a class="source-link" href="${esc(source)}" target="_blank" rel="noopener noreferrer">운동명 참고: 번핏 공개 라이브러리</a>`;
    if (canAdd) document.getElementById('libraryAddToRoutine').addEventListener('click', () => {
      if (!window.PacefitAddExercise?.(item.name)) return;
      backdrop.classList.remove('open');
      document.querySelector('[data-view-target="workout"]')?.click();
    });
    backdrop.classList.add('open');
  };
  window.PacefitOpenLibraryDetail = name => {
    const item = items.find(row => row.name === name);
    if (item) showDetail(item);
  };

  filters.innerHTML = categories.map(name => `<button type="button" data-category="${esc(name)}" aria-pressed="${name === category}">${esc(name)}</button>`).join('');
  filters.addEventListener('click', event => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    category = button.dataset.category;
    limit = 36;
    filters.querySelectorAll('button').forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
    render();
  });
  search.addEventListener('input', () => { limit = 36; render(); });
  more.addEventListener('click', () => { limit += 36; render(); });
  grid.addEventListener('click', event => {
    const button = event.target.closest('[data-library-id]');
    if (!button) return;
    const item = items.find(row => row.id === button.dataset.libraryId);
    if (item) showDetail(item);
  });
  render();
})();

