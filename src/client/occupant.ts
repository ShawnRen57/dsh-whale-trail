/** Follow an existing slot occupant, whose registration can follow declaration. */
export function watchOccupant<T>(read:()=>T|undefined,subscribe:(changed:()=>void)=>()=>void,mount:(value:T)=>()=>void):()=>void {
 let current:T|undefined;let dispose:(()=>void)|undefined;let busy=false;
 const reconcile=()=>{if(busy)return;const next=read();if(next===current)return;busy=true;try{dispose?.();dispose=undefined;current=next;if(next!==undefined)dispose=mount(next);}finally{busy=false;}};
 const unsubscribe=subscribe(reconcile);reconcile();return()=>{unsubscribe();dispose?.();};
}
