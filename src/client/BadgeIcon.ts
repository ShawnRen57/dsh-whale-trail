import {createElement} from 'react';
/** Shared outline medal for both the account entry and the dialog heading. */
export function BadgeIcon({size=16}:{size?:number}) {
 return createElement('svg',{width:size,height:size,viewBox:'0 0 16 16',fill:'none',stroke:'currentColor',strokeWidth:1.35,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true,focusable:false},
  createElement('path',{d:'m5.2 9.1-.8 5.4L8 12.6l3.6 1.9-.8-5.4'}),
  createElement('circle',{cx:8,cy:6,r:4}));
}
