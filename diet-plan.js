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
  const blank=week=>({week,days:names.map((name,i)=>({name,date:dateAt(week,i),flexible:false,meals:['','','']}))});
  const valid=p=>p&&Array.isArray(p.days)&&p.days.length===7&&p.days.every(d=>Array.isArray(d.meals)&&d.meals.length===3);
  function mount(root,{memberId=null,canWrite=true}={}){
    if(!root)return;
    const trainer=!!memberId, owner=()=>memberId||session()?.user?.id||'local';
    let weekInput,daysRoot,generate,status;
    if(trainer){
      root.classList.add('weekly-diet-plan');
      root.innerHTML='<h3>회원 주간 식단표</h3><p>회원과 공유할 식사 아이디어입니다. 약속 있는 날은 비워 두세요.</p><div class="weekly-plan-controls"><input type="date" aria-label="식단표 시작 주"><button type="button">주간 식단 추천</button></div><div class="diet-plan-days"></div><p class="diet-plan-help" role="status"></p>';
      weekInput=root.querySelector('input[type=date]');daysRoot=root.querySelector('.diet-plan-days');generate=root.querySelector('.weekly-plan-controls button');status=root.querySelector('[role=status]');
    }else{
      weekInput=root.querySelector('#dietPlanWeek');daysRoot=root.querySelector('#dietPlanDays');generate=root.querySelector('#dietPlanGenerate');status=root.querySelector('#dietPlanStatus');
    }
    const saveButton=document.createElement('button');saveButton.type='button';saveButton.className='diet-plan-server-save';saveButton.textContent=trainer?'회원에게 식단표 공유':'식단표 서버 저장';saveButton.hidden=!canWrite;generate.after(saveButton);
    let plan=null,loadToken=0,editRevision=0;
    const key=week=>`pacefitWeeklyDietPlanV1:${owner()}:${week}`;
    const readLocal=week=>{try{const p=JSON.parse(localStorage.getItem(key(week))||'null');return valid(p)?p:null;}catch{return null;}};
    const saveLocal=()=>{try{localStorage.setItem(key(plan.week),JSON.stringify(plan));return true;}catch{status.textContent='이 기기에 저장하지 못했습니다. 저장 공간을 확인해 주세요.';return false;}};
    function draw(){
      const week=weekInput.value;if(!plan||plan.week!==week)plan=readLocal(week)||blank(week);
      daysRoot.innerHTML=plan.days.map((day,i)=>`<article class="diet-plan-day${day.flexible?' is-flexible':''}"><div class="diet-plan-day-head"><strong>${day.name}요일 <small>${day.date.slice(5)}</small></strong><label><input type="checkbox" data-plan-flex="${i}" ${day.flexible?'checked':''} ${canWrite?'':'disabled'}> 유연한 식사·약속</label></div>${day.flexible?'<p>추천을 비워둡니다. 실제 식사는 별도로 기록할 수 있어요.</p>':`<div class="diet-plan-meals">${labels.map((label,j)=>`<label>${label}<input data-plan-meal="${i}:${j}" value="${esc(day.meals[j]||'')}" maxlength="120" placeholder="식사 아이디어" ${canWrite?'':'readonly'}></label>`).join('')}</div>`}</article>`).join('');
      if(!trainer){const target=window.RefitDietJournal?.goalTargets?.();status.textContent=target?`${target.goal==='loss'?'감량':target.goal==='gain'?'증량':'유지'} 참고 목표 ${target.kcal.toLocaleString()}kcal/일. 식단표는 음식 아이디어이며 분량·영양 합계를 계산하지 않습니다.`:'식단표는 참고 아이디어입니다. 실제 섭취량은 식단 기록에 남겨 주세요.';}
    }
    async function loadServer(){
      const token=++loadToken,revision=editRevision,week=weekInput.value,s=session();plan=readLocal(week)||blank(week);draw();
      if(!s?.client||!s?.user||owner()==='local')return;
      const {data,error}=await s.client.from('diet_weekly_plans').select('days,updated_by').eq('member_id',owner()).eq('week_start',week).maybeSingle();
      if(token!==loadToken||weekInput.value!==week||revision!==editRevision)return;
      if(error){status.textContent=trainer?'공유 식단표를 불러오지 못했습니다. 권한과 서버 설정을 확인해 주세요.':'이 기기의 식단표를 표시합니다. 서버 조회는 현재 사용할 수 없습니다.';return;}
      if(data&&valid({days:data.days})){plan={week,days:data.days};draw();status.textContent=trainer?'공유 중인 식단표를 불러왔습니다.':`서버 식단표를 불러왔습니다. ${data.updated_by===s.user.id?'내가':'트레이너가'} 마지막으로 수정했어요.`;}
    }
    weekInput.value=monday(localDate(new Date()));draw();loadServer();
    weekInput.addEventListener('change',()=>{weekInput.value=monday(weekInput.value)||monday(localDate(new Date()));loadServer();});
    daysRoot.addEventListener('change',event=>{const input=event.target.closest('[data-plan-flex]');if(!input||!canWrite)return;editRevision++;plan.days[Number(input.dataset.planFlex)].flexible=input.checked;saveLocal();draw();status.textContent='이 기기에 임시 저장됐습니다. 공유하려면 서버 저장을 눌러 주세요.';});
    daysRoot.addEventListener('input',event=>{const input=event.target.closest('[data-plan-meal]');if(!input||!canWrite)return;editRevision++;const [day,meal]=input.dataset.planMeal.split(':').map(Number);plan.days[day].meals[meal]=input.value;saveLocal();status.textContent='이 기기에 임시 저장됐습니다. 공유하려면 서버 저장을 눌러 주세요.';});
    generate.addEventListener('click',()=>{if(!canWrite)return;editRevision++;plan.days.forEach((day,i)=>{if(!day.flexible)day.meals=[...ideas[i]];});saveLocal();draw();status.textContent='약속 있는 날은 비웠습니다. 다른 날에 식사 제한을 더하지 않았어요. 확인 후 서버에 저장해 주세요.';});
    saveButton.addEventListener('click',async()=>{
      const s=session();if(!s?.client||!s?.user){status.textContent='로그인해야 서버에 저장할 수 있습니다.';return;}
      saveButton.disabled=true;status.textContent='식단표를 서버에 저장하는 중…';
      try{
        if(!trainer){const {data,error}=await s.client.from('diet_consents').select('server_storage').eq('user_id',s.user.id).maybeSingle();if(error)throw error;if(!data?.server_storage){status.textContent='서버 저장 동의를 켠 뒤 저장할 수 있습니다.';return;}}
        const {error}=await s.client.from('diet_weekly_plans').upsert({member_id:owner(),week_start:plan.week,days:plan.days,updated_by:s.user.id,updated_at:new Date().toISOString()},{onConflict:'member_id,week_start'});
        if(error)throw error;saveLocal();status.textContent=trainer?'회원에게 식단표를 공유했습니다.':'서버에 저장했습니다. 식단 공유 동의가 켜져 있으면 트레이너도 볼 수 있습니다.';
      }catch(error){status.textContent=`서버 저장 실패: ${String(error?.message||'권한 또는 연결 오류').slice(0,140)}`;}finally{saveButton.disabled=false;}
    });
    if(!trainer){window.addEventListener('refit:session-ready',loadServer);window.addEventListener('refit:session-ended',loadServer);}
    return {reload:loadServer};
  }
  window.PacefitDietPlan={mountTrainer:(root,memberId,canWrite)=>mount(root,{memberId,canWrite})};
  mount(document.getElementById('weeklyDietPlan'));
})();

