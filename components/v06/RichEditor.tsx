'use client';
import {useEffect,useRef,useState,type MouseEvent,type ClipboardEvent} from 'react';

type Props={value:string;onChange:(html:string)=>void;label:string;hint?:string;minHeight?:number};
const allowed=new Set(['P','DIV','BR','B','STRONG','I','EM','U','UL','OL','LI','H2','H3','BLOCKQUOTE','A']);
const blocked=new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','FORM','SVG','MATH','VIDEO','AUDIO','IMG','LINK','META','BASE','TEMPLATE']);

/** HTML allowlist for user-generated formatted text; strips every attribute except safe HTTPS links. */
export function cleanRichHtml(raw:string):string {
 if(typeof document==='undefined')return '';
 const doc=new DOMParser().parseFromString(raw||'','text/html');
 const target=document.createElement('div');
 const walk=(node:Node,parent:Node)=>{
  if(node.nodeType===Node.TEXT_NODE){parent.appendChild(document.createTextNode(node.textContent||''));return;}
  if(node.nodeType!==Node.ELEMENT_NODE)return;
  const source=node as HTMLElement;
  if(blocked.has(source.tagName))return;
  const tag=allowed.has(source.tagName)?source.tagName.toLowerCase():'span';
  const safe=document.createElement(tag);
  if(source.tagName==='A'){
   const href=source.getAttribute('href')||'';
   try {const u=new URL(href);
    if(u.protocol==='https:'||u.protocol==='http:'){
     safe.setAttribute('href',u.href);safe.setAttribute('target','_blank');safe.setAttribute('rel','noopener noreferrer');
    }
   }catch { /* discard unsafe link */ }
  }
  for(const child of Array.from(source.childNodes))walk(child,safe);
  parent.appendChild(safe);
 };
 for(const child of Array.from(doc.body.childNodes))walk(child,target);
 return target.innerHTML.slice(0,16000);
}
export function richPlainText(html:string):string{
 if(typeof document==='undefined')return html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
 const node=document.createElement('div');node.innerHTML=cleanRichHtml(html);
 return (node.textContent||'').replace(/\s+/g,' ').trim();
}
export function RichContent({html,className=''}:{html:string;className?:string}){
 const [safe,setSafe]=useState('');
 useEffect(()=>setSafe(cleanRichHtml(html||'')),[html]);
 if(!safe)return <p className="rich-empty">{richPlainText(html)||'Aucune description pour le moment.'}</p>;
 return <div className={`rich-view ${className}`} dangerouslySetInnerHTML={{__html:safe}}/>;
}
export default function RichEditor({value,onChange,label,hint,minHeight=175}:Props){
 const editor=useRef<HTMLDivElement|null>(null);
 useEffect(()=>{if(editor.current&&document.activeElement!==editor.current){
  const next=cleanRichHtml(value||'');if(editor.current.innerHTML!==next)editor.current.innerHTML=next;
 }},[value]);
 const push=()=>{if(editor.current)onChange(cleanRichHtml(editor.current.innerHTML));};
 const command=(name:string,arg?:string)=>{
  editor.current?.focus();document.execCommand(name,false,arg);push();
 };
 const toolbar=(e:MouseEvent<HTMLButtonElement>,cmd:string,arg?:string)=>{
  e.preventDefault();command(cmd,arg);
 };
 function insertLink(e:MouseEvent<HTMLButtonElement>){
  e.preventDefault();const href=window.prompt('Adresse du lien (https://...)');
  if(!href)return;try{const u=new URL(href);if(u.protocol!=='https:'&&u.protocol!=='http:')throw new Error('Adresse invalide');
   command('createLink',u.href);
  }catch{window.alert('Utilisez un lien commencant par https:// ou http://');}
 }
 const paste=(e:ClipboardEvent<HTMLDivElement>)=>{
  e.preventDefault();const text=e.clipboardData.getData('text/plain');
  document.execCommand('insertText',false,text);push();
 };
 const b=(name:string,title:string,cmd:string,arg?:string)=>
  <button key={name} type="button" className="editor-tool" aria-label={title}
   title={title} onMouseDown={e=>toolbar(e,cmd,arg)}>{name}</button>;
 return <div className="field">
  <label>{label}</label>
  <div className="wysiwyg">
   <div className="wysiwyg-toolbar" role="toolbar" aria-label="Mise en forme du texte">
    {b('B','Gras','bold')}{b('I','Italique','italic')}{b('U','Souligner','underline')}
    <span className="toolbar-divider"/>
    {b('H2','Grand titre','formatBlock','h2')}{b('H3','Sous-titre','formatBlock','h3')}
    {b('Liste','Liste a puces','insertUnorderedList')}{b('1. 2.','Liste numerotee','insertOrderedList')}
    <button type="button" className="editor-tool" aria-label="Inserer un lien" onMouseDown={insertLink}>Lien</button>
    {b('Effacer','Effacer la mise en forme','removeFormat')}
   </div>
   <div ref={editor} className="wysiwyg-surface rich-view" role="textbox" aria-multiline="true"
    aria-label={label} data-placeholder="Saisissez une description détaillée..." contentEditable suppressContentEditableWarning
    style={{minHeight}} onInput={push} onBlur={push} onPaste={paste}/>
  </div>
  <div className="field-hint">{hint||'Texte enrichi : titres, listes, gras, italique et liens.'}</div>
 </div>;
}
