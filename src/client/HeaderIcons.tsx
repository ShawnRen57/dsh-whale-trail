/** Local outline SVGs keep both controls on the same grid in the pinned host. */
const geometry={width:20,height:20,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true as const,focusable:false};
export function RefreshIcon(){return <svg {...geometry}><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>;}
export function CloseIcon(){return <svg {...geometry}><path d="m3 3 18 18M21 3 3 21"/></svg>;}
