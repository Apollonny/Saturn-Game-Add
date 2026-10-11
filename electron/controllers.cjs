'use strict';
const path=require('node:path');
const {createHash}=require('node:crypto');
const sonyProfiles=new Map([[0x05c4,'dualshock4'],[0x09cc,'dualshock4'],[0x0ba0,'dualshock4'],[0x0ce6,'dualsense'],[0x0df2,'dualsense-edge']]);
const axis=value=>Math.max(-1,Math.min(1,(value-127.5)/127.5));
function profileForDevice(device){
  if(device.vendorId!==0x054c||!sonyProfiles.has(device.productId)||device.usagePage!==1||![4,5].includes(device.usage)||!device.path)return null;
  return sonyProfiles.get(device.productId);
}
function decodeSonyReport(profile,data){
  if(!Buffer.isBuffer(data))data=Buffer.from(data||[]);
  const dualsense=profile.startsWith('dualsense');let offset,classic=false;
  if(dualsense&&data[0]===0x31&&data.length>=78)offset=2;
  else if(data[0]===0x01&&data.length===64)offset=1;
  else if(data[0]===0x01&&data.length>=10){offset=1;classic=true;}
  else if(!dualsense&&data[0]===0x11&&data.length>=78)offset=3;
  else return null;
  const base=dualsense&&!classic?offset+7:offset+4,b0=data[base],b1=data[base+1],b2=data[base+2],hat=b0&15;
  const left=dualsense&&!classic?data[offset+4]:data[offset+7],right=dualsense&&!classic?data[offset+5]:data[offset+8];
  const buttons=Array(18).fill(false);
  buttons[0]=!!(b0&32);buttons[1]=!!(b0&64);buttons[2]=!!(b0&16);buttons[3]=!!(b0&128);
  buttons[4]=!!(b1&1);buttons[5]=!!(b1&2);buttons[6]=left>140;buttons[7]=right>140;
  buttons[8]=!!(b1&16);buttons[9]=!!(b1&32);buttons[10]=!!(b1&64);buttons[11]=!!(b1&128);
  buttons[12]=[0,1,7].includes(hat);buttons[13]=[3,4,5].includes(hat);buttons[14]=[5,6,7].includes(hat);buttons[15]=[1,2,3].includes(hat);
  buttons[16]=!!(b2&1);buttons[17]=!!(b2&2);
  return {buttons,axes:[axis(data[offset]),axis(data[offset+1]),axis(data[offset+2]),axis(data[offset+3])]};
}
function decodeXInput(state){
  const gamepad=state.Gamepad||state.gamepad||{},mask=gamepad.wButtons||0,buttons=Array(18).fill(false);
  for(const [index,bit] of [[0,0x1000],[1,0x2000],[2,0x4000],[3,0x8000],[4,0x100],[5,0x200],[8,0x20],[9,0x10],[10,0x40],[11,0x80],[12,1],[13,2],[14,4],[15,8]])buttons[index]=!!(mask&bit);
  buttons[6]=(gamepad.bLeftTrigger||0)>140;buttons[7]=(gamepad.bRightTrigger||0)>140;
  const normal=value=>Math.max(-1,Math.min(1,(value||0)/(value<0?32768:32767)));
  return {buttons,axes:[normal(gamepad.sThumbLX),-normal(gamepad.sThumbLY),normal(gamepad.sThumbRX),-normal(gamepad.sThumbRY)]};
}
let xinputReader;
function createXInputReader(){
  if(process.platform!=='win32')return null;
  if(xinputReader)return xinputReader;
  const koffi=require('koffi');
  const Gamepad=koffi.struct('SaturnXInputGamepad',{wButtons:'uint16_t',bLeftTrigger:'uint8_t',bRightTrigger:'uint8_t',sThumbLX:'int16_t',sThumbLY:'int16_t',sThumbRX:'int16_t',sThumbRY:'int16_t'});
  koffi.struct('SaturnXInputState',{dwPacketNumber:'uint32_t',Gamepad});
  let getState;
  for(const dll of ['xinput1_4.dll','xinput9_1_0.dll'])try{getState=koffi.load(path.join(process.env.SystemRoot||'C:\\Windows','System32',dll)).func('uint32_t __stdcall XInputGetState(uint32_t index, _Out_ SaturnXInputState *state)');break;}catch{}
  if(!getState)return null;
  xinputReader=index=>{const state={};return getState(index,state)===0?state:null;};return xinputReader;
}
class ControllerService{
  constructor({hid,xinput,onFrame=()=>{},onStatus=()=>{}}={}){
    this.onFrame=onFrame;this.onStatus=onStatus;this.devices=new Map();this.frames=new Map();this.handles=new Map();this.signatures=new Map();this.running=false;this.foreground=true;this.scanning=false;this.generation=0;this.errors=[];
    try{this.hid=hid===undefined?require('node-hid'):hid;}catch{this.hid=null;this.errors.push('PlayStation HID bağlantısı başlatılamadı.');}
    try{this.xinput=xinput===undefined?createXInputReader():xinput;}catch{this.xinput=null;this.errors.push('Xbox XInput bağlantısı başlatılamadı.');}
    this.lastDiscovery=-Infinity;this.lastSent=new Map();this.lastButtons=new Map();
  }
  status(){return {devices:[...this.devices.values()],hidAvailable:!!this.hid,xinputAvailable:!!this.xinput,errors:this.errors.slice(),frames:[...this.frames.values()]};}
  notify(){this.onStatus(this.status());}
  publish(id,metadata,input){
    const frame={...metadata,id:metadata.id||id,...input};this.frames.set(id,frame);
    const signature=JSON.stringify([input.buttons,input.axes]);
    if(this.signatures.get(id)===signature)return;
    const buttons=JSON.stringify(input.buttons),now=Date.now();if(this.lastButtons.get(id)===buttons&&now-(this.lastSent.get(id)||0)<16)return;
    this.lastSent.set(id,now);this.lastButtons.set(id,buttons);
    this.signatures.set(id,signature);this.onFrame(frame);
  }
  async disconnect(id){
    const handle=this.handles.get(id);this.handles.delete(id);this.frames.delete(id);this.devices.delete(id);this.signatures.delete(id);this.lastSent.delete(id);this.lastButtons.delete(id);
    if(handle){handle.removeAllListeners('data');handle.removeAllListeners('error');handle.on('error',()=>{});try{await handle.close();}catch{}}
    this.notify();
  }
  async scan(){
    if(!this.hid||this.scanning||!this.running)return this.status();
    this.scanning=true;const generation=this.generation;
    try{
      const list=await this.hid.devicesAsync(0x054c,0),eligible=list.filter(device=>profileForDevice(device)),paths=new Set(eligible.map(device=>device.path));
      if(!this.running||generation!==this.generation)return this.status();
      for(const id of this.handles.keys())if(!paths.has(id))await this.disconnect(id);
      for(const device of eligible){
        if(this.handles.has(device.path))continue;
        let handle;
        try{
          handle=await this.hid.HIDAsync.open(device.path);
          if(!this.running||generation!==this.generation){await handle.close();break;}
          const profile=profileForDevice(device),metadata={id:'hid:'+createHash('sha256').update(device.path).digest('hex').slice(0,16),name:profile==='dualshock4'?'DualShock 4':profile==='dualsense-edge'?'DualSense Edge':'DualSense',kind:'playstation',source:'hid'};
          this.handles.set(device.path,handle);this.devices.set(device.path,{id:device.path,...metadata});
          handle.on('data',data=>{const input=decodeSonyReport(profile,data);if(input&&this.running)this.publish(device.path,metadata,input);});
          handle.on('error',()=>{this.disconnect(device.path).catch(()=>{});});
          this.notify();
        }catch{if(handle)try{await handle.close();}catch{}if(!this.errors.includes('Kumanda HID bağlantısı açılamadı.')){this.errors.push('Kumanda HID bağlantısı açılamadı.');this.notify();}}
      }
    }catch{if(!this.errors.includes('Kumandalar taranamadı.')){this.errors.push('Kumandalar taranamadı.');this.notify();}}
    finally{this.scanning=false;}
    return this.status();
  }
  pollXbox(){
    if(!this.running||!this.xinput)return;
    const now=Date.now(),discover=now-this.lastDiscovery>=1000;if(discover)this.lastDiscovery=now;
    for(let index=0;index<4;index++){
      const id='xinput:'+index;if(!discover&&!this.devices.has(id))continue;
      let state;try{state=this.xinput(index);}catch{state=null;}
      if(!state){if(this.devices.has(id))this.disconnect(id).catch(()=>{});continue;}
      const metadata={name:`Xbox Kumandası${index?' '+(index+1):''}`,kind:'xbox',source:'xinput'};
      if(!this.devices.has(id)){this.devices.set(id,{id,...metadata});this.notify();}
      this.publish(id,metadata,decodeXInput(state));
    }
  }
  setForeground(foreground){const resumed=foreground&&!this.foreground;this.foreground=foreground;if(resumed&&this.running){this.lastDiscovery=-Infinity;this.pollXbox();this.scan().catch(()=>{});}}
  start(){
    if(this.running)return;this.running=true;this.generation++;
    const tick=()=>{if(!this.running)return;this.pollXbox();this.pollTimer=setTimeout(tick,this.foreground?16:120);this.pollTimer.unref?.();};tick();
    const scan=async()=>{if(!this.running)return;await this.scan();if(this.running){this.scanTimer=setTimeout(scan,this.foreground?3000:10000);this.scanTimer.unref?.();}};scan();this.notify();
  }
  async stop(){this.running=false;this.generation++;clearTimeout(this.pollTimer);clearTimeout(this.scanTimer);await Promise.all([...this.devices.keys()].map(id=>this.disconnect(id)));}
}
module.exports={ControllerService,decodeSonyReport,decodeXInput,profileForDevice,createXInputReader};
