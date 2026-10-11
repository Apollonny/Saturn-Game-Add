'use strict';
const {_electron}=require(process.env.SATURN_PLAYWRIGHT_MODULE||'playwright');
const path=require('node:path'),fs=require('node:fs'),os=require('node:os'),assert=require('node:assert/strict');
const source=path.resolve(__dirname,'..');
(async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'saturn-controller-check-'));
 const executable=process.env.SATURN_ELECTRON_BINARY||require('electron');
 const app=await _electron.launch({executablePath:executable,args:[process.env.SATURN_NATIVE_APP||source],env:{...process.env,SATURN_TEST_MODE:'1',SATURN_TEST_DATA:profile,ELECTRON_RUN_AS_NODE:undefined}});
 try{
  const page=await app.firstWindow();await page.waitForFunction(()=>typeof window.saturnDesktop?.controllerStatus==='function');
  const status=await page.evaluate(()=>window.saturnDesktop.controllerStatus());assert.equal(status.hidAvailable,true);assert.equal(status.xinputAvailable,true);assert.deepEqual(status.errors,[]);
  assert.equal(await page.evaluate(()=>window.saturnDesktop.windowAction('unsupported')),false);
  const listing=await page.evaluate(directory=>window.saturnDesktop.browseControllerFiles({directory,extensions:['.cjs']}),__dirname);assert.equal(listing.ok,true);assert.ok(listing.entries.some(entry=>entry.name==='controllers.test.cjs'));
  const invalid=await page.evaluate(()=>window.saturnDesktop.browseControllerFiles({directory:'../outside'}));assert.equal(invalid.ok,false);
  const folders=await page.evaluate(directory=>window.saturnDesktop.browseControllerFiles({directory,foldersOnly:true}),__dirname);assert.equal(folders.ok,true);assert.ok(folders.entries.every(entry=>entry.directory));
  console.log(JSON.stringify({nativeIPC:true,hidReady:status.hidAvailable,xinputReady:status.xinputAvailable,connectedDevices:status.devices.length,readOnlyFileBrowser:true,relativePathsRejected:true}));
 }finally{await app.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
