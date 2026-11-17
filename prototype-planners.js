/* Preparation logic only: no auth, network, storage, timers, notifications or live surveys. */
((root)=>{
  'use strict';
  const P=typeof module!=='undefined'?require('./record-period.js'):root.PacefitRecordPeriod;
  const I=typeof module!=='undefined'?require('./member-insights.js'):root.PacefitMemberInsights;
  const DAY=86400000;
  const offset=(date,n)=>P.move('day',date,n);
  const days=(a,b)=>(Date.parse(a+'T00:00:00Z')-Date.parse(b+'T00:00:00Z'))/DAY;
  const clock=value=>typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value)?Number(value.slice(0,2))*60+Number(value.slice(3)):null;
  const normalize=value=>String(value||'').normalize('NFKC').trim().toLocaleLowerCase('ko');
  function matchMember(name,members) {
    const key=normalize(name);
    if(!key)return [];
    return members.filter(member=>member.status==='active'&&[member.name,member.alias].some(value=>normalize(value)===key)).map(member=>member.id);
  }
  function scheduleReview(input,members,existing=[]) {
    const allowed=members.filter(row=>row.status==='active');
    const reviewed=[];
    for(const [index,raw] of input.entries()) {
      const candidates=matchMember(raw.name,allowed),memberId=String(raw.memberId||'');
      const row={index,memberId:memberId|| (candidates.length===1?candidates[0]:''),date:raw.date,start:raw.start,end:raw.end,place:String(raw.place||'').trim().slice(0,120)};
      const errors=[];
      if(!allowed.some(member=>member.id===row.memberId))errors.push(candidates.length>1?'동명이인·별명 중복: 회원을 선택해주세요.':'연결 회원을 선택해주세요.');
      if(!P.valid(row.date))errors.push('유효한 날짜를 입력해주세요.');
      const a=clock(row.start),b=clock(row.end);
      if(a===null||b===null||b<=a)errors.push('종료 시간은 같은 날 시작 시간 뒤여야 합니다.');
      const valid=!errors.length;
      const previous=[...existing.filter(r=>r.status!=='cancelled'),...reviewed.filter(r=>r.valid).map(r=>r.row)];
      const duplicate=valid&&previous.some(r=>r.memberId===row.memberId&&r.date===row.date&&r.start===row.start&&r.end===row.end);
      const conflict=valid&&previous.some(r=>r.date===row.date&&clock(r.start)!==null&&clock(r.end)!==null&&a<clock(r.end)&&b>clock(r.start));
      reviewed.push({row,candidates,valid,duplicate,conflict,errors,ready:valid&&!duplicate&&!conflict&&raw.confirmed===true});
    }
    return reviewed;
  }
  function surveyDue({start,end,today,completed=[],snoozedUntil=null}) {
    if(!P.valid(start)||!P.valid(end)||!P.valid(today)||end<start||today<start||today>end||snoozedUntil&&today<snoozedUntil)return null;
    const stages=[{id:'first',date:start},{id:'day3',date:offset(start,2)}];
    for(let i=7;offset(start,i)<end;i+=7)stages.push({id:'week-'+i/7,date:offset(start,i)});
    stages.push({id:'end',date:end});
    // At a collision show one latest stage. End wins; older missed stages do not interrupt later work.
    const eligible=stages.filter(row=>row.date<=today&&row.date<=end).sort((a,b)=>b.date.localeCompare(a.date)||(a.id==='end'?-1:b.id==='end'?1:0));
    const latest=eligible[0];
    return latest&&!completed.includes(latest.id)?latest:null;
  }
  const copy={
    3:['최근 운동은 어떠셨나요? 😊','운동하셨다면 살짝 기록해두세요. 다음 운동을 준비할 때 도움이 될 거예요.','기록 남기기'],
    7:['이번 주에도 내 속도로 🌿','가볍게 몸을 움직여볼까요? 지난 기록을 보며 오늘 할 수 있는 운동을 골라보세요.','내 운동 보기'],
    14:['잠시 쉬어가도 괜찮아요 🙂','다시 움직이고 싶은 날, 부담 없이 들러주세요. 가벼운 운동부터 함께해요.','내 운동 보기'],
    30:['오늘은 작은 시작 어때요? ✨','예전만큼 해야 한다는 부담은 내려놓아요. 오늘 할 수 있는 만큼이면 충분해요.','내 운동 보기'],
    90:['오랜만이에요, 반가워요 👋','운동이 생각나는 날, PACEFIT에 들러주세요. 천천히 다시 시작해봐요.','내 운동 보기']
  };
  function reminderCandidate({ownerId,logs,now,serverConsent,readStatus,preferences,sent=[]}) {
    if(!ownerId||serverConsent!==true||readStatus!=='ok'||preferences?.enabled!==true||!Array.isArray(preferences.days)||!Array.isArray(logs))return null;
    const date=new Date(now);if(!Number.isFinite(date.getTime()))return null;
    const today=P.day(date),hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',hourCycle:'h23'}).format(date));
    if(hour<9||hour>=20)return null;
    const latest=logs.filter(log=>log&&log.id&&P.valid(log.date)&&log.date<=today&&(I.totals(log).sets>0||typeof log.cardio?.type==='string'&&Number(log.cardio.minutes)>0&&Number(log.cardio.minutes)<=1440)).sort((a,b)=>b.date.localeCompare(a.date)||String(b.loggedAt||'').localeCompare(String(a.loggedAt||''))||String(b.id).localeCompare(String(a.id)))[0];
    if(!latest)return null; // No-record accounts need an explicitly agreed baseline.
    const elapsed=days(today,latest.date),threshold=[3,7,14,30,90].filter(n=>preferences.days.includes(n)&&elapsed>=n).pop();
    if(!threshold)return null;
    const key=JSON.stringify([ownerId,latest.id,latest.date,latest.loggedAt||null,threshold]);
    if(sent.includes(key))return null;
    return {key,threshold,title:copy[threshold][0],body:copy[threshold][1],button:copy[threshold][2],baselineDate:latest.date};
  }
  function groupResponses(responses,assignments={}) {
    const groups=new Map();
    for(const response of responses) {
      if(!['member','trainer'].includes(response.role)||!response.id)continue;
      // Manual group IDs, never semantic guessing or destructive normalization of originals.
      const group=String(assignments[response.id]||'unclassified');
      const key=JSON.stringify([response.role,response.stage,group]);
      if(!groups.has(key))groups.set(key,{role:response.role,stage:response.stage,group,count:0,originals:[]});
      const bucket=groups.get(key);bucket.count++;bucket.originals.push({...response});
    }
    return [...groups.values()];
  }
  const api={clock,matchMember,scheduleReview,surveyDue,reminderCandidate,groupResponses,copy};
  root.PacefitPrototypePlanners=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
