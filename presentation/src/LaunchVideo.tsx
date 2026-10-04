import React from 'react';
import {AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import sceneData from './scene-data.json';
import {ReminderDemo} from './demo/ReminderDemo';
import {DemoApp} from './demo/DemoApp';
import {MascotSprite} from './demo/MascotSprite';
import './video.css';

export const FPS=30;
export const INTRO=90;
export const OUTRO=90;
export type DemoScene={id:string;title:string;subtitle:string;durationInFrames:number;captions:{at:number;text:string}[]};
export const scenes=sceneData as DemoScene[];
export const framesFor=(scene:DemoScene)=>scene.durationInFrames;
export const TOTAL=INTRO+scenes.reduce((n,s)=>n+framesFor(s),0)+OUTRO;
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
const headlines:Record<string,string>={welcome:'Care starts with a conversation.',care:'Small steps. Every day.',travel:'Take your care with you.',prescription:'Your refill, step by step.',brief:'Your story. Ready to share.'};
const Brand=()=> <div className="brand"><span className="face"><i/><em/><i/></span><span>baymax<span className="brand-dot">.</span></span></div>;

export const Opening:React.FC=()=>{
 const f=useCurrentFrame();const {fps}=useVideoConfig();const enter=spring({frame:f-4,fps,config:{damping:24}});
 return <AbsoluteFill className="canvas opening"><div className="intro-copy" style={{opacity:enter,transform:`translateY(${(1-enter)*24}px)`}}><Brand/><h1>An adorable Medical Personal Agent<br/>that cares for you.</h1></div><div className="opening-sprite" style={{opacity:enter,transform:`translateY(${(1-enter)*55}px)`}}><MascotSprite size={570} greeting/></div></AbsoluteFill>;
};

export const DemoChapter:React.FC<{scene:DemoScene;index:number}>=({scene,index})=>{
 const f=useCurrentFrame();const {fps}=useVideoConfig();
 const current=Math.max(0,scene.captions.findLastIndex(c=>c.at*fps<=f));
 const captionAt=Math.round((scene.captions[current]?.at??0)*fps);
 const enter=interpolate(f,[0,12],[0,1],clamp);
 if(scene.id==='reminders')return <AbsoluteFill className="canvas reminder-scene"><div className="reminder-copy"><div className="scene-kicker">BAYMAX · REMINDERS</div><h2>Small steps.<br/>Big Baymax<br/>energy.</h2><p>A little nudge.<br/>You choose when.</p></div><ReminderDemo/></AbsoluteFill>;
 const wide=(scene.id==='welcome'&&current===3)||(scene.id==='care'&&current===5)||scene.id==='brief'||(scene.id==='travel'&&current===3);
 const mode=wide?'overview':scene.id==='prescription'?'refill':scene.id==='care'&&current===0?'conversation':scene.id==='travel'?'travel':'personal';
 const title=scene.id==='care'?(current===0?'Make room\nfor you.':current===3?'How are\nyou, really?':current===4?'A little\nwin.':'Small steps.\nEvery day.'):scene.id==='prescription'?(current>=4?'All set.':current>=2?'One last\nlook.':'A refill.\nMade simple.'):scene.id==='travel'?'Care,\nwherever\nyou go.':scene.id==='welcome'?'Start with\nhello.':headlines[scene.id];
 return <AbsoluteFill className={`canvas demo layout-${mode} ${scene.id==='care'&&(current===3||current===4)?'variant-checkin':''}`}>
 <div className="scene-copy" style={{opacity:enter}}><div className="scene-kicker">{scene.id==='prescription'?'PRESCRIPTION REFILL':scene.id==='travel'?'TRAVEL CARE':scene.id==='brief'?'DOCTOR BRIEF':scene.id==='welcome'?'MEET BAYMAX':'EVERYDAY CARE'}</div><h2>{wide?headlines[scene.id]:title}</h2><div className="scene-rule"/></div>
 <div className="feature-stage" style={{opacity:enter}}><DemoApp sceneId={scene.id} step={current} stepFrame={f-captionAt}/></div>
 </AbsoluteFill>;
};

export const Closing:React.FC=()=>{
 const f=useCurrentFrame();const {fps}=useVideoConfig();const enter=spring({frame:f-3,fps,config:{damping:24}});
 return <AbsoluteFill className="canvas closing"><div className="closing-sprite" style={{opacity:enter,transform:`translateY(${(1-enter)*28}px)`}}><MascotSprite size={390}/></div><div className="outro-copy" style={{opacity:enter}}><h1>Your care. Your pace.</h1><Brand/><p className="positioning">Designed to be secure and compliant.</p></div></AbsoluteFill>;
};
export const LaunchVideo:React.FC=()=>{
 let start=INTRO;
 return <AbsoluteFill className="canvas"><Sequence durationInFrames={INTRO} name="Meet Baymax"><Opening/></Sequence>{scenes.map((scene,index)=>{const from=start;start+=framesFor(scene);return <Sequence key={scene.id} from={from} durationInFrames={framesFor(scene)} name={scene.title}><DemoChapter scene={scene} index={index}/></Sequence>})}<Sequence from={start} durationInFrames={OUTRO} name="Your care. Your pace."><Closing/></Sequence></AbsoluteFill>;
};
