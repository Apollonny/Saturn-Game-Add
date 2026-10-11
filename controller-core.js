(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.SaturnControllerCore=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const buttonActions={0:'confirm',1:'back',2:'erase',3:'keyboard',4:'previous-tab',5:'next-tab',6:'previous-page',7:'next-page',8:'queue',9:'settings',17:'keyboard'};
  function directionOf(sample){
    const buttons=sample?.buttons||[],axes=sample?.axes||[];
    const horizontal=(buttons[15]?1:0)-(buttons[14]?1:0),vertical=(buttons[13]?1:0)-(buttons[12]?1:0);
    if(horizontal||vertical)return Math.abs(vertical)>=Math.abs(horizontal)?(vertical>0?'down':'up'):(horizontal>0?'right':'left');
    const x=Number.isFinite(axes[0])?axes[0]:0,y=Number.isFinite(axes[1])?axes[1]:0;
    if(Math.max(Math.abs(x),Math.abs(y))<.55)return null;
    return Math.abs(x)>Math.abs(y)?(x>0?'right':'left'):(y>0?'down':'up');
  }
  class InputRepeater{
    constructor(){this.reset();}
    reset(){this.previous=[];this.direction=null;this.nextMove=0;this.nextErase=0;this.armed=false;}
    update(sample,now,repeatErase=false){
      const buttons=sample?.buttons||[],direction=directionOf(sample),actions=[];
      if(!this.armed){if(!buttons.some(Boolean)&&!direction)this.armed=true;this.previous=buttons.slice();return actions;}
      for(const [index,action] of Object.entries(buttonActions))if(buttons[index]&&!this.previous[index]){actions.push(action);if(action==='erase')this.nextErase=repeatErase?now+420:Infinity;}
      if(repeatErase&&buttons[2]&&this.previous[2]&&now>=this.nextErase){actions.push('erase');this.nextErase=now+100;}
      if(direction!==this.direction){if(direction){actions.push(direction);this.nextMove=now+340;}this.direction=direction;}
      else if(direction&&now>=this.nextMove){actions.push(direction);this.nextMove=now+105;}
      this.previous=buttons.slice();return actions;
    }
  }
  return {InputRepeater,directionOf};
});
