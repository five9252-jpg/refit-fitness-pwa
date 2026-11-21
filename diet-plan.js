(() => {
  'use strict';
  const names=['월','화','수','목','금','토','일'], labels=['아침','점심','저녁'];
  const ideas=[
    ['오트밀·우유·바나나','현미밥·닭고기·채소','두부·잡곡밥·나물'],
    ['달걀·통밀빵·과일','보리밥·생선·채소','소고기·밥·샐러드'],
    ['요거트·견과·과일','잡곡밥·두부·채소','닭고기·밥·구운 채소'],
    ['달걀·밥·과일','현미밥·콩류·채소','생선·밥·나물'],
    ['오트밀·요거트·과일','밥·돼지고기·채소','두부·달걀·샐러드'],
    ['통밀빵·달걀·우유','잡곡밥·생선·채소','닭고기·밥·나물'],
    ['밥·달걀·과일','현미밥·소고기·채소','콩류·밥·구운 채소']
  ];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const localDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const monday=v=>{const d=new Date(`${v}T12:00:00`);if(Number.isNaN(d.getTime()))return null;d.setDate(d.getDate()-(d.getDay()+6)%7);return localDate(d);};
  const dateAt=(week,i)=>{const d=new Date(`${week}T12:00:00`);d.setDate(d.getDate()+i);return localDate(d);};
  const session=()=>window.RefitAccountSession;
  const alternatives=[['현미밥·사과','고구마·바나나','잡곡밥·채소'],['잡곡밥·구운 채소','현미밥·나물','보리밥·채소'],['현미밥·나물','고구마·샐러드','잡곡밥·구운 채소']];
  const avoidAliases={우유:['우유','요거트','치즈'],달걀:['달걀','계란'],밀:['밀','빵','파스타'],콩:['콩','두부','두유'],땅콩:['땅콩','견과'],견과류:['견과','호두','아몬드','땅콩'],생선:['생선','연어','참치'],새우:['새우'],게:['게'],돼지고기:['돼지고기'],소고기:['소고기'],닭고기:['닭고기','닭가슴살'],복숭아:['복숭아'],토마토:['토마토']};
  const foodOptions=Object.keys(avoidAliases);
  const blank=week=>({week,days:names.map((name,i)=>({name,date:dateAt(week,i),meals:['','',''],planned:[false,false,false]}))});
  const valid=p=>p&&Array.isArray(p.days)&&p.days.length===7&&p.days.every(d=>Array.isArray(d.meals)&&d.meals.length===3);
  const normalize=(p,week)=>({week,days:p.days.map((d,i)=>({name:names[i],date:dateAt(week,i),meals:d.flexible?['','','']:d.meals.map(x=>String(x||'')),planned:Array.isArray(d.planned)?d.planned.map(Boolean):d.meals.map(x=>!!x&&!ideas[i].includes(x))}))});
  const cleaned=xs=>[...new Set((Array.isArray(xs)?xs:[]).map(x=>String(x).trim().slice(0,40)).filter(Boolean))].slice(0,30);
  const excluded=(meal,foods)=>foods.some(food=>(avoidAliases[food]||[food]).some(part=>meal.includes(part)));
  function mount(root,{memberId=null,canWrite=true}={}){
    if(!root)return;
    const trainer=!!memberId, owner=()=>memberId||session()?.user?.id||'local';
    let weekInput,daysRoot,generate,status;
    if(trainer){
      root.classList.add('weekly-diet-plan');
      root.innerHTML='<h3>회원 주간 식단표</h3><p>직접 정한 식사는 유지하고 빈칸만 추천합니다.</p><div class="weekly-plan-controls"><input type="date" aria-label="식단표 시작 주"><button type="button">빈칸 추천</button></div><div class="diet-plan-days"></div><p class="diet-plan-help" role="status"></p>';
      weekInput=root.querySelector('input[type=date]');daysRoot=root.querySelector('.diet-plan-days');generate=root.querySelector('.weekly-plan-controls button');status=root.querySelector('[role=status]');
    }else{
      weekInput=root.querySelector('#dietPlanWeek');daysRoot=root.querySelector('#dietPlanDays');generate=root.querySelector('#dietPlanGenerate');status=root.querySelector('#dietPlanStatus');generate.textContent='빈칸 추천';
    }
    const saveButton=document.createElement('button');saveButton.type='button';saveButton.className='diet-plan-server-save';saveButton.textContent=trainer?'식단표 완성·공유':'식단표 완성·저장';saveButton.hidden=!canWrite;generate.after(saveButton);
    let plan=null,loadToken=0,editRevision=0,foods=[];
    const key=week=>`pacefitWeeklyDietPlanV1:${owner()}:${week}`;
    const readLocal=week=>{try{const p=JSON.parse(localStorage.getItem(key(week))||'null');return valid(p)?normalize(p,week):null;}catch{return null;}};
    const foodKey=()=>`pacefitDietAvoidV1:${owner()}`;
    const readFoods=()=>{try{return cleaned(JSON.parse(localStorage.getItem(foodKey())||'[]'));}catch{return [];}};
    const saveFoods=()=>{try{localStorage.setItem(foodKey(),JSON.stringify(foods));return true;}catch{return false;}};
    const saveLocal=()=>{try{localStorage.setItem(key(plan.week),JSON.stringify(plan));return true;}catch{status.textContent='이 기기에 저장하지 못했습니다. 저장 공간을 확인해 주세요.';return false;}};
    function draw(){
      const week=weekInput.value;if(!plan||plan.week!==week)plan=readLocal(week)||blank(week);
      const target=!trainer?window.RefitDietJournal?.goalTargets?.():null;
      daysRoot.innerHTML=plan.days.map((day,i)=>{const fixed=day.planned.filter(Boolean).length,remaining=3-fixed,ordinary=Math.round((Number(target?.kcal)||0)/3),recommendKcal=remaining?Math.max(0,Math.round(((Number(target?.kcal)||0)-ordinary*fixed)/remaining)):0;return `<article class="diet-plan-day"><div class="diet-plan-day-head"><strong>${day.name}요일 <small>${day.date.slice(5)}</small></strong></div>${target?`<p class="diet-plan-help">하루 ${Math.round(target.kcal).toLocaleString()} kcal 참고 · ${fixed?`직접 정한 ${fixed}끼는 일반식 한 끼 약 ${ordinary.toLocaleString()} kcal로 가정 · `:''}추천 식사 한 끼당 약 ${recommendKcal.toLocaleString()} kcal 참고</p>`:''}<div class="diet-plan-meals">${labels.map((label,j)=>`<div class="diet-plan-meal"><label>${label}<input data-plan-meal="${i}:${j}" value="${esc(day.meals[j]||'')}" maxlength="120" placeholder="추천 또는 직접 입력" ${canWrite?'':'readonly'}></label><label class="diet-plan-fixed"><input type="checkbox" data-plan-fixed="${i}:${j}" ${day.planned[j]?'checked':''} ${canWrite?'':'disabled'}> 직접 정한 식사</label></div>`).join('')}</div></article>`}).join('');
      if(!trainer)status.textContent=target?`하루 참고 목표 ${target.kcal.toLocaleString()} kcal를 세 끼에 나눈 계획입니다. 직접 정한 식사는 일반식 한 끼로 가정합니다. 메뉴의 실제 분량과 열량은 계산되지 않으므로 섭취량은 식단 기록에서 확인해 주세요.`:'식단표는 참고 아이디어입니다. 실제 섭취량은 식단 기록에 남겨 주세요.';
    }
    async function loadServer(){
      const token=++loadToken,revision=editRevision,week=weekInput.value,s=session();plan=readLocal(week)||blank(week);draw();
      if(!s?.client||!s?.user||owner()==='local')return;
      const {data,error}=await s.client.from('diet_weekly_plans').select('days,updated_by').eq('member_id',owner()).eq('week_start',week).maybeSingle();
      if(token!==loadToken||weekInput.value!==week||revision!==editRevision)return;
      if(error){status.textContent=trainer?'공유 식단표를 불러오지 못했습니다. 권한과 서버 설정을 확인해 주세요.':'이 기기의 식단표를 표시합니다. 서버 조회는 현재 사용할 수 없습니다.';return;}
      if(data&&valid({days:data.days})){plan=normalize({days:data.days},week);draw();status.textContent=trainer?'공유 중인 식단표를 불러왔습니다.':`서버 식단표를 불러왔습니다. ${data.updated_by===s.user.id?'내가':'트레이너가'} 마지막으로 수정했어요.`;}
    }
    function recommend(){let missing=0;plan.days.forEach((day,i)=>day.meals.forEach((value,j)=>{if(day.planned[j]||(value.trim()&&!excluded(value,foods)))return;const options=[ideas[i][j],...alternatives[j],...ideas.map(row=>row[j])];const choice=options.find(meal=>!excluded(meal,foods));if(choice)day.meals[j]=choice;else{day.meals[j]='';missing++;}}));saveLocal();draw();return missing;}
    let foodPanel=null;
    function drawFoods(){if(!foodPanel)return;foodPanel.querySelector('.diet-avoid-options').innerHTML=foodOptions.map(food=>`<label><input type="checkbox" data-avoid-food="${esc(food)}" ${foods.includes(food)?'checked':''}> ${esc(food)}</label>`).join('');foodPanel.querySelector('.diet-avoid-selected').innerHTML=foods.map(food=>`<button type="button" data-remove-food="${esc(food)}" aria-label="${esc(food)} 제외 해제">${esc(food)} ×</button>`).join('');}
    async function loadFoods(){const who=owner(),s=session();foods=readFoods();drawFoods();if(!s?.client||!s?.user||who==='local')return;try{const {data,error}=await s.client.from('diet_preferences').select('excluded_foods').eq('user_id',who).maybeSingle();if(error)throw error;if(who===owner()&&data){foods=cleaned(data.excluded_foods);saveFoods();drawFoods();}}catch{/* 로컬 설정 유지 */}}
    if(!trainer){
      foodPanel=document.createElement('section');foodPanel.className='diet-avoid-panel';foodPanel.hidden=true;
      foodPanel.innerHTML='<div class="diet-avoid-head"><strong>못 먹는 음식 설정</strong><button type="button" data-close-food aria-label="닫기">×</button></div><p>추천에서 뺄 음식이나 재료를 검색해 선택하세요.</p><input type="search" class="diet-avoid-search" aria-label="못 먹는 음식 검색" placeholder="음식·재료 검색"><div class="diet-avoid-options"></div><div class="diet-avoid-custom"><input maxlength="40" aria-label="목록에 없는 음식" placeholder="목록에 없는 음식 입력"><button type="button" data-add-food>추가</button></div><div class="diet-avoid-selected"></div><p class="diet-avoid-warning">이름 기준 추천 보조 기능입니다. 알레르기가 있다면 실제 음식의 원재료와 교차 접촉 가능성을 직접 확인해 주세요.</p><p class="diet-avoid-save-status" role="status"></p><button type="button" data-save-food>설정 저장하고 식단표 보기</button>';
      root.prepend(foodPanel);
      const open=document.createElement('button');open.type='button';open.className='diet-avoid-open';open.textContent='못 먹는 음식 설정';root.querySelector('.diet-card-heading')?.append(open);open.addEventListener('click',()=>{foodPanel.hidden=false;drawFoods();foodPanel.scrollIntoView?.({block:'nearest'});});
      foodPanel.addEventListener('input',event=>{if(!event.target.matches('.diet-avoid-search'))return;const q=event.target.value.trim();foodPanel.querySelectorAll('.diet-avoid-options label').forEach(label=>{label.hidden=!!q&&!label.textContent.includes(q);});});
      foodPanel.addEventListener('change',event=>{const input=event.target.closest('[data-avoid-food]');if(!input)return;foods=cleaned(input.checked?[...foods,input.dataset.avoidFood]:foods.filter(x=>x!==input.dataset.avoidFood));drawFoods();});
      foodPanel.addEventListener('click',async event=>{const remove=event.target.closest('[data-remove-food]');if(remove){foods=foods.filter(x=>x!==remove.dataset.removeFood);drawFoods();return;}if(event.target.closest('[data-add-food]')){const input=foodPanel.querySelector('.diet-avoid-custom input');foods=cleaned([...foods,input.value]);input.value='';drawFoods();return;}if(event.target.closest('[data-close-food]')){foodPanel.hidden=true;return;}if(!event.target.closest('[data-save-food]'))return;
        if(!saveFoods()){foodPanel.querySelector('.diet-avoid-save-status').textContent='기기에 저장하지 못했습니다.';return;}
        let message='이 기기에 저장했습니다.';const s=session();if(s?.client&&s?.user){try{const {data}=await s.client.from('diet_consents').select('server_storage').eq('user_id',s.user.id).maybeSingle();if(data?.server_storage){const {error}=await s.client.from('diet_preferences').upsert({user_id:s.user.id,excluded_foods:foods,updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error)throw error;message='계정에도 저장했습니다.';}else message+=' 계정 동기화에는 식단 서버 저장 동의가 필요합니다.';}catch{message+=' 서버 동기화는 실패했습니다.';}}
        status.textContent=message+' 다음 추천부터 반영합니다.';foodPanel.hidden=true;
      });
      const firstOpen=()=>{if(document.body.dataset.view!=='diet')return;const key=`pacefitDietAvoidSeenV1:${owner()}`;if(localStorage.getItem(key))return;localStorage.setItem(key,'1');foodPanel.hidden=false;drawFoods();};
      window.addEventListener('pacefit:view-changed',firstOpen);window.addEventListener('refit:session-ready',()=>{loadFoods();firstOpen();});setTimeout(firstOpen,0);
    }
    weekInput.value=monday(localDate(new Date()));foods=readFoods();draw();loadFoods();loadServer();
    weekInput.addEventListener('change',()=>{weekInput.value=monday(weekInput.value)||monday(localDate(new Date()));loadServer();});
    daysRoot.addEventListener('change',event=>{const input=event.target.closest('[data-plan-fixed]');if(!input||!canWrite)return;editRevision++;const [day,meal]=input.dataset.planFixed.split(':').map(Number);plan.days[day].planned[meal]=input.checked;saveLocal();status.textContent='직접 정한 식사는 추천할 때 유지합니다.';});
    daysRoot.addEventListener('input',event=>{const input=event.target.closest('[data-plan-meal]');if(!input||!canWrite)return;editRevision++;const [day,meal]=input.dataset.planMeal.split(':').map(Number);plan.days[day].meals[meal]=input.value;plan.days[day].planned[meal]=!!input.value.trim();input.closest('.diet-plan-meal').querySelector('[data-plan-fixed]').checked=plan.days[day].planned[meal];saveLocal();status.textContent='직접 적은 식사는 유지됩니다. 완성 버튼을 눌러 저장해 주세요.';});
    generate.addEventListener('click',()=>{if(!canWrite)return;editRevision++;const missing=recommend();status.textContent=missing?`${missing}개 칸은 제외 조건에 맞는 추천이 없습니다. 직접 입력해 주세요.`:'직접 정한 식사를 유지하고 빈칸만 추천했습니다. 확인 후 완성·저장해 주세요.';});
    saveButton.addEventListener('click',async()=>{
      if(!canWrite)return;const missing=recommend();if(missing||plan.days.some(day=>day.meals.some(meal=>!meal.trim()))){status.textContent='빈 식사 칸을 직접 채운 뒤 완성해 주세요.';return;}if(plan.days.some(day=>day.meals.some((meal,j)=>day.planned[j]&&excluded(meal,foods)))){status.textContent='직접 입력한 식사에 제외한 음식이 포함되어 있습니다. 확인·수정한 뒤 완성해 주세요.';return;}
      const s=session();if(!s?.client||!s?.user){status.textContent=saveLocal()?'이 기기에 식단표를 완성·저장했습니다.':'저장하지 못했습니다.';return;}
      saveButton.disabled=true;status.textContent='식단표를 서버에 저장하는 중…';
      try{
        if(!trainer){const {data,error}=await s.client.from('diet_consents').select('server_storage').eq('user_id',s.user.id).maybeSingle();if(error)throw error;if(!data?.server_storage){status.textContent=saveLocal()?'이 기기에 식단표를 완성·저장했습니다. 계정 저장은 식단 서버 저장 동의가 필요합니다.':'저장하지 못했습니다.';return;}}
        const {error}=await s.client.from('diet_weekly_plans').upsert({member_id:owner(),week_start:plan.week,days:plan.days,updated_by:s.user.id,updated_at:new Date().toISOString()},{onConflict:'member_id,week_start'});
        if(error)throw error;saveLocal();status.textContent=trainer?'회원에게 완성된 식단표를 공유했습니다.':'식단표를 완성해 계정에 저장했습니다. 공유 동의가 켜져 있으면 트레이너도 볼 수 있습니다.';
      }catch(error){status.textContent=`서버 저장 실패: ${String(error?.message||'권한 또는 연결 오류').slice(0,140)}`;}finally{saveButton.disabled=false;}
    });
    if(!trainer){window.addEventListener('refit:session-ready',loadServer);window.addEventListener('refit:session-ended',loadServer);}
    return {reload:loadServer};
  }
  window.PacefitDietPlan={mountTrainer:(root,memberId,canWrite)=>mount(root,{memberId,canWrite})};
  mount(document.getElementById('weeklyDietPlan'));
})();

