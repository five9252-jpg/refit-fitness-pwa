(() => {
  'use strict';
  const weekInput=document.getElementById('dietPlanWeek'),daysRoot=document.getElementById('dietPlanDays'),button=document.getElementById('dietPlanGenerate'),status=document.getElementById('dietPlanStatus');
  if(!weekInput||!daysRoot||!button||!status)return;
  const names=['월','화','수','목','금','토','일'];
  const ideas=[
    ['오트밀·우유·바나나','현미밥·닭고기·채소','두부·잡곡밥·나물'],
    ['달걀·통밀빵·과일','보리밥·생선·채소','소고기·밥·샐러드'],
    ['요거트·견과·과일','잡곡밥·두부·김치·채소','닭고기·밥·구운 채소'],
    ['달걀·밥·과일','현미밥·콩류·채소','생선·밥·나물'],
    ['오트밀·요거트·과일','밥·돼지고기·채소','두부·달걀·샐러드'],
    ['통밀빵·달걀·우유','잡곡밥·생선·채소','닭고기·밥·나물'],
    ['밥·달걀·과일','현미밥·소고기·채소','콩류·밥·구운 채소']
  ];
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const localDate=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const monday=value=>{const date=new Date(`${value}T12:00:00`);if(Number.isNaN(date.getTime()))return null;date.setDate(date.getDate()-(date.getDay()+6)%7);return localDate(date);};
  const dateAt=(week,index)=>{const date=new Date(`${week}T12:00:00`);date.setDate(date.getDate()+index);return localDate(date);};
  const owner=()=>window.RefitAccountSession?.user?.id||'local';
  const key=week=>`pacefitWeeklyDietPlanV1:${owner()}:${week}`;
  let plan=null;
  function read(week){try{const data=JSON.parse(localStorage.getItem(key(week))||'null');return data?.days?.length===7?data:null;}catch{return null;}}
  function save(){if(!plan)return;localStorage.setItem(key(plan.week),JSON.stringify(plan));status.textContent='이번 주 식단표를 이 기기에 저장했습니다. 기록은 실제 먹은 음식으로 따로 남겨 주세요.';}
  function render(){
    const week=weekInput.value;
    if(!plan||plan.week!==week)plan=read(week)||{week,days:names.map((name,index)=>({name,date:dateAt(week,index),flexible:false,meals:['','','']}))};
    daysRoot.innerHTML=plan.days.map((day,index)=>`<article class="diet-plan-day${day.flexible?' is-flexible':''}" data-plan-day="${index}"><div class="diet-plan-day-head"><strong>${day.name}요일 <small>${day.date.slice(5)}</small></strong><label><input type="checkbox" data-plan-flex="${index}" ${day.flexible?'checked':''}> 유연한 식사·약속</label></div>${day.flexible?'<p>이날은 식단 추천을 비워둡니다. 실제 식사는 평소처럼 기록할 수 있어요.</p>':`<div class="diet-plan-meals">${['아침','점심','저녁'].map((meal,mealIndex)=>`<label>${meal}<input data-plan-meal="${index}:${mealIndex}" value="${escape(day.meals[mealIndex]||'')}" maxlength="120" placeholder="추천 후 수정 가능"></label>`).join('')}</div>`}</article>`).join('');
    const target=window.RefitDietJournal?.goalTargets?.();
    status.textContent=target?`현재 ${target.goal==='loss'?'감량':target.goal==='gain'?'증량':'유지'} 참고 목표 ${target.kcal.toLocaleString()}kcal/일. 식단표는 음식 아이디어이며 실제 분량과 영양 합계를 계산하지 않습니다.`:'식단표는 음식 아이디어입니다. 프로필에 체중·기초대사량을 입력하면 참고 목표가 함께 보입니다.';
  }
  weekInput.value=monday(localDate(new Date()));render();
  weekInput.addEventListener('change',()=>{weekInput.value=monday(weekInput.value)||monday(localDate(new Date()));plan=null;render();});
  daysRoot.addEventListener('change',event=>{const flex=event.target.closest('[data-plan-flex]');if(flex){plan.days[Number(flex.dataset.planFlex)].flexible=flex.checked;save();render();}});
  daysRoot.addEventListener('input',event=>{const meal=event.target.closest('[data-plan-meal]');if(!meal)return;const [day,index]=meal.dataset.planMeal.split(':').map(Number);plan.days[day].meals[index]=meal.value;save();});
  button.addEventListener('click',()=>{if(!plan)render();plan.days.forEach((day,index)=>{if(!day.flexible)day.meals=[...ideas[index]];});save();render();status.textContent='약속 있는 날은 비워두고 주간 식사 아이디어를 만들었습니다. 각 칸을 눌러 직접 바꿀 수 있어요. 실제 섭취량은 식단 기록에 입력해 주세요.';});
  window.addEventListener('refit:session-ready',()=>{plan=null;render();});
  window.addEventListener('refit:session-ended',()=>{plan=null;render();});
})();
