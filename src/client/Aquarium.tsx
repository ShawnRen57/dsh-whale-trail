import {useEffect,useRef} from 'react';
import {drawAquarium,type AquariumMode,type AquariumPreferences} from '../aquarium.ts';
export interface AquariumProps {preferences: AquariumPreferences; mode: AquariumMode; className?: string;}
/** Decorative canvas stays within the host-provided region and never participates in input. */
export function Aquarium({preferences,mode,className}:AquariumProps) {
  const canvas=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const element=canvas.current;
    if(!element || !preferences.enabled || !preferences.selected.length)return;
    const ctx=element.getContext('2d');
    if(!ctx)return;
    const owner=element.ownerDocument,view=owner.defaultView;
    if(!view)return;
    let disposed=false,frame=0,width=0,height=0,elapsed=0,last:number|undefined;
    const media=view.matchMedia?.('(prefers-reduced-motion: reduce)');
    let systemReduced=media?.matches ?? false;
    const reduced=()=>preferences.reducedMotion || systemReduced;
    const render=()=>drawAquarium(ctx,width,height,elapsed,preferences.selected,{...preferences,reducedMotion:reduced(),mode});
    const stop=()=>{if(frame)view.cancelAnimationFrame?.(frame);frame=0;last=undefined;};
    const tick=(now:number)=>{
      frame=0;if(disposed||owner.hidden||reduced())return;
      if(last!==undefined)elapsed+=Math.min(100,Math.max(0,now-last));last=now;
      render();frame=view.requestAnimationFrame(tick);
    };
    const start=()=>{
      stop();render();
      if(!disposed&&!owner.hidden&&!reduced()&&view.requestAnimationFrame)frame=view.requestAnimationFrame(tick);
    };
    const resize=()=>{
      const box=element.getBoundingClientRect();width=Math.max(0,Math.min(4096,box.width));height=Math.max(0,Math.min(2160,box.height));
      const ratio=Math.min(2,view.devicePixelRatio||1);
      element.width=Math.round(width*ratio);element.height=Math.round(height*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);render();
    };
    const visibility=()=>{if(owner.hidden)stop();else start();};
    const motion=(event:MediaQueryListEvent)=>{systemReduced=event.matches;start();};
    const Resize=view.ResizeObserver;
    const observer=Resize?new Resize(resize):undefined;
    observer?.observe(element);view.addEventListener('resize',resize);owner.addEventListener('visibilitychange',visibility);
    media?.addEventListener?.('change',motion);
    resize();start();
    return()=>{disposed=true;stop();observer?.disconnect();view.removeEventListener('resize',resize);owner.removeEventListener('visibilitychange',visibility);media?.removeEventListener?.('change',motion);ctx.clearRect(0,0,width,height);};
  },[preferences.enabled,preferences.selected.join('\0'),preferences.density,preferences.speed,preferences.color,preferences.reducedMotion,mode]);
  if(!preferences.enabled || !preferences.selected.length)return null;
  return <canvas ref={canvas} className={className} aria-hidden="true" data-aquarium-mode={mode} style={{position:'absolute',inset:0,width:'100%',height:'100%',maxWidth:'100%',maxHeight:'100%',display:'block',pointerEvents:'none',background:'transparent',border:0,overflow:'hidden'}}/>;
}
