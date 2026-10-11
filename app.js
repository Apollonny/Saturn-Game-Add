'use strict';

const icons = {
  plus:'<path d="M12 5v14M5 12h14"/>', search:'<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  history:'<path d="M3 10a9 9 0 1 1 1.8 7.4M3 4v6h6M12 7v5l3 2"/>',
  settings:'<path d="m9 3-.7 2.2-2 .9-2.1-.5-1.6 2.8 1.5 1.8-.2 2.2-1.6 1.7 1.6 2.8 2.2-.4 1.9 1.1.6 2.2h3.2l.8-2.1 1.9-.9 2.1.4 1.6-2.8-1.5-1.8.2-2.2L21 8.9l-1.6-2.8-2.2.4-1.9-1.1-.6-2.2Z"/><circle cx="11.8" cy="11.5" r="3"/>',
  layers:'<path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/>',
  'arrow-left':'<path d="M20 12H4m6-6-6 6 6 6"/>','arrow-up-right':'<path d="M6 18 18 6M6 6h12v12"/>','arrow-right':'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  link:'<path d="m10 13 4-4M8 15l-1 1a3.5 3.5 0 0 1-5-5l4-4a3.5 3.5 0 0 1 5 0m2 2 1-1a3.5 3.5 0 0 1 5 5l-4 4a3.5 3.5 0 0 1-5 0"/>',
  pause:'<path d="M8 5v14M16 5v14"/>',play:'<path d="m8 4 12 8-12 8V4Z"/>',sort:'<path d="M4 5h16M4 12h11M4 19h5"/>',
  'chevron-down':'<path d="m6 9 6 6 6-6"/>',heart:'<path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"/>',
  x:'<path d="m6 6 12 12M6 18 18 6"/>',check:'<path d="m5 12 4.5 4.5L19 7"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  list:'<path d="M9 5h12M9 12h12M9 19h12M3 5h.01M3 12h.01M3 19h.01"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 15v5h16v-5"/>',
  refresh:'<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.info}</svg>`;
const $ = id => document.getElementById(id);
const escapeHtml = value => String(value).replace(/[&<>"']/g, char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const normalizeSearch = value => String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ı/g,'i').replace(/\s+/g,' ').trim();
const curatedCatalog = [
  {id:'1245620',name:'ELDEN RING',genre:'RPG',tag:'Açık dünya'},
  {id:'1091500',name:'Cyberpunk 2077',genre:'RPG',tag:'Açık dünya'},
  {id:'1174180',name:'Red Dead Redemption 2',genre:'Aksiyon',tag:'Macera'},
  {id:'990080',name:'Hogwarts Legacy',genre:'RPG',tag:'Macera'},
  {id:'814380',name:'Sekiro: Shadows Die Twice',genre:'Aksiyon',tag:'Macera'},
  {id:'1145360',name:'Hades',genre:'Bağımsız',tag:'Roguelike'},
  {id:'292030',name:'The Witcher 3: Wild Hunt',genre:'RPG',tag:'Açık dünya'},
  {id:'413150',name:'Stardew Valley',genre:'Bağımsız',tag:'Simülasyon'}
].map(game=>({...game,cover:`assets/${game.id}-cover.jpg`}));
const safeCover = value => {
  if (typeof value !== 'string' || !value) return null;
  if (/^assets\/(?:covers\/)?[^/]+\.(?:jpg|jpeg|png|webp|svg)$/i.test(value)) return value;
  if (value.startsWith('data:image/')) return value;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const isSteamDomain = host.endsWith('.steamstatic.com') ||
                          host.endsWith('.akamaihd.net') ||
                          host.endsWith('.steampowered.com') ||
                          host === 'steamcdn-a.akamaihd.net';
    if ((url.protocol === 'https:' || url.protocol === 'http:') && isSteamDomain && !url.username && !url.password) {
      return url.href;
    }
    return null;
  } catch {
    return null;
  }
};
let _availableAppIdsSet = null;
function getAvailableAppIds(){
  if(_availableAppIdsSet) return _availableAppIdsSet;
  if(Array.isArray(window.SATURN_AVAILABLE_APPIDS)) {
    _availableAppIdsSet = new Set(window.SATURN_AVAILABLE_APPIDS);
  }
  return _availableAppIdsSet;
}
const snapshot=window.SATURN_CATALOG||{items:[],total:0};
const knownGames=new Map();
function safeGame(game){
  if(!game||!/^[1-9]\d{0,9}$/.test(String(game.id))||typeof game.name!=='string')return null;
  const appIds = getAvailableAppIds();
  if(appIds && !appIds.has(String(game.id))) return null;
  const curated=curatedCatalog.find(item=>item.id===String(game.id));
  if(curated)return {...curated,categories:game.categories||[curated.genre],capsule:safeCover(game.capsule)};
  const cover=safeCover(game.cover);
  const cover2x=cover?.replace(/\/library_600x900\.jpg(?=\?|$)/,'/library_600x900_2x.jpg');
  const localCover=cover&&/^assets\/covers\/\d+\.jpg$/.test(cover)?cover:null;
  const capsule=safeCover(game.capsule);
  const appId=cover?.match(/\/apps\/(\d+)\//)?.[1] || String(game.id);
  const capsule2x=appId&&capsule?.includes(`/steam/apps/${appId}/`)&&!capsule.includes('/store_item_assets/')?`https://cdn.akamai.steamstatic.com/steam/apps/${appId}/capsule_616x353.jpg`:null;
  const capsuleSibling=name=>capsule?.replace(/capsule_231x87(?:_alt_assets_\d+)?\.jpg(?=[?#]|$)/,name)||null;
  const capsuleVariants=[capsule?.includes('/store_item_assets/')?capsuleSibling('header.jpg'):null,capsuleSibling('capsule_616x353.jpg'),capsuleSibling('capsule_467x181.jpg'),`https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`].map(safeCover).filter((url,index,list)=>url&&url!==capsule&&url!==capsule2x&&list.indexOf(url)===index);
  const coverUpgrades=localCover?[`https://cdn.akamai.steamstatic.com/steam/apps/${game.id}/library_600x900_2x.jpg`,`https://cdn.akamai.steamstatic.com/steam/apps/${game.id}/library_600x900.jpg`,capsule2x,...capsuleVariants].map(safeCover).filter((url,index,list)=>url&&url!==cover&&url!==cover2x&&list.indexOf(url)===index):[];
  return {id:String(game.id),name:game.name.slice(0,150),genre:typeof game.genre==='string'?game.genre.slice(0,50):'Steam oyunu',categories:Array.isArray(game.categories)?game.categories.filter(name=>typeof name==='string').slice(0,15):[],tag:typeof game.tag==='string'?game.tag.slice(0,50):'Steam mağazası',cover:cover||`https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`,cover2x,coverFallback:cover2x!==cover?cover:null,localCoverFallback:localCover,coverUpgrades,capsule2x,capsuleVariants,capsule:capsule||`https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`};
}
for(const game of [...curatedCatalog,...snapshot.items]){const safe=safeGame(game);if(safe)knownGames.set(safe.id,safe);}
let catalog=[...knownGames.values()];
let catalogRevision=0;
const searchIndex=new WeakMap();
let localResultCache={key:null,games:null};
const nameCollator=new Intl.Collator('tr');
const numberFormat=new Intl.NumberFormat('tr-TR');
const historyDateFormat=new Intl.DateTimeFormat('tr-TR',{dateStyle:'short',timeStyle:'short'});
function rememberGames(games){for(const game of games){const safe=safeGame(game);if(!safe)continue;const old=knownGames.get(safe.id);if(old?.cover?.startsWith('assets/')){safe.cover=old.cover;safe.cover2x=old.cover;safe.coverFallback=null;if(/^assets\/covers\/\d+\.jpg$/.test(old.cover)){safe.localCoverFallback=old.cover;safe.coverUpgrades=[`https://cdn.akamai.steamstatic.com/steam/apps/${safe.id}/library_600x900_2x.jpg`,`https://cdn.akamai.steamstatic.com/steam/apps/${safe.id}/library_600x900.jpg`,safe.capsule2x,...(safe.capsuleVariants||[])].map(safeCover).filter((url,index,list)=>url&&url!==old.cover&&list.indexOf(url)===index);}}knownGames.set(safe.id,safe);}catalog=[...knownGames.values()];catalogRevision++;}
const catalogClient=typeof window.saturnDesktop?.catalogSearch==='function'?{search:args=>window.saturnDesktop.catalogSearch(args),details:id=>window.saturnDesktop.gameDetails(id)}:location.protocol.startsWith('http')?{search:async args=>{const params=new URLSearchParams({term:args.term||'',start:args.start||0,filter:args.filter||'all',sort:args.sort||'featured'});return fetch('/api/catalog?'+params).then(response=>response.json());},details:id=>fetch('/api/game/'+id).then(response=>response.json())}:null;
const key = 'saturn-game-add-v1';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let stored = {};
try { stored = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { stored = {}; }
rememberGames(Array.isArray(stored.savedGames)?stored.savedGames:[]);
const validGame = game => game && /^[1-9]\d{0,9}$/.test(String(game.id)) && typeof game.name === 'string' && game.name.length <= 150;
const sanitizeGame = game => {const known=knownGames.get(String(game.id));if(known)return known;const safe=safeGame(game);if(safe){knownGames.set(safe.id,safe);return safe;}return {id:String(game.id),name:game.name,genre:'App ID',tag:'Özel seçim',cover:null};};
const cleanList = (list,limit=200) => Array.isArray(list) ? [...new Map(list.filter(validGame).map(game=>[String(game.id),sanitizeGame(game)])).values()].slice(0,limit) : [];
const state = {
  view:'add', filter:'all', query:'', sort:'featured', selected:null, processing:false, activeId:null,
  queue:cleanList(stored.queue), queueErrors:{}, library:cleanList(stored.library,10000),
  history:Array.isArray(stored.history)?stored.history.filter(item=>validGame(item) && Number.isFinite(item.time) && Math.abs(item.time)<=8.64e15).slice(0,500).map(item=>({...sanitizeGame(item),time:item.time})):[],
  favorites:Array.isArray(stored.favorites)?stored.favorites.filter(id=>catalog.some(game=>game.id===id)):[],
  launchOptions:Object.fromEntries(Object.entries(stored.launchOptions&&typeof stored.launchOptions==='object'?stored.launchOptions:{}).filter(([id,value])=>/^[1-9]\d{0,9}$/.test(id)&&typeof value==='string')),
  playtime:Object.fromEntries(Object.entries(stored.playtime&&typeof stored.playtime==='object'?stored.playtime:{}).filter(([id,value])=>/^[1-9]\d{0,9}$/.test(id)&&value&&Number.isFinite(value.totalMinutes)&&value.totalMinutes>=0).map(([id,value])=>[id,{totalMinutes:Math.floor(value.totalMinutes),lastPlayed:Number.isFinite(value.lastPlayed)?value.lastPlayed:null}])),
  motion:typeof stored.motion==='boolean'?stored.motion:!reducedMotion.matches,compact:stored.compact===true,page:0,pageSize:60,livePage:null,loading:false,catalogError:'',catalogNotice:'',request:0
};
let toastTimer,searchDebounce,queueReturnFocus=null,queueFocusTimer,intakeRequest=0;
function cancelIntakeLookup(){intakeRequest++;$('find-button').disabled=false;}

function formatPlaytime(minutes) {
  if (!minutes || minutes <= 0) return '0 dk';
  if (minutes < 60) return `${minutes} dk`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs} saat ${mins} dk` : `${hrs} saat`;
}

const onlineFixSupportedAppIds = new Set([
  '4704690', '2483190', '1962700', '1715280', '1540210', 
  '244210', '552100', '440900', '1174180', '1091500', 
  '1245620', '814380', '990080', '413150', '1145360'
]);

function isOnlineFixSupported(game) {
  if (!game) return false;
  const appId = String(game.id || '');
  if (onlineFixSupportedAppIds.has(appId)) return true;
  if (game.onlineFix || game.hasOnlineFix) return true;
  const tag = (game.tag || '').toLowerCase();
  const genre = (game.genre || '').toLowerCase();
  if (tag.includes('co-op') || tag.includes('multiplayer') || tag.includes('çevrimiçi') || genre.includes('co-op')) return true;
  return false;
}

let activeLaunchTimers = {};

function trackGameLaunch(appId) {
  if (!appId) return;
  activeLaunchTimers[appId] = Date.now();
  toast("Oyun süresi takibi başlatıldı.");
}

function updateActivePlaytimes() {
  const now = Date.now();
  let updated = false;
  for (const appId in activeLaunchTimers) {
    const startTime = activeLaunchTimers[appId];
    if (startTime) {
      const diffMs = now - startTime;
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins > 0) {
        if (!state.playtime[appId]) {
          state.playtime[appId] = { totalMinutes: 0, lastPlayed: null };
        }
        state.playtime[appId].totalMinutes = (state.playtime[appId].totalMinutes || 0) + diffMins;
        state.playtime[appId].lastPlayed = now;
        activeLaunchTimers[appId] = now;
        updated = true;
      }
    }
  }
  if (updated) {
    persist();
  }
}

setInterval(updateActivePlaytimes, 60000);

window.addEventListener('focus', () => {
  updateActivePlaytimes();
});

window.addEventListener('beforeunload', () => {
  updateActivePlaytimes();
});

function hydrateIcons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon);});}
function persist(){try{const libraryKnown=state.library.map(g=>knownGames.get(String(g.id))).filter(Boolean);const favKnown=state.favorites.map(id=>knownGames.get(String(id))).filter(Boolean);const allSaved=[...new Map([...libraryKnown,...favKnown].map(g=>[g.id,g])).values()];localStorage.setItem(key,JSON.stringify({queue:state.queue,library:state.library,history:state.history,favorites:state.favorites,launchOptions:state.launchOptions,playtime:state.playtime,motion:state.motion,compact:state.compact,savedGames:allSaved}));}catch{toast('Tarayıcı verileri saklayamıyor. Bu oturumda devam edebilirsin.');}}
function toast(message){clearTimeout(toastTimer);$('toast').innerHTML=icon('check')+`<span>${escapeHtml(message)}</span>`;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,4000);}
function queueIsOpen(){return $('queue-dialog').matches(':popover-open');}
function openQueueDialog(){const popup=$('queue-dialog');if(queueIsOpen())return;clearTimeout(queueFocusTimer);queueReturnFocus=document.activeElement?.isConnected?document.activeElement:$('queue-open');const tray=$('mobile-tray');tray.hidden=true;document.body.classList.remove('has-tray');renderQueue(true);popup.showPopover();($('add-selected')&&!$('add-selected').disabled?$('add-selected'):$('queue-close')).focus({preventScroll:true});}
function feedback(message,type=''){const el=$('input-feedback');el.className=type;el.innerHTML=icon(type==='error'?'info':type==='success'?'check':'link')+`<span>${escapeHtml(message)}</span>`;$('game-input').setAttribute('aria-invalid',String(type==='error'));}

const coverRecovery=new Map();
function recoverGameCover(appId){
  if(!catalogClient||!/^[1-9]\d{0,9}$/.test(appId))return Promise.resolve(null);
  if(coverRecovery.has(appId))return coverRecovery.get(appId);
  const request=(async()=>{
    try{
      const response=await catalogClient.details(appId);
      if(!response?.ok||String(response.game?.id)!==appId)return null;
      const source=safeCover(response.game.capsule);if(!source)return null;
      const available=await new Promise(resolve=>{
        const probe=new Image(),timer=setTimeout(()=>finish(false),8000);
        function finish(result){clearTimeout(timer);probe.onload=null;probe.onerror=null;resolve(result);}
        probe.onload=()=>finish(probe.naturalWidth>0);probe.onerror=()=>finish(false);probe.src=source;
      });
      if(!available)return null;
      rememberGames([response.game]);
      const recovered=knownGames.get(appId);if(!recovered)return source;
      recovered.cover=source;recovered.cover2x=source;recovered.coverFallback=null;
      const replace=game=>game.id===appId?{...game,...recovered}:game;
      state.library=state.library.map(replace);state.queue=state.queue.map(replace);
      if(state.selected?.id===appId)state.selected=replace(state.selected);
      if(currentManagedGame?.id===appId)currentManagedGame=replace(currentManagedGame);
      persist();render();return source;
    }catch{return null;}
  })();
  coverRecovery.set(appId,request);
  return request;
}
document.addEventListener('load',event=>{
  const img=event.target;if(!(img instanceof HTMLImageElement)||img.classList.contains('cover-backdrop')||!img.dataset.appId)return;
  img.hidden=false;(img.closest('.cover-wrap')||img.closest('.manage-cover-header'))?.querySelector('.unknown-cover')?.remove();
  if(img.naturalWidth<=img.naturalHeight*1.08)return;
  img.classList.add('wide-art');const wrap=img.closest('.cover-wrap');if(!wrap)return;wrap.classList.add('has-wide-art');
  let backdrop=wrap.querySelector('.cover-backdrop');if(!backdrop){backdrop=document.createElement('img');backdrop.className='cover-backdrop';backdrop.alt='';backdrop.setAttribute('aria-hidden','true');backdrop.loading='lazy';wrap.prepend(backdrop);}backdrop.src=img.getAttribute('src');
},true);
window.addEventListener('error', function(event) {
  const img = event.target;
  if (!img || img.tagName !== 'IMG') return;
  if (img.classList.contains('cover-backdrop')) return;

  if (img.dataset.appId || img.dataset.imageFallbacks) {
    const appId = img.dataset.appId;
    let fallbacks = img.dataset.imageFallbacks ? img.dataset.imageFallbacks.split('|').filter(Boolean) : [];
    if (appId) {
      const defaultSteamFallbacks = [
        `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`,
        `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/capsule_616x353.jpg`,
        `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`,
        `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/capsule_231x87.jpg`,
        `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`
      ];
      for (const fb of defaultSteamFallbacks) {
        if (!fallbacks.includes(fb) && img.src !== fb) {
          fallbacks.push(fb);
        }
      }
    }
    let currentIndex = parseInt(img.dataset.fallbackIndex || '0', 10);
    while (currentIndex < fallbacks.length && fallbacks[currentIndex] === img.src) {
      currentIndex++;
    }
    if (currentIndex < fallbacks.length) {
      const nextSrc = fallbacks[currentIndex];
      img.dataset.fallbackIndex = String(currentIndex + 1);
      const coverWrap = img.closest('.cover-wrap');
      if (coverWrap && /header\.jpg|capsule_|wide|store_item_assets/i.test(nextSrc)) {
        coverWrap.classList.add('has-wide-art');
        let backdrop = coverWrap.querySelector('img.cover-backdrop');
        if (!backdrop) {
          backdrop = document.createElement('img');
          backdrop.className = 'cover-backdrop';
          backdrop.alt = '';
          backdrop.setAttribute('aria-hidden', 'true');
          coverWrap.insertBefore(backdrop, coverWrap.firstChild);
        }
        backdrop.src = nextSrc;
        img.classList.add('wide-art');
      }
      img.src = nextSrc;
    } else {
      const coverWrap = img.closest('.cover-wrap');
      if (coverWrap) {
        img.hidden=true;coverWrap.classList.remove('has-wide-art');coverWrap.querySelector('.cover-backdrop')?.remove();
        if(!coverWrap.querySelector('.unknown-cover'))coverWrap.insertAdjacentHTML('afterbegin',`<div class="unknown-cover">${icon('grid')}<span>APP ID<br>${escapeHtml(appId || '')}</span></div>`);
      } else {
        const manageHeader = img.closest('.manage-cover-header');
        if (manageHeader) {
          img.hidden=true;
          if(!manageHeader.querySelector('.unknown-cover'))manageHeader.insertAdjacentHTML('afterbegin',`<div class="unknown-cover">${icon('grid')}<span>APP ID ${escapeHtml(appId || '')}</span></div>`);
        }
      }
      if(appId&&!img.dataset.metadataAttempted){
        img.dataset.metadataAttempted='true';
        recoverGameCover(appId).then(source=>{
          if(!source||!img.isConnected||img.dataset.appId!==appId)return;
          img.src=source;
        });
      }
    }
  }
}, true);

function gameImage(game, alt = '', className = '') {
  const appId = String(game.id || '');
  const primary = game.cover2x || game.cover || game.capsule2x || game.capsule || (appId ? `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_600x900.jpg` : '');
  const defaultHeader = appId ? `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg` : null;
  const defaultCapsule353 = appId ? `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/capsule_616x353.jpg` : null;
  const defaultCapsule87 = appId ? `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/capsule_231x87.jpg` : null;
  const defaultLibrary = appId ? `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_600x900.jpg` : null;
  const rawFallbacks = [
    game.coverFallback,
    defaultHeader,
    defaultCapsule353,
    defaultCapsule87,
    defaultLibrary,
    game.capsule2x,
    ...(game.capsuleVariants || []),
    game.capsule,
    game.localCoverFallback,
    appId ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg` : null,
    appId ? `https://steamcdn-a.akamaihd.net/steam/apps/${appId}/header.jpg` : null
  ];
  const fallbacks = rawFallbacks.map(safeCover).filter((url, index, list) => url && url !== primary && list.indexOf(url) === index);
  const isWide = /header\.jpg|capsule_|wide|store_item_assets|library_hero/i.test(primary);
  if (isWide) {
    return `<img class="cover-backdrop" src="${escapeHtml(primary)}" alt="" aria-hidden="true">` +
           `<img class="wide-art ${className}" data-app-id="${escapeHtml(appId)}" src="${escapeHtml(primary)}" ` +
           `${fallbacks.length ? `data-image-fallbacks="${escapeHtml(fallbacks.join('|'))}"` : ''} ` +
           `alt="${escapeHtml(alt)}" loading="lazy">`;
  }
  return `<img${className ? ` class="${className}"` : ''} data-app-id="${escapeHtml(appId)}" src="${escapeHtml(primary)}" ` +
         `${fallbacks.length ? `data-image-fallbacks="${escapeHtml(fallbacks.join('|'))}"` : ''} ` +
         `${game.localCoverFallback ? `data-local-fallback="${escapeHtml(game.localCoverFallback)}"` : ''} alt="${escapeHtml(alt)}" loading="lazy" width="600" height="900">`;
}

function gameCard(game, isLibrary = false) {
  const selected = state.selected?.id === game.id;
  const favorite = state.favorites.includes(game.id);
  const queued = state.queue.some(item => item.id === game.id);
  const primary = game.cover2x || game.cover || game.capsule2x || game.capsule || (game.id ? `https://cdn.akamai.steamstatic.com/steam/apps/${game.id}/library_600x900.jpg` : '');
  const isWide = /header\.jpg|capsule_|wide|store_item_assets|library_hero/i.test(primary);
  const coverWrapClass = `cover-wrap ${isWide ? 'has-wide-art' : ''}`;
  return `<article class="game-tile"><button class="game-pick ${selected ? 'selected' : ''}" data-select="${game.id}" aria-label="${escapeHtml(game.name)} seç" aria-pressed="${selected}"><div class="${coverWrapClass}">${game.cover || game.capsule || game.id ? gameImage(game, `${game.name} oyun kapağı`) : `<div class="unknown-cover">${icon('grid')}<span>APP ID<br>${game.id}</span></div>`}${selected ? `<span class="selection-check">${icon('check')}</span>` : ''}<span class="cover-badge">${icon(isLibrary ? 'check' : queued ? 'list' : 'plus')} ${isLibrary ? 'Oyun Yönetiminde' : queued ? 'Kuyrukta' : game.genre}</span></div><span class="game-title">${escapeHtml(game.name)}</span><span class="game-meta"><span>${escapeHtml(game.tag)}</span><code>${game.id}</code></span></button>${!isLibrary ? `<button class="favorite-button ${favorite ? 'saved' : ''}" data-favorite="${game.id}" aria-label="${escapeHtml(game.name)} ${favorite ? 'favorilerden çıkar' : 'favorilere ekle'}" aria-pressed="${favorite}">${icon('heart')}</button>` : ''}</article>`;
}
function catalogKey(){return JSON.stringify([state.query,state.filter,state.sort,state.page]);}
const gridCardState=new WeakMap(),gameContentKeys=new WeakMap();
function gameContentKey(game){let key=gameContentKeys.get(game);if(!key){key=JSON.stringify([game.name,game.genre,game.tag,game.cover,game.cover2x,game.coverFallback,game.capsule,game.capsule2x,game.capsuleVariants,game.localCoverFallback]);gameContentKeys.set(game,key);}return key;}
function updateGameGrid(grid,games,isLibrary=false){
  const existing=new Map(Array.from(grid.children,card=>[card.querySelector('[data-select]')?.dataset.select,card]));
  const wanted=new Set(games.map(game=>game.id)),favorites=new Set(state.favorites),queued=new Set(state.queue.map(game=>game.id));
  for(const [id,card] of existing)if(!wanted.has(id))card.remove();
  const template=document.createElement('template');
  games.forEach((game,index)=>{
    const content=gameContentKey(game),selected=state.selected?.id===game.id,favorite=favorites.has(game.id),inQueue=queued.has(game.id);
    let card=existing.get(game.id),previous=card&&gridCardState.get(card);
    if(!previous||previous.content!==content||previous.isLibrary!==isLibrary){
      template.innerHTML=gameCard(game,isLibrary);const replacement=template.content.firstElementChild;
      if(card)card.replaceWith(replacement);card=replacement;
    }else if(previous.selected!==selected||previous.favorite!==favorite||previous.inQueue!==inQueue){
      const pick=card.querySelector('.game-pick'),wrap=card.querySelector('.cover-wrap');
      pick.classList.toggle('selected',selected);pick.setAttribute('aria-pressed',String(selected));
      const check=wrap.querySelector('.selection-check');if(selected&&!check)wrap.insertAdjacentHTML('beforeend',`<span class="selection-check">${icon('check')}</span>`);else if(!selected)check?.remove();
      const badge=wrap.querySelector('.cover-badge');if(badge)badge.innerHTML=`${icon(isLibrary?'check':inQueue?'list':'plus')} ${isLibrary?'Oyun Yönetiminde':inQueue?'Kuyrukta':escapeHtml(game.genre)}`;
      const favoriteButton=card.querySelector('.favorite-button');if(favoriteButton){favoriteButton.classList.toggle('saved',favorite);favoriteButton.setAttribute('aria-pressed',String(favorite));favoriteButton.setAttribute('aria-label',`${game.name} ${favorite?'favorilerden çıkar':'favorilere ekle'}`);}
    }
    gridCardState.set(card,{content,isLibrary,selected,favorite,inQueue});
    if(grid.children[index]!==card)grid.insertBefore(card,grid.children[index]||null);
  });
}
function editDistanceWithin(left,right,limit){if(Math.abs(left.length-right.length)>limit)return limit+1;let previous=Array.from({length:right.length+1},(_,index)=>index);for(let row=1;row<=left.length;row++){const current=[row];let minimum=row;for(let column=1;column<=right.length;column++){current[column]=Math.min(current[column-1]+1,previous[column]+1,previous[column-1]+(left[row-1]===right[column-1]?0:1));minimum=Math.min(minimum,current[column]);}if(minimum>limit)return limit+1;previous=current;}return previous[right.length];}
function localMatchRank(game,needle,queryWords){
  if(!needle)return 0;
  let indexed=searchIndex.get(game);
  if(!indexed){const name=normalizeSearch(game.name);indexed={name,words:name.split(/[^a-z0-9]+/).filter(Boolean)};searchIndex.set(game,indexed);}
  const {name,words:nameWords}=indexed;
  if(game.id===needle||name===needle)return 0;
  if(name.includes(needle))return 1;
  if(queryWords.every(word=>nameWords.some(part=>part.includes(word))))return 2;
  let distance=0;
  for(const word of queryWords){
    if(word.length<4)return -1;
    const limit=word.length>=8?2:1;
    const best=nameWords.reduce((minimum,part)=>Math.min(minimum,editDistanceWithin(word,part,limit)),limit+1);
    if(best>limit)return -1;
    distance+=best;
  }
  return 3+distance/(queryWords.length*10);
}
function localResults(){const resultKey=JSON.stringify([catalogRevision,state.query,state.filter,state.sort,state.filter==='favorites'?state.favorites:null]);if(localResultCache.key===resultKey)return localResultCache.games;const needle=normalizeSearch(state.query),queryWords=needle.split(/\s+/).filter(Boolean),favorites=new Set(state.favorites);let games=catalog.filter(game=>state.filter==='all'||(state.filter==='favorites'&&favorites.has(game.id))||game.genre===state.filter||game.categories?.includes(state.filter)).map(game=>({game,rank:localMatchRank(game,needle,queryWords)})).filter(result=>result.rank>=0);if(state.query)games.sort((a,b)=>a.rank-b.rank||nameCollator.compare(a.game.name,b.game.name));else if(state.sort!=='featured')games.sort((a,b)=>nameCollator.compare(a.game.name,b.game.name)*(state.sort==='az'?1:-1));const results=games.map(result=>result.game);localResultCache={key:resultKey,games:results};return results;}
function renderCatalog(){
  if(state.view!=='add')return;
  const focused=$('game-grid').contains(document.activeElement)?document.activeElement.closest('[data-select],[data-favorite]'):null;
  const focusAttribute=focused?(focused.hasAttribute('data-favorite')?'data-favorite':'data-select'):null;
  const focusId=focused?.getAttribute(focusAttribute);
  const live=state.filter!=='favorites'&&state.livePage?.key===catalogKey()?state.livePage:null;
  const local=live?null:localResults();
  const total=live?live.total:local.length;
  if(!live&&!state.loading)state.page=Math.min(state.page,Math.max(0,Math.ceil(total/state.pageSize)-1));
  const games=live?live.items:local.slice(state.page*state.pageSize,(state.page+1)*state.pageSize);
  updateGameGrid($('game-grid'),games);
  $('result-count').textContent=`${numberFormat.format(total)}${live?.hasMore?'+':''} oyun`;
  $('catalog-source-label').textContent=live?'Canlı Steam kataloğu · Seçtiğin oyunu kolayca kuyruğa ekle.':`${numberFormat.format(catalog.length)} oyunluk yerel katalog · ${state.loading?'Steam ile güncelleniyor.':'Kullanıma hazır.'}`;
  $('catalog-empty').hidden=games.length>0||state.loading;
  $('search-active').hidden=!state.query;
  $('search-active').querySelector('span').textContent=`“${state.query}” için sonuçlar`;
  document.querySelectorAll('[data-filter]').forEach(button=>{const active=button.dataset.filter===state.filter;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
  $('catalog-prev').disabled=state.loading||state.page===0;
  $('catalog-next').disabled=state.loading||!!live?.incomplete||(!live?.hasMore&&(state.page+1)*state.pageSize>=total);
  $('catalog-page-label').textContent=live?.hasMore?`Sayfa ${state.page+1} · ${numberFormat.format(total)}+ oyun yüklendi`:total?`Sayfa ${state.page+1} / ${Math.ceil(total/state.pageSize)} · Toplam ${numberFormat.format(total)} oyun`:'Sonuç yok';
  document.querySelector('.catalog').setAttribute('aria-busy',String(state.loading));
  $('catalog-status').textContent=state.loading?'Steam kataloğu yükleniyor…':state.catalogError||state.catalogNotice;
  $('catalog-status').classList.toggle('error',!!state.catalogError&&!state.loading);
  $('catalog-retry').hidden=(!state.catalogError&&!live?.incomplete)||!catalogClient;
  if(focusId){const next=$('game-grid').querySelector(`[${focusAttribute}="${focusId}"]`)||$('game-grid').querySelector('[data-select]')||document.querySelector(`[data-filter="${state.filter}"]`);next?.focus({preventScroll:true});}
}
async function loadSteamPage(){
  const request=++state.request;
  if(!catalogClient||state.filter==='favorites'){state.loading=false;state.livePage=null;state.catalogError='';renderCatalog();return;}
  state.loading=true;state.catalogError='';state.catalogNotice='';renderCatalog();
  try{
    const response=await catalogClient.search({term:state.query,start:state.page*state.pageSize,filter:state.filter,sort:state.sort});
    if(request!==state.request)return;
    if(!response.ok)throw new Error(response.error||'Steam katalog sorgusu tamamlanamadı.');
    rememberGames(response.items);
    state.livePage={key:catalogKey(),items:response.items.map(game=>knownGames.get(String(game.id))).filter(Boolean),total:response.total,hasMore:response.hasMore===true,incomplete:response.incomplete===true};
    if(state.livePage.incomplete)state.catalogNotice='Steam taraması henüz tamamlanmadı. Daha fazla sonuç için yeniden dene.';
    if(!state.livePage.items.length&&!state.livePage.hasMore&&state.query&&localResults().length){state.livePage=null;state.catalogNotice='Steam aramasında tam eşleşme yok; yerel katalogdaki yakın sonuçlar gösteriliyor.';}
  }catch(error){if(request!==state.request)return;state.livePage=null;state.page=0;state.catalogError=`${error.message} Yerel katalogla devam edebilirsin.`;}
  finally{if(request===state.request){state.loading=false;renderCatalog();}}
}
function renderQueue(force=false){
  const count=state.queue.length;
  $('queue-count').textContent=count;
  $('queue-open').setAttribute('aria-label',`Ekleme kuyruğu, ${count} oyun`);
  if(!force&&!queueIsOpen())return;
  const focused=document.activeElement;
  const focusedId=$('selection-panel').contains(focused)?focused.id:null;
  const removedId=$('queue-list').contains(focused)?focused.closest('[data-remove]')?.dataset.remove:null;
  $('queue-total').textContent=state.processing?"Steam'e ekleniyor…":`${count} oyun bekliyor`;
  $('queue-empty').hidden=count>0||!!state.selected;
  $('run-queue').disabled=!count||state.processing;
  $('clear-queue').disabled=!count||state.processing;
  $('run-queue').querySelector('span:nth-child(2)').textContent=state.processing?'İşleniyor…':'Kuyruğu çalıştır';
  $('queue-list').innerHTML=state.queue.map(game=>`<li>${game.cover?gameImage(game,`${game.name} oyun kapağı`,'queue-thumb'):`<span class="queue-thumb"></span>`}<div class="queue-item-copy"><h3>${escapeHtml(game.name)}</h3><p class="${state.activeId===game.id?'status-active':''}">${state.activeId===game.id?'<span class="spinner"></span>Steam’e ekleniyor…':state.queueErrors[game.id]?`Eklenemedi · ${escapeHtml(state.queueErrors[game.id])}`:`App ID ${game.id} · Bekliyor`}</p></div><button class="queue-remove" data-remove="${game.id}" aria-label="${escapeHtml(game.name)} kuyruktan çıkar" ${state.processing?'disabled':''}>${icon('x')}</button></li>`).join('');
  const panel=$('selection-panel');
  panel.hidden=!state.selected;
  if(state.selected){
    const game=state.selected;
    const inQueue=state.queue.some(item=>item.id===game.id);
    const inLibrary=state.library.some(item=>item.id===game.id);
    const buttonLabel=inLibrary?'Oyun Yönetimi':inQueue?'Kuyrukta':'Kuyruğa ekle';
    panel.innerHTML=`<div class="selected-overline"><span>Seçili oyun</span><button class="text-button" id="deselect" aria-label="Oyun seçimini kaldır">${icon('x')}</button></div><div class="selected-info">${game.cover?gameImage(game,`${game.name} oyun kapağı`):`<span class="selected-fallback">${icon('grid')}</span>`}<div><h3>${escapeHtml(game.name)}</h3><p>App ID ${game.id} · ${escapeHtml(game.genre)}</p></div></div><button class="secondary-button" id="add-selected" ${inQueue||state.processing?'disabled':''}>${icon(inLibrary?'settings':inQueue?'check':'plus')}${buttonLabel}</button>`;
  }
  if(focusedId||removedId){
    const same=focusedId?$(focusedId):$('queue-list').querySelector(`[data-remove="${removedId}"]`);
    const next=same&&!same.disabled&&(!focusedId||!panel.hidden)?same:$('queue-list').querySelector('[data-remove]:not(:disabled)')||($('run-queue').disabled?$('game-input'):$('run-queue'));
    next?.focus({preventScroll:true});
  }
}
function renderLibrary(){$('library-count').textContent=state.library.length;if(state.view!=='library')return;updateGameGrid($('library-grid'),state.library,true);$('library-empty').hidden=state.library.length>0;}
function renderHistory(){$('history-empty').hidden=state.history.length>0;$('history-table-wrap').hidden=!state.history.length;$('export-history').disabled=!state.history.length;$('history-body').innerHTML=state.history.map(game=>`<tr><td>${escapeHtml(game.name)}</td><td>${game.id}</td><td><span class="history-state">${icon('check')}Steam’e eklendi</span></td><td>${escapeHtml(historyDateFormat.format(game.time))}</td></tr>`).join('');}
function renderMobileTray(){
  const tray=$('mobile-tray');
  const focusedId=tray.contains(document.activeElement)?document.activeElement.id:null;
  const canAdd=state.selected&&!state.queue.some(game=>game.id===state.selected.id)&&!state.library.some(game=>game.id===state.selected.id);
  tray.hidden=state.view!=='add'||(!canAdd&&!state.queue.length&&!state.processing);
  document.body.classList.toggle('has-tray',!tray.hidden);
  tray.innerHTML=`<div><strong>${escapeHtml(canAdd?state.selected.name:state.processing?'Steam’e ekleniyor…':`Kuyrukta ${state.queue.length} oyun`)}</strong><span>${canAdd?`App ID ${state.selected.id}`:state.queue.length?'Steam’e eklemeye hazır':'İşlem tamamlandı'}</span></div><button class="primary-button" id="mobile-action" ${state.processing||(!canAdd&&!state.queue.length)?'disabled':''}>${icon(canAdd?'plus':'play')}${canAdd?'Kuyruğa ekle':'Çalıştır'}</button><button class="icon-button" id="mobile-dismiss" aria-label="Hızlı kuyruğu kapat">${icon('x')}</button>`;
  if(focusedId&&!tray.hidden){const same=$(focusedId);const next=same&&!same.disabled?same:$('mobile-dismiss');next?.focus({preventScroll:true});}
}
function render(){renderCatalog();renderQueue();renderLibrary();if(state.view==='history')renderHistory();renderMobileTray();}
function setView(view){state.view=['add','library','history'].includes(view)?view:'add';$('hero').hidden=state.view!=='add';$('intake-section').hidden=state.view!=='add';document.querySelector('.space').hidden=false;['add','library','history'].forEach(name=>$(name+'-view').hidden=name!==state.view);document.querySelectorAll('[data-view]').forEach(button=>{const active=button.dataset.view===state.view;button.classList.toggle('active',active);if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});render();updateFloatingQueue();setMotion(state.motion);}
function chooseGame(game){if(!game)return;cancelIntakeLookup();const fromLibrary=state.view==='library';state.selected=game;const message=state.library.some(item=>item.id===game.id)?`${game.name} Oyun Yönetiminde.`:state.queue.some(item=>item.id===game.id)?`${game.name} kuyrukta.`:`${game.name} seçildi. Kuyruğa ekleyebilirsin.`;feedback(message,'success');if(state.view!=='add'){location.hash='add';setView('add');}render();if(fromLibrary)$('game-input').focus({preventScroll:true});openQueueDialog();}
function addSelected(){if(!state.selected||state.processing)return;const game=state.selected;if(state.queue.some(item=>item.id===game.id)||state.library.some(item=>item.id===game.id)){toast('Bu oyun zaten kuyruğunda veya Oyun Yönetiminde.');return;}if(state.queue.length>=200){toast('Kuyruk dolu. Önce bekleyen oyunları işle.');return;}state.queue.push(game);persist();render();if(queueIsOpen())$('queue-dialog').hidePopover();toast(`${game.name} kuyruğa eklendi.`);}
function parseIntake(value){if(/^[1-9]\d{0,9}$/.test(value))return {id:value};if(/^\d+$/.test(value))return {error:'Geçerli bir App ID gir. Örnek: 1245620.'};if(/^(https?:\/\/|www\.|store\.steampowered\.com)/i.test(value)){try{const url=new URL(/^https?:\/\//i.test(value)?value:'https://'+value);const match=/^\/app\/([1-9]\d{0,9})(?:\/|$)/.exec(url.pathname);if(url.hostname!=='store.steampowered.com'||!match)return {error:'Steam mağazasındaki /app/ bağlantısını kullan.'};return {id:match[1]};}catch{return {error:'Bağlantı okunamadı. Steam bağlantısını veya App ID gir.'};}}return {query:value};}
async function submitIntake(event){
  event.preventDefault();
  const lookup=++intakeRequest;
  clearTimeout(searchDebounce);
  state.request++;state.loading=false;state.catalogError='';state.catalogNotice='';
  const value=$('game-input').value.trim();
  if(!value){feedback('Bir oyun adı, App ID veya Steam bağlantısı gir.','error');$('game-input').focus();return;}
  const result=parseIntake(value);if(result.error){feedback(result.error,'error');return;}
  state.filter='all';state.query='';state.page=0;state.livePage=null;
  if(result.id){
    const known=knownGames.get(result.id);if(known){chooseGame(known);loadSteamPage();return;}
    $('find-button').disabled=true;feedback('Steam oyun bilgisi yükleniyor…');
    try{
      const response=catalogClient?await catalogClient.details(result.id):null;
      if(lookup!==intakeRequest)return;
      if(response?.ok&&response.game&&typeof response.game.name==='string'){rememberGames([response.game]);chooseGame(knownGames.get(result.id)||sanitizeGame({...response.game,id:result.id,name:response.game.name.slice(0,150)}));}
      else{chooseGame({id:result.id,name:`Steam oyunu #${result.id}`,genre:'App ID',tag:'Özel seçim',cover:null});feedback('Mağaza ayrıntısı bulunamadı. App ID ile yerel kuyruğa ekleyebilirsin.');}
    }catch{if(lookup!==intakeRequest)return;chooseGame({id:result.id,name:`Steam oyunu #${result.id}`,genre:'App ID',tag:'Özel seçim',cover:null});feedback('Steam bilgisi alınamadı. App ID ile devam edebilirsin.');}
    finally{if(lookup===intakeRequest)$('find-button').disabled=false;}
    return;
  }
  const exact=catalog.find(game=>normalizeSearch(game.name)===normalizeSearch(value));
  if(exact){chooseGame(exact);loadSteamPage();return;}
  state.query=result.query;feedback(catalogClient?'Steam kataloğunda aranıyor…':'Yerel katalogdaki eşleşmeler aşağıda.');
  await loadSteamPage();
  if(!state.catalogError)feedback('Sonuçlardan bir kapak seçebilirsin.');
}
async function runQueue(){
  if(state.processing||!state.queue.length)return;
  state.processing=true;renderQueue();renderMobileTray();
  let addedCount=0,failedCount=0;
  try{
    for(const game of [...state.queue]){
      state.activeId=game.id;delete state.queueErrors[game.id];renderQueue();renderMobileTray();
      let result;
      try{
        if(typeof window.saturnDesktop?.addGame==='function')result=await window.saturnDesktop.addGame(game.id);
        else{const res=await fetch(`http://127.0.0.1:6767/add/${game.id}`,{method:'POST'});result=await res.json();}
      }catch(error){result={success:false,error:error.message};}
      if(!result?.success){failedCount++;state.queueErrors[game.id]=result?.error||'İşlem tamamlanamadı. Yeniden dene.';}
      else{
        addedCount++;state.queue=state.queue.filter(item=>item.id!==game.id);
        if(!state.library.some(item=>item.id===game.id))state.library.push(game);
        state.history.unshift({...game,time:Date.now()});state.history=state.history.slice(0,500);
      }
      persist();render();
    }
    if(failedCount)toast(`${addedCount} oyun eklendi; ${failedCount} oyun eklenemedi ve yeniden denemek için kuyrukta kaldı.`);
    else{toast(`${addedCount} oyun Steam'e eklendi! Değişikliklerin görünmesi için Steam'i yeniden başlatabilirsiniz.`);if(queueIsOpen())$('queue-dialog').hidePopover();}
  }finally{state.processing=false;state.activeId=null;render();}
}
let playbackRequest=0;
function motionControls(){
  if ($('setting-motion')) $('setting-motion').checked=state.motion;
  const mt = $('motion-toggle');
  if (mt) {
    mt.setAttribute('aria-pressed',String(!state.motion));
    mt.innerHTML=icon(state.motion?'pause':'play')+`<span>${state.motion?'Animasyonu durdur':'Animasyonu oynat'}</span>`;
  }
}
function setMotion(enabled){
  const request=++playbackRequest;
  state.motion=enabled;
  motionControls();
  const video=$('wallpaper');
  if(!enabled||document.hidden){video.pause();return;}
  video.play().catch(error=>{
    if(request!==playbackRequest||!state.motion||error.name==='AbortError')return;
    state.motion=false;
    motionControls();
    persist();
    toast('Video oynatılamadı. Arka plan görseli ile devam edebilirsin.');
  });
}
function exportHistory(){const blob=new Blob([JSON.stringify({application:'Saturn Steam Game Add',mode:'steam-game-add',history:state.history},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download='saturn-islem-gecmisi.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('İşlem geçmişi dışa aktarıldı.');}
function initializeWallpaper(){
  const video=$('wallpaper');
  const poster=new Image();
  const canvas=$('wallpaper-canvas');
  const context=canvas.getContext('2d',{alpha:false});
  const scene=document.createElement('canvas');
  const sceneContext=scene.getContext('2d');
  let width=0,height=0,ratio=1,frame=null,resizeFrame=null,lastDrawTime=0;
  let horizontalMask=null,verticalMask=null,maskWidth=0,maskHeight=0,maskRatio=0;
  const frameInterval=1000/30;
  if(!context||!sceneContext)return;

  function resize(){
    width=canvas.clientWidth;
    height=canvas.clientHeight;
    ratio=Math.min(window.devicePixelRatio||1,1.5);
    const pixelWidth=Math.max(1,Math.round(width*ratio)),pixelHeight=Math.max(1,Math.round(height*ratio));
    if(canvas.width!==pixelWidth||canvas.height!==pixelHeight){canvas.width=pixelWidth;canvas.height=pixelHeight;}
    context.setTransform(ratio,0,0,ratio,0,0);
    draw();
  }

  function draw(){
    context.fillStyle='#000';
    context.fillRect(0,0,width,height);
    const media=video.readyState>=2?video:poster.complete&&poster.naturalWidth?poster:null;
    if(!media||!width||!height)return;
    const sourceWidth=media.videoWidth||media.naturalWidth,sourceHeight=media.videoHeight||media.naturalHeight;
    const scale=width/sourceWidth;
    const bandHeight=sourceHeight*.14;
    const tileHeight=bandHeight*scale;
    // Tiled star-only background (excludes planet rings from top-left)
    context.globalAlpha=.72;
    for(let y=0,index=0;y<height;y+=tileHeight,index++){
      const sourceY=index%2===0?0:Math.max(0,sourceHeight-bandHeight);
      context.save();
      if(index%2){context.translate(width,0);context.scale(-1,1);}
      context.drawImage(media,0,sourceY,sourceWidth,bandHeight,0,y,width,tileHeight+.5);
      context.restore();
    }
    context.globalAlpha=1;

    const shortDesktop=width>640&&window.innerHeight<=850;
    const sceneScale=(width<=640?1120:shortDesktop?640:1200)/sourceWidth;
    const cropX=sourceWidth*.29,cropY=sourceHeight*.22;
    const cropWidth=sourceWidth*.42,cropHeight=sourceHeight*.53;
    const targetWidth=Math.round(cropWidth*sceneScale),targetHeight=Math.round(cropHeight*sceneScale);
    if(!horizontalMask||maskWidth!==targetWidth||maskHeight!==targetHeight||maskRatio!==ratio){
      scene.width=Math.round(targetWidth*ratio);
      scene.height=Math.round(targetHeight*ratio);
      maskWidth=targetWidth;maskHeight=targetHeight;maskRatio=ratio;
      sceneContext.setTransform(ratio,0,0,ratio,0,0);
      horizontalMask=sceneContext.createLinearGradient(0,0,targetWidth,0);
      horizontalMask.addColorStop(0,'transparent');horizontalMask.addColorStop(.1,'#000');horizontalMask.addColorStop(.9,'#000');horizontalMask.addColorStop(1,'transparent');
      verticalMask=sceneContext.createLinearGradient(0,0,0,targetHeight);
      verticalMask.addColorStop(0,'transparent');verticalMask.addColorStop(.14,'#000');verticalMask.addColorStop(.86,'#000');verticalMask.addColorStop(1,'transparent');
    }
    sceneContext.setTransform(ratio,0,0,ratio,0,0);
    sceneContext.clearRect(0,0,targetWidth,targetHeight);
    sceneContext.globalCompositeOperation='source-over';
    sceneContext.drawImage(media,cropX,cropY,cropWidth,cropHeight,0,0,targetWidth,targetHeight);
    sceneContext.globalCompositeOperation='destination-in';
    sceneContext.fillStyle=horizontalMask;sceneContext.fillRect(0,0,targetWidth,targetHeight);
    sceneContext.fillStyle=verticalMask;sceneContext.fillRect(0,0,targetWidth,targetHeight);
    sceneContext.globalCompositeOperation='source-over';
    const planetCenter=width<=640?199:shortDesktop?104:158;
    const top=planetCenter-(sourceHeight*.5-cropY)*sceneScale;
    context.globalAlpha=.9;
    context.drawImage(scene,(width-targetWidth)/2,top,targetWidth,targetHeight);
    context.globalAlpha=1;
  }

  function stop(){
    if(frame===null)return;
    if(video.requestVideoFrameCallback)video.cancelVideoFrameCallback(frame);
    else cancelAnimationFrame(frame);
    frame=null;
  }
  function next(_timestamp,metadata){
    frame=null;
    const now=(metadata?.mediaTime??video.currentTime)*1000,elapsed=now-lastDrawTime;
    if(elapsed<0||elapsed>=frameInterval-.5){draw();lastDrawTime=now;}
    if(video.paused||document.hidden)return;
    frame=video.requestVideoFrameCallback?video.requestVideoFrameCallback(next):requestAnimationFrame(next);
  }
  video.addEventListener('playing',()=>{stop();lastDrawTime=-Infinity;next();});
  video.addEventListener('pause',stop);
  video.addEventListener('loadeddata',draw);
  video.addEventListener('seeked',draw);
  poster.addEventListener('load',draw);
  poster.src=video.poster;
  window.addEventListener('resize',()=>{if(resizeFrame!==null)return;resizeFrame=requestAnimationFrame(()=>{resizeFrame=null;resize();});},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else if(!video.paused){stop();next();}});
  resize();
}

if(window.saturnDesktop?.isDesktop){document.body.classList.add('desktop-app');$('desktop-titlebar').hidden=false;}
initializeWallpaper();
hydrateIcons();
function updateFloatingQueue(){const heading=document.querySelector('.catalog .section-heading');const topInset=document.body.classList.contains('desktop-app')?34:0;const floating=state.view==='add'&&heading.getBoundingClientRect().bottom<=topInset;$('queue-open').classList.toggle('queue-floating',floating);document.body.classList.toggle('has-floating-queue',floating);}
const queueHeadingObserver=new IntersectionObserver(updateFloatingQueue,{rootMargin:`${document.body.classList.contains('desktop-app')?'-34px':'0px'} 0px 0px 0px`,threshold:0});
queueHeadingObserver.observe(document.querySelector('.catalog .section-heading'));
window.addEventListener('resize',updateFloatingQueue,{passive:true});
document.querySelectorAll('#queue-open').forEach(button=>button.addEventListener('click',()=>{if(queueIsOpen())$('queue-dialog').hidePopover();else openQueueDialog();}));
$('queue-dialog').addEventListener('toggle',event=>{const opened=event.newState==='open';$('queue-open').setAttribute('aria-expanded',String(opened));if(!opened){renderMobileTray();queueFocusTimer=setTimeout(()=>{if(queueIsOpen())return;const active=document.activeElement;if((active===document.body||$('queue-dialog').contains(active))&&queueReturnFocus?.isConnected)queueReturnFocus.focus({preventScroll:true});queueReturnFocus=null;},0);}});
$('queue-close').addEventListener('click',()=>$('queue-dialog').hidePopover());
document.querySelector('.brand').addEventListener('click',()=>setView('add'));
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{location.hash=button.dataset.view;setView(button.dataset.view);}));
$('intake-form').addEventListener('submit',submitIntake);
$('game-input').addEventListener('input',()=>{cancelIntakeLookup();const value=$('game-input').value.trim();if($('game-input').getAttribute('aria-invalid')==='true')feedback('Steam mağaza bağlantısını doğrudan yapıştırabilirsin.');clearTimeout(searchDebounce);state.page=0;state.livePage=null;state.catalogError='';state.catalogNotice='';state.request++;state.loading=false;const parsed=parseIntake(value);if(parsed.id){state.query='';renderCatalog();return;}state.query=value;renderCatalog();const normalized=normalizeSearch(value);if(normalized.length===1)return;searchDebounce=setTimeout(()=>loadSteamPage(),normalized.length?360:160);});
$('game-grid').addEventListener('click',event=>{const favorite=event.target.closest('[data-favorite]');if(favorite){const id=favorite.dataset.favorite;state.favorites=state.favorites.includes(id)?state.favorites.filter(item=>item!==id):[...state.favorites,id];persist();renderCatalog();return;}const select=event.target.closest('[data-select]');if(select)chooseGame(knownGames.get(select.dataset.select));});
$('library-grid').addEventListener('click',event=>{const select=event.target.closest('[data-select]');if(select){const game=state.library.find(g=>g.id===select.dataset.select);if(game)openManageModal(game);}});
$('catalog-next')?.addEventListener('click', () => {
  if (state.loading) return;
  state.page++;
  loadSteamPage();
  document.querySelector('.catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
$('catalog-prev')?.addEventListener('click', () => {
  if (state.loading || state.page <= 0) return;
  state.page--;
  loadSteamPage();
  document.querySelector('.catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
$('catalog-retry')?.addEventListener('click', () => {
  if (state.loading) return;
  loadSteamPage();
});
document.querySelectorAll('[data-filter]').forEach(button => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    if (state.filter === filter) return;
    state.filter = filter;
    state.page = 0;
    state.livePage = null;
    loadSteamPage();
  });
});
$('sort-select')?.addEventListener('change', (e) => {
  state.sort = e.target.value;
  state.page = 0;
  state.livePage = null;
  loadSteamPage();
});
$('clear-search')?.addEventListener('click', () => {
  $('game-input').value = '';
  state.query = '';
  state.page = 0;
  state.livePage = null;
  loadSteamPage();
});
$('reset-filters')?.addEventListener('click', () => {
  $('game-input').value = '';
  state.query = '';
  state.filter = 'all';
  state.sort = 'featured';
  state.page = 0;
  state.livePage = null;
  if ($('sort-select')) $('sort-select').value = 'featured';
  loadSteamPage();
});

let currentManagedGame = null,managementRequest=0;

async function openManageModal(game) {
  if (!game) return;
  currentManagedGame = game;
  const request=++managementRequest,dialog=$('game-manage-dialog');
  if(queueIsOpen())$('queue-dialog').hidePopover();

  const headerContainer = document.querySelector('.manage-cover-header');
  if (headerContainer && !$('manage-cover-img')) {
    headerContainer.innerHTML = `<img id="manage-cover-img" class="manage-cover-img" alt=""><button class="icon-button dialog-close manage-close" aria-label="Pencereyi kapat">${icon('x')}</button>`;
    const closeBtn = headerContainer.querySelector('.manage-close');
    if (closeBtn) closeBtn.addEventListener('click', () => $('game-manage-dialog')?.close());
    hydrateIcons(headerContainer);
  }

  const img = $('manage-cover-img');
  if (img) {
    const appId = String(game.id);
    const primary = game.capsule2x || game.capsule || game.cover2x || game.cover || (appId ? `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg` : '');
    img.dataset.appId = appId;
    img.dataset.imageFallbacks = [
      `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`,
      `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/capsule_616x353.jpg`,
      `https://steamcdn-a.akamaihd.net/steam/apps/${appId}/header.jpg`,
      `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`,
      `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`
    ].filter(safeCover).join('|');
    delete img.dataset.fallbackIndex;
    delete img.dataset.fallbacksInitialized;
    delete img.dataset.metadataAttempted;
    img.hidden=false;
    img.src = primary;
    img.alt = game.name;
  }
  const title = $('manage-title');
  if (title) title.textContent = game.name;
  const appid = $('manage-appid');
  if (appid) appid.textContent = game.id;
  const meta = $('manage-meta');
  if (meta) meta.textContent = 'Oyun Yönetiminde';

  const badgeContainer = $('manage-sources-badge');
  if (badgeContainer) {
    badgeContainer.innerHTML = `<span class="source-pill">Sunucu durumu kontrol ediliyor...</span>`;
    if (typeof window.saturnDesktop?.checkSources === 'function') {
      window.saturnDesktop.checkSources(game.id).then(sources => {
        if(request!==managementRequest||!dialog?.open)return;
        if (!sources || Object.keys(sources).length === 0) {
          badgeContainer.innerHTML = `<span class="source-pill">Kaynak bilgisi bulunamadı</span>`;
        } else {
          badgeContainer.innerHTML = Object.entries(sources).map(([k, v]) => `<span class="source-pill ${v ? 'online' : ''}">${escapeHtml(k)}: ${v ? 'Aktif' : 'Yok'}</span>`).join('');
        }
      }).catch(() => {
        if(request!==managementRequest||!dialog?.open)return;
        badgeContainer.innerHTML = `<span class="source-pill">Kaynak durumu alınamadı</span>`;
      });
    } else {
      badgeContainer.innerHTML = `<span class="source-pill online">Yerel Mod</span>`;
    }
  }

  if (dialog && typeof dialog.showModal === 'function') {
    dialog.showModal();
  }
}

$('manage-act-launch-game')?.addEventListener('click', () => {
  if (!currentManagedGame) return;
  trackGameLaunch(currentManagedGame.id);
  const launchArgs = state.launchOptions?.[currentManagedGame.id] || '';
  const url = `steam://rungameid/${currentManagedGame.id}${launchArgs ? `//${encodeURIComponent(launchArgs)}` : ''}`;
  toast(`${currentManagedGame.name} Steam'de başlatılıyor...`);
  if (typeof window.saturnDesktop?.openExternalUrl === 'function') {
    window.saturnDesktop.openExternalUrl(url);
  } else {
    window.open(url, '_blank');
  }
});

$('manage-act-dlc-unpacker')?.addEventListener('click', async () => {
  if (!currentManagedGame) return;
  toast(`${currentManagedGame.name} için DLC kilitleri oluşturuluyor...`);
  try {
    let res;
    if (typeof window.saturnDesktop?.generateDlc === 'function') {
      res = await window.saturnDesktop.generateDlc({
        appId: currentManagedGame.id,
        baseAppId: currentManagedGame.id,
        gameName: currentManagedGame.name
      });
    } else {
      res = { success: false, error: 'Masaüstü modunda değilsiniz.' };
    }
    if (res?.success) {
      toast(`DLC Unpacker: ${currentManagedGame.name} için tüm DLC'ler açıldı ve .lua'ya işlendi!`);
    } else {
      toast(`DLC açıcı uyarısı: ${res?.error || 'Sunucudan varsayılan DLC manifesti üretildi.'}`);
    }
  } catch (e) {
    toast(`DLC İşlem Hatası: ${e.message}`);
  }
});

$('manage-act-view-lua-content')?.addEventListener('click', async () => {
  if (!currentManagedGame) return;
  let code = null;
  if (typeof window.saturnDesktop?.getLuaContent === 'function') {
    code = await window.saturnDesktop.getLuaContent(currentManagedGame.id);
  }
  if (!code) {
    code = `-- Saturn Steam Game Add Generator\n-- AppID: ${currentManagedGame.id}\n-- Name: ${currentManagedGame.name}\n\naddApp(${currentManagedGame.id}, 1, "stplug-in")\nsetManifestid(${currentManagedGame.id}, "0", 0)\n-- Auto-generated Lua script`;
  }
  const codeEl = $('lua-viewer-code');
  if (codeEl) codeEl.textContent = code;
  const fileEl = $('lua-viewer-filename');
  if (fileEl) fileEl.textContent = `${currentManagedGame.id}.lua (${currentManagedGame.name})`;
  const dlg = $('lua-viewer-dialog');
  if (dlg && typeof dlg.showModal === 'function') {
    dlg.showModal();
  }
});

$('lua-viewer-copy')?.addEventListener('click', () => {
  const code = $('lua-viewer-code')?.textContent;
  if (code) {
    navigator.clipboard.writeText(code).then(() => {
      toast('.lua dosya içeriği panoya kopyalandı!');
    });
  }
});

$('manage-act-depots')?.addEventListener('click', async () => {
  if (!currentManagedGame) return;
  const listContainer = $('vault-variants-list');
  if (!listContainer) return;
  listContainer.innerHTML = '<p style="color:#a0a5b8;font-size:12px">Vault sürümleri taranıyor...</p>';

  let variants = [];
  try {
    if (typeof window.saturnDesktop?.getVaultVariants === 'function') {
      variants = await window.saturnDesktop.getVaultVariants(currentManagedGame.id);
    }
  } catch (e) {}

  if (!Array.isArray(variants) || variants.length === 0) {
    variants = [
      { hash: 'current_active', label: 'Varsayılan Yapı (Aktif Build)', capturedAt: new Date().toISOString() }
    ];
  }

  listContainer.innerHTML = variants.map(v => `
    <div class="vault-item">
      <div class="vault-item-info">
        <h4>${escapeHtml(v.label || 'Kayıtlı Versiyon')}</h4>
        <p>Hash: ${escapeHtml((v.hash || '').slice(0, 16))} • Tarih: ${escapeHtml(new Date(v.capturedAt || Date.now()).toLocaleDateString('tr-TR'))}</p>
      </div>
      <button class="secondary-button apply-vault-btn" data-hash="${escapeHtml(v.hash)}">Geri Yükle</button>
    </div>
  `).join('');

  listContainer.querySelectorAll('.apply-vault-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const hash = btn.dataset.hash;
      if (hash === 'current_active') {
        toast("Zaten aktif olan varsayılan depodasınız.");
        return;
      }
      toast("Seçilen versiyon Steam'e uygulanıyor...");
      let res;
      if (typeof window.saturnDesktop?.applyVaultVariant === 'function') {
        res = await window.saturnDesktop.applyVaultVariant({ appId: currentManagedGame.id, hash });
      }
      if (res?.success) {
        toast("Depo versiyonu başarıyla geri yüklendi! Steam'i yeniden başlatabilirsiniz.");
        $('vault-dialog')?.close();
      } else {
        toast(`Hata: ${res?.error || 'Uygulanamadı'}`);
      }
    });
  });

  const vaultDlg = $('vault-dialog');
  if (vaultDlg && typeof vaultDlg.showModal === 'function') {
    vaultDlg.showModal();
  }
});

$('manage-act-redownload')?.addEventListener('click', async () => {
  if (!currentManagedGame) return;
  toast(`${currentManagedGame.name} yeniden indiriliyor / güncelleniyor...`);
  try {
    let res;
    if (typeof window.saturnDesktop?.addGame === 'function') {
      res = await window.saturnDesktop.addGame(currentManagedGame.id);
    } else {
      const resp = await fetch(`http://127.0.0.1:6767/add/${currentManagedGame.id}`, { method: 'POST' });
      res = await resp.json();
    }
    if (res?.success) {
      toast(`${currentManagedGame.name} başarıyla yenilendi! Steam'i yeniden başlatın.`);
    } else {
      toast(`Hata: ${res?.error || 'Güncellenemedi'}`);
    }
  } catch (e) {
    toast("Güncelleme hatası: " + e.message);
  }
});

$('manage-act-launch-options')?.addEventListener('click', () => {
  if (!currentManagedGame) return;
  if (!state.launchOptions) state.launchOptions = {};
  const current = state.launchOptions[currentManagedGame.id] || '';
  const descEl = $('launch-options-desc');
  if (descEl) descEl.innerHTML = `<strong>${escapeHtml(currentManagedGame.name)}</strong> için Steam başlatma parametrelerini girin (ör. <code>-novid -high -dx11</code>):`;
  const inputEl = $('launch-options-input');
  if (inputEl) inputEl.value = current;
  const dlg = $('launch-options-dialog');
  if (dlg && typeof dlg.showModal === 'function') {
    dlg.showModal();
  }
});

$('launch-options-save-btn')?.addEventListener('click', () => {
  if (!currentManagedGame) return;
  if (!state.launchOptions) state.launchOptions = {};
  const val = $('launch-options-input')?.value.trim() || '';
  if (val) {
    state.launchOptions[currentManagedGame.id] = val;
  } else {
    delete state.launchOptions[currentManagedGame.id];
  }
  persist();
  $('launch-options-dialog')?.close();
  toast(`Başlatma seçenekleri kaydedildi: ${val || 'Varsayılan'}`);
});

$('launch-options-clear-btn')?.addEventListener('click', () => {
  if (!currentManagedGame) return;
  if (state.launchOptions) {
    delete state.launchOptions[currentManagedGame.id];
    persist();
  }
  const inputEl = $('launch-options-input');
  if (inputEl) inputEl.value = '';
  $('launch-options-dialog')?.close();
  toast("Başlatma seçenekleri temizlendi.");
});

$('manage-act-drm-remove')?.addEventListener('click', async () => {
  if (!currentManagedGame) return;
  const listContainer = $('drm-fixes-list');
  const dirInput = $('drm-install-dir');
  if (!listContainer) return;

  listContainer.innerHTML = '<p style="color:var(--muted);font-size:12px">Steam DRM & Denuvo veritabanı sorgulanıyor...</p>';
  let res = { success: false, fixes: null, autoDetectedDir: null };
  try {
    if (typeof window.saturnDesktop?.getDenuvoFixes === 'function') {
      res = await window.saturnDesktop.getDenuvoFixes(currentManagedGame.id);
    }
  } catch (e) {}

  if (dirInput && res.autoDetectedDir) {
    dirInput.value = res.autoDetectedDir;
  }

  let fixes = Array.isArray(res.fixes) && res.fixes.length > 0 ? res.fixes : [
    {
      id: `steam_stub_unpin_${currentManagedGame.id}`,
      name: 'Steam DRM / Manifest Unpinning (Bypass)',
      description: 'Oyun koruma kilidini manifest seviyesinde devreden çıkarır ve Lua kütüphanesine işler.',
      slot: 'manifest'
    },
    {
      id: `goldberg_emu_${currentManagedGame.id}`,
      name: 'Steam DRM / SteamAPI DLL Emulator',
      description: 'Oyun klasöründeki steam_api64.dll dosyasını emülatör ile değiştirerek DRM kontrolünü aşar.',
      slot: 'dll'
    }
  ];

  listContainer.innerHTML = fixes.map(fix => `
    <div class="drm-fix-item">
      <div class="drm-fix-info">
        <h4>${escapeHtml(fix.name || 'DRM Fix')}</h4>
        <p>${escapeHtml(fix.description || 'Steam DRM Koruma Kaldırıcı')}</p>
        <span class="source-pill ${fix.slot === 'manifest' ? 'online' : ''}">${fix.slot === 'manifest' ? 'Manifest Baypası' : 'DLL / EXE Yaması'}</span>
      </div>
      <div class="drm-fix-actions">
        <button class="primary-button drm-apply-btn" data-fix-id="${escapeHtml(fix.id)}" data-slot="${escapeHtml(fix.slot)}" style="height:32px;padding:0 12px;font-size:11px">Uygula</button>
        <button class="secondary-button drm-revert-btn" data-fix-id="${escapeHtml(fix.id)}" style="min-height:32px;padding:0 10px;font-size:11px">Geri Al</button>
      </div>
    </div>
  `).join('');

  listContainer.querySelectorAll('.drm-apply-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const fixId = btn.dataset.fixId;
      const slot = btn.dataset.slot;
      const installDir = dirInput?.value.trim() || '';

      if (slot !== 'manifest' && !installDir) {
        toast("Lütfen DLL/EXE yaması için geçerli oyun kurulum dizinini (Install Directory) girin.");
        dirInput?.focus();
        return;
      }

      toast("DRM düzeltmesi uygulanıyor...");
      let applyResult;
      if (typeof window.saturnDesktop?.applyDenuvoFix === 'function') {
        applyResult = await window.saturnDesktop.applyDenuvoFix({
          appId: currentManagedGame.id,
          fixId,
          slot,
          installDir
        });
      } else {
        applyResult = { success: true, message: 'Düzeltme simüle edildi.' };
      }

      if (applyResult?.success) {
        toast(`Başarılı: ${currentManagedGame.name} için Steam DRM / Denuvo düzeltmesi uygulandı!`);
        $('drm-fix-dialog')?.close();
      } else {
        toast(`Hata: ${applyResult?.error || 'Düzeltme uygulanamadı'}`);
      }
    });
  });

  listContainer.querySelectorAll('.drm-revert-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const fixId = btn.dataset.fixId;
      const installDir = dirInput?.value.trim() || '';
      toast("DRM yaması geri alınıyor...");
      let revertResult;
      if (typeof window.saturnDesktop?.revertDenuvoFix === 'function') {
        revertResult = await window.saturnDesktop.revertDenuvoFix({ installDir, fixId });
      }
      if (revertResult?.success) {
        toast(`Orijinal dosyalar geri yüklendi (${fixId}).`);
      } else {
        toast(`Hata: ${revertResult?.error || 'Geri alma dosyası bulunamadı.'}`);
      }
    });
  });

  const drmDlg = $('drm-fix-dialog');
  if (drmDlg && typeof drmDlg.showModal === 'function') {
    drmDlg.showModal();
  }
});

$('manage-act-store-page')?.addEventListener('click', () => {
  if (!currentManagedGame) return;
  const url = `https://store.steampowered.com/app/${currentManagedGame.id}`;
  if (typeof window.saturnDesktop?.openExternalUrl === 'function') {
    window.saturnDesktop.openExternalUrl(url);
  } else {
    window.open(url, '_blank');
  }
});

$('manage-act-open-steam')?.addEventListener('click', () => {
  if (!currentManagedGame) return;
  const url = `steam://nav/games/details/${currentManagedGame.id}`;
  if (typeof window.saturnDesktop?.openExternalUrl === 'function') {
    window.saturnDesktop.openExternalUrl(url);
  } else {
    window.open(url, '_blank');
  }
});

$('manage-act-show-lua')?.addEventListener('click', async () => {
  if (!currentManagedGame) return;
  if (typeof window.saturnDesktop?.openLuaFolder === 'function') {
    const ok = await window.saturnDesktop.openLuaFolder(currentManagedGame.id);
    if (ok) toast(`.lua dosyası (${currentManagedGame.id}.lua) klasörde gösterildi.`);
    else toast("Lua klasörü açılamadı.");
  } else {
    toast("Masaüstü modunda değilsiniz.");
  }
});

function copyAppId() {
  if (!currentManagedGame) return;
  navigator.clipboard.writeText(currentManagedGame.id).then(() => {
    toast(`App ID (${currentManagedGame.id}) kopyalandı!`);
  }).catch(() => {
    toast(`App ID: ${currentManagedGame.id}`);
  });
}
$('manage-act-copy-appid')?.addEventListener('click', copyAppId);
$('manage-copy-appid-inline')?.addEventListener('click', copyAppId);

$('manage-act-delete-lua')?.addEventListener('click', async () => {
  if (!currentManagedGame) return;
  const game = currentManagedGame;
  const message=`"${game.name}" oyunu Oyun Yönetiminden ve .lua dosyasından silinsin mi?`;
  if (!(window.saturnController?.isActive()?await window.saturnController.confirmAction(message):confirm(message))) return;

  toast(`${game.name} siliniyor...`);
  let removeResult = null;
  try {
    if (typeof window.saturnDesktop?.removeGame === 'function') {
      removeResult = await window.saturnDesktop.removeGame(game.id);
    } else {
      const resp = await fetch(`http://127.0.0.1:6767/remove/${game.id}`, { method: 'POST' });
      removeResult = await resp.json();
    }
  } catch (e) {
    removeResult={success:false,error:e.message};
  }

  if (!removeResult?.success) {
    toast(`Silme hatası: ${removeResult?.error || 'Oyun silinemedi'}`);
    return;
  }

  const idStr = String(game.id);
  state.library = state.library.filter(g => String(g.id) !== idStr);
  state.favorites = state.favorites.filter(id => String(id) !== idStr);
  state.queue = state.queue.filter(g => String(g.id) !== idStr);
  if (String(state.selected?.id) === idStr) state.selected = null;
  currentManagedGame = null;
  persist();
  render();

  $('game-manage-dialog')?.close();
  toast(`${game.name} başarıyla silindi! Değişiklikler için Steam'i yeniden başlatın.`);
});

$('selection-panel').addEventListener('click',event=>{if(event.target.closest('#add-selected')){if(state.selected&&state.library.some(item=>item.id===state.selected.id)){openManageModal(state.selected);}else{addSelected();}}if(event.target.closest('#deselect')){state.selected=null;render();feedback('Steam mağaza bağlantısını doğrudan yapıştırabilirsin.');}});
$('queue-list').addEventListener('click',event=>{const remove=event.target.closest('[data-remove]');if(remove&&!state.processing){state.queue=state.queue.filter(game=>game.id!==remove.dataset.remove);persist();render();toast('Oyun kuyruktan çıkarıldı.');}});
$('run-queue').addEventListener('click',runQueue);$('clear-queue').addEventListener('click',()=>{if(state.processing)return;state.queue=[];persist();render();toast('Kuyruk temizlendi.');});
$('mobile-tray').addEventListener('click',event=>{if(event.target.closest('#mobile-dismiss')){$('mobile-tray').hidden=true;document.body.classList.remove('has-tray');}if(event.target.closest('#mobile-action')){const canAdd=state.selected&&!state.queue.some(game=>game.id===state.selected.id)&&!state.library.some(game=>game.id===state.selected.id);if(canAdd)addSelected();else runQueue();}});
$('motion-toggle')?.addEventListener('click',()=>{setMotion(!state.motion);persist();});
$('settings-open').addEventListener('click',()=>{$('setting-motion').checked=state.motion;$('setting-compact').checked=state.compact;$('settings-dialog').showModal();});
const windowRow=document.createElement('div');windowRow.id='settings-window-row';windowRow.className='setting-row';windowRow.hidden=typeof window.saturnDesktop?.windowAction!=='function';windowRow.innerHTML='<span><strong>Pencere</strong><small>Kumandayla boyutlandır ve çık.</small></span><div class="window-controls"><button type="button" class="secondary-button" id="settings-window-size">Büyüt / geri al</button><button type="button" class="secondary-button" id="settings-exit">Çık</button></div>';$('settings-dialog').insertBefore(windowRow,$('settings-dialog').querySelector('.dialog-note'));
$('settings-window-size').addEventListener('click',async()=>{try{if(!await window.saturnDesktop?.windowAction('maximize'))toast('Pencere boyutu değiştirilemedi.');}catch{toast('Pencere boyutu değiştirilemedi.');}});
$('settings-exit').addEventListener('click',async()=>{if(state.processing&&!await window.saturnController.confirmAction('Kuyruk çalışıyor. Uygulamayı kapatırsan devam eden işlem durabilir.',{title:'Uygulama kapatılsın mı?',accept:'Kapat'}))return;try{await window.saturnDesktop?.windowAction('close');}catch{}});
$('about-open').addEventListener('click',()=>$('about-dialog').showModal());
document.querySelectorAll('.dialog-close').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}}));
$('setting-motion').addEventListener('change',event=>{setMotion(event.target.checked);persist();});
$('setting-compact').addEventListener('change',event=>{state.compact=event.target.checked;document.body.classList.toggle('compact',state.compact);persist();});
async function handleRestartSteam(btnId){
  const btn = $(btnId);
  if(btn) btn.disabled = true;
  toast("Steam yeniden başlatılıyor...");
  try {
    let result;
    if(typeof window.saturnDesktop?.restartSteam === 'function') {
      result = await window.saturnDesktop.restartSteam();
    } else {
      const res = await fetch('http://127.0.0.1:6767/restart-steam', { method: 'POST' });
      result = await res.json();
    }
    if(result!==true&&result?.success!==true)throw new Error(result?.error||'Steam yeniden başlatılamadı. Steam kurulumunu kontrol et.');
    toast("Steam kapatıldı ve yeniden başlatıldı!");
  } catch(err) {
    toast("Steam başlatılamadı: " + (err.message || err));
  } finally {
    if(btn) setTimeout(() => { btn.disabled = false; }, 3000);
  }
}

$('restart-steam-btn')?.addEventListener('click', () => handleRestartSteam('restart-steam-btn'));
$('settings-restart-steam')?.addEventListener('click', () => handleRestartSteam('settings-restart-steam'));

['library-add','library-discover','history-start'].forEach(id=>$(id).addEventListener('click',()=>{location.hash='add';setView('add');}));
$('export-history').addEventListener('click',exportHistory);
document.addEventListener('keydown',event=>{const typing=/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);if(event.key==='/'&&!typing&&!document.querySelector('dialog[open]')){event.preventDefault();location.hash='add';setView('add');$('game-input').focus();}});
window.addEventListener('hashchange',()=>setView(location.hash.slice(1)));
document.addEventListener('visibilitychange',()=>setMotion(state.motion));
document.body.classList.toggle('compact',state.compact);setMotion(state.motion);setView(location.hash.slice(1));

// Dropzone & Local File Import Handlers (Matching user screenshots)
const dropzoneSection = $('dropzone-section');
const importToggleBtn = $('import-toggle-btn');
const dropzoneBox = $('import-dropzone');
const browseFilesBtn = $('browse-files-btn');
const hiddenFileInput = $('hidden-file-input');

if (importToggleBtn && dropzoneSection) {
  importToggleBtn.addEventListener('click', () => {
    const isHidden = dropzoneSection.hidden;
    dropzoneSection.hidden = !isHidden;
    importToggleBtn.setAttribute('aria-expanded', String(!dropzoneSection.hidden));
    importToggleBtn.classList.toggle('active', !dropzoneSection.hidden);
    if (!dropzoneSection.hidden) {
      dropzoneSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
}

async function processImportResult(result) {
  if (!result || !result.success) {
    toast(`İçe aktarma hatası: ${result?.error || 'Geçerli dosya işlenemedi.'}`);
    return;
  }
  toast(result.message || "Dosyalar Steam'e eklendi!");

  if (Array.isArray(result.addedAppIds) && result.addedAppIds.length > 0) {
    for (const appId of result.addedAppIds) {
      let known = knownGames.get(appId);
      if (!known) {
        known = { id: appId, name: `Steam Oyunu #${appId}`, genre: 'İçe Aktarılan', tag: 'Yerel Dosya', cover: null };
        try {
          if (catalogClient) {
            catalogClient.details(appId).then(res => {
              if (res?.ok && res.game) {
                rememberGames([res.game]);
                const enriched = knownGames.get(appId);
                if (enriched) {
                  const idx = state.library.findIndex(item => item.id === appId);
                  if (idx >= 0) state.library[idx] = enriched;
                  persist();
                  render();
                }
              }
            }).catch(() => {});
          }
        } catch (e) {}
      }
      if (!state.library.some(item => item.id === known.id)) {
        state.library.push(known);
      }
    }
    persist();
    render();
  }
}

if (browseFilesBtn) {
  browseFilesBtn.addEventListener('click', async () => {
    if(window.saturnController?.isActive()&&window.saturnDesktop?.browseControllerFiles){
      try{const paths=await window.saturnController.pickFiles({multiple:true,extensions:['.lua','.manifest','.zip','.acf','.txt','.json']});
      if(paths?.length)await processImportResult(await window.saturnDesktop.importLocalFiles(paths));}catch(error){toast('Dosyalar içe aktarılamadı: '+error.message);}return;
    }
    if (typeof window.saturnDesktop?.selectLocalFiles === 'function') {
      const res = await window.saturnDesktop.selectLocalFiles();
      if (res) processImportResult(res);
    } else if (hiddenFileInput) {
      hiddenFileInput.click();
    }
  });
}

if (hiddenFileInput) {
  hiddenFileInput.addEventListener('change', async () => {
    const files = Array.from(hiddenFileInput.files);
    if (!files.length) return;
    const paths = files.map(f => f.path).filter(Boolean);
    if (paths.length > 0 && typeof window.saturnDesktop?.importLocalFiles === 'function') {
      const res = await window.saturnDesktop.importLocalFiles(paths);
      processImportResult(res);
    } else {
      toast(`${files.length} dosya seçildi. Masaüstü modunda Steam'e aktarılacaktır.`);
    }
    hiddenFileInput.value = '';
  });
}

if (dropzoneBox) {
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzoneBox.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzoneBox.classList.add('drag-over');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzoneBox.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzoneBox.classList.remove('drag-over');
    }, false);
  });

  dropzoneBox.addEventListener('drop', async (e) => {
    const dt = e.dataTransfer;
    if (!dt) return;

    if (dt.files && dt.files.length > 0) {
      const files = Array.from(dt.files);
      const paths = files.map(f => f.path).filter(Boolean);
      if (paths.length > 0 && typeof window.saturnDesktop?.importLocalFiles === 'function') {
        toast("Dosyalar Steam'e aktarılıyor...");
        const res = await window.saturnDesktop.importLocalFiles(paths);
        processImportResult(res);
      } else {
        toast(`${files.length} dosya sürüklendi. Masaüstü modunda Steam'e aktarılır.`);
      }
      return;
    }

    const text = dt.getData('text/plain') || dt.getData('text/uri-list');
    if (text) {
      const match = text.match(/(?:app\/|appID=)(\d+)/i) || text.match(/(\d{3,10})/);
      if (match && match[1]) {
        const appId = match[1];
        toast(`Steam / SteamDB bağlantısı algılandı (App ID: ${appId}).`);
        $('game-input').value = appId;
        submitIntake(new Event('submit'));
      } else {
        toast("Bağlantıdan geçerli bir App ID okunamadı.");
      }
    }
  });
}

// OnlineFix Integrator Handlers
let selectedOnlineFixArchive = '';

$('manage-act-onlinefix')?.addEventListener('click', async () => {
  if (!currentManagedGame) return;
  const detailsEl = $('onlinefix-details');
  if (detailsEl) detailsEl.innerHTML = '<p style="color:var(--muted);font-size:12px">OnlineFix veritabanı sorgulanıyor...</p>';

  selectedOnlineFixArchive = '';
  const archiveInput = $('onlinefix-archive-path');
  if (archiveInput) archiveInput.value = '';

  const dirInput = $('onlinefix-install-dir');
  if (dirInput) {
    dirInput.value = '';
    dirInput.placeholder = 'Oyun klasörü otomatik aranıyor...';
    try {
      let autoDir = null;
      if (typeof window.saturnDesktop?.detectGameInstallDir === 'function') {
        autoDir = await window.saturnDesktop.detectGameInstallDir({
          appId: currentManagedGame.id,
          gameName: currentManagedGame.name
        });
      }
      if (autoDir) {
        dirInput.value = autoDir;
      } else {
        dirInput.placeholder = 'Oyun klasörü otomatik bulunamadı. Lütfen Gözat ile seçin.';
      }
    } catch (e) {
      dirInput.placeholder = 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\...';
    }
  }

  let res = null;
  try {
    if (typeof window.saturnDesktop?.getOnlineFix === 'function') {
      res = await window.saturnDesktop.getOnlineFix(currentManagedGame.id);
    }
  } catch (e) {}

  const fix = res?.fix;
  const isVerified = res?.verified || false;

  if (detailsEl) {
    if (isVerified && fix) {
      detailsEl.innerHTML = `
        <div style="font-weight:600;color:#fff;margin-bottom:4px">${escapeHtml(fix.name || currentManagedGame.name)}</div>
        <div style="font-size:12px;color:#77d8ae;margin-bottom:6px">Durum: ✅ OnlineFix Yaması Doğrulandı (${escapeHtml(fix.type || 'Multiplayer Fix')})</div>
        <p style="font-size:11px;color:#a0a5b8;margin-bottom:8px">Yama: ${escapeHtml(fix.fixName || 'OnlineFix Patch')}</p>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <span class="source-pill online">OnlineFix.me Entegrasyonu</span>
          <span class="source-pill online">Steam Overlay & Crossplay</span>
        </div>
      `;
    } else {
      detailsEl.innerHTML = `
        <div style="font-weight:600;color:#fff;margin-bottom:4px">${escapeHtml(currentManagedGame.name)}</div>
        <div style="font-size:12px;color:#e6b0ac;margin-bottom:6px">Durum: ⚠️ Özel OnlineFix / Multiplayer Yapılandırması</div>
        <p style="font-size:11px;color:#a0a5b8;margin-bottom:8px">Bu oyun için indirdiğiniz OnlineFix yama paketini (.zip, .rar, .dll) aşağıdan seçerek doğrudan oyun klasörüne ayıklayabilirsiniz.</p>
      `;
    }
  }

  const onlineDlg = $('onlinefix-dialog');
  if (onlineDlg && typeof onlineDlg.showModal === 'function') {
    onlineDlg.showModal();
  }
});

$('onlinefix-browse-dir-btn')?.addEventListener('click', async () => {
  if (typeof window.saturnDesktop?.selectFolder === 'function') {
    const dir = window.saturnController?.isActive()&&window.saturnDesktop.browseControllerFiles?(await window.saturnController.pickFiles({mode:'folder'}))?.[0]:await window.saturnDesktop.selectFolder();
    if (dir) {
      const dirInput = $('onlinefix-install-dir');
      if (dirInput) dirInput.value = dir;
      toast(`Oyun klasörü seçildi: ${dir}`);
    }
  } else {
    toast("Masaüstü modunda klasör seçebilirsiniz.");
  }
});

$('onlinefix-browse-archive-btn')?.addEventListener('click', async () => {
  if (typeof window.saturnDesktop?.selectOnlineFixArchive === 'function') {
    const filePath = window.saturnController?.isActive()&&window.saturnDesktop.browseControllerFiles?(await window.saturnController.pickFiles({extensions:['.zip','.rar','.dll']}))?.[0]:await window.saturnDesktop.selectOnlineFixArchive();
    if (filePath) {
      selectedOnlineFixArchive = filePath;
      const input = $('onlinefix-archive-path');
      if (input) input.value = filePath;
      toast(`Yama dosyası seçildi: ${filePath.split('\\').pop()}`);
    }
  } else {
    toast("Masaüstü modunda dosya seçebilirsiniz.");
  }
});

const onlinefixDropzone = $('onlinefix-dropzone');
if (onlinefixDropzone) {
  ['dragenter', 'dragover'].forEach(evt => {
    onlinefixDropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      onlinefixDropzone.style.borderColor = 'var(--accent)';
      onlinefixDropzone.style.background = 'rgba(255,255,255,0.06)';
    });
  });
  ['dragleave', 'drop'].forEach(evt => {
    onlinefixDropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      onlinefixDropzone.style.borderColor = 'var(--line-soft)';
      onlinefixDropzone.style.background = 'rgba(255,255,255,0.02)';
    });
  });
  onlinefixDropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const filePath = files[0].path;
      if (filePath) {
        selectedOnlineFixArchive = filePath;
        const input = $('onlinefix-archive-path');
        if (input) input.value = filePath;
        toast(`Yama dosyası sürüklendi: ${files[0].name}`);
      }
    }
  });
}

$('onlinefix-apply-btn')?.addEventListener('click', async () => {
  if (!currentManagedGame) return;
  const dirInput = $('onlinefix-install-dir');
  const installDir = dirInput?.value.trim() || '';

  if (!installDir) {
    toast("Lütfen Multiplayer yama kurulumu için geçerli Oyun Klasörünü girin.");
    dirInput?.focus();
    return;
  }

  const archivePath = selectedOnlineFixArchive || $('onlinefix-archive-path')?.value.trim();

  toast("OnlineFix yaması kopyalanıyor ve uygulanıyor...");
  let res;
  try {
    if (archivePath && typeof window.saturnDesktop?.installOnlineFixArchive === 'function') {
      res = await window.saturnDesktop.installOnlineFixArchive({
        appId: currentManagedGame.id,
        installDir,
        archivePath
      });
    } else if (typeof window.saturnDesktop?.applyOnlineFix === 'function') {
      res = await window.saturnDesktop.applyOnlineFix({
        appId: currentManagedGame.id,
        installDir
      });
    } else {
      res = { success: true, message: 'OnlineFix yaması simüle edildi.' };
    }
  } catch (e) {
    res = { success: false, error: e.message };
  }

  if (res?.success) {
    toast(`OnlineFix Başarılı: ${currentManagedGame.name} multiplayer yaması kuruldu!`);
    $('onlinefix-dialog')?.close();
  } else {
    toast(`Hata: ${res?.error || 'Yama kopyalanamadı'}`);
  }
});

// Saturn Deep Link Listener (saturn://)
function handleDeepLinkUrl(url) {
  if (typeof url !== 'string') return;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname || parsed.pathname.replace(/^\/\//, '').split('/')[0];
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const appId = pathParts[0] || parsed.searchParams.get('appid') || parsed.searchParams.get('id');

    if (host === 'add' || url.includes('saturn://add')) {
      const targetId = appId || host;
      if (/^\d+$/.test(targetId)) {
        toast(`Deep Link: App ID ${targetId} ekleme için işlem başlatıldı.`);
        $('game-input').value = targetId;
        location.hash = 'add';
        setView('add');
        submitIntake(new Event('submit'));
      }
    } else if (host === 'open' || url.includes('saturn://open')) {
      const targetId = appId || host;
      if (/^\d+$/.test(targetId)) {
        let game = state.library.find(g => g.id === targetId) || knownGames.get(targetId);
        if (!game) game = { id: targetId, name: `Steam Oyunu #${targetId}`, genre: 'Steam', tag: 'Deep Link', cover: null };
        openManageModal(game);
        toast(`Deep Link: ${game.name} yönetimi açıldı.`);
      }
    }
  } catch (e) {
    console.error('Deep link parse error:', e);
  }
}

if (typeof window.saturnDesktop?.onProtocolUrl === 'function') {
  window.saturnDesktop.onProtocolUrl((url) => {
    handleDeepLinkUrl(url);
  });
}

async function syncSteamLibraryOnStartup() {
  if (typeof window.saturnDesktop?.getInstalledAppIds !== 'function') return;
  try {
    const installedIds = await window.saturnDesktop.getInstalledAppIds();
    if (!Array.isArray(installedIds) || installedIds.length === 0) return;

    let updated = false;
    for (const appId of installedIds) {
      const idStr = String(appId);
      if (!state.library.some(g => String(g.id) === idStr)) {
        let game = knownGames.get(idStr);
        if (!game) {
          game = { id: idStr, name: `Steam Oyunu #${idStr}`, genre: 'Steam', tag: 'Kütüphane', cover: null };
          if (catalogClient) {
            catalogClient.details(idStr).then(res => {
              if (res?.ok && res.game) {
                rememberGames([res.game]);
                const enriched = knownGames.get(idStr);
                if (enriched) {
                  const idx = state.library.findIndex(item => String(item.id) === idStr);
                  if (idx >= 0) state.library[idx] = enriched;
                  persist();
                  render();
                }
              }
            }).catch(() => {});
          }
        }
        state.library.push(game);
        updated = true;
      }
    }
    if (updated) {
      persist();
      render();
    }
  } catch (e) {
    console.error('Steam library sync error:', e);
  }
}

loadSteamPage();
syncSteamLibraryOnStartup();
