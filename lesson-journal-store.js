/* Private storage + account-scoped local IndexedDB. No member media in app JSON/localStorage. */
((root)=>{
  'use strict';
  const C=root.PacefitLessonCore,checked=result=>{if(result?.error)throw result.error;return result?.data;};
  function localRequest(mode,work){return new Promise((resolve,reject)=>{const request=indexedDB.open('pacefitLessonLocalV1',1);request.onupgradeneeded=()=>{const store=request.result.createObjectStore('blocks',{keyPath:'id'});store.createIndex('owner','owner');};request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('blocks',mode),req=work(tx.objectStore('blocks'));let value;req.onsuccess=()=>{value=req.result;};tx.oncomplete=()=>{db.close();resolve(value);};tx.onerror=tx.onabort=()=>{db.close();reject(tx.error||Error('기기 저장 실패'));};};});}
  class Repository {
    constructor({session,memberId,logKey,localOnly=false}) {this.session=session;this.owner=session?.user?.id||'local';this.memberId=memberId;this.logKey=logKey;this.localOnly=localOnly;}
    guard(){if((root.RefitAccountSession?.user?.id||'local')!==this.owner||this.session&&root.RefitAccountSession!==this.session)throw Error('계정이 변경되었습니다. 일지를 다시 열어주세요.');}
    async permissions(){this.guard();if(!this.session||this.localOnly)return {can_read:false,can_feedback:false,can_upload:false};const data=checked(await this.session.client.rpc('lesson_journal_permissions',{m:this.memberId,k:this.logKey}));this.guard();return data;}
    async consent(){this.guard();if(!this.session||this.memberId!==this.owner)return false;const data=checked(await this.session.client.from('lesson_media_consents').select('enabled').eq('user_id',this.owner).maybeSingle());this.guard();return data?.enabled===true;}
    async setConsent(enabled){this.guard();if(this.memberId!==this.owner||!this.session)throw Error('회원 본인 계정에서만 동의를 변경할 수 있습니다.');checked(await this.session.client.rpc('set_lesson_media_consent',{allow_media:enabled===true}));this.guard();}
    async list(){this.guard();const local=this.memberId===this.owner?await localRequest('readonly',store=>store.index('owner').getAll(this.owner)):[];this.guard();return local.filter(row=>row.log_key===this.logKey);}
    async remoteList(){this.guard();if(!this.session||this.localOnly)return [];const rows=checked(await this.session.client.from('lesson_journal_blocks').select('*').eq('member_id',this.memberId).eq('log_key',this.logKey).eq('status','ready').order('created_at',{ascending:false}).limit(300));this.guard();return (rows||[]).map(row=>({...row,remote:true}));}
    async add(value,share){
      this.guard();if(value.blob&&C.validateFile(value.blob).kind!==value.kind)throw Error('파일 종류를 확인해주세요.');const id=crypto.randomUUID(),row={id,member_id:this.memberId,log_key:this.logKey,author_id:this.owner,parent_id:value.parent_id||null,target_key:value.target_key||'log',kind:value.kind,body:String(value.body||'').slice(0,2000),capture_local:C.capture(value.capture_local),time_source:['metadata','video','ocr','manual'].includes(value.time_source)?value.time_source:'unknown',position:Number.isSafeInteger(value.position)?value.position:Date.now(),ink:C.cleanInk(value.ink),created_at:new Date().toISOString()};
      if(!share){if(this.memberId!==this.owner)throw Error('트레이너의 회원 자료는 기기 전용으로 저장하지 않습니다.');await localRequest('readwrite',store=>store.put({...row,owner:this.owner,blob:value.blob||null,file_name:String(value.file_name||'').slice(0,255),mime_type:value.blob?.type||null,remote:false}));this.guard();return {...row,remote:false};}
      if(!this.session||this.localOnly)throw Error('공유하려면 실제 계정의 서버 연결이 필요합니다.');
      if(row.parent_id?.startsWith('local-'))throw Error('기기 전용 항목은 먼저 공유해주세요.');
      let objectPath=null,reserved=false;
      if(value.blob){const type=C.validateFile(value.blob);objectPath=`${this.memberId}/${this.owner}/${id}${type.extension}`;Object.assign(row,{object_path:objectPath,mime_type:value.blob.type,file_name:String(value.file_name||'첨부').slice(0,255),status:'pending'});}
      try {
        const {created_at,...insert}=row;checked(await this.session.client.from('lesson_journal_blocks').insert(insert).select('id').single());reserved=true;this.guard();
        if(value.blob){checked(await this.session.client.storage.from('lesson-journal').upload(objectPath,value.blob,{contentType:value.blob.type,upsert:false,cacheControl:'0'}));this.guard();checked(await this.session.client.from('lesson_journal_blocks').update({status:'ready'}).eq('id',id).select('id').single());this.guard();}
        return {...row,remote:true,status:'ready'};
      }catch(error){
        // A failed finalization never publishes metadata. Retain an actionable error if cleanup fails.
        let cleanupFailed=false;
        if(reserved&&root.RefitAccountSession===this.session){if(objectPath){const removed=await this.session.client.storage.from('lesson-journal').remove([objectPath]);cleanupFailed=Boolean(removed.error);}if(!cleanupFailed){const removed=await this.session.client.from('lesson_journal_blocks').delete().eq('id',id);cleanupFailed=Boolean(removed.error);}}
        if(cleanupFailed)throw Error('업로드가 완료되지 않았습니다. 미완료 파일 정리가 필요합니다. 운영자에게 문의해주세요.');throw error;
      }
    }
    async blob(row){this.guard();if(!row.remote)return row.blob;const blob=checked(await this.session.client.storage.from('lesson-journal').download(row.object_path));this.guard();return blob;}
    async update(row,patch){this.guard();const safe={};if('ink'in patch)safe.ink=C.cleanInk(patch.ink);if('capture_local'in patch){if(patch.capture_local&&!C.capture(patch.capture_local))throw Error('유효한 촬영 시각을 입력해주세요.');safe.capture_local=C.capture(patch.capture_local);safe.time_source=patch.time_source==='unknown'?'unknown':'manual';}if(row.remote){checked(await this.session.client.from('lesson_journal_blocks').update(safe).eq('id',row.id).select('id').single());}else{await localRequest('readwrite',store=>store.put({...row,...safe}));}this.guard();}
    async move(row,direction){this.guard();if(![-1,1].includes(direction))throw Error('이동 방향을 확인해주세요.');if(row.remote){checked(await this.session.client.rpc('move_lesson_block',{block_id:row.id,direction}));}else{const rows=C.order((await this.list()).filter(r=>!r.parent_id&&r.target_key===row.target_key),'manual'),at=rows.findIndex(r=>r.id===row.id);if(at<0||!rows[at+direction])return;[rows[at],rows[at+direction]]=[rows[at+direction],rows[at]];await localRequest('readwrite',store=>{let request;rows.forEach((r,i)=>{request=store.put({...r,position:(i+1)*1024});});return request;});}this.guard();}
    async remove(row){this.guard();if(row.remote){if(row.object_path)checked(await this.session.client.storage.from('lesson-journal').remove([row.object_path]));checked(await this.session.client.from('lesson_journal_blocks').delete().eq('id',row.id).select('id').single());}else{const locals=await this.list(),ids=new Set([row.id]);for(let i=0;i<3;i++)locals.filter(r=>ids.has(r.parent_id)).forEach(r=>ids.add(r.id));for(const id of ids)await localRequest('readwrite',store=>store.delete(id));}this.guard();}
  }
  root.PacefitLessonStore={Repository,async clearLocal(){const id=root.RefitAccountSession?.user?.id||'local';const rows=await localRequest('readonly',store=>store.index('owner').getAll(id));for(const row of rows)await localRequest('readwrite',store=>store.delete(row.id));}};
})(window);
