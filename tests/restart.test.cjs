'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Backend=require('../electron/steam-add-backend.cjs');
test('missing Steam installation is reported without stopping any process',async()=>{
  const fixture={steamPath:null,stopSteam(){throw Error('Must not run');}};
  assert.equal(await Backend.prototype.restartSteam.call(fixture),false);
});
test('a failed Steam stop prevents starting another instance',async()=>{
  const fixture={steamPath:'fixture',isSteamRunning:()=>true,stopSteam:()=>false,startSteam(){throw Error('Must not run');}};
  assert.equal(await Backend.prototype.restartSteam.call(fixture),false);
});
test('restart reports the result of starting Steam',async()=>{
  const fixture={steamPath:'fixture',isSteamRunning:()=>false,startSteam:()=>false};
  assert.equal(await Backend.prototype.restartSteam.call(fixture),false);
});
