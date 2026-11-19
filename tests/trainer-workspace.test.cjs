const test = require('node:test');
const assert = require('node:assert/strict');
const {members,markup,dateValue} = require('../trainer-workspace.js');
const now = new Date('2026-11-14T09:50:00Z');
const link = (id,extra={}) => ({member_id:id,status:'active',can_write:false,...extra});
const record = (date,name='샘플') => ({payload:{profile:{name},logs:date ? [{date}] : []}});
test('inactive links never enter the directory; missing records reveal no profile',()=>{
  const rows=members([link('a'),link('b',{status:'revoked'})],{b:record('2026-11-13','노출 금지')},now);
  assert.equal(rows.length,1);assert.equal(rows[0].status,'unavailable');
  assert.equal(rows[0].name,'연결 회원 1');assert.equal(rows[0].canWrite,false);
  assert.equal(markup(rows,{query:'',filter:'all',page:1}).includes('노출 금지'),false);
});
test('seven-day threshold and no-record state remain distinct',()=>{
  const rows=members(['a','b','c','d'].map(id=>link(id)),{a:record('2026-11-07'),b:record('2026-11-08'),c:record(null)},now);
  assert.deepEqual(rows.map(row=>row.status),['attention','recent','empty','unavailable']);
});
test('Korean calendar day determines the threshold at midnight',()=>{
  const records={a:record('2026-11-07')};
  assert.equal(members([link('a')],records,new Date('2026-11-13T14:59:59Z'))[0].status,'recent');
  assert.equal(members([link('a')],records,new Date('2026-11-13T15:00:00Z'))[0].status,'attention');
});
test('invalid and future dates do not imply recent exercise',()=>{
  for(const date of ['2026-02-30','2026-11-15','broken']) assert.equal(members([link('a')],{a:record(date)},now)[0].status,'empty');
  assert.equal(dateValue('2026-02-30'),null);
});
test('60 members paginate without duplication and clamp the selected page',()=>{
  const links=Array.from({length:60},(_,i)=>link(String(i)));
  const rows=members(links,Object.fromEntries(links.map(row=>[row.member_id,record('2026-11-13',`회원 ${row.member_id}`)])),now);
  const ids=[];
  for(let page=1;page<=3;page++){
    const html=markup(rows,{query:'',filter:'all',page});
    const pageIds=[...html.matchAll(/data-member="([^"]+)" data-section="profile"/g)].map(match=>match[1]);
    assert.equal(pageIds.length,20);ids.push(...pageIds);
  }
  assert.equal(new Set(ids).size,60);
  const state={query:'없는 이름',filter:'all',page:3};
  assert.match(markup(rows,state),/검색 결과 0명/);assert.equal(state.page,1);
});
test('name search normalizes input and status filters narrow results',()=>{
  const rows=members([link('a'),link('b')],{a:record('2026-11-01','ABC 회원'),b:record('2026-11-13','다른 회원')},now);
  assert.match(markup(rows,{query:' ａｂｃ ',filter:'attention',page:1}),/검색 결과 1명/);
  assert.match(markup(rows,{query:'ABC',filter:'recent',page:1}),/검색 결과 0명/);
});
test('untrusted names and IDs are escaped in text and action attributes',()=>{
  const id='x" onclick="bad()';
  const rows=members([link(id,{can_write:'true'})],{[id]:record(null,'<img src=x onerror=bad()>')},now);
  const html=markup(rows,{query:'',filter:'all',page:1});
  assert.equal(html.includes('<img'),false);assert.equal(html.includes('data-member="x" onclick='),false);
  assert.equal(rows[0].canWrite,false);assert.match(html,/&lt;img/);
});
test('manual care groups combine with status and name filters',()=>{
  const rows=members([link('a'),link('b')],{a:record('2026-11-01','김 회원'),b:record('2026-11-13','이 회원')},now);rows[0].group='pt';
  assert.match(markup(rows,{query:'',filter:'all',group:'pt',page:1}),/검색 결과 1명/);
  assert.match(markup(rows,{query:'',filter:'recent',group:'pt',page:1}),/검색 결과 0명/);
  const html=markup(rows,{query:'',filter:'all',group:'management',page:1});
  assert.match(html,/data-member="b"/);assert.equal(html.includes('data-member="a"'),false);
});
test('group assignments persist separately per trainer and fail closed on storage errors',()=>{
  const fs=require('node:fs'),vm=require('node:vm'),memory=new Map();
  const context={window:{localStorage:{getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)}}};
  vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../trainer-workspace.js'),'utf8'),context);
  const api=context.window.PacefitTrainerWorkspace;
  assert.equal(api.saveGroup('trainer-a','member-a','pt'),true);
  assert.equal(api.loadGroups('trainer-a')['member-a'],'pt');assert.equal(api.loadGroups('trainer-b')['member-a'],undefined);
  assert.equal(api.saveGroup('trainer-a','member-a','invalid'),false);
  context.window.localStorage.setItem=()=>{throw Error('quota');};assert.equal(api.saveGroup('trainer-a','member-a','management'),false);
});
test('aliases are private per trainer, reversible, searchable by original name and escaped',()=>{
  const fs=require('node:fs'),vm=require('node:vm'),memory=new Map();
  const context={window:{localStorage:{getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)}}};
  vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../trainer-workspace.js'),'utf8'),context);
  const api=context.window.PacefitTrainerWorkspace;
  const rows=members([link('member-a')],{'member-a':record('2026-11-13','원래 이름')},now);
  assert.equal(api.saveAlias('trainer-a','member-a','<b>오전 회원</b>'),true);
  const renamed=api.aliasRows(rows,'trainer-a');assert.equal(rows[0].name,'원래 이름');assert.equal(renamed[0].name,'<b>오전 회원</b>');
  assert.equal(api.aliasRows(rows,'trainer-b')[0].name,'원래 이름');
  const html=api.markup(renamed,{query:'원래',filter:'all',page:1});assert.match(html,/검색 결과 1명/);assert.equal(html.includes('<b>오전'),false);
  assert.equal(api.saveAlias('trainer-a','member-a','x'.repeat(41)),false);
  assert.equal(api.saveAlias('trainer-a','member-a',''),true);assert.equal(api.aliasRows(rows,'trainer-a')[0].name,'원래 이름');
  context.window.localStorage.setItem=()=>{throw Error('quota');};assert.equal(api.saveAlias('trainer-a','member-a','오전'),false);
});
