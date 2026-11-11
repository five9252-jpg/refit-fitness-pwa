(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const logs = () => { const items=window.RefitAccountBridge?.getState()?.logs; return Array.isArray(items)?items:[]; };
  const localISO = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const parseISO = value => new Date(`${value}T12:00:00`);
  const today = localISO(new Date());
  const categories = ['전체','가슴','등','어깨','팔','하체'];
  let chosenCategory = '전체';
  let selectedDate = today;
  let shownMonth = new Date().getMonth();
  let shownYear = new Date().getFullYear();
  let chosenExercise = '';

  const style = document.createElement('style');
  style.textContent = `
    .routine-editor{display:block}.routine-editor>.routine-add-select,.routine-editor>#addRoutineExercise,.routine-editor>small{display:none}
    .add-search-ui label{display:block;font-size:12px;font-weight:800;color:#164449}.add-search-ui input{width:100%;margin-top:7px;padding:11px 12px;border:1px solid #d9e4d8;border-radius:11px;background:white;color:#173A3E;font:inherit}
    .add-part-chips{display:flex;gap:6px;overflow-x:auto;padding:11px 0}.add-part-chips button{flex:none;border:1px solid #d9e4d8;border-radius:999px;background:#fff;padding:7px 12px;color:#07535A;font-size:11px;font-weight:800}.add-part-chips button[aria-pressed=true]{background:#07535A;color:#fff}
    .add-search-results{display:grid;gap:5px;max-height:270px;overflow:auto}.add-search-results button{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;padding:9px 11px;border:1px solid #e2e9df;border-radius:10px;background:white;text-align:left;color:#173F43;font-size:12px}.add-search-results button:hover{background:#eef5ec}.add-search-results small{color:#66776b;white-space:nowrap}.add-search-empty{margin:5px 2px;color:#66776b;font-size:11px}
    .cardio-add{margin:14px 0;padding:17px;border:1px solid #dce8da;border-radius:16px;background:#f6faf5}.cardio-add>label{display:flex;gap:10px;align-items:center;font-size:14px;font-weight:800}.cardio-fields{display:grid;grid-template-columns:1.3fr .7fr .8fr;gap:8px;margin-top:12px}.cardio-fields label{font-size:10px;color:#5d6d60}.cardio-fields input,.cardio-fields select{display:block;width:100%;min-width:0;margin-top:5px;padding:10px;border:1px solid #dbe4d9;border-radius:9px;background:white;color:#193A3E;font:inherit}.cardio-fields[hidden]{display:none}.cardio-hint{display:block;margin-top:9px;color:#647467;font-size:11px}
    .journal-calendar,.journal-performance{margin:16px 0;padding:18px;border:1px solid #e2e9e0;border-radius:17px;background:#fbfcfa}
    .journal-overview{display:grid;grid-template-columns:minmax(260px,.9fr) minmax(340px,1.1fr);gap:14px;align-items:start;margin:12px 0}.journal-overview>.journal-calendar,.journal-overview>.journal-performance{min-width:0;margin:0;height:100%}.journal-performance>summary{list-style:none}.journal-performance>summary::-webkit-details-marker{display:none}.journal-performance[open]>summary{margin-bottom:10px}.performance-charts{grid-template-columns:1fr}.journal-calendar h3,.journal-performance h3{margin:0;color:#123B3F;font-size:16px}.calendar-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.calendar-head button{border:1px solid #dce5d9;border-radius:10px;background:white;padding:7px 10px;color:#07535A}.calendar-head strong{font-size:14px}.calendar-weekdays,.calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;text-align:center}.calendar-weekdays{margin-top:16px;color:#7b897e;font-size:10px}.calendar-grid{margin-top:7px}.calendar-day{min-height:55px;border:1px solid transparent;border-radius:10px;background:transparent;color:#173F43;font-size:12px}.calendar-day[aria-pressed=true]{background:#E5F3EE;border-color:#80AAA4}.calendar-day[data-today=true]{font-weight:900}.calendar-day:focus-visible{outline:2px solid #07535A}.calendar-day .day-face{display:block;margin-top:3px;font-size:15px}.calendar-day .day-count{display:block;color:#38676A;font-size:9px}.calendar-empty{min-height:55px}.calendar-day-panel{margin-top:14px;padding-top:12px;border-top:1px solid #e0e8df}.calendar-day-panel h4{margin:0 0 8px;font-size:13px}.calendar-session{padding:12px;margin-top:7px;border-radius:11px;background:white;border:1px solid #e3e9e1}.calendar-session-heading{font-size:12px;font-weight:800}.calendar-session-exercises{margin:8px 0 0;padding:0;list-style:none;display:grid;gap:5px}.calendar-session-exercises li{padding:7px 9px;border-radius:8px;background:#f4f8f3;color:#245357;font-size:11px;line-height:1.4}.calendar-session details{margin-top:8px}.calendar-session details summary{cursor:pointer;font-size:11px;color:#38676A}.calendar-session .log-details{display:grid;gap:10px;margin-top:10px}.calendar-session .log-exercise-block{min-width:0;padding:9px;border:1px solid #e5ebe3;border-radius:9px;background:#fff}.calendar-session .log-exercise-title{margin-bottom:6px;color:#245357;font-size:11px;font-weight:800;overflow-wrap:anywhere}.calendar-session .log-set-row{display:grid;grid-template-columns:52px minmax(0,1fr);gap:8px;padding:4px 0;border-top:1px solid #edf1eb;font-size:10px;line-height:1.4}.calendar-session .log-set-row span:last-child{text-align:right;color:#4D6F70;font-variant-numeric:tabular-nums}.calendar-session .log-detail-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:start;padding:5px 0;border-top:1px solid #edf1eb;font-size:10px}.calendar-session .log-detail-row>span:last-child{text-align:right;color:#4D6F70}.calendar-session .log-note{white-space:pre-wrap;overflow-wrap:anywhere}
    body[data-view="workout"] #journalCard,body[data-view="journal"] #journalCard{display:block!important;min-width:0}#journalCard>.card-head{align-items:center}#journalCard>.journal-calendar,#journalCard>.journal-disclosure,#journalCard>.journal-performance{width:100%;min-width:0}#journalDisclosure:not([open])>:not(summary){display:none!important}#journalDisclosure>.history-ranges{display:none!important}#journalDisclosure .range-caption{display:none!important}#journalDisclosure>summary{display:list-item!important;list-style:revert!important;pointer-events:auto!important}.journal-performance>summary{cursor:pointer;font-size:15px;font-weight:800;color:#123B3F}.journal-disclosure>summary{font-size:14px}.journal-performance select{max-width:100%;margin:13px 0;padding:9px;border:1px solid #dce5d9;border-radius:9px;background:white;font:inherit}.performance-charts{display:grid;gap:13px}.performance-chart{padding:12px;border-radius:12px;background:#fff;border:1px solid #e4ebe2}.performance-chart strong{display:block;font-size:12px}.performance-chart svg{display:block;width:100%;height:auto;max-height:150px}.performance-chart .chart-axis{display:flex;justify-content:space-between;color:#748477;font-size:10px}.performance-note{margin:10px 0 0;color:#607364;font-size:11px;line-height:1.5}.performance-note a{color:#07535A;font-weight:800}
    @media(max-width:760px){.journal-overview{grid-template-columns:1fr}.journal-overview>.journal-calendar,.journal-overview>.journal-performance{height:auto}}
    @media(max-width:520px){.cardio-fields{grid-template-columns:1fr 1fr}.cardio-fields label:first-child{grid-column:1/-1}.journal-calendar,.journal-performance{padding:13px}.calendar-day{min-height:48px}.calendar-empty{min-height:48px}#journalCard>.card-head p{display:none}}
  `;
  document.head.append(style);

  const editor = $('.routine-editor');
  editor.insertAdjacentHTML('afterbegin', `<div class="add-search-ui"><label for="addExerciseSearch">운동 이름 검색</label><input id="addExerciseSearch" type="search" autocomplete="off" placeholder="예: 스쿼트, 프레스" aria-describedby="addExerciseHint"><div class="add-part-chips" role="group" aria-label="운동 부위 선택"></div><div class="add-search-results" id="addExerciseResults" aria-live="polite"></div><small class="add-search-empty" id="addExerciseHint">이름을 모르겠다면 운동할 부위를 눌러보세요.</small></div>`);
  const search = $('#addExerciseSearch');
  const chips = $('.add-part-chips');
  const results = $('#addExerciseResults');
  function searchOptions() {
    const source = $('#addRoutineSelect');
    const query = search.value.trim().toLocaleLowerCase('ko-KR');
    if (!query && chosenCategory === '전체') { results.innerHTML=''; $('#addExerciseHint').textContent='이름을 모르겠다면 운동할 부위를 눌러보세요.'; return; }
    const options = [...source.querySelectorAll('optgroup')].flatMap(group => [...group.querySelectorAll('option')].map(option => ({name:option.value,category:group.label,disabled:option.disabled})));
    const matches = options.filter(item => !item.disabled && (chosenCategory === '전체' || item.category === chosenCategory) && (!query || item.name.toLocaleLowerCase('ko-KR').includes(query)));
    results.innerHTML = matches.slice(0,8).map(item => `<button type="button" data-add-name="${esc(item.name)}"><span>${esc(item.name)}</span><small>${esc(item.category)} · 추가</small></button>`).join('') || `<p class="add-search-empty">맞는 운동이 없어요. 다른 부위나 이름으로 찾아보세요.</p>`;
    $('#addExerciseHint').textContent = matches.length > 8 ? `${matches.length}개 중 8개를 표시해요. 이름을 입력하면 더 빨리 찾을 수 있어요.` : `${matches.length}개 운동`;
  }
  function renderChips() {
    chips.innerHTML = categories.map(category => `<button type="button" data-category="${category}" aria-pressed="${chosenCategory===category}">${category}</button>`).join('');
  }
  chips.onclick = event => { const button=event.target.closest('[data-category]'); if(!button)return; chosenCategory=button.dataset.category; renderChips(); searchOptions(); };
  search.oninput = searchOptions;
  results.onclick = event => { const button=event.target.closest('[data-add-name]'); if(!button)return; const select=$('#addRoutineSelect'); select.value=button.dataset.addName; $('#addRoutineExercise').click(); search.value=''; searchOptions(); };
  const oldPlan = window.renderPlan;
  window.renderPlan = function () { oldPlan(); renderChips(); searchOptions(); };

  $('#exerciseList').insertAdjacentHTML('afterend', `<section class="cardio-add" aria-label="유산소 운동 추가"><label><input type="checkbox" id="cardioEnabled"> 오늘 운동 끝에 유산소 추가</label><div class="cardio-fields" id="cardioFields" hidden><label>운동 종류<select id="cardioType"><option>걷기</option><option>러닝</option><option>실내 자전거</option><option>일립티컬</option><option>계단 오르기</option><option>로잉 머신</option><option>줄넘기</option><option>기타</option></select></label><label>시간 (분)<input id="cardioMinutes" type="number" min="1" max="240" step="1" placeholder="예: 20"></label><label>거리 (km, 선택)<input id="cardioDistance" type="number" min="0" max="100" step="0.1" placeholder="선택"></label></div><small class="cardio-hint">유산소만 기록해도 저장할 수 있어요.</small></section>`);
  $('#cardioEnabled').onchange = () => { $('#cardioFields').hidden = !$('#cardioEnabled').checked; if ($('#cardioEnabled').checked) $('#cardioMinutes').focus(); };
  window.PacefitCardio = {
    read() {
      if (!$('#cardioEnabled').checked) return {data:null,error:null};
      const minutes=Number($('#cardioMinutes').value), rawDistance=$('#cardioDistance').value.trim(), distance=rawDistance===''?null:Number(rawDistance);
      if (!Number.isInteger(minutes) || minutes<1 || minutes>240) { $('#cardioMinutes').focus(); return {data:null,error:'유산소 시간을 1~240분으로 입력해주세요.'}; }
      if (distance!==null && (!Number.isFinite(distance) || distance<0 || distance>100)) { $('#cardioDistance').focus(); return {data:null,error:'유산소 거리를 0~100km로 입력해주세요.'}; }
      return {data:{type:$('#cardioType').value,minutes,distance},error:null};
    },
    clear() { $('#cardioEnabled').checked=false; $('#cardioFields').hidden=true; $('#cardioMinutes').value=''; $('#cardioDistance').value=''; }
  };

  const card = $('#journalCard');
  card.querySelector('.card-head p').textContent = '달력에서 날짜를 눌러 기록을 보고, 최근 7일과 운동 변화를 확인해요.';
  card.querySelector('#journalDisclosure').insertAdjacentHTML('beforebegin', `<section class="journal-calendar" aria-label="운동일지 달력"><div class="calendar-head"><h3>운동 달력</h3><button type="button" id="calendarPrev" aria-label="이전 달">‹</button><strong id="calendarMonth"></strong><button type="button" id="calendarNext" aria-label="다음 달">›</button></div><div class="calendar-weekdays" aria-hidden="true"><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span><span>일</span></div><div class="calendar-grid" id="calendarGrid"></div><div class="calendar-day-panel" id="calendarDayLogs"></div></section>`);
  $('#journalDisclosure').insertAdjacentHTML('afterend', `<details class="journal-performance" aria-label="운동 기록 변화"><summary>운동 기록 변화</summary><p class="performance-note">같은 운동·기구의 세트별 최고 무게와 그 무게에서 한 횟수를 비교해요.</p><label for="performanceExercise">비교할 운동</label><select id="performanceExercise"></select><div class="performance-charts" id="performanceCharts"></div><p class="performance-note">무게나 횟수의 변화는 운동 수행 기록입니다. 자세·휴식·노력 정도가 다르면 직접적인 근력 향상으로 단정하기 어려워요. <a href="./docs/운동기록-변화-근거.md" target="_blank" rel="noopener">자료와 해석 기준 보기</a></p></details>`);
  $('#journalDisclosure').open=false;
  const journalOverview=document.createElement("div");journalOverview.className="journal-overview";const calendarSection=card.querySelector(".journal-calendar"),performanceSection=card.querySelector(".journal-performance");card.insertBefore(journalOverview,card.querySelector("#journalDisclosure"));journalOverview.append(calendarSection,performanceSection);performanceSection.open=true;
  function effortFace(log) {
    const effort=String(log.effort||'');
    if (/통증/.test(effort)) return '😣';
    if (/힘들|어려|매우/.test(effort)) return '🥵';
    if (/쉬웠|가벼|편했/.test(effort)) return '😊';
    return '🙂';
  }
  function detailRows(log) {
    const items=(log.items||[]).map(item => {
      const sets=Array.isArray(item.setDetails)&&item.setDetails.length ? item.setDetails : Array.from({length:Number(item.sets)||1},()=>({weight:item.weight,reps:item.reps}));
      return `<section class="log-exercise-block"><div class="log-exercise-title">${esc(item.name)}${item.equipment?` · ${esc(item.equipment)}`:''}</div>${sets.map((set,n)=>`<div class="log-set-row"><span>${n+1}세트</span><span>${esc(set.weight)}kg × ${esc(set.reps)}회</span></div>`).join('')}</section>`;
    }).join('');
    const cardio=log.cardio ? `<div class="log-detail-row"><span>유산소 · ${esc(log.cardio.type)}</span><span>${esc(log.cardio.minutes)}분${log.cardio.distance!=null?` · ${esc(log.cardio.distance)}km`:''}</span></div>` : '';
    const note=log.note?`<p class="log-note">${esc(log.note)}</p>`:'';
    const photos=(log.photoIds||[]).map((id,n)=>`<img data-photo-id="${esc(id)}" alt="운동 사진 ${n+1}">`).join('');
    return items+cardio+note+(photos?`<div class="log-photo-grid">${photos}</div>`:'');
  }
  function renderCalendar() {
    const first=new Date(shownYear,shownMonth,1), offset=(first.getDay()+6)%7, count=new Date(shownYear,shownMonth+1,0).getDate();
    $('#calendarMonth').textContent=`${shownYear}년 ${shownMonth+1}월`;
    const byDate=new Map();
    logs().forEach(log=>{if(!byDate.has(log.date))byDate.set(log.date,[]);byDate.get(log.date).push(log)});
    $('#calendarGrid').innerHTML=Array.from({length:offset},()=>'<span class="calendar-empty"></span>').join('')+Array.from({length:count},(_,i)=>{
      const day=i+1, iso=localISO(new Date(shownYear,shownMonth,day)), dayLogs=byDate.get(iso)||[], face=dayLogs.length?effortFace(dayLogs.at(-1)):'';
      return `<button type="button" class="calendar-day" data-date="${iso}" data-today="${iso===today}" aria-pressed="${iso===selectedDate}" aria-label="${shownMonth+1}월 ${day}일${dayLogs.length?`, 운동 ${dayLogs.length}회, 난이도 ${esc(dayLogs.at(-1).effort||'미기록')}`:''}"><span>${day}</span><span class="day-face" aria-hidden="true">${face}</span>${dayLogs.length>1?`<span class="day-count">${dayLogs.length}회</span>`:''}</button>`;
    }).join('');
    const dayLogs=byDate.get(selectedDate)||[];
    $('#calendarDayLogs').innerHTML=`<h4>${parseISO(selectedDate).toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'})} · ${dayLogs.length}회</h4>`+(dayLogs.length?dayLogs.map(log=>{const exerciseNames=(log.items||[]).map(item=>item.name).filter(Boolean);if(log.cardio)exerciseNames.push(`유산소 · ${log.cardio.type||'기록'}`);const names=exerciseNames.length?`<ul class="calendar-session-exercises">${exerciseNames.map(name=>`<li>${esc(name)}</li>`).join('')}</ul>`:'<p class="add-search-empty">종목별 기록이 없는 운동이에요.</p>';return `<article class="calendar-session log-item" data-log-id="${esc(log.id||'')}"><div class="calendar-session-heading">${effortFace(log)} ${esc(log.title||'운동 기록')} · ${esc(log.effort||'난이도 미기록')}</div>${names}<details><summary>세트·메모·사진 보기</summary><div class="log-details">${detailRows(log)}</div></details></article>`}).join(''):'<p class="add-search-empty">이날의 운동 기록이 없어요.</p>');
    if (window.hydrateLogPhotos) window.hydrateLogPhotos();
  }
  $('#calendarPrev').onclick=()=>{shownMonth--;if(shownMonth<0){shownMonth=11;shownYear--;}renderCalendar()};
  $('#calendarNext').onclick=()=>{shownMonth++;if(shownMonth>11){shownMonth=0;shownYear++;}renderCalendar()};
  $('#calendarGrid').onclick=event=>{const day=event.target.closest('[data-date]');if(!day)return;selectedDate=day.dataset.date;renderCalendar()};
  function pointsFor(key) {
    return logs().flatMap(log => (log.items||[]).filter(item=>JSON.stringify([item.name,item.equipment||''])===key).map(item=>{
      const sets=Array.isArray(item.setDetails)&&item.setDetails.length?item.setDetails:[{weight:item.weight,reps:item.reps}];
      const valid=sets.filter(set=>Number.isFinite(Number(set.weight))&&Number.isInteger(Number(set.reps))&&Number(set.reps)>0).sort((a,b)=>Number(b.weight)-Number(a.weight)||Number(b.reps)-Number(a.reps));
      return valid.length?{date:log.date,weight:Number(valid[0].weight),reps:Number(valid[0].reps),loggedAt:log.loggedAt||''}:null;
    }).filter(Boolean)).sort((a,b)=>a.date.localeCompare(b.date)||a.loggedAt.localeCompare(b.loggedAt)).slice(-12);
  }
  function chart(title,points,field,unit) {
    const values=points.map(point=>point[field]), min=Math.min(...values), max=Math.max(...values), floor=Math.max(0,min-(max-min||1)*.2), ceiling=max+(max-min||1)*.2;
    const coords=values.map((value,i)=>({x:34+i*(532/Math.max(1,values.length-1)),y:140-(value-floor)/(ceiling-floor)*110}));
    const path=coords.map((point,i)=>`${i?'L':'M'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
    const change=values.at(-1)-values[0], changeText=`${change>0?'+':''}${Number(change.toFixed(1))}${unit}`;
    return `<div class="performance-chart"><strong>${title} · 최근 ${values.at(-1)}${unit} (${changeText})</strong><svg viewBox="0 0 600 165" role="img" aria-label="${title}: ${values.map((value,i)=>`${points[i].date} ${value}${unit}`).join(', ')}"><path d="M34 140H566" stroke="#dbe7d9" fill="none"/><path d="${path}" stroke="#07535A" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>${coords.map((point,i)=>`<circle cx="${point.x}" cy="${point.y}" r="4" fill="#07535A"><title>${esc(points[i].date)} · ${values[i]}${unit}</title></circle>`).join('')}<text x="0" y="25" font-size="11" fill="#4D6F70">${Number(ceiling.toFixed(1))}</text><text x="0" y="143" font-size="11" fill="#4D6F70">${Number(floor.toFixed(1))}</text></svg><div class="chart-axis"><span>${esc(points[0].date)}</span><span>${esc(points.at(-1).date)}</span></div></div>`;
  }
  function renderPerformance() {
    const keys=[...new Set(logs().flatMap(log=>(log.items||[]).map(item=>JSON.stringify([item.name,item.equipment||'']))))];
    const select=$('#performanceExercise');
    if(!keys.includes(chosenExercise))chosenExercise=keys.at(-1)||'';
    select.innerHTML=keys.map(key=>{const [name,equipment]=JSON.parse(key);return `<option value="${esc(key)}">${esc(name)}${equipment?` · ${esc(equipment)}`:''}</option>`}).join('');
    select.value=chosenExercise;
    const points=chosenExercise?pointsFor(chosenExercise):[];
    $('#performanceCharts').innerHTML=points.length<2?`<p class="add-search-empty">${points.length?'같은 운동을 한 번 더 기록하면 변화 그래프가 나타나요.':'운동을 기록하면 변화 그래프가 나타나요.'}</p>`:chart('세트 최고 무게',points,'weight','kg')+chart('그 무게에서의 반복',points,'reps','회');
  }
  $('#performanceExercise').onchange=event=>{chosenExercise=event.target.value;renderPerformance()};
  const oldLogs=window.renderLogs;
  window.renderLogs=function(){
    window.historyRange=7;
    oldLogs();
    const cutoff=new Date();cutoff.setDate(cutoff.getDate()-6);
    const recent=logs().filter(log=>log.date>=localISO(cutoff)&&log.date<=today);
    $('#journalSummary').textContent=`최근 7일 · ${recent.length}회`;
    $('#logCount').textContent=`전체 ${logs().length}회`;
    $('#rangeCaption').textContent='최근 7일';
    document.querySelectorAll('#logList .log-item[data-log-id]').forEach(root=>{
      const log=logs().find(item=>item.id===root.dataset.logId);if(!log)return;
      const detail=root.querySelector('.log-details');if(log.cardio&&detail)detail.insertAdjacentHTML('beforeend',`<div class="log-detail-row"><span>유산소 · ${esc(log.cardio.type)}</span><span>${esc(log.cardio.minutes)}분${log.cardio.distance!=null?` · ${esc(log.cardio.distance)}km`:''}</span></div>`);
      if(log.cardio){
        const sub=root.querySelector('.log-sub');
        if(sub)sub.textContent=log.items.length?`${sub.textContent} · 유산소 ${log.cardio.minutes}분`:`유산소 ${log.cardio.type} ${log.cardio.minutes}분 · ${log.effort||'난이도 미기록'}`;
        if(!log.items.length){const volume=root.querySelector('.log-volume');if(volume){volume.firstChild.textContent=String(log.cardio.minutes);volume.querySelector('small').textContent='유산소 시간(분)';}}
      }
    });
    renderCalendar();renderPerformance();
  };
  window.renderPlan();window.renderLogs();
})();


