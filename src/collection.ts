/** Display preferences never provide evidence for chapters or badges. */
import {z} from 'zod';
export interface Preferences {
 aquarium:{enabled:boolean;selected:string[];density:number;speed:number;color:string;reducedMotion:boolean};
 card:{badgeIds:string[];signature:string};
}
export interface ChapterView {id:string;name:string;days:number;dialogues:number;rewards:string[];unlocked:boolean;completedAt?:number;progress:{days:number;dialogues:number};}
export interface CollectionView {chapters:ChapterView[];unlockedDecor:string[];}
const rewards=[['whale','clownfish','kelp','shell'],['ray','tang','coral','anemone'],['turtle','sardines','seahorse','starfish'],['dolphin','moonfish','jellyfish','lighthouse'],['humpback','manta','nautilus','reef'],['orca','lanternfish','squid','seafan'],['spermwhale','hammerhead','flyingfish','shipwreck'],['bluewhale','whaleshark','oarfish','vent'],['beluga','coelacanth','tuna','observatory']];
const names=['初见浅湾','珊瑚小径','潮汐花园','月光航道','暖流远航','深蓝回声','鲸落秘境','无垠大洋','星海归航'];
export const CHAPTERS=[ [1,1],[3,10],[7,20],[14,50],[30,100],[60,200],[100,500],[180,1000],[365,1000] ].map(([days,dialogues],i)=>({id:`c${i+1}`,name:names[i]!,days:days!,dialogues:dialogues!,rewards:rewards[i]!.map(r=>`c${i+1}-${r}`)}));
export const preferencesSchema=z.strictObject({aquarium:z.strictObject({enabled:z.boolean(),selected:z.array(z.string().max(100)).max(36),density:z.number().int().min(1).max(100),speed:z.number().min(0.1).max(3),color:z.string().regex(/^#[0-9a-fA-F]{6}$/),reducedMotion:z.boolean()}),card:z.strictObject({badgeIds:z.array(z.string().max(100)).max(5),signature:z.string().max(120)})});
export const defaultPreferences=():Preferences=>({aquarium:{enabled:false,selected:[],density:24,speed:1,color:'#67c7d8',reducedMotion:false},card:{badgeIds:[],signature:''}});
/** Import is forgiving about unavailable choices; direct editing rejects them. */
export function validatePreferences(input:unknown,unlocked:readonly string[],earned:readonly string[],strict:boolean):Preferences {
 const p=preferencesSchema.parse(input);const allowedDecor=new Set(unlocked),allowedBadges=new Set(earned);
 if(strict&&p.aquarium.selected.some(id=>!allowedDecor.has(id)))throw new Error('locked decor: choose unlocked rewards');
 const selected=[...new Set(p.aquarium.selected)].filter(id=>allowedDecor.has(id));
 const badges=[...new Set(p.card.badgeIds)].filter(id=>allowedBadges.has(id));
 if(strict&&(badges.length!==p.card.badgeIds.length||(badges.length!==0&&badges.length!==5)))throw new Error('choose five distinct earned badges');
 return {...p,aquarium:{...p.aquarium,selected},card:{...p.card,badgeIds:badges.length===5?badges:[]}};
}
export function collectionView(dayProofTimes:readonly number[],roundTimes:readonly number[]):CollectionView {
 const chapters=CHAPTERS.map(c=>{const unlocked=dayProofTimes.length>=c.days&&roundTimes.length>=c.dialogues;return {...c,rewards:[...c.rewards],unlocked,...unlocked?{completedAt:Math.max(dayProofTimes[c.days-1]!,roundTimes[c.dialogues-1]!)}:{},progress:{days:Math.min(dayProofTimes.length,c.days),dialogues:Math.min(roundTimes.length,c.dialogues)}};});
 return {chapters,unlockedDecor:chapters.filter(c=>c.unlocked).flatMap(c=>c.rewards)};
}
