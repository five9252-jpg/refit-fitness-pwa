/* Display calculations and strict body-record serialization. No network or storage. */
((root)=>{
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=(value,min=0,max=1e8)=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))&&Number(value)>=min&&Number(value)<=max?Number(value):null;
  const fmt=(value,digits=0)=>value===null||!Number.isFinite(value)?'—':value.toLocaleString('ko-KR',{maximumFractionDigits:digits});
  const day=date=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
  const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
  function cleanMetrics(rows,today=day(new Date())) {
    return (Array.isArray(rows)?rows:[]).filter(row=>row&&validDate(row.date)&&row.date<=today).map(row=>({id:String(row.id||'').slice(0,100),date:row.date,weight:num(row.weight,20,300),bmr:num(row.bmr,500,4000),recordedAt:Number.isFinite(Date.parse(row.recordedAt))?row.recordedAt:null,source:row.source==='profile'?'profile':'manual'})).filter(row=>row.id&&(row.weight!==null||row.bmr!==null)).sort((a,b)=>b.date.localeCompare(a.date)||String(b.recordedAt||'').localeCompare(String(a.recordedAt||''))).slice(0,360);
  }
  function cleanReports(rows,ownerId,today=day(new Date())) {
    if(!ownerId)return [];
    return (Array.isArray(rows)?rows:[]).filter(row=>row&&row.ownerId===ownerId&&row.shareWithTrainer===true&&Number.isFinite(Date.parse(row.acceptedAt))&&validDate(row.date)&&row.date<=today&&typeof row.image==='string'&&row.image.length<=240000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(row.image)).map(row=>({id:String(row.id||'').slice(0,100),ownerId,date:row.date,name:String(row.name||'체성분 검사표').slice(0,80),image:row.image,shareWithTrainer:true,acceptedAt:row.acceptedAt})).filter(row=>row.id).slice(0,8);
  }
  function cloudBodyFields(state,consent,ownerId) {
    return consent===true&&!state.demo?{bodyMetricsV1:cleanMetrics(state.bodyMetricsV1),sharedBodyReportsV1:cleanReports(state.sharedBodyReportsV1,ownerId)}:{bodyMetricsV1:[],sharedBodyReportsV1:[]};
  }
  function sets(item) {
    if(Array.isArray(item?.setDetails)&&item.setDetails.length)return item.setDetails.map(s=>({weight:num(s?.weight,0,1000),reps:num(s?.reps,1,100)})).filter(s=>s.weight!==null&&s.reps!==null&&Number.isInteger(s.reps)).slice(0,30);
    const count=num(item?.sets,1,30),weight=num(item?.weight,0,1000),reps=num(item?.reps,1,100);
    return Number.isInteger(count)&&Number.isInteger(reps)&&weight!==null?Array.from({length:count},()=>({weight,reps})):[];
  }
  function totals(log) {
    return (Array.isArray(log?.items)?log.items:[]).flatMap(sets).reduce((r,s)=>({sets:r.sets+1,reps:r.reps+s.reps,weights:r.weights+s.weight,volume:r.volume+s.weight*s.reps}),{sets:0,reps:0,weights:0,volume:0});
  }
  function calories(log,profile={}) {
    const stored=num(log?.calorieEstimate?.kcal,0,10000);
    if(stored!==null)return {kcal:stored,label:'기록 당시 체중·시간 기준',approximate:false};
    const t=totals(log),weight=num(profile.weight,20,300);if(weight===null||!t.sets)return {kcal:null,label:'체중·운동 정보 필요',approximate:false};
    const recorded=num(log.strengthMinutes??log.durationMinutes??log.calorieEstimate?.strengthMinutes,1,300);
    const minutes=recorded??(t.reps*3/60+Math.max(0,t.sets-1));
    const met=String(log.effort||'').includes('힘들')?6:3.5;
    return {kcal:Math.round(met*3.5*weight/200*minutes/5)*5,approximate:recorded===null,label:recorded===null?'시간 미기록 · 1회 3초·세트 사이 60초·현재 체중으로 참고 추정':'입력 시간·현재 체중 기준 MET 추정'};
  }
  function nutrition(profile={},mode) {
    const weight=num(profile.weight,20,300),bmr=num(profile.bmr,500,4000);
    if(weight===null||bmr===null)return null;
    if(!['loss','maintain','gain'].includes(mode))mode=/감량|체중 줄|살 빼/.test(profile.goalOther||profile.goal||'')?'loss':/증량|근육 증가/.test(profile.goalOther||profile.goal||'')?'gain':'maintain';
    const days=num(profile.days,1,5)??2,factor=Math.min(1.6,1.4+days*.04),maintenance=Math.round(bmr*factor/50)*50;
    const kcal=mode==='loss'?Math.max(1000,maintenance-300):mode==='gain'?maintenance+250:maintenance;
    const protein=Math.round(weight*1.2),fat=Math.round(kcal*.30/9),carbs=Math.max(0,Math.round((kcal-protein*4-fat*9)/4));
    return {kcal,protein,fat,carbs,mode,label:{loss:'감량',maintain:'유지',gain:'증량'}[mode]};
  }
  function foodKey(name='') {
    const first=String(name).split(/[·,+]/)[0];
    if(/사과|바나나|과일|베리|귤|오렌지|포도|딸기/.test(first))return 'fruit';
    if(/샐러드|채소|나물|김치|브로콜리|토마토/.test(first))return 'vegetable';
    if(/연어|생선|고등어|참치|새우|해산|오징어/.test(first))return 'seafood';
    if(/우유|요거트|요구르트|치즈/.test(first))return 'dairy';
    if(/닭|살코기|소고기|돼지|달걀|계란|두부|두유|콩/.test(first))return 'protein';
    return 'grain';
  }
  function exerciseIcon(name='') {
    let file='';
    if(typeof exerciseAtlasCell!=='undefined')file=exerciseAtlasCell[name]?.file||'';
    const src=/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(file)?file:/^[\w.-]+\.(jpg|jpeg|png|webp|svg)$/.test(file)?'./assets/exercises/'+file:'';
    return src?`<img class="mi-exercise-icon" src="${esc(src)}" alt="" width="64" height="64" loading="lazy">`:'<span class="mi-exercise-icon mi-icon-fallback" aria-hidden="true">🏋️</span>';
  }
  function timeText(log) {
    const raw=log.loggedAt||log.created_at;
    return raw&&Number.isFinite(Date.parse(raw))?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(raw))+' 기록 (한국 시간)':'기록 시각 미입력';
  }
  const stat=(label,value)=>`<div class="mi-stat"><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`;
  function workoutSummary(logs,profile={},mode='week') {
    const dates=[...new Set(logs.map(log=>log.date).filter(Boolean))].sort();
    const sum=logs.reduce((r,l)=>{const t=totals(l),c=calories(l,profile);r.sets+=t.sets;r.reps+=t.reps;if(c.kcal!==null){r.kcal+=c.kcal;r.estimated++;}return r;},{sets:0,reps:0,kcal:0,estimated:0});
    const buckets=new Map();
    for(const log of logs){if(!validDate(log.date))continue;let key=log.date;if(mode==='month'){const d=new Date(key+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);key=d.toISOString().slice(0,10);}if(!buckets.has(key))buckets.set(key,{days:new Set(),sets:0,kcal:0,known:0});const b=buckets.get(key),c=calories(log,profile);b.days.add(log.date);b.sets+=totals(log).sets;if(c.kcal!==null){b.kcal+=c.kcal;b.known++;}}
    const points=[...buckets].sort(([a],[b])=>a.localeCompare(b));
    const charts=[['days','운동한 날','일'],['kcal','추정 소모 칼로리','kcal'],['sets','총 세트','세트']].map(([key,label,unit])=>{const values=points.map(([,v])=>key==='days'?v.days.size:v[key]),max=Math.max(1,...values);return '<section class="mi-metric-chart"><h4>'+label+'</h4><div class="mi-volume-chart" aria-label="'+label+' 그래프">'+points.map(([date,v],i)=>'<div><strong>'+(key==='kcal'&&!v.known?'—':fmt(values[i]))+'</strong><span style="height:'+Math.max(2,Math.round(values[i]/max*70))+'px"></span><small>'+esc(date.slice(5))+'</small></div>').join('')+'</div><small>'+unit+' · '+(mode==='month'?'주별':'날짜별')+' 합계</small></section>';}).join('');
    return '<div class="mi-stats">'+stat('운동한 날',dates.length+'일')+stat('총 세트',fmt(sum.sets)+'세트')+stat('총 반복',fmt(sum.reps)+'회')+stat('추정 소모 칼로리',sum.estimated?'약 '+fmt(sum.kcal)+' kcal':'정보 필요')+'</div><p class="trainer-note">같은 날 여러 기록은 1일로 셉니다. 소모 칼로리는 계산 가능한 '+sum.estimated+'/'+logs.length+'회만 합산한 추정값입니다.</p>'+(points.length?'<div class="mi-metric-charts">'+charts+'</div>':'<p class="trainer-empty">공유 운동 기록이 쌓이면 표시됩니다.</p>');
  }

  function workoutLogEntries(logs,profile={}) {
    return logs.map(log=>{const t=totals(log),c=calories(log,profile);return `<article class="trainer-log" data-lesson-log="${esc(log.id)}"><h4>${esc(log.title||'운동 기록')}</h4><small>${esc(log.date)} · ${esc(timeText(log))} · <strong class="trainer-author-badge">${log.source==='trainer'?'트레이너 작성':'회원 작성'}</strong></small><div class="mi-stats">${stat('총 세트·횟수',`${t.sets}세트 · ${t.reps}회`)}${stat('총 운동량',fmt(t.volume,1)+' kg·회')}${stat('예상 소모량',c.kcal===null?'정보 필요':'약 '+fmt(c.kcal)+' kcal')}${stat('기록 강도',log.effort||'미기록')}</div>${(log.items||[]).map(item=>{const ss=sets(item),v=totals({items:[item]});return `<div class="mi-exercise">${exerciseIcon(item.name)}<div><strong>${esc(item.name)}</strong><p>${ss.map((s,i)=>`${i+1}세트 ${fmt(s.weight,1)}kg × ${s.reps}회`).join(' / ')||'세트 정보 없음'}</p><small>합계 ${v.sets}세트 · ${v.reps}회 · 중량 합 ${fmt(v.weights,1)}kg · 운동량 ${fmt(v.volume,1)}kg·회</small></div></div>`}).join('')}<p class="trainer-note">${esc(c.label)}. 소모량은 운동 전체 기준이며 종목별로 나누지 않습니다.</p>${log.note?`<p>${esc(log.note)}</p>`:''}<div class="trainer-comments" data-thread="${esc(log.id)}"><button class="trainer-subtle" type="button" data-load-comment="${esc(log.id)}">코멘트 보기</button></div></article>`;}).join('')||'<p class="trainer-empty">공유 운동 기록이 없어요.</p>';
  }
  function workoutLogs(logs,profile={}) {
    const groups=new Map();for(const log of logs){const date=validDate(log.date)?log.date:'날짜 미입력';if(!groups.has(date))groups.set(date,[]);groups.get(date).push(log);}
    return [...groups].sort(([a],[b])=>b.localeCompare(a)).map(([date,entries])=>'<details class="mi-workout-day"><summary><strong>'+esc(date)+'</strong><span>운동 '+entries.length+'회 · '+entries.reduce((n,l)=>n+totals(l).sets,0)+'세트</span></summary>'+workoutLogEntries(entries,profile)+'</details>').join('')||'<p class="trainer-empty">공유 운동 기록이 없어요.</p>';
  }
  function dietPeriodSummary(rows,target,period) {
    const validRows=rows.filter(r=>validDate(r.entry_date)),days=new Set(validRows.map(r=>r.entry_date)).size;
    const cards=[['kcal','열량','kcal'],['carbs','탄수화물','g'],['protein','단백질','g'],['fat','지방','g']].map(([key,label,unit])=>{
      const known=validRows.filter(r=>num(r.nutrients?.[key])!==null),total=known.reduce((n,r)=>n+Number(r.nutrients[key]),0),goal=target?target[key]*days:0,percent=goal&&known.length?Math.round(total/goal*100):null;
      return '<div class="mi-nutrition"><small>'+label+'</small><strong>'+(known.length?fmt(total,key==='kcal'?0:1):'—')+' '+unit+'</strong><span>기록일 목표 '+(goal?fmt(goal):'—')+' '+unit+'</span>'+(percent!==null?'<b>목표 대비 '+percent+'%</b><progress max="100" value="'+Math.min(100,percent)+'" aria-label="'+label+' 목표 대비 '+percent+'%"></progress>':'')+(known.length<validRows.length?'<small>성분 미입력 포함 · 일부 합계</small>':'')+'</div>';
    }).join('');
    return '<section class="mi-period-diet"><h4>선택 기간 영양 목표</h4>'+(period?'<p class="mi-range">'+esc(period.label)+'</p>':'')+'<div class="mi-nutrition-grid">'+cards+'</div><p class="trainer-note">식단 기록이 있는 '+days+'일의 섭취 합계를 일일 목표 × 기록일 수와 비교합니다. 미기록일은 0 섭취로 처리하지 않으며, 기록일에도 빠진 끼니가 있을 수 있습니다. 현재 프로필의 목표 참고값 기준이며 높을수록 좋은 점수는 아닙니다.</p></section>';
  }
  function dietMarkup(rows,profile={},mode,period) {
    const target=nutrition(profile,mode),byDay=new Map();
    for(const row of rows){const date=validDate(row.entry_date)?row.entry_date:'날짜 미입력';if(!byDay.has(date))byDay.set(date,[]);byDay.get(date).push(row);}
    const days=[...byDay].sort(([a],[b])=>b.localeCompare(a));
    const content=days.map(([date,entries])=>{const sums={kcal:0,protein:0,carbs:0,fat:0},known={kcal:0,protein:0,carbs:0,fat:0};for(const row of entries)for(const key of Object.keys(sums)){const n=num(row.nutrients?.[key]);if(n!==null){sums[key]+=n;known[key]++;}}
      return `<section class="trainer-diet-day"><h4>${esc(date)} · ${entries.length}개 기록</h4><div class="mi-nutrition-grid">${[['kcal','열량','kcal'],['carbs','탄수화물','g'],['protein','단백질','g'],['fat','지방','g']].map(([key,label,unit])=>`<div class="mi-nutrition"><small>${label}</small><strong>섭취 ${known[key]?fmt(sums[key],key==='kcal'?0:1):'—'} ${unit}</strong><span>권장 참고 ${target?fmt(target[key]):'미입력'} ${target?unit:''}</span>${target&&known[key]?`<span class="mi-nutrition-percent">목표 대비 ${Math.round(sums[key]/Math.max(1,target[key])*100)}%</span><progress max="100" value="${Math.min(100,sums[key]/Math.max(1,target[key])*100)}" aria-label="${label} 목표 대비 ${Math.round(sums[key]/Math.max(1,target[key])*100)}%"></progress>`:''}${known[key]<entries.length?'<small>일부 성분 정보 없음</small>':''}</div>`).join('')}</div>${entries.slice().sort((a,b)=>['아침','점심','저녁','간식'].indexOf(a.meal)-['아침','점심','저녁','간식'].indexOf(b.meal)).map(row=>`<div class="mi-food"><img src="./assets/diet/${foodKey(row.food_name)}.svg" alt="" width="48" height="48" loading="lazy"><div><strong>${esc(row.meal)} · ${esc(row.food_name)}</strong><small>${esc(row.amount_g??'—')}g · ${fmt(num(row.nutrients?.kcal))} kcal · 탄 ${fmt(num(row.nutrients?.carbs),1)}g · 단 ${fmt(num(row.nutrients?.protein),1)}g · 지 ${fmt(num(row.nutrients?.fat),1)}g</small>${row.note?`<p>${esc(row.note)}</p>`:''}${row.photo_path?`<img class="mi-meal-photo" data-diet-photo="${esc(row.photo_path)}" alt="식단 사진" loading="lazy">`:''}</div></div>`).join('')}</section>`;});
    return `<p class="trainer-note">${target?`현재 공유 프로필 기준 ${target.label} 권장 참고량 · ${fmt(target.kcal)}kcal/일 · 단백질 ${target.protein}g · 탄수화물 ${target.carbs}g · 지방 ${target.fat}g. 개인별 식사 처방이 아닙니다.`:'권장 참고량을 계산하려면 회원이 체중과 기초대사량을 입력·공유해야 합니다. 섭취량은 공유된 식단만 합산합니다.'}</p><div class="mi-stats">${stat('불러온 식단',`${rows.length}${rows.length===500?'+':''}건`)}${stat('기록 날짜',days.length+'일')}${stat('최근 식단일',days[0]?.[0]||'—')}${stat('목표 참고',target?.label||'정보 필요')}</div>${dietPeriodSummary(rows,target,period)}${content.slice(0,7).join('')||'<p class="trainer-empty">공유 허용된 식단 기록이 없어요. 기록 유무나 미동의 여부를 단정할 수 없습니다.</p>'}${content.length>7?`<details><summary>이전 ${content.length-7}일 식단 보기</summary>${content.slice(7).join('')}</details>`:''}`;
  }
  function monthlyOverview(logs=[],diets=[],poses=[],metrics=[],profile={}) {
    const months=new Map();
    const bucket=date=>{if(!/^\d{4}-\d{2}/.test(String(date||'')))return null;const key=String(date).slice(0,7);if(!months.has(key))months.set(key,{key,logs:[],diets:[],poses:[],metrics:[]});return months.get(key);};
    logs.forEach(row=>bucket(row.date)?.logs.push(row));
    diets.forEach(row=>bucket(row.entry_date)?.diets.push(row));
    poses.forEach(row=>bucket(row.created_at)?.poses.push(row));
    cleanMetrics(metrics).forEach(row=>bucket(row.date)?.metrics.push(row));
    const cards=[...months.values()].sort((a,b)=>b.key.localeCompare(a.key)).slice(0,12).map(month=>{
      const volume=month.logs.reduce((sum,row)=>sum+totals(row).volume,0);
      const days=new Set(month.diets.map(row=>row.entry_date)).size;
      const kcalRows=month.diets.map(row=>num(row.nutrients?.kcal)).filter(value=>value!==null);
      const weights=month.metrics.filter(row=>row.weight!==null).sort((a,b)=>a.date.localeCompare(b.date));
      const weightChange=weights.length>1?`${weights.at(-1).weight-weights[0].weight>0?'+':''}${fmt(weights.at(-1).weight-weights[0].weight,1)} kg`:null;
      return `<article class="mi-month-card"><h4>${esc(month.key.replace('-', '년 '))}월</h4><div class="mi-month-grid"><div><small>프로필 · 체중</small><strong>${weights.length?fmt(weights.at(-1).weight,1)+' kg':'기록 없음'}</strong><span>${weightChange?`월내 변화 ${weightChange}`:'이달 비교 기록 없음'}</span></div><div><small>운동 변화</small><strong>${month.logs.length}회 · ${fmt(volume,1)} kg·회</strong><span>공유 운동 기록 기준</span></div><div><small>식단</small><strong>${days}일 · ${month.diets.length}건</strong><span>${kcalRows.length?`열량 정보 ${kcalRows.length}건 · 합계 ${fmt(kcalRows.reduce((a,b)=>a+b,0))} kcal`:'열량 정보 없음'}</span></div><div><small>자세</small><strong>${month.poses.length}건</strong><span>공유된 자세 결과 기준</span></div></div></article>`;
    });
    return `<p class="trainer-note">월별로 회원이 공유한 기록만 모았습니다. ${esc(profile.name||'회원')}님의 현재 프로필과 과거 측정값은 다를 수 있습니다. 기록이 없는 달은 변화가 없었다는 뜻이 아닙니다.</p><div class="mi-month-list">${cards.join('')||'<p class="mi-month-empty">공유된 월별 기록이 아직 없습니다.</p>'}</div>`;
  }
  function historyMarkup(rows,key,profile={}) {
    const entries=cleanMetrics(rows).filter(row=>row[key]!==null),unit=key==='weight'?'kg':'kcal/일',label=key==='weight'?'체중':'기초대사량';
    return `<details class="mi-history"><summary>${label} 변화 목록 · 현재 ${fmt(num(profile[key],key==='weight'?20:500,key==='weight'?300:4000),1)} ${unit}</summary>${entries.length?`<div class="mi-history-list">${entries.map((row,i)=>`<div><time>${esc(row.date)}</time><strong>${fmt(row[key],1)} ${unit}</strong><small>${entries[i+1]?`이전 대비 ${(row[key]-entries[i+1][key])>0?'+':''}${fmt(row[key]-entries[i+1][key],1)} ${unit}`:'첫 기록'} · ${row.source==='profile'?'프로필 값 확인':'날짜별 기록'}</small></div>`).join('')}</div>`:'<p class="trainer-note">날짜별 기록이 아직 없습니다. 과거 수치는 임의로 만들지 않습니다.</p>'}</details>`;
  }
  function reportsMarkup(rows,ownerId) {
    const reports=cleanReports(rows,ownerId);
    return `<section class="mi-reports"><h4>공유된 체성분 검사표 ${reports.length}장</h4><p class="trainer-note">회원이 검사표별 서버 저장·트레이너 공유를 별도로 허용한 사진만 표시합니다. 자동 분석하지 않습니다.</p><div class="mi-report-grid">${reports.map(row=>`<details><summary>${esc(row.date)} · ${esc(row.name)}</summary><img src="${row.image}" alt="${esc(row.date)} 체성분 검사표" loading="lazy"></details>`).join('')||'<p class="trainer-empty">별도로 공유된 검사표가 없습니다.</p>'}</div></section>`;
  }
  root.PacefitMemberInsights={esc,num,fmt,day,validDate,sets,totals,calories,nutrition,foodKey,cleanMetrics,cleanReports,cloudBodyFields,workoutSummary,workoutLogs,dietMarkup,monthlyOverview,historyMarkup,reportsMarkup};
  if(typeof module!=='undefined')module.exports=root.PacefitMemberInsights;
})(typeof window==='undefined'?globalThis:window);
