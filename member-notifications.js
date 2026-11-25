(()=>{
  const button=document.getElementById('journalNoticeButton');
  const count=document.getElementById('journalNoticeCount');
  const list=document.getElementById('journalNoticeList');
  if(!button||!count||!list)return;
  let entries=[];
  let owner='';
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const seenKey=()=>`pacefit-journal-seen:${owner}`;
  const seen=()=>{try{return new Set(JSON.parse(localStorage.getItem(seenKey())||'[]'))}catch{return new Set()}};
  function render(){
    const read=seen(),unread=entries.filter(row=>!read.has(row.id)).length;
    count.textContent=String(unread);count.hidden=!unread;
    button.setAttribute('aria-label',unread?`새 일지 ${unread}건`:'새 일지 없음');
    list.innerHTML=`<strong>트레이너 일지</strong>${entries.length?entries.map(row=>`<button type="button" data-journal-id="${esc(row.id)}" data-journal-date="${esc(row.entry_date)}"><span>${read.has(row.id)?'':'● '}${esc(row.title||'트레이너 운동일지')}</span><small>${esc(row.entry_date)}</small></button>`).join(''):'<p>도착한 일지가 없습니다.</p>'}`;
  }
  async function refresh(){
    const session=window.RefitAccountSession;
    const user=session?.user;
    if(!user||!session.client){owner='';entries=[];render();return}
    const id=user.id;owner=id;
    const result=await session.client.from('trainer_log_entries').select('id,entry_date,title,created_at').eq('member_id',id).order('created_at',{ascending:false}).limit(30);
    if(owner!==id)return;
    if(result.error){list.innerHTML='<p>일지를 불러오지 못했어요.</p>';return}
    entries=result.data||[];render();
  }
  button.onclick=()=>{list.hidden=!list.hidden;button.setAttribute('aria-expanded',String(!list.hidden));if(!list.hidden)refresh()};
  list.onclick=event=>{
    const target=event.target.closest('[data-journal-id]');if(!target||!owner)return;
    const read=seen();read.add(target.dataset.journalId);localStorage.setItem(seenKey(),JSON.stringify([...read]));render();list.hidden=true;button.setAttribute('aria-expanded','false');
    document.querySelector('[data-view-target="journal"]')?.click();
    const date=target.dataset.journalDate;
    setTimeout(()=>window.PacefitJournalSelectDate?.(date),120);
  };
  window.addEventListener('refit:session-ready',refresh);
  window.addEventListener('refit:session-ended',()=>{owner='';entries=[];render();list.hidden=true});
  setTimeout(refresh,500);
})();

