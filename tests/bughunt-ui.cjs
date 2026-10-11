'use strict';
const {chromium}=require(process.env.SATURN_PLAYWRIGHT_MODULE||'playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const fs=require('node:fs');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'}),results=[];
 async function check(name,exercise,stored={}){
  const context=await browser.newContext({viewport:{width:1440,height:980}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route(/^https?:/,route=>route.request().url().includes('header.jpg')?route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="460" height="215"><rect width="460" height="215" fill="#111"/></svg>'}):route.fulfill({status:404,contentType:'text/plain',body:''}));
  await page.addInitScript(seed=>{
   localStorage.setItem('saturn-game-add-v1',JSON.stringify(seed));
   window.__details=[];window.__sources=[];window.__addCalls=[];
   window.saturnDesktop={isDesktop:true,
    catalogSearch:async()=>({ok:false,error:'Test offline'}),
    gameDetails:id=>new Promise(resolve=>window.__details.push({id,resolve})),
    checkSources:id=>new Promise(resolve=>window.__sources.push({id,resolve})),
    addGame:async id=>{window.__addCalls.push(id);if(window.__rejectAdds)throw Error('Test IPC disconnected');return {success:id==='1091500',error:'Test add failed'};},
    removeGame:async()=>{throw Error('Test remove disconnected');},restartSteam:async()=>false
   };
  },stored);
  try{await page.goto(pathToFileURL(path.join(root,'index.html')).href,{waitUntil:'load'});await page.waitForTimeout(150);const detail=await exercise(page);results.push({name,passed:detail.passed&&errors.length===0,detail,errors});}
  catch(error){results.push({name,passed:false,error:error.message,errors});}
  finally{await context.close();}
 }
 try{
  await check('fuzzy search ranks Cyberpunk ahead of unrelated short tokens',async page=>{const first=await page.evaluate(()=>{state.query='cyberpank';return localResults()[0]?.id;});return {passed:first==='1091500',first};});
  await check('failed queue items survive while successful items are recorded',async page=>{const data=await page.evaluate(async()=>{state.queue=[curatedCatalog[0],curatedCatalog[1]];await runQueue();return {queue:state.queue.map(g=>g.id),library:state.library.map(g=>g.id),history:state.history.map(g=>g.id),processing:state.processing,calls:window.__addCalls};});return {passed:data.queue.join(',')==='1245620'&&data.library.join(',')==='1091500'&&data.history.join(',')==='1091500'&&!data.processing&&data.calls.length===2,...data};});
  await check('IPC rejection keeps remaining queue and releases busy state',async page=>{const data=await page.evaluate(async()=>{state.queue=[curatedCatalog[0],curatedCatalog[1]];window.__rejectAdds=true;try{await runQueue();}catch{}return {queue:state.queue.length,processing:state.processing,active:state.activeId};});return {passed:data.queue===2&&!data.processing&&data.active===null,...data};});
  await check('failed removal retains library entry',async page=>{await page.evaluate(()=>{window.confirm=()=>true;state.library=[curatedCatalog[0]];openManageModal(state.library[0]);});await page.locator('#manage-act-delete-lua').click();await page.waitForTimeout(100);const count=await page.evaluate(()=>state.library.length);return {passed:count===1,count};});
  await check('stale App ID lookup cannot replace newer selection',async page=>{
   await page.evaluate(()=>{$('game-input').value='99999991';submitIntake(new Event('submit'));});await page.waitForFunction(()=>window.__details.length===1);
   await page.evaluate(()=>{$('game-input').value='99999992';$('game-input').dispatchEvent(new Event('input'));submitIntake(new Event('submit'));});await page.waitForFunction(()=>window.__details.length===2);
   await page.evaluate(()=>window.__details[1].resolve({ok:false}));await page.waitForTimeout(30);await page.evaluate(()=>window.__details[0].resolve({ok:false}));await page.waitForTimeout(30);
   const id=await page.evaluate(()=>state.selected?.id);return {passed:id==='99999992',id};
  });
  await check('old source status cannot overwrite newly opened game',async page=>{
   await page.evaluate(()=>{openManageModal(curatedCatalog[0]);$('game-manage-dialog').close();openManageModal(curatedCatalog[1]);});
   await page.evaluate(()=>window.__sources[1].resolve({'New game source':true}));await page.waitForTimeout(30);await page.evaluate(()=>window.__sources[0].resolve({'Old game source':true}));await page.waitForTimeout(30);
   const text=await page.locator('#manage-sources-badge').textContent();return {passed:text.includes('New game source')&&!text.includes('Old game source'),text};
  });
  await check('unknown App ID details remain selectable without crashing',async page=>{
   await page.evaluate(()=>{$('game-input').value='99999993';submitIntake(new Event('submit'));});await page.waitForFunction(()=>window.__details.length===1);
   await page.evaluate(()=>window.__details[0].resolve({ok:true,game:{id:'99999993',name:'Custom Game'}}));await page.waitForTimeout(30);
   const data=await page.evaluate(()=>({id:state.selected?.id,name:state.selected?.name,disabled:$('find-button').disabled}));return {passed:data.id==='99999993'&&data.name==='Custom Game'&&!data.disabled,...data};
  });
  await check('missing source status never claims sources are online',async page=>{
   await page.evaluate(()=>{openManageModal(curatedCatalog[0]);window.__sources[0].resolve({});});await page.waitForTimeout(30);
   const data=await page.locator('#manage-sources-badge').evaluate(el=>({text:el.textContent,online:el.querySelectorAll('.online').length}));return {passed:data.online===0&&!data.text.includes('Aktif'),...data};
  });
  await check('removing final favorite on last page returns to valid page',async page=>{const data=await page.evaluate(()=>{const games=catalog.slice(0,61);state.filter='favorites';state.favorites=games.map(g=>g.id);state.page=1;renderCatalog();state.favorites=state.favorites.slice(0,60);renderCatalog();return {page:state.page,cards:$('game-grid').children.length};});return {passed:data.page===0&&data.cards===60,...data};});
  await check('Steam restart failure is not announced as success',async page=>{await page.evaluate(()=>handleRestartSteam('restart-steam-btn'));const text=await page.locator('#toast').textContent();return {passed:!text.includes('yeniden başlatıldı')&&text.includes('başlatılamadı'),text};});
  await check('out-of-range stored history time cannot crash history view',async page=>{await page.evaluate(()=>setView('history'));return {passed:true};},{history:[{id:'1245620',name:'ELDEN RING',time:1e100}],launchOptions:5,playtime:'invalid'});
  await check('landscape cover remains uncropped',async page=>{await page.evaluate(()=>updateGameGrid($('game-grid'),[{id:'4001890',name:'How to Fish',cover:'assets/covers/4001890.jpg',genre:'Bağımsız',tag:'Steam'}]));await page.locator('#game-grid .game-tile').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('#game-grid img.wide-art')?.naturalWidth>0);const fit=await page.locator('#game-grid img.wide-art').evaluate(img=>getComputedStyle(img).objectFit);return {passed:fit==='contain',fit};});
 }finally{await browser.close();}
 const report={passed:results.filter(r=>r.passed).length,total:results.length,results};
 if(process.env.SATURN_BUGHUNT_REPORT)fs.writeFileSync(process.env.SATURN_BUGHUNT_REPORT,JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));if(report.passed!==report.total)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
