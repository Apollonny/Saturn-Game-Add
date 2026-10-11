'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function createBridge(){
  let handler,calls=0;
  const fakeHttp={createServer:callback=>{handler=callback;return {on(){},listen(){}};}};
  const context={module:{exports:{}},require:name=>name==='http'?fakeHttp:require(name),console:{log(){},warn(){}},process,setTimeout,Buffer};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../electron/steam-add-backend.cjs'),'utf8'),context);
  const Backend=context.module.exports;
  const fixture={addGame:async()=>{calls++;return {success:true};},removeGame:()=>{calls++;return {success:true};}};
  Backend.prototype.startHttpServer.call(fixture,6767);
  return {calls:()=>calls,request:async(origin,url='/add/1245620',host='127.0.0.1:6767')=>{
    const headers={},response={statusCode:200,setHeader(key,value){headers[key]=value;},end(body){this.body=body;}};
    await handler({url,method:'POST',headers:{origin,host}},response);
    return {status:response.statusCode,headers,body:JSON.parse(response.body)};
  }};
}
test('unrelated websites cannot invoke Steam actions through the HTTP bridge',async()=>{
  const bridge=createBridge(),result=await bridge.request('https://unrelated.example');
  assert.equal(result.status,403);assert.equal(bridge.calls(),0);assert.equal(result.headers['Access-Control-Allow-Origin'],undefined);
});
test('the supported local preview can use the HTTP bridge',async()=>{
  const bridge=createBridge(),result=await bridge.request('http://127.0.0.1:4173');
  assert.equal(result.status,200);assert.equal(result.body.success,true);assert.equal(bridge.calls(),1);assert.equal(result.headers['Access-Control-Allow-Origin'],'http://127.0.0.1:4173');
});
test('foreign Host headers are rejected',async()=>{
  const bridge=createBridge(),result=await bridge.request(undefined,'/add/1245620','unrelated.example:6767');
  assert.equal(result.status,403);assert.equal(bridge.calls(),0);
});
test('malformed App IDs are rejected before an action is invoked',async()=>{
  const bridge=createBridge(),result=await bridge.request('http://127.0.0.1:4173','/remove/../outside');
  assert.equal(result.status,400);assert.equal(bridge.calls(),0);
});
test('invalid removal IDs never reach the filesystem',()=>{
  const Backend=require('../electron/steam-add-backend.cjs');
  const fixture={getStPlugInDir(){throw Error('Filesystem must not be accessed');}};
  assert.equal(Backend.prototype.removeGame.call(fixture,'../outside').success,false);
  assert.equal(Backend.prototype.hasGame.call(fixture,'../outside'),false);
});
