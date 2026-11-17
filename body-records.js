/* Member-owned numeric history and opt-in body-composition images. */
(()=>{
  'use strict';
  const I=window.PacefitMemberInsights,bridge=window.RefitAccountBridge;
  const dialog=document.querySelector('#profileBackdrop .dialog');
  if(!I||!bridge||!dialog)return;
  const host=document.createElement('section');host.className='body-records-panel';host.id='bodyRecordsPanel';
  dialog.querySelector('.dialog-actions').before(host);
  const profileStrip=document.getElementById('profileStrip');
  if(profileStrip){const open=document.createElement('button');open.type='button';open.className='profile-edit';open.textContent='체중·체성분 기록';open.onclick=()=>{window.openProfile?.();host.scrollIntoView({block:'start'});};profileStrip.appendChild(open);}
  const owner=()=>window.RefitAccountSession?.user?.id||'local';
  const currentSession=()=>window.RefitAccountSession;
  const owns=(id,session)=>owner()===id&&currentSession()===session;
  const state=()=>bridge.getState()||{};
  const save=(next,message)=>typeof window.commitState==='function'?window.commitState(next,message):bridge.replaceState(next)!==false;
  let renderEpoch=0,tracking=false,ready=false,lastOwner='',lastProfile='',busy=false;
  const openDB=()=>new Promise((resolve,reject)=>{const request=indexedDB.open('pacefitBodyReportsV1',1);request.onupgradeneeded=()=>request.result.createObjectStore('reports',{keyPath:'id'}).createIndex('ownerId','ownerId');request.onerror=()=>reject(request.error);request.onsuccess=()=>resolve(request.result);});
  async function dbRequest(mode,work){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('reports',mode),req=work(tx.objectStore('reports'));let result;req.onsuccess=()=>{result=req.result;};tx.oncomplete=()=>{db.close();resolve(result);};tx.onerror=()=>{db.close();reject(tx.error);};tx.onabort=()=>{db.close();reject(tx.error||Error('기기 저장을 완료하지 못했습니다.'));};});}
  async function compress(file){
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024)throw Error('JPG·PNG·WebP 사진을 12MB 이하로 선택해주세요.');
    const url=URL.createObjectURL(file),image=new Image();
    try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('사진을 읽지 못했습니다.'));image.src=url;});
      if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>40000000)throw Error('사진 해상도가 너무 큽니다. 검사표 부분만 잘라 선택해주세요.');
      let edge=1600;
      for(let pass=0;pass<5;pass++){const ratio=Math.min(1,edge/Math.max(image.naturalWidth,image.naturalHeight));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));const g=canvas.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,canvas.width,canvas.height);g.drawImage(image,0,0,canvas.width,canvas.height);
        for(const quality of [.85,.72,.58,.45]){const result=canvas.toDataURL('image/jpeg',quality);if(result.length<=240000)return result;}edge=Math.round(edge*.8);
      }throw Error('공유용 크기로 줄이지 못했습니다. 검사표 부분만 잘라 다시 선택해주세요.');
    }finally{URL.revokeObjectURL(url);}
  }
  function status(message){const el=host.querySelector('[data-body-status]');if(el)el.textContent=message;}
  function trackProfile(){
    if(!ready||tracking||busy)return;
    const current=state(),id=owner(),profile=current.profile||{},snapshot=JSON.stringify([profile.weight,profile.bmr]);
    if(lastOwner!==id){lastOwner=id;lastProfile='';}
    if(snapshot===lastProfile||current.demo)return;
    lastProfile=snapshot;
    const weight=I.num(profile.weight,20,300),bmr=I.num(profile.bmr,500,4000);if(weight===null&&bmr===null)return;
    const history=I.cleanMetrics(current.bodyMetricsV1),latest=history[0];
    if(latest?.weight===weight&&latest?.bmr===bmr)return;
    const now=new Date();tracking=true;
    try{save({...current,bodyMetricsV1:I.cleanMetrics([{id:'profile-'+now.getTime(),date:I.day(now),recordedAt:now.toISOString(),weight,bmr,source:'profile'},...history])},'프로필 수치를 날짜별 기록에 반영했어요.');}finally{tracking=false;}
  }
  async function render(){
    if(busy)return;
    const epoch=++renderEpoch,id=owner(),session=currentSession(),current=state(),today=I.day(new Date()),reports=I.cleanReports(current.sharedBodyReportsV1,id),canShare=!!session?.exerciseConsent&&!current.demo;
    host.innerHTML=`<h3>체중·기초대사량·체성분 검사표</h3><p>현재 프로필 값의 확인일·변경일을 기록합니다. 실제 측정일이 다르면 아래에서 날짜별로 직접 추가해주세요.</p>${I.historyMarkup(current.bodyMetricsV1,'weight',current.profile)}${I.historyMarkup(current.bodyMetricsV1,'bmr',current.profile)}<form id="bodyMetricForm"><div class="body-record-form"><label>측정 날짜<input name="date" type="date" value="${today}" max="${today}" required></label><label>체중 (kg)<input name="weight" type="number" min="20" max="300" step="0.1" placeholder="예: 70.2"></label><label>기초대사량 (kcal/일)<input name="bmr" type="number" min="500" max="4000" step="1" placeholder="예: 1550"></label></div><button type="submit">날짜별 수치 저장</button></form><hr><h4>체성분 검사표 사진 추가</h4><form id="bodyReportForm"><label>검사 날짜<input name="date" type="date" value="${today}" max="${today}" required></label><label>검사표 사진<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required></label><p>기본값은 이 기기에만 보관합니다. 사진은 JPEG로 줄이며 위치 등 원본 메타데이터는 제거합니다. AI로 분석하거나 수치를 자동 저장하지 않습니다.</p><label class="body-share"><input name="share" type="checkbox" ${canShare?'':'disabled'}><span><b>[선택] 이 검사표의 계정 서버 저장·트레이너 공유에 동의합니다.</b><br>Supabase 서울 서버에 보관되며 운영자와 현재·이후 연결한 트레이너가 확인할 수 있습니다. 자료별 공유 해제가 가능합니다. 신분 정보 등 필요 없는 부분은 잘라주세요.</span></label>${!canShare?'<p>공유하려면 로그인하고 계정 설정에서 운동·신체 정보 서버 저장 동의를 먼저 켜주세요.</p>':''}<button type="submit">검사표 사진 저장</button></form><p class="body-status" data-body-status role="status"></p><div id="bodyReportList"><p>기기 검사표를 불러오는 중…</p></div>`;
    host.querySelector('#bodyMetricForm').onsubmit=event=>{
      event.preventDefault();if(!owns(id,session))return;
      if(state().demo){status('샘플 모드를 종료하고 내 프로필을 저장한 뒤 추가해주세요.');return;}
      const fields=new FormData(event.currentTarget),date=String(fields.get('date')),weight=I.num(fields.get('weight'),20,300),bmr=I.num(fields.get('bmr'),500,4000);
      if(!I.validDate(date)||date>today||weight===null&&bmr===null){status('측정 날짜와 체중 또는 기초대사량을 확인해주세요.');return;}
      if(fields.get('weight')!==''&&weight===null||fields.get('bmr')!==''&&(bmr===null||!Number.isInteger(bmr))){status('입력 범위를 확인해주세요. 기초대사량은 정수로 기록합니다.');return;}
      const now=new Date(),before=state(),row={id:'body-'+now.getTime(),date,weight,bmr,recordedAt:now.toISOString(),source:'manual'},history=I.cleanMetrics([row,...I.cleanMetrics(before.bodyMetricsV1)]);
      const profile=before.profile?{...before.profile}:null;
      if(profile){for(const key of ['weight','bmr']){const latest=history.find(r=>r[key]!==null);if(latest)profile[key]=latest[key];}}
      lastProfile=JSON.stringify([profile?.weight,profile?.bmr]);
      if(save({...before,profile,bodyMetricsV1:history},'날짜별 신체 기록을 저장했어요.'))render();else status('저장하지 못했습니다. 저장 공간을 확인해주세요.');
    };
    host.querySelector('#bodyReportForm').onsubmit=async event=>{
      event.preventDefault();if(!owns(id,session)||busy)return;
      const form=event.currentTarget,fields=new FormData(form),date=String(fields.get('date')),file=fields.get('photo'),share=fields.get('share')==='on';
      if(!I.validDate(date)||date>today||!file?.size){status('검사 날짜와 사진을 확인해주세요.');return;}
      if(share&&(!session?.exerciseConsent||!owns(id,session))){status('서버 저장 동의를 확인해주세요.');return;}
      if(share&&I.cleanReports(state().sharedBodyReportsV1,id).length>=8){status('공유 검사표는 최대 8장입니다. 이전 자료의 공유를 해제한 뒤 추가해주세요.');return;}
      busy=true;form.querySelector('button').disabled=true;status('사진을 줄여 기기에 저장하는 중…');
      try{const image=await compress(file);if(!owns(id,session))return;const now=new Date(),row={id:'report-'+crypto.randomUUID(),ownerId:id,date,name:String(file.name).slice(0,80),image,shareWithTrainer:share,acceptedAt:share?now.toISOString():null};
        await dbRequest('readwrite',store=>store.put(row));if(!owns(id,session))return;
        if(share){const before=state();if(!save({...before,sharedBodyReportsV1:I.cleanReports([row,...I.cleanReports(before.sharedBodyReportsV1,id)],id)},'검사표 공유 요청을 저장했어요.'))throw Error('사진은 기기에 저장했지만 공유 요청을 저장하지 못했습니다.');}
        busy=false;await render();status(share?'공유 요청 저장 완료. 상단의 ‘서버에 저장됨’ 표시를 확인해주세요.':'이 기기에만 저장했습니다. 트레이너에게 공유되지 않습니다.');
      }catch(error){status(error.message||'사진을 저장하지 못했습니다.');}finally{busy=false;if(form.isConnected)form.querySelector('button').disabled=false;if(!owns(id,session))render();}
    };
    let local=[];
    try{local=await dbRequest('readonly',store=>store.index('ownerId').getAll(id));}catch{if(epoch===renderEpoch&&owns(id,session))status('기기 사진 저장소를 사용할 수 없습니다. 브라우저 저장 설정을 확인해주세요.');}
    if(epoch!==renderEpoch||!owns(id,session))return;
    const merged=new Map(local.map(row=>[row.id,row]));for(const row of reports)merged.set(row.id,row);
    const list=host.querySelector('#bodyReportList');list.innerHTML=[...merged.values()].sort((a,b)=>b.date.localeCompare(a.date)).map(row=>{const shared=reports.some(r=>r.id===row.id),valid=I.cleanReports([{...row,shareWithTrainer:true,acceptedAt:row.acceptedAt||new Date().toISOString()}],id)[0];return valid?`<article class="body-local-report"><details><summary>${I.esc(row.date)} · ${I.esc(row.name)} · ${shared?'공유 요청됨':'기기 전용'}</summary><img src="${valid.image}" alt="${I.esc(row.date)} 체성분 검사표" loading="lazy"></details>${shared?`<button type="button" data-unshare="${I.esc(row.id)}">서버 공유 해제</button>`:''}<button type="button" data-remove="${I.esc(row.id)}">사진 삭제</button></article>`:'';}).join('')||'<p>아직 저장한 체성분 검사표가 없습니다.</p>';
    list.onclick=async event=>{const control=event.target.closest('button');if(!control||!owns(id,session)||busy)return;const reportId=control.dataset.unshare||control.dataset.remove;if(!reportId)return;
      busy=true;control.disabled=true;
      try{const before=state(),shared=I.cleanReports(before.sharedBodyReportsV1,id).filter(row=>row.id!==reportId);if(!save({...before,sharedBodyReportsV1:shared},'검사표 공유 해제 요청을 저장했어요.'))throw Error('공유 해제 요청을 저장하지 못했습니다.');
        if(control.dataset.remove)await dbRequest('readwrite',store=>store.delete(reportId));
        busy=false;await render();status('기기 목록을 갱신했습니다. 서버 공유 해제는 ‘서버에 저장됨’ 표시를 확인해주세요.');
      }catch(error){status(error.message);}finally{busy=false;if(control.isConnected)control.disabled=false;}
    };
  }
  window.addEventListener('refit:state-updated',()=>{if(!busy&&!tracking){trackProfile();render();}});
  window.PacefitBodyRecords={clearLocal:async()=>{const id=owner(),rows=await dbRequest('readonly',store=>store.index('ownerId').getAll(id));for(const row of rows)await dbRequest('readwrite',store=>store.delete(row.id));localStorage.removeItem('pacefitTrainerGroupsV1:'+id);localStorage.removeItem('pacefitTrainerAliasesV1:'+id);}};
  for(const type of ['refit:session-ready','refit:local-ready'])window.addEventListener(type,()=>{ready=true;lastOwner='';lastProfile='';trackProfile();render();});
  window.addEventListener('refit:session-ended',()=>{ready=false;renderEpoch++;lastOwner='';lastProfile='';host.innerHTML='';});
  if(currentSession()||document.getElementById('accountGate')?.hidden){ready=true;trackProfile();}render();
})();
