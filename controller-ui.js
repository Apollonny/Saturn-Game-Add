(() => {
  'use strict';
  const byId=id=>document.getElementById(id),desktop=window.saturnDesktop||{},engine=new window.SaturnControllerCore.InputRepeater();
  const nativeFrames=new Map();let status={devices:[],frames:[],errors:[]},browserDevices=[],activeId=null,lastActivity=0,lastInput=0,focused=document.hasFocus(),animation=null,timer=null,lastLoop=performance.now(),enabled=true,selectEditing=null;
  const preferences='saturn-controller-settings-v1';try{enabled=JSON.parse(localStorage.getItem(preferences)||'{}').enabled!==false;}catch{}
  byId('controller-enabled').checked=enabled;
  const visible=element=>!!element?.isConnected&&!element.closest('[hidden]')&&getComputedStyle(element).visibility!=='hidden'&&element.getBoundingClientRect().width>0&&element.getBoundingClientRect().height>0;
  const textField=element=>element?.matches('textarea:not([readonly]),input:not([readonly]):not([type="checkbox"]):not([type="file"]):not([type="hidden"]):not([type="radio"]):not([type="range"])');
  function topDialog(){return document.activeElement?.closest('dialog[open]')||[...document.querySelectorAll('dialog[open]')].at(-1)||null;}
  function scope(){return topDialog()||document.querySelector('#queue-dialog:popover-open')||document;}
  function controls(root=scope(),omitGrid=false){
    const selector='button:not(:disabled),a[href],input:not(:disabled):not([type="hidden"]),textarea:not(:disabled):not([readonly]),select:not(:disabled),[tabindex="0"]';
    return [...root.querySelectorAll(omitGrid?`:is(${selector}):not(.game-grid *)`:selector)].filter(element=>visible(element)&&!element.matches('.skip-link,[inert]')&&!element.closest('[inert]'));
  }
  function highlight(element){
    document.querySelectorAll('.controller-focus').forEach(item=>item.classList.remove('controller-focus'));
    if(!visible(element))return;element.classList.add('controller-focus');element.focus({preventScroll:true});element.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
  }
  function markInput(kind='xbox'){
    lastInput=performance.now();document.documentElement.classList.add('controller-mode');
    const ps=kind==='playstation';byId('controller-hint-confirm').textContent=ps?'✕ Seç':'A Seç';byId('controller-hint-back').textContent=ps?'○ Geri':'B Geri';byId('controller-hint-search').textContent=ps?'△ Ara':'Y Ara';
    byId('controller-hints').hidden=!!topDialog();
  }
  function move(direction){
    if(selectEditing&&visible(selectEditing)){
      const select=selectEditing;if(direction==='up'||direction==='left')select.selectedIndex=Math.max(0,select.selectedIndex-1);else select.selectedIndex=Math.min(select.options.length-1,select.selectedIndex+1);
      select.dispatchEvent(new Event('change',{bubbles:true}));return;
    }
    const root=scope(),current=visible(document.activeElement)&&(root===document||root.contains(document.activeElement))?document.activeElement:null;
    const card=current?.matches('.game-pick')?current.closest('.game-tile'):null,grid=card?.parentElement;
    if(grid?.classList.contains('game-grid')&&root===document){
      const columns=getComputedStyle(grid).gridTemplateColumns.split(/\s+/).length,index=Array.prototype.indexOf.call(grid.children,card),horizontal=direction==='left'||direction==='right',next=index+(direction==='left'?-1:direction==='right'?1:direction==='up'?-columns:columns);
      if(next>=0&&next<grid.children.length&&(!horizontal||Math.floor(next/columns)===Math.floor(index/columns))){highlight(grid.children[next].querySelector('.game-pick'));return;}
      if(horizontal)return;
    }
    const candidates=controls(root,!!card);
    if(!current){highlight(candidates.find(el=>el.matches('.nav-item.active'))||candidates[0]);return;}
    const rectangle=current.getBoundingClientRect(),cx=rectangle.x+rectangle.width/2,cy=rectangle.y+rectangle.height/2,horizontal=direction==='left'||direction==='right',sign=direction==='left'||direction==='up'?-1:1;
    let best=null,score=Infinity;
    for(const candidate of candidates){
      if(candidate===current)continue;const r=candidate.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,forward=sign*(horizontal?x-cx:y-cy);if(forward<4)continue;
      const cross=Math.abs(horizontal?y-cy:x-cx),overlap=horizontal?r.top<rectangle.bottom&&r.bottom>rectangle.top:r.left<rectangle.right&&r.right>rectangle.left;
      const cost=forward+cross*2+(overlap?0:1000);if(cost<score){score=cost;best=candidate;}
    }
    if(best)highlight(best);
  }
  function activate(){
    const root=scope();let element=document.activeElement;
    if(!visible(element)||element.disabled||!element.matches('button,a[href],input,textarea,select,[tabindex="0"]')||(root!==document&&!root.contains(element))){const candidates=controls(root,root===document);element=candidates.find(el=>el.matches('.nav-item.active'))||candidates[0];highlight(element);return;}
    if(textField(element)){openKeyboard(element);return;}
    if(element instanceof HTMLSelectElement){selectEditing=selectEditing===element?null:element;element.classList.toggle('controller-select-editing',!!selectEditing);return;}
    element.click();setTimeout(()=>{if(!visible(document.activeElement)||document.activeElement===document.body)highlight(controls()[0]);else highlight(document.activeElement);},0);
  }
  function back(){
    if(selectEditing){selectEditing.classList.remove('controller-select-editing');selectEditing=null;return;}
    const modal=topDialog();if(modal){modal.close();return;}
    const queue=document.querySelector('#queue-dialog:popover-open');if(queue){queue.hidePopover();return;}
    const current=document.querySelector('[data-view].active');if(current?.dataset.view!=='add')document.querySelector('[data-view="add"]')?.click();
    highlight(document.querySelector('[data-view="add"]'));
  }
  function changeTab(delta){
    if(topDialog()){const list=controls(),index=list.indexOf(document.activeElement);highlight(list[(Math.max(0,index)+delta+list.length)%list.length]);return;}
    const tabs=[...document.querySelectorAll('[data-view]')],index=tabs.findIndex(tab=>tab.classList.contains('active')),next=tabs[(index+delta+tabs.length)%tabs.length];next?.click();highlight(next);
  }
  function scrollTarget(){
    let element=document.activeElement;while(element&&element!==document.body){const style=getComputedStyle(element);if(element.scrollHeight>element.clientHeight&&/auto|scroll/.test(style.overflowY))return element;element=element.parentElement;}
    const modal=topDialog();return modal&&modal.scrollHeight>modal.clientHeight?modal:window;
  }
  function pageMove(delta){const button=byId(delta<0?'catalog-prev':'catalog-next');if(!topDialog()&&visible(button)&&!button.disabled){button.click();return;}scrollTarget().scrollBy({top:delta*innerHeight*.65,behavior:'instant'});}
  const keyboard=byId('controller-keyboard');let target=null,draft='',upper=false,symbols=false,keyboardReturn=null,maxLength=160,keyboardCommitted=false;
  const letterKeys=['1','2','3','4','5','6','7','8','9','0','-','_', 'q','w','e','r','t','y','u','ı','o','p','ğ','ü', 'a','s','d','f','g','h','j','k','l','ş','i','.', 'z','x','c','v','b','n','m','ö','ç','/','\\',':'];
  const symbolKeys=['!','@','#','$','%','&','*','(',')','[',']','?', '+','-','_','=','{','}','<','>','/','\\',':',';', '1','2','3','4','5','6','7','8','9','0',',','.', '"',"'",'`','~','|','^','€','£','₺','ğ','ü','ş'];
  function updateKeys(){
    const keys=symbols?symbolKeys:letterKeys,grid=byId('controller-key-grid');
    if(!grid.children.length)for(let index=0;index<48;index++){const button=document.createElement('button');button.type='button';button.className='keyboard-key';button.dataset.keyIndex=String(index);button.addEventListener('click',()=>append(button.dataset.key));grid.append(button);}
    [...grid.children].forEach((button,index)=>{const value=upper?keys[index].toLocaleUpperCase('tr-TR'):keys[index];button.dataset.key=value;button.textContent=value;button.setAttribute('aria-label',value);});
    byId('keyboard-case').setAttribute('aria-pressed',String(upper));byId('keyboard-symbols').setAttribute('aria-pressed',String(symbols));
  }
  function updateDraft(){const preview=byId('controller-keyboard-value');preview.value=draft;preview.scrollTop=preview.scrollHeight;byId('keyboard-message').textContent=`${draft.length} / ${maxLength} karakter`;}
  function append(character){if(draft.length+character.length>maxLength){byId('keyboard-message').textContent=`En fazla ${maxLength} karakter yazabilirsin.`;return;}draft+=character;updateDraft();}
  function erase(){draft=[...draft].slice(0,-1).join('');updateDraft();}
  function openKeyboard(input){
    if(!input||!visible(input)||input.disabled)return;
    if(keyboard.open){highlight(byId('controller-key-grid').firstElementChild);return;}
    target=input;keyboardReturn=document.activeElement;draft=input.value;upper=false;symbols=false;keyboardCommitted=false;maxLength=input.maxLength>0?input.maxLength:input.id==='game-input'?160:4096;
    byId('controller-keyboard-title').textContent=input.id==='game-input'?'Oyun ara':input.getAttribute('aria-label')||document.querySelector(`label[for="${input.id}"]`)?.textContent?.trim()||'Metin yaz';
    byId('keyboard-done').firstChild.textContent=input.id==='game-input'?'Ara':'Uygula';updateKeys();updateDraft();keyboard.showModal();highlight(byId('controller-key-grid').firstElementChild);byId('controller-hints').hidden=true;
  }
  function finishKeyboard(){
    if(!target?.isConnected){keyboard.close();return;}
    const field=target,value=draft;keyboardCommitted=true;keyboard.close();field.value=value;field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));
    if(field.id==='game-input'){highlight(byId('find-button'));field.form?.requestSubmit();}
    else{const candidates=controls(),action=candidates.find(el=>el.matches('.primary-button'));highlight(action||field);}
  }
  keyboard.addEventListener('close',()=>{if(!keyboardCommitted&&keyboardReturn?.isConnected)keyboardReturn.focus({preventScroll:true});target=null;keyboardReturn=null;});
  byId('keyboard-space').addEventListener('click',()=>append(' '));byId('keyboard-erase').addEventListener('click',erase);byId('keyboard-clear').addEventListener('click',()=>{draft='';updateDraft();});
  byId('keyboard-case').addEventListener('click',()=>{upper=!upper;updateKeys();});byId('keyboard-symbols').addEventListener('click',()=>{symbols=!symbols;updateKeys();});byId('keyboard-done').addEventListener('click',finishKeyboard);
  function searchKeyboard(){
    if(keyboard.open){append(' ');return;}
    const modal=topDialog(),input=modal?[...modal.querySelectorAll('input,textarea')].find(field=>textField(field)&&visible(field)):textField(document.activeElement)?document.activeElement:null;
    if(input){openKeyboard(input);return;}
    [...document.querySelectorAll('dialog[open]')].reverse().forEach(dialog=>dialog.close());document.querySelector('[data-view="add"]')?.click();openKeyboard(byId('game-input'));
  }
  function handle(action){
    if(['up','down','left','right'].includes(action)){move(action);return;}
    if(action==='confirm'){activate();return;}if(action==='back'){back();return;}
    if(action==='keyboard'){searchKeyboard();return;}if(action==='erase'){if(keyboard.open)erase();else document.activeElement?.closest('.game-tile')?.querySelector('.favorite-button')?.click();return;}
    if(action==='settings'){if(keyboard.open)finishKeyboard();else if(!topDialog())byId('settings-open').click();return;}
    if(action==='queue'){if(!topDialog())byId('queue-open').click();return;}
    if(action==='previous-tab'||action==='next-tab'){if(keyboard.open)(action==='previous-tab'?byId('keyboard-case'):byId('keyboard-symbols')).click();else changeTab(action==='previous-tab'?-1:1);return;}
    if(action==='previous-page'||action==='next-page')pageMove(action==='previous-page'?-1:1);
  }
  const confirm=byId('controller-confirm');let confirmResolve=null;
  function confirmAction(message,{title='Oyunu sil?',accept='Sil'}={}){if(confirmResolve)return Promise.resolve(false);byId('controller-confirm-title').textContent=title;byId('controller-confirm-accept').textContent=accept;byId('controller-confirm-copy').textContent=message;return new Promise(resolve=>{confirmResolve=resolve;confirm.showModal();highlight(byId('controller-confirm-cancel'));});}
  function resolveConfirm(value){const resolve=confirmResolve;confirmResolve=null;confirm.close();resolve?.(value);}
  byId('controller-confirm-cancel').addEventListener('click',()=>resolveConfirm(false));byId('controller-confirm-accept').addEventListener('click',()=>resolveConfirm(true));confirm.addEventListener('close',()=>{const resolve=confirmResolve;confirmResolve=null;resolve?.(false);});
  const fileDialog=byId('controller-files');let fileResolve=null,fileOptions={},fileDirectory=null,fileParent=null,fileRequest=0;const fileSelection=new Set();
  async function loadFiles(directory){
    const request=++fileRequest;byId('controller-files-status').textContent='Klasörler yükleniyor…';byId('controller-files-list').replaceChildren();byId('controller-files-list').setAttribute('aria-busy','true');byId('controller-files-select').disabled=true;
    let result;try{result=await desktop.browseControllerFiles({directory,extensions:fileOptions.extensions||[],foldersOnly:fileOptions.mode==='folder'});}catch{result={ok:false,error:'Klasör okunamadı.'};}
    if(request!==fileRequest||!fileDialog.open)return;byId('controller-files-list').setAttribute('aria-busy','false');
    if(!result?.ok){byId('controller-files-status').textContent=result?.error||'Klasör okunamadı.';return;}
    fileDirectory=result.directory;fileParent=result.parent;byId('controller-files-path').value=fileDirectory||'';byId('controller-files-up').disabled=fileDirectory===null;
    byId('controller-files-select').hidden=fileOptions.mode==='folder'?fileDirectory===null:!fileOptions.multiple;byId('controller-files-select').disabled=fileOptions.multiple?!fileSelection.size:false;byId('controller-files-select').textContent=fileOptions.multiple?`${fileSelection.size} dosyayı seç`:'Bu klasörü seç';
    const list=byId('controller-files-list');list.replaceChildren();for(const entry of result.entries||[]){const button=document.createElement('button');button.type='button';button.className='file-browser-entry';button.textContent=entry.directory?`${entry.name} /`:entry.name;button.title=entry.path;
      if(fileOptions.multiple&&!entry.directory)button.setAttribute('aria-pressed',String(fileSelection.has(entry.path)));
      button.addEventListener('click',()=>{if(entry.directory){loadFiles(entry.path);return;}if(!fileOptions.multiple){finishFiles([entry.path]);return;}if(fileSelection.has(entry.path))fileSelection.delete(entry.path);else fileSelection.add(entry.path);button.setAttribute('aria-pressed',String(fileSelection.has(entry.path)));byId('controller-files-select').disabled=!fileSelection.size;byId('controller-files-select').textContent=`${fileSelection.size} dosyayı seç`;});list.append(button);}
    byId('controller-files-status').textContent=list.children.length?`${list.children.length} öğe`:'Bu klasörde uygun dosya yok.';highlight(list.firstElementChild||(byId('controller-files-select').hidden?byId('controller-files-path'):byId('controller-files-select')));
  }
  function pickFiles(options={}){
    if(!desktop.browseControllerFiles||fileResolve)return Promise.resolve(null);fileOptions=options;fileSelection.clear();byId('controller-files-title').textContent=options.mode==='folder'?'Klasör seç':'Dosya seç';
    return new Promise(resolve=>{fileResolve=resolve;fileDialog.showModal();loadFiles(options.directory||null);});
  }
  function finishFiles(paths){const resolve=fileResolve;fileResolve=null;fileRequest++;fileDialog.close();resolve?.(paths);}
  fileDialog.addEventListener('close',()=>{const resolve=fileResolve;fileResolve=null;fileRequest++;resolve?.(null);});
  byId('controller-files-up').addEventListener('click',()=>loadFiles(fileParent));byId('controller-files-go').addEventListener('click',()=>loadFiles(byId('controller-files-path').value.trim()||null));byId('controller-files-select').addEventListener('click',()=>finishFiles(fileOptions.multiple?[...fileSelection]:[fileDirectory]));
  function normalized(frame){
    if(!frame||typeof frame.id!=='string')return null;
    return {...frame,buttons:Array.from({length:18},(_,index)=>!!frame.buttons?.[index]),axes:Array.from({length:4},(_,index)=>Number.isFinite(frame.axes?.[index])?Math.max(-1,Math.min(1,frame.axes[index])):0)};
  }
  function receiveFrame(value){const frame=normalized(value);if(frame)nativeFrames.set(frame.id,frame);}
  function renderStatus(){
    const devices=status.devices.length?status.devices:browserDevices,connected=devices.length>0;
    byId('controller-dot').classList.toggle('connected',connected);byId('controller-open').setAttribute('aria-label',connected?`${devices[0].name} bağlı. Kumanda ayarları`:'Kumanda bağlantısı ve kullanım');
    byId('controller-status').textContent=connected?`${devices.length} kumanda bağlı${enabled?'':' · Kumandayla kontrol kapalı'}`:status.errors?.length?status.errors.join(' '):'Kumandanı USB veya Bluetooth ile bağla. Bağlandıktan sonra bir tuşa bas.';
    const list=byId('controller-device-list');list.replaceChildren();for(const device of devices){const row=document.createElement('div'),name=document.createElement('strong'),source=document.createElement('span');row.className='controller-device';name.textContent=device.name;source.textContent=device.source==='hid'?'Doğrudan HID':device.source==='xinput'?'Windows XInput':'Standart Gamepad';row.append(name,source);list.append(row);}
    if(!connected){activeId=null;engine.reset();document.documentElement.classList.remove('controller-mode');byId('controller-hints').hidden=true;}
  }
  function receiveStatus(value){if(!value)return;status={devices:Array.isArray(value.devices)?value.devices:[],frames:Array.isArray(value.frames)?value.frames:[],errors:Array.isArray(value.errors)?value.errors:[]};const ids=new Set(status.devices.map(device=>device.id));for(const id of nativeFrames.keys())if(!ids.has(id))nativeFrames.delete(id);status.frames.forEach(receiveFrame);if(activeId&&!ids.has(activeId)){activeId=null;engine.reset();}renderStatus();kick();}
  function sampleBrowser(){
    let pads=[];try{pads=[...(navigator.getGamepads?.()||[])].filter(pad=>pad?.connected&&pad.mapping==='standard');}catch{}
    const frames=pads.map(pad=>({id:'gamepad:'+pad.index,name:pad.id.slice(0,100),kind:/054c|playstation|dualshock|dualsense|sony/i.test(pad.id)?'playstation':'xbox',source:'gamepad',buttons:pad.buttons.map(button=>button.pressed||button.value>.55),axes:pad.axes.slice(0,4)}));
    if(browserDevices.map(d=>d.id).join()!==frames.map(d=>d.id).join()){browserDevices=frames.map(({id,name,kind,source})=>({id,name,kind,source}));renderStatus();}
    return frames;
  }
  function loop(now=performance.now()){
    animation=null;timer=null;const elapsed=Math.min(50,now-lastLoop);lastLoop=now;
    const frames=status.devices.length?[...nativeFrames.values()]:sampleBrowser();
    if(enabled&&focused&&!document.hidden){
      const meaningful=frame=>frame.buttons.some(Boolean)||!!window.SaturnControllerCore.directionOf(frame)||Math.abs(frame.axes[3]||0)>.25;
      let sample=frames.find(frame=>frame.id===activeId);const candidate=frames.find(meaningful);
      if(!sample||(candidate&&candidate.id!==activeId&&now-lastActivity>500)){sample=candidate||frames[0];if(sample?.id!==activeId){activeId=sample?.id||null;engine.reset();}}
      if(sample){
        if(meaningful(sample))lastActivity=now;
        const actions=engine.update(sample,now,keyboard.open);for(const action of actions){markInput(sample.kind);handle(action);}
        const rightY=sample.axes[3]||0;if(Math.abs(rightY)>.28&&!keyboard.open){markInput(sample.kind);scrollTarget().scrollBy({top:rightY*elapsed*.9,behavior:'instant'});}
      }
    }
    if(now-lastInput>10000&&!keyboard.open){document.documentElement.classList.remove('controller-mode');document.querySelectorAll('.controller-focus').forEach(el=>el.classList.remove('controller-focus'));byId('controller-hints').hidden=true;}
    if(!document.hidden&&focused&&enabled&&(frames.length||status.devices.length))animation=requestAnimationFrame(loop);else timer=setTimeout(()=>loop(performance.now()),document.hidden?1000:250);
  }
  function kick(){if(animation!==null)cancelAnimationFrame(animation);if(timer!==null)clearTimeout(timer);animation=requestAnimationFrame(loop);}
  function suspend(){focused=false;engine.reset();byId('controller-hints').hidden=true;}
  window.addEventListener('blur',suspend);window.addEventListener('focus',()=>{focused=true;engine.reset();kick();});document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();else{focused=document.hasFocus();engine.reset();kick();}});
  window.addEventListener('gamepadconnected',kick);window.addEventListener('gamepaddisconnected',()=>{activeId=null;engine.reset();kick();});
  document.addEventListener('pointerdown',()=>{document.documentElement.classList.remove('controller-mode');document.querySelectorAll('.controller-focus').forEach(el=>el.classList.remove('controller-focus'));byId('controller-hints').hidden=true;});
  byId('controller-open').addEventListener('click',()=>{renderStatus();byId('controller-dialog').showModal();});
  byId('controller-enabled').addEventListener('change',event=>{enabled=event.target.checked;engine.reset();try{localStorage.setItem(preferences,JSON.stringify({enabled}));}catch{}if(!enabled){document.documentElement.classList.remove('controller-mode');byId('controller-hints').hidden=true;}renderStatus();kick();});
  byId('controller-rescan').addEventListener('click',async()=>{const button=byId('controller-rescan');button.disabled=true;try{if(desktop.rescanControllers)receiveStatus(await desktop.rescanControllers());else{sampleBrowser();renderStatus();}}catch{byId('controller-status').textContent='Bağlantı yenilenemedi. Kumandayı tekrar bağla.';}finally{button.disabled=false;}});
  const unsubscribeStatus=desktop.onControllerStatus?.(receiveStatus),unsubscribeFrame=desktop.onControllerFrame?.(receiveFrame);
  desktop.controllerStatus?.().then(receiveStatus).catch(()=>{byId('controller-status').textContent='Kumanda durumu alınamadı.';});
  window.addEventListener('beforeunload',()=>{unsubscribeStatus?.();unsubscribeFrame?.();if(animation!==null)cancelAnimationFrame(animation);if(timer!==null)clearTimeout(timer);});
  window.saturnController=Object.freeze({openKeyboard,confirmAction,pickFiles,isActive:()=>enabled&&document.documentElement.classList.contains('controller-mode')});
  renderStatus();kick();
})();
