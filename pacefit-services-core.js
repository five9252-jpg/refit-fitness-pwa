((root)=>{
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function parseCSV(text){
  if(typeof text!=='string'||text.length>200000)throw Error('200KB 이하 CSV 파일을 선택해주세요.');
  const lines=[];let row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(field);field='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(x=>x.trim()))lines.push(row);row=[];field='';}else field+=c;}
  if(quoted)throw Error('CSV의 따옴표를 확인해주세요.');row.push(field);if(row.some(x=>x.trim()))lines.push(row);
  const header=lines.shift()?.map(x=>x.replace(/^\uFEFF/,'').trim());
  if(!header||header.join(',')!=='회원,날짜,시작,종료,장소')throw Error('첫 줄은 회원,날짜,시작,종료,장소 순서여야 합니다.');
  if(lines.length>100)throw Error('한 번에 100건까지 가져올 수 있어요.');
  return lines.map(r=>{if(r.length!==5)throw Error('CSV 열 개수를 확인해주세요.');return Object.fromEntries(['name','date','start','end','place'].map((k,i)=>[k,r[i].trim()]));});
 }
 const normalize=v=>String(v||'').normalize('NFKC').toLowerCase().replace(/[\s.!?。，！？]+/g,'');
 function group(rows,assignments={}){const groups=new Map();for(const r of rows){const key=JSON.stringify([r.role,r.stage,assignments[r.id]||normalize(r.body)]);if(!groups.has(key))groups.set(key,{label:assignments[r.id]||r.body,role:r.role,stage:r.stage,rows:[]});groups.get(key).rows.push(r);}return [...groups.values()];}
 const api={esc,parseCSV,normalize,group};if(typeof module!=='undefined')module.exports=api;root.PacefitServicesCore=api;
})(typeof window==='undefined'?globalThis:window);
