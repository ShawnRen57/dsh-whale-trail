/** Pinned 0.2.1 account menu adapter: preserve every existing action and append one item. */
import { Children, cloneElement, createElement, isValidElement, type ReactNode } from 'react';
import {BadgeIcon} from './BadgeIcon.ts';
interface MenuProps {items?:{id:string;label:ReactNode;icon?:ReactNode}[];onSelect?:(id:string)=>void;onClose?:()=>void;children?:ReactNode;}
// Match the account menu's 16px currentColor outline icons and shared icon column.
const badgeIcon=createElement(BadgeIcon);
/** Decorate the original render tree, without querying or mutating DOM. */
export function addBadgeMenu(node:ReactNode,label:string,open:()=>void):ReactNode {
 if(!isValidElement<MenuProps>(node))return node;
 const props=node.props;
 if(Array.isArray(props.items)&&props.items.some(i=>i.id==='settings')&&props.items.some(i=>i.id==='contact')){
  return cloneElement(node,{items:[props.items[0]!,{id:'whale-trail',label,icon:badgeIcon},...props.items.slice(1)],onSelect:(id:string)=>{
   if(id==='whale-trail'){props.onClose?.();open();}else props.onSelect?.(id);
  }});
 }
 if(props.children!==undefined)return cloneElement(node,{},Children.map(props.children,c=>addBadgeMenu(c,label,open)));
 return node;
}
