'use strict';
const {chromium}=require(process.env.SATURN_PLAYWRIGHT_MODULE||'playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  for(const width of [1440,960]){
   const context=await browser.newContext({viewport:{width,height:width===1440?980:680}}),page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.route(/^https?:/,route=>route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect width="600" height="900" fill="#17191e"/></svg>'}));
   await page.addInitScript(()=>{
    const pad={id:'fixture-ps',name:'DualSense',kind:'playstation',source:'hid',buttons:Array(18).fill(false),axes:[0,0,0,0]};window.__pad=pad;window.__removed=[];window.__imports=[];window.__windowActions=[];
    localStorage.setItem('saturn-game-add-v1',JSON.stringify({library:[{id:'1245620',name:'ELDEN RING'},{id:'1091500',name:'Cyberpunk 2077'}]}));
    window.saturnDesktop={isDesktop:true,
     catalogSearch:async()=>({ok:false,error:'Offline fixture'}),gameDetails:async()=>({ok:false}),checkSources:async()=>({}),
     controllerStatus:async()=>({devices:[pad],frames:[pad],errors:[],hidAvailable:true,xinputAvailable:true}),rescanControllers:async()=>({devices:[pad],frames:[pad],errors:[]}),
     onControllerFrame:callback=>{window.__frame=callback;return ()=>{};},onControllerStatus:callback=>{window.__status=callback;return ()=>{};},
     removeGame:async id=>{window.__removed.push(id);return {success:false,error:'Simulated remove failure'};},
     selectLocalFiles:async()=>{throw Error('Native file dialog must not be used by controller');},importLocalFiles:async files=>{window.__imports.push(files);return {success:true,addedAppIds:[]};},
     windowAction:async action=>{window.__windowActions.push(action);return true;},
     browseControllerFiles:async({directory,foldersOnly})=>({ok:true,directory,parent:directory==='C:\\Games'?'C:\\':null,entries:directory===null?[{name:'C:\\',path:'C:\\',directory:true}]:directory==='C:\\'?[{name:'Games',path:'C:\\Games',directory:true},...(!foldersOnly?[{name:'1.lua',path:'C:\\1.lua',directory:false}]:[])]:[]})
    };
   });
   await page.goto(pathToFileURL(path.join(root,'index.html')).href,{waitUntil:'load'});await page.bringToFront();await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForTimeout(120);
   async function emit(button=null){await page.evaluate(button=>{const pad={...window.__pad,buttons:Array(18).fill(false)};if(button!==null)pad.buttons[button]=true;window.__frame(pad);},button);await page.waitForTimeout(45);}
   async function press(button){await emit(button);await emit(null);}
   const focus=selector=>page.evaluate(selector=>document.querySelector(selector).focus(),selector);
   await emit(null);assert.equal(await page.locator('#controller-dot').evaluate(el=>el.classList.contains('connected')),true);
   await press(5);assert.equal(await page.locator('[data-view].active').getAttribute('data-view'),'library');
   await focus('#library-grid [data-select="1245620"]');await press(15);assert.equal(await page.evaluate(()=>document.activeElement.dataset.select),'1091500');
   await emit(0);await page.waitForTimeout(500);assert.equal(await page.locator('#game-manage-dialog').evaluate(el=>el.open),true);await emit(null);await press(1);assert.equal(await page.locator('#game-manage-dialog').evaluate(el=>el.open),false);
   await press(3);assert.equal(await page.locator('#controller-keyboard').evaluate(el=>el.open),true);
   await press(0);assert.equal(await page.locator('#controller-keyboard-value').inputValue(),'1');await press(2);assert.equal(await page.locator('#controller-keyboard-value').inputValue(),'');
   await press(13);assert.equal(await page.evaluate(()=>document.activeElement.dataset.key),'q');
   await press(15);await press(15);assert.equal(await page.evaluate(()=>document.activeElement.dataset.key),'e');await press(0);assert.equal(await page.locator('#controller-keyboard-value').inputValue(),'e');
   await press(1);assert.equal(await page.locator('#game-input').inputValue(),'');assert.equal(await page.locator('#controller-keyboard').evaluate(el=>el.open),false);
   await press(3);
   for(const letter of ['e','l','d','e','n']){
    const index=await page.locator('#controller-key-grid button').evaluateAll((keys,letter)=>keys.findIndex(key=>key.dataset.key===letter),letter);
    let current=Number(await page.evaluate(()=>document.activeElement.dataset.keyIndex));
    while(Math.floor(current/12)!==Math.floor(index/12)){await press(Math.floor(current/12)<Math.floor(index/12)?13:12);current=Number(await page.evaluate(()=>document.activeElement.dataset.keyIndex));}
    while(current%12!==index%12){await press(current%12<index%12?15:14);current=Number(await page.evaluate(()=>document.activeElement.dataset.keyIndex));}
    await press(0);
   }
   assert.equal(await page.locator('#controller-keyboard-value').inputValue(),'elden');
   if(process.env.SATURN_CONTROLLER_SCREENSHOTS)await page.screenshot({path:path.join(process.env.SATURN_CONTROLLER_SCREENSHOTS,`keyboard-${width}.png`)});
   await press(9);assert.equal(await page.locator('#game-input').inputValue(),'elden');assert.equal(await page.locator('#controller-keyboard').evaluate(el=>el.open),false);
   await press(9);assert.equal(await page.locator('#settings-dialog').evaluate(el=>el.open),true);
   await focus('#setting-compact');const compact=await page.locator('#setting-compact').isChecked();await press(0);assert.equal(await page.locator('#setting-compact').isChecked(),!compact);await focus('#settings-window-size');await press(0);await focus('#settings-exit');await press(0);assert.deepEqual(await page.evaluate(()=>window.__windowActions),['maximize','close']);await press(1);
   await focus('#sort-select');await press(0);await press(13);assert.equal(await page.locator('#sort-select').inputValue(),'az');await press(1);
   await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await press(9);assert.equal(await page.locator('#settings-dialog').evaluate(el=>el.open),false);
   await emit(9);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForTimeout(60);assert.equal(await page.locator('#settings-dialog').evaluate(el=>el.open),false);await emit(null);await press(9);assert.equal(await page.locator('#settings-dialog').evaluate(el=>el.open),true);await press(1);
   await page.evaluate(()=>{window.__chosenFolder=undefined;window.saturnController.pickFiles({mode:'folder'}).then(value=>window.__chosenFolder=value);});await page.waitForFunction(()=>document.querySelector('.file-browser-entry'));
   await press(0);await press(0);assert.equal(await page.locator('#controller-files-path').inputValue(),'C:\\Games');await press(0);await page.waitForFunction(()=>window.__chosenFolder!==undefined);assert.deepEqual(await page.evaluate(()=>window.__chosenFolder),['C:\\Games']);
   await page.evaluate(()=>{window.__chosenFiles=undefined;window.saturnController.pickFiles({multiple:true,extensions:['.lua']}).then(value=>window.__chosenFiles=value);});await page.waitForFunction(()=>document.querySelector('.file-browser-entry'));
   await press(0);await press(13);await press(0);assert.equal(await page.locator('.file-browser-entry[aria-pressed="true"]').count(),1);await press(13);await press(0);await page.waitForFunction(()=>window.__chosenFiles!==undefined);assert.deepEqual(await page.evaluate(()=>window.__chosenFiles),['C:\\1.lua']);
   await page.evaluate(()=>{window.__nestedPicker=undefined;window.saturnController.pickFiles({mode:'folder'}).then(value=>window.__nestedPicker=value);});await page.waitForFunction(()=>document.querySelector('.file-browser-entry'));await focus('#controller-files-path');await press(0);assert.equal(await page.locator('#controller-keyboard').evaluate(el=>el.open),true);await press(15);assert.equal(await page.evaluate(()=>document.activeElement.closest('dialog').id),'controller-keyboard');await press(1);assert.equal(await page.locator('#controller-files').evaluate(el=>el.open),true);await press(1);await page.waitForFunction(()=>window.__nestedPicker!==undefined);assert.equal(await page.evaluate(()=>window.__nestedPicker),null);
   await page.evaluate(()=>{setView('library');openManageModal(state.library[0]);window.confirm=()=>{throw Error('Native confirmation should not be used by controller');};});
   await focus('#manage-act-delete-lua');await press(0);assert.equal(await page.locator('#controller-confirm').evaluate(el=>el.open),true);await press(1);assert.equal(await page.evaluate(()=>window.__removed.length),0);
   await focus('#manage-act-delete-lua');await press(0);await focus('#controller-confirm-accept');await press(0);assert.equal(await page.evaluate(()=>window.__removed.length),1);assert.equal(await page.evaluate(()=>state.library.length),2);await press(1);
   await page.evaluate(()=>window.__status({devices:[],frames:[],errors:[]}));await page.waitForTimeout(40);assert.equal(await page.locator('#controller-dot').evaluate(el=>el.classList.contains('connected')),false);
   await page.evaluate(()=>{window.__browserPads=[{index:0,id:'Xbox Standard Gamepad',connected:true,mapping:'standard',buttons:Array.from({length:18},()=>({pressed:false,value:0})),axes:[0,0,0,0]}];Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>window.__browserPads});window.dispatchEvent(new Event('gamepadconnected'));});await page.waitForTimeout(70);
   await page.evaluate(()=>{window.__browserPads[0].buttons[9]={pressed:true,value:1};});await page.waitForTimeout(70);assert.equal(await page.locator('#settings-dialog').evaluate(el=>el.open),true);
   await page.evaluate(()=>{window.__browserPads[0].buttons[9]={pressed:false,value:0};window.__status({devices:[window.__pad],frames:[window.__pad],errors:[]});});await page.waitForTimeout(70);await press(1);
   await page.evaluate(()=>{window.__browserPads[0].buttons[0]={pressed:true,value:1};});await page.waitForTimeout(70);assert.equal(await page.locator('#queue-dialog').evaluate(el=>el.matches(':popover-open')),false);
   await focus('#controller-open');await press(0);await focus('#controller-enabled');await press(0);assert.equal(await page.locator('#controller-enabled').isChecked(),false);await press(1);assert.equal(await page.locator('#controller-dialog').evaluate(el=>el.open),true);
   await page.locator('#controller-enabled').check();await emit(null);await press(1);assert.equal(await page.locator('#controller-dialog').evaluate(el=>el.open),false);
   await page.evaluate(()=>document.querySelector('[data-view="add"]').click());await focus('#import-toggle-btn');await press(0);await focus('#browse-files-btn');await press(0);await page.waitForFunction(()=>document.querySelector('.file-browser-entry'));
   await press(0);await press(13);await press(0);await press(13);await press(0);await page.waitForFunction(()=>window.__imports.length===1);assert.deepEqual(await page.evaluate(()=>window.__imports[0]),['C:\\1.lua']);
   await page.evaluate(()=>{state.library=Array.from({length:1000},(_,index)=>({id:String(8000000+index),name:'Library Game '+index,genre:'Steam',tag:'Kütüphane',cover:'https://cdn.akamai.steamstatic.com/steam/apps/1245620/library_600x900.jpg'}));setView('library');document.querySelector('#library-grid .game-pick').focus();window.__rects=0;const original=Element.prototype.getBoundingClientRect;Element.prototype.getBoundingClientRect=function(){window.__rects++;return original.call(this);};});
   await press(15);assert.equal(await page.evaluate(()=>document.activeElement.dataset.select),'8000001');assert.ok(await page.evaluate(()=>window.__rects)<30);
   assert.deepEqual(errors,[]);console.log(JSON.stringify({width,nativeConnection:true,spatialNavigation:true,heldButtonSafe:true,virtualKeyboardSearch:true,settingsAndSelect:true,focusRecovery:true,folderAndFileSelection:true,nestedKeyboard:true,controllerConfirmation:true,disconnect:true}));
   await context.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
