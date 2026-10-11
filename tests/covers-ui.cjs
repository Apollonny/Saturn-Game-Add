'use strict';
const {chromium}=require(process.env.SATURN_PLAYWRIGHT_MODULE||'playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const modern='https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4704690/current/header.jpg';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  for(const available of [true,false]){
   const context=await browser.newContext({viewport:{width:1440,height:980}}),page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.route(/^https?:/,route=>route.request().url()===modern&&available?route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="460" height="215"><rect width="460" height="215" fill="#35604d"/><text x="230" y="115" text-anchor="middle" font-size="35" fill="white">MECCHA CHAMELEON</text></svg>'}):route.fulfill({status:404,contentType:'text/plain',body:''}));
   await page.addInitScript(({source,available})=>{
    window.__coverCalls=0;
    if(!localStorage.getItem('saturn-game-add-v1'))localStorage.setItem('saturn-game-add-v1',JSON.stringify({library:[{id:'4704690',name:'MECCHA CHAMELEON'}],queue:[{id:'4704690',name:'MECCHA CHAMELEON'}]}));
    window.saturnDesktop={isDesktop:true,catalogSearch:async()=>({ok:false,error:'Test offline'}),gameDetails:async id=>{
     window.__coverCalls++;await new Promise(resolve=>setTimeout(resolve,40));
     return available?{ok:true,game:{id,name:'MECCHA CHAMELEON',cover:`https://cdn.akamai.steamstatic.com/steam/apps/${id}/library_600x900.jpg`,capsule:source}}:{ok:false,error:'Metadata unavailable'};
    }};
   },{source:modern,available});
   await page.goto(pathToFileURL(path.join(root,'index.html')).href+'#library',{waitUntil:'load'});
   await page.evaluate(()=>{state.selected=state.library[0];openQueueDialog();});
   if(available){
    try{await page.waitForFunction(source=>document.querySelector('#library-grid img[data-app-id="4704690"]')?.getAttribute('src')===source&&document.querySelector('#library-grid img[data-app-id="4704690"]')?.naturalWidth>0,modern,{timeout:10000});}
    catch(error){console.log(JSON.stringify(await page.evaluate(()=>({calls:window.__coverCalls,recovery:coverRecovery.size,library:state.library[0],images:[...document.querySelectorAll('img[data-app-id="4704690"]')].map(img=>({src:img.src,width:img.naturalWidth,hidden:img.hidden,index:img.dataset.fallbackIndex,attempted:img.dataset.metadataAttempted}))}))));console.log(JSON.stringify(errors));throw error;}
    const data=await page.evaluate(()=>{const img=document.querySelector('#library-grid img[data-app-id="4704690"]');return {fit:getComputedStyle(img).objectFit,hidden:img.hidden,unknown:img.closest('.cover-wrap').querySelectorAll('.unknown-cover').length,calls:window.__coverCalls,library:state.library[0].cover,queue:state.queue[0].cover,selected:state.selected.cover,heroNotes:document.querySelectorAll('.hero-note').length};});
    assert.equal(data.fit,'contain');assert.equal(data.hidden,false);assert.equal(data.unknown,0);assert.equal(data.calls,1);assert.equal(data.library,modern);assert.equal(data.queue,modern);assert.equal(data.selected,modern);assert.equal(data.heroNotes,0);
    await page.evaluate(()=>{$('queue-dialog').hidePopover();openManageModal(state.library[0]);});await page.waitForFunction(()=>document.querySelector('#manage-cover-img')?.naturalWidth>0);
    assert.equal(await page.locator('#manage-cover-img').getAttribute('src'),modern);
    await page.evaluate(()=>$('game-manage-dialog').close());
    if(process.env.SATURN_COVER_SCREENSHOT)await page.screenshot({path:process.env.SATURN_COVER_SCREENSHOT});
    await page.reload({waitUntil:'load'});await page.waitForFunction(()=>document.querySelector('#library-grid img[data-app-id="4704690"]')?.naturalWidth>0);
    assert.equal(await page.evaluate(()=>window.__coverCalls),0);
    console.log(JSON.stringify({coverRecovery:true,...data,persistsAfterRestart:true}));
   }else{
    await page.waitForFunction(()=>document.querySelector('#library-grid .unknown-cover')&&window.__coverCalls===1);await page.waitForTimeout(150);
    assert.equal(await page.evaluate(()=>window.__coverCalls),1);
    console.log(JSON.stringify({metadataFailureSafe:true,requests:1}));
   }
   assert.deepEqual(errors,[]);await context.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
