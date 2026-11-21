/* Shared reference estimates, not a medical prescription. No automatic trend correction. */
((root)=>{
  'use strict';
  const number=(v,min,max)=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))&&Number(v)>=min&&Number(v)<=max?Number(v):null;
  const validDate=d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'')&&Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
  function targets(profile={},mode,history=[],options={}){
    const today=options.today||new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const rows=(Array.isArray(history)?history:[]).filter(r=>r&&validDate(r.date)&&r.date<=today).slice().sort((a,b)=>b.date.localeCompare(a.date)||String(b.recordedAt||'').localeCompare(String(a.recordedAt||'')));
    const selected={};for(const [key,min,max] of [['weight',20,300],['bmr',500,4000]]){const row=rows.find(r=>number(r[key],min,max)!==null);selected[key]={value:row?number(row[key],min,max):number(profile[key],min,max),date:row?.date||null};}
    const weight=selected.weight.value,bmr=selected.bmr.value;if(weight===null||bmr===null)return null;
    if(!['loss','maintain','gain'].includes(mode))mode=/감량|체중 줄|살 빼/.test(profile.goalOther||profile.goal||'')?'loss':/증량|근육 증가/.test(profile.goalOther||profile.goal||'')?'gain':'maintain';
    const days=number(profile.days,1,7)??2,factor=Math.min(1.6,1.4+days*.04),maintenance=Math.round(bmr*factor/50)*50;
    const kcal=mode==='loss'?Math.max(1000,maintenance-300):mode==='gain'?maintenance+250:maintenance;
    const protein=Math.round(weight*1.2),fat=Math.round(kcal*.30/9),carbs=Math.max(0,Math.round((kcal-protein*4-fat*9)/4));
    const unique=[...new Map(rows.filter(r=>number(r.weight,20,300)!==null).map(r=>[r.date,r]).reverse()).values()].sort((a,b)=>b.date.localeCompare(a.date));
    const latest=unique[0],older=latest&&unique.find(r=>(Date.parse(latest.date)-Date.parse(r.date))/86400000>=14);
    const trend=older&&unique.length>=3?{from:older.date,to:latest.date,measurements:unique.filter(r=>r.date>=older.date).length,changeKg:Math.round((Number(latest.weight)-Number(older.weight))*10)/10,message:`${older.date}~${latest.date} 입력 체중 ${Math.round((Number(latest.weight)-Number(older.weight))*10)/10}kg 변화. 측정 조건·식사 기록을 함께 확인하고 목표를 재검토하세요. 추세로 칼로리를 자동 변경하지 않습니다.`}:null;
    return {kcal,protein,fat,carbs,mode,goal:mode,label:{loss:'감량',maintain:'유지',gain:'증량'}[mode],weight,bmr,trend,sourceDates:{weight:selected.weight.date,bmr:selected.bmr.date},reason:`체중 ${weight}kg (${selected.weight.date||'프로필'}) · 기초대사량 ${bmr}kcal (${selected.bmr.date||'프로필'}) 반영. 활동량은 주간 운동 목표로 추정하며 체중 추세에 따른 자동 증감은 하지 않습니다.`,estimated:true};
  }
  function sumFoods(items=[]){const result={};for(const key of ['kcal','protein','carbs','fat']){const values=items.map(i=>{const grams=number(i.grams,1,5000),value=number(i.food?.[key],0,10000);return grams===null||value===null?null:grams*value/100;});result[key]=values.length&&values.every(v=>v!==null)?values.reduce((a,b)=>a+b,0):null;}return result;}
  function allocateDay(day,target){
    const kcal=number(target,1,20000),next=JSON.parse(JSON.stringify(day));if(kcal===null)return {day:next,changed:false,message:'목표 열량을 먼저 설정해 주세요.'};
    const sums=[0,1,2].map(j=>sumFoods(next.foods?.[j]||[]));
    const adjustable=[0,1,2].filter(j=>!next.planned?.[j]&&sums[j].kcal>0);
    if(!adjustable.length)return {day:next,changed:false,message:'DB 음식·분량을 먼저 추가하고 조정할 끼니의 직접 정한 식사 체크를 해제해 주세요.'};
    let assumed=0,reserved=0;
    for(let j=0;j<3;j++)if(!adjustable.includes(j)){if(sums[j].kcal!==null)reserved+=sums[j].kcal;else{reserved+=kcal/3;assumed++;}}
    const remaining=kcal-reserved;if(remaining<=0)return {day:next,changed:false,message:'고정·미확인 끼니 참고량이 목표 이상입니다. 고정 식사를 유지했으며 다른 끼니를 자동 축소하지 않았습니다.'};
    let limited=false;for(const j of adjustable){const factor=remaining/adjustable.length/sums[j].kcal,bounded=Math.max(.5,Math.min(2,factor));if(factor!==bounded)limited=true;next.foods[j]=next.foods[j].map(item=>({...item,grams:Math.max(1,Math.min(5000,Math.round(item.grams*bounded)))}));}
    const actual=reserved+adjustable.reduce((n,j)=>n+sumFoods(next.foods[j]).kcal,0),difference=Math.round(kcal-actual);
    return {day:next,changed:true,message:`고정 식사는 유지하고 DB 분량을 조정했습니다. ${assumed?`미확인 ${assumed}끼는 일반식 1/3 가정. `:''}${limited?'변경 배율을 0.5~2배로 제한했습니다. ':''}목표와 ${Math.abs(difference)} kcal ${difference>=0?'부족':'초과'}(가정 포함). 영양소 누락·제외 음식과 분량을 확인한 뒤 완성·저장해 주세요.`,difference,assumed,limited};
  }
  const api={targets,sumFoods,allocateDay};root.PacefitNutrition=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
