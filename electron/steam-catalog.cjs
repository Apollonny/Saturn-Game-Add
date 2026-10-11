'use strict';
const { parse } = require('node-html-parser');
const fs = require('fs');
const path = require('path');

let availableAppIds = null;
function getAvailableAppIds() {
  if (availableAppIds) return availableAppIds;
  try {
    const candidates = [
      path.join(__dirname, 'available-appids.json'),
      path.join(__dirname, '..', 'available-appids.json'),
      path.join(__dirname, '..', 'catalog-data.js'),
      path.join(process.resourcesPath || '', 'available-appids.json'),
      path.join(process.cwd(), 'available-appids.json')
    ];
    for (const file of candidates) {
      if (fs.existsSync(file)) {
        if (file.endsWith('.js')) {
          const content = fs.readFileSync(file, 'utf8');
          const match = content.match(/window\.SATURN_AVAILABLE_APPIDS\s*=\s*(\[[^\]]+\])/);
          if (match) {
            const arr = JSON.parse(match[1]);
            availableAppIds = new Set(arr.map(String));
            console.log('[steam-catalog] Loaded availableAppIds from catalog-data.js count:', availableAppIds.size);
            break;
          }
        } else {
          const arr = JSON.parse(fs.readFileSync(file, 'utf8'));
          if (Array.isArray(arr)) {
            availableAppIds = new Set(arr.map(String));
            console.log('[steam-catalog] Loaded availableAppIds from json count:', availableAppIds.size);
            break;
          }
        }
      }
    }
  } catch (err) {
    console.error('[steam-catalog] Error loading availableAppIds:', err);
  }
  return availableAppIds;
}

const cache = new Map();
const tagIds = {Aksiyon:'19',RPG:'122',Bağımsız:'492'};
const sorts = {featured:'_ASC',az:'Name_ASC',za:'Name_DESC'};
const allowedImage = value => {
  try { const url=new URL(value); return url.protocol==='https:'&&url.hostname.endsWith('.steamstatic.com')?url.href:null; }
  catch { return null; }
};
function genresFromTags(tags){return Object.entries(tagIds).filter(([,id])=>tags.includes(Number(id))).map(([name])=>name);}
function parseResults(payload){
  if(payload.success!==1||typeof payload.results_html!=='string')throw new Error('Steam katalog yanıtı okunamadı.');
  const appIdsSet = getAvailableAppIds();
  const document=parse(payload.results_html);
  const items=[];
  const rows=document.querySelectorAll('a.search_result_row');
  for(const row of rows){
    const id=row.getAttribute('data-ds-appid');
    const name=row.querySelector('.title')?.text.trim();
    if(!/^[1-9]\d{0,9}$/.test(id||'')||!name)continue;
    // Skip Free-to-Play games (already free on Steam)
    const priceContainer = row.querySelector('.search_price_discount_combined');
    const priceFinal = priceContainer?.getAttribute('data-price-final');
    const isFreeText = row.querySelector('.discount_final_price.free')?.text.trim();
    const isFree = priceFinal === '0' || !!isFreeText || /ücretsiz|free to play/i.test(row.text);
    if (isFree) continue;

    // Only include games that exist in our manifest sources
    if (appIdsSet && !appIdsSet.has(String(id))) {
      continue;
    }

    let tags=[];try{tags=JSON.parse(row.getAttribute('data-ds-tagids')||'[]');}catch{}
    const categories=genresFromTags(tags);
    items.push({id,name:name.slice(0,150),genre:categories[0]||'Steam oyunu',categories,tag:'Steam mağazası',cover:`https://cdn.akamai.steamstatic.com/steam/apps/${id}/library_600x900.jpg`,capsule:allowedImage(row.querySelector('.search_capsule img')?.getAttribute('src'))});
  }
  const total=items.length;
  const steamTotal=Number(payload.total_count);
  return {items,total,rawCount:rows.length,steamTotal:Number.isFinite(steamTotal)&&steamTotal>=0?steamTotal:null};
}
async function fetchJSON(url){
  const response=await fetch(url,{signal:AbortSignal.timeout(14000),headers:{Accept:'application/json','Accept-Language':'tr-TR,tr;q=.9,en;q=.8'}});
  if(!response.ok)throw new Error(response.status===429?'Steam istek sınırına ulaşıldı. Biraz sonra yeniden dene.':'Steam mağazasına şu anda ulaşılamıyor.');
  return response.json();
}
const queryStreamCache = new Map();

async function search({term='',start=0,filter='all',sort='featured',count=60}={}){
  term=String(term).trim().slice(0,160);
  start=Math.min(500000,Math.max(0,Math.floor(Number(start)||0)));
  count=Math.min(100,Math.max(1,Math.floor(Number(count)||60)));

  const queryKey = JSON.stringify({term, filter, sort});
  let stream = queryStreamCache.get(queryKey);

  if (!stream || Date.now() - stream.createdAt > 300000) {
    stream = {
      createdAt: Date.now(),
      items: [],
      seenAppIds: new Set(),
      rawSteamOffset: 0,
      reachedEnd: false
    };
    queryStreamCache.set(queryKey, stream);
    if (queryStreamCache.size > 20) {
      queryStreamCache.delete(queryStreamCache.keys().next().value);
    }
  }

  const targetCount = start + count;
  let filled = false;
  while (stream.items.length < targetCount && !stream.reachedEnd && !filled) {
    if (stream.pending) { await stream.pending; continue; }
    filled = true;
    const pending = (async () => {
      let attempts = 0;

      while (stream.items.length < targetCount && !stream.reachedEnd && attempts < 15) {
        const url = new URL('https://store.steampowered.com/search/results/');
        const parameters = {term, start: String(stream.rawSteamOffset), count: '100', dynamic_data: '', sort_by: sorts[sort]||sorts.featured, category1: '998', infinite: '1', cc: 'tr', l: 'turkish', snr: '1_7_7_230_7'};
        if (tagIds[filter]) parameters.tags = tagIds[filter];
        for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);

          const payload = await fetchJSON(url);
          const parsed = parseResults(payload);
          if (parsed.rawCount === 0) {
            stream.reachedEnd = true;
            break;
          }
          for (const item of parsed.items) {
            if (!stream.seenAppIds.has(item.id)) {
              stream.seenAppIds.add(item.id);
              stream.items.push(item);
            }
          }
          stream.rawSteamOffset += 100;
          if(parsed.steamTotal!==null&&stream.rawSteamOffset>=parsed.steamTotal)stream.reachedEnd=true;
          attempts++;
      }

    })();
    stream.pending = pending;
    try { await pending; } finally { if (stream.pending === pending) stream.pending = null; }
  }

  const items = stream.items.slice(start, start + count);
  const total=stream.items.length,hasMore=!stream.reachedEnd;
  return { items, total, hasMore, incomplete:hasMore&&items.length<count, start, source: 'Steam mağazası', fetchedAt: new Date().toISOString() };
}
const pendingDetails = new Map(), detailQueue = [];
let activeDetails = 0;
function enqueueDetails(task) {
  const result = new Promise((resolve, reject) => detailQueue.push({ task, resolve, reject }));
  pumpDetails();
  return result;
}
function pumpDetails() {
  while (activeDetails < 4 && detailQueue.length) {
    const job = detailQueue.shift();
    activeDetails++;
    Promise.resolve().then(job.task).then(job.resolve, job.reject).finally(() => { activeDetails--; pumpDetails(); });
  }
}
async function details(id){
  id=String(id);
  if(!/^[1-9]\d{0,9}$/.test(id))throw new Error('Geçerli bir Steam App ID gir.');
  const key='app:'+id;
  const cached=cache.get(key);if(cached&&Date.now()-cached.time<600000)return cached.value;
  if(pendingDetails.has(key))return pendingDetails.get(key);
  const request=enqueueDetails(async()=>{
    const url=new URL('https://store.steampowered.com/api/appdetails');
    url.searchParams.set('appids',id);url.searchParams.set('l','turkish');url.searchParams.set('cc','tr');
    const payload=await fetchJSON(url);
    const app=payload[id];
    if(!app?.success||!app.data?.name)return null;
    const data=app.data;
    const categories=(data.genres||[]).map(item=>item.description).filter(name=>typeof name==='string');
    const value={id,name:data.name.slice(0,150),genre:categories[0]||'Steam oyunu',categories,tag:'Steam mağazası',cover:`https://cdn.akamai.steamstatic.com/steam/apps/${id}/library_600x900.jpg`,capsule:allowedImage(data.header_image)||`https://cdn.akamai.steamstatic.com/steam/apps/${id}/header.jpg`};
    cache.set(key,{time:Date.now(),value});
    if(cache.size>512)cache.delete(cache.keys().next().value);
    return value;
  });
  pendingDetails.set(key,request);
  try{return await request;}finally{pendingDetails.delete(key);}
}
module.exports={search,details,parseResults};
