/* Calendar periods use Korean dates, Monday weeks and actual calendar months. */
((root) => {
  'use strict';
  const day = date => { const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).map(part=>[part.type,part.value])); return `${parts.year}-${parts.month}-${parts.day}`; };
  function valid(value) {
    return typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value+'T00:00:00Z')) && new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
  }
  const iso = date => date.toISOString().slice(0,10);
  function bounds(mode, anchor) {
    if(!['all','day','week','month'].includes(mode)||!valid(anchor))throw Error('조회 기간과 기준 날짜를 확인해주세요.');
    if(mode==='all')return {start:'0001-01-01',end:'9999-12-31',label:'전체 기간'};
    const start=new Date(anchor+'T00:00:00Z'),end=new Date(start);
    if(mode==='week'){start.setUTCDate(start.getUTCDate()-(start.getUTCDay()+6)%7);end.setTime(start.getTime());end.setUTCDate(end.getUTCDate()+6);}
    if(mode==='month'){start.setUTCDate(1);end.setUTCMonth(end.getUTCMonth()+1,0);}
    return {start:iso(start),end:iso(end),label:mode==='day'?anchor:`${iso(start)} ~ ${iso(end)}`};
  }
  function select(rows,mode,anchor,key='date') {
    const {start,end}=bounds(mode,anchor);
    return (Array.isArray(rows)?rows:[]).filter(row=>valid(row?.[key])&&row[key]>=start&&row[key]<=end);
  }
  function move(mode,anchor,step) {
    bounds(mode,anchor);
    if(mode==='all')return anchor;
    const date=new Date(anchor+'T00:00:00Z');
    if(mode==='month'){const n=date.getUTCDate();date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+step);const last=new Date(date);last.setUTCMonth(last.getUTCMonth()+1,0);date.setUTCDate(Math.min(n,last.getUTCDate()));}
    else date.setUTCDate(date.getUTCDate()+step*(mode==='week'?7:1));
    return iso(date);
  }
  function controls(state) {
    const period=bounds(state.mode,state.anchor);
    const nav=state.mode==='all'?'':`<button type="button" data-period-step="-1" aria-label="이전 기간">‹</button><label>기준일 <input type="date" value="${state.anchor}" data-period-date required></label><button type="button" data-period-step="1" aria-label="다음 기간">›</button>`;
    return `<div class="pf-period" role="group" aria-label="기록 조회 기간">${[['all','전체'],['day','일별'],['week','주별'],['month','월별']].map(([mode,label])=>`<button type="button" data-period="${mode}" aria-pressed="${state.mode===mode}">${label}</button>`).join('')}${nav}<span role="status">${period.label}</span></div>`;
  }
  function mount(host,state,onChange) {
    host.innerHTML=controls(state);
    host.onclick=event=>{const btn=event.target.closest('button');if(!btn)return;let focus;
      if(btn.dataset.period){state.mode=btn.dataset.period;focus=`[data-period="${state.mode}"]`;}
      else if(btn.dataset.periodStep){state.anchor=move(state.mode,state.anchor,Number(btn.dataset.periodStep));focus=`[data-period-step="${btn.dataset.periodStep}"]`;}
      else return;
      mount(host,state,onChange);host.querySelector(focus)?.focus();onChange();
    };
    host.onchange=event=>{if(!event.target.matches('[data-period-date]'))return;if(!valid(event.target.value)){event.target.value=state.anchor;return;}state.anchor=event.target.value;mount(host,state,onChange);host.querySelector('input')?.focus();onChange();};
  }
  const api={day,valid,bounds,select,move,controls,mount};root.PacefitRecordPeriod=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
