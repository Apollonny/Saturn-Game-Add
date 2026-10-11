'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const service = require('../electron/steam-catalog.cjs');
const ids = require('../available-appids.json').map(String);
const row = (id, name='Fixture Game') => `<a class="search_result_row" data-ds-appid="${id}" data-ds-tagids="[19]"><span class="title">${name}</span><div class="search_price_discount_combined" data-price-final="1000"></div></a>`;
const response = (rows, total=200) => ({ok:true,json:async()=>({success:1,results_html:rows,total_count:total})});

test('malformed rows do not discard valid search results',()=>{
  const parsed=service.parseResults({success:1,results_html:`<a class="search_result_row" data-ds-appid="${ids[0]}"></a>`+row(ids[1])});
  assert.deepEqual(parsed.items.map(item=>item.id),[ids[1]]);
});
test('a filtered raw page does not end the Steam catalogue',async()=>{
  const original=global.fetch,calls=[];
  global.fetch=async url=>{const offset=Number(new URL(url).searchParams.get('start'));calls.push(offset);return response(offset===0?row('9999999999'):row(ids[0]));};
  try {const result=await service.search({term:'filtered-page-regression',count:1});assert.equal(result.items[0]?.id,ids[0]);assert.deepEqual(calls,[0,100]);}
  finally {global.fetch=original;}
});
test('a network failure is surfaced and can be retried',async()=>{
  const original=global.fetch;
  global.fetch=async()=>({ok:false,status:503});
  try {
    await assert.rejects(service.search({term:'offline-regression',count:1}),/ulaşılamıyor/);
    global.fetch=async()=>response(row(ids[0]),1);
    const retry=await service.search({term:'offline-regression',count:1});assert.equal(retry.items[0]?.id,ids[0]);assert.equal(retry.hasMore,false);
  } finally {global.fetch=original;}
});
test('an unfinished search exposes a lower bound and continuation',async()=>{
  const original=global.fetch;
  global.fetch=async()=>response(ids.slice(0,4).map(id=>row(id)).join(''),1000);
  try {const result=await service.search({term:'page-total-regression',count:1});assert.equal(result.total,4);assert.equal(result.hasMore,true);}
  finally {global.fetch=original;}
});
test('a sparse catalogue pauses scanning and resumes without losing matches',async()=>{
  const original=global.fetch;let calls=0;
  global.fetch=async()=>response(row(++calls<=15?'9999999999':ids[0]),10000);
  try{
    const partial=await service.search({term:'sparse-regression',count:1});assert.equal(partial.incomplete,true);assert.equal(partial.hasMore,true);assert.equal(calls,15);
    const retry=await service.search({term:'sparse-regression',count:1});assert.equal(retry.items[0]?.id,ids[0]);assert.equal(retry.incomplete,false);assert.equal(calls,16);
  }finally{global.fetch=original;}
});
test('concurrent search requests share pages and preserve the next page',async()=>{
  const original=global.fetch;let calls=0;
  global.fetch=async url=>{calls++;await new Promise(resolve=>setTimeout(resolve,10));const offset=Number(new URL(url).searchParams.get('start'));return response(ids.slice(offset,offset+100).map(id=>row(id)).join(''),300);};
  try{
    await Promise.all([service.search({term:'concurrent-regression',count:60}),service.search({term:'concurrent-regression',count:60})]);assert.equal(calls,1);
    const next=await service.search({term:'concurrent-regression',start:60,count:60});assert.deepEqual(next.items.map(item=>item.id),ids.slice(60,120));assert.equal(calls,2);
  }finally{global.fetch=original;}
});
