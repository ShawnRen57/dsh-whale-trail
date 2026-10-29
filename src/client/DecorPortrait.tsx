import {COLLECTION_ART} from './collection-art.ts';
/** Static collectible illustration; loaded from the offline plugin bundle. */
export function DecorPortrait({id}:{id:string}) {
 const src=COLLECTION_ART[id];
 return src?<img className="wt-decor-portrait" src={src} width={512} height={512} alt="" aria-hidden="true" loading="lazy" decoding="async"/>:null;
}
