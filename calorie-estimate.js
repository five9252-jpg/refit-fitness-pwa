(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const state = () => window.RefitAccountBridge?.getState();
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const metByCardio = Object.freeze({
    '걷기':3.8, '러닝':7.5, '실내 자전거':5.8, '일립티컬':5.0,
    '계단 오르기':6.8, '로잉 머신':5.0, '줄넘기':11.0
  });
  const style = document.createElement('style');
  style.textContent = `
    .strength-duration{margin:14px 0;padding:15px 17px;border:1px solid #dce8da;border-radius:16px;background:#f8faf6}.strength-duration label{display:block;color:#164449;font-size:12px;font-weight:800}.strength-duration input{display:block;width:130px;max-width:100%;margin-top:7px;padding:10px;border:1px solid #dbe4d9;border-radius:9px;background:white;color:#193A3E;font:inherit}.strength-duration small{display:block;margin-top:7px;color:#657768;font-size:11px;line-height:1.4}
    .calorie-result{margin:15px 0 0;padding:15px 17px;border:1px solid #dce9d8;border-radius:14px;background:#eff7ed}.calorie-result strong{display:block;color:#244c30;font-size:17px}.calorie-result p{margin:6px 0 0;color:#617465;font-size:11px;line-height:1.5}.calorie-result[hidden]{display:none}
    .calorie-log-row{margin-top:9px;padding-top:9px;border-top:1px solid #e1e9de;color:#07535A;font-size:12px;font-weight:800}.calorie-log-row small{display:block;margin-top:3px;color:#748477;font-size:10px;font-weight:500}
  `;
  document.head.append(style);
  $('.cardio-add').insertAdjacentHTML('beforebegin', `<div class="strength-duration"><label for="strengthMinutes">근력 운동 시간 (선택, 분)<input id="strengthMinutes" type="number" min="1" max="300" step="1" inputmode="numeric" placeholder="예: 40"></label><small>쉬는 시간을 포함한 근력 운동 전체 시간을 적어주세요. 칼로리 추정에는 체중과 운동 시간이 필요해요.</small></div>`);
  $('#workoutCard .save-row').insertAdjacentHTML('afterend', `<div class="calorie-result" id="calorieResult" role="status" hidden></div>`);

  function estimate({weightKg,strengthMinutes,cardio,effort}) {
    const weight=Number(weightKg);
    if (!Number.isFinite(weight) || weight<20 || weight>300) return null;
    const strengthMet=String(effort).includes('힘들')?6.0:3.5;
    const strength=Number.isInteger(strengthMinutes)&&strengthMinutes>0?strengthMinutes*strengthMet*3.5*weight/200:0;
    const cardioMet=cardio?metByCardio[cardio.type]||null:null;
    const aerobic=cardioMet&&Number.isInteger(cardio.minutes)?cardio.minutes*cardioMet*3.5*weight/200:0;
    if (!strength && !aerobic) return null;
    return {kcal:Math.round((strength+aerobic)/5)*5,strengthKcal:Math.round(strength/5)*5,cardioKcal:Math.round(aerobic/5)*5,weightKg:weight,strengthMinutes:strengthMinutes||null,cardioMinutes:cardio?.minutes||null,strengthMet:strength?strengthMet:null,cardioMet:cardioMet||null,method:'2024-compendium-standard-met'};
  }
  window.PacefitCalories = {
    estimate,
    readDuration() {
      const input=$('#strengthMinutes'), raw=input.value.trim();
      if (!raw) return {minutes:null,error:null};
      const minutes=Number(raw);
      if (!Number.isInteger(minutes)||minutes<1||minutes>300) {input.focus();return {minutes:null,error:'근력 운동 시간은 1~300분으로 입력해주세요.'};}
      return {minutes,error:null};
    },
    afterSave(log) {
      const result=$('#calorieResult');
      const unknownCardio=log.cardio?.type==='기타';
      if (log.calorieEstimate) result.innerHTML=`<strong>이번 운동 약 ${escape(log.calorieEstimate.kcal)} kcal</strong><p>체중 ${escape(log.calorieEstimate.weightKg)}kg과 입력한 운동 시간을 기준으로 계산한 대략치예요.${unknownCardio?' 종류가 정해지지 않은 유산소는 제외했어요.':''} 실제 소모량은 다를 수 있습니다. <a href="./docs/운동-칼로리-추정-근거.md" target="_blank" rel="noopener">계산 기준 보기</a></p>`;
      else result.innerHTML=`<strong>칼로리 추정에 필요한 정보가 부족해요</strong><p>${unknownCardio?'유산소 종류가 “기타”라면 활동 유형을 선택해야 계산할 수 있어요. ':'프로필에 체중을 입력하고, 근력 운동 시간 또는 유산소 시간을 기록하면 다음 운동부터 표시됩니다.'}</p>`;
      result.hidden=false;
      $('#strengthMinutes').value='';
    }
  };

  const oldRenderProfile=window.renderProfile;
  window.renderProfile=function(){
    oldRenderProfile();
    const profile=state()?.profile;
    if (!profile) return;
    const details=$('#profileDisclosureMeta');
    details.insertAdjacentHTML('beforeend', `${profile.sex?`<div>성별: ${escape(profile.sex)}</div>`:''}${profile.bmr?`<div>기초대사량: ${escape(profile.bmr)} kcal/일</div>`:''}`);
  };
  const oldRenderLogs=window.renderLogs;
  window.renderLogs=function(){
    oldRenderLogs();
    const rows=state()?.logs||[];
    document.querySelectorAll('#logList .log-item[data-log-id], #calendarDayLogs .log-item[data-log-id]').forEach(root=>{
      const log=rows.find(row=>row.id&&row.id===root.dataset.logId);
      if (!log?.calorieEstimate?.kcal) return;
      const content=`<div class="calorie-log-row">예상 운동 소모량 약 ${escape(log.calorieEstimate.kcal)} kcal<small>기록 당시 체중·시간과 활동 유형으로 추정</small></div>`;
      const detail=root.querySelector('.log-details');
      if(detail)detail.insertAdjacentHTML('beforeend',content);
      if(root.closest('#logList')){const sub=root.querySelector('.log-sub');if(sub)sub.textContent+=` · 약 ${log.calorieEstimate.kcal}kcal`;}
    });
  };
  window.renderProfile();
  window.renderLogs();
})();
