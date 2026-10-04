import React from 'react';
import {AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import sceneData from './scene-data.json';
import {DemoApp} from './demo/DemoApp';
import {MascotSprite} from './demo/MascotSprite';
import './video.css';

export const FPS=30;
export const INTRO=120;
export const OUTRO=120;
export type DemoScene={id:string;title:string;subtitle:string;durationInFrames:number;captions:{at:number;text:string}[]};
export const scenes=sceneData as DemoScene[];
export const framesFor=(scene:DemoScene)=>scene.durationInFrames;
export const TOTAL=INTRO+scenes.reduce((n,s)=>n+framesFor(s),0)+OUTRO;
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
const labels=['Hello, Baymax','Everyday care','Travel ready','Refill demo','Doctor brief'];


const Brand=({light=false}:{light?:boolean})=><div className={`brand ${light?'light':''}`}><span className="face"><i/><em/><i/></span><span>baymax<span className="brand-dot">.</span></span></div>;
const Background=()=>{const f=useCurrentFrame();return <><div className="grain"/><div className="ambient ambient-one" style={{transform:`translateY(${Math.sin(f/80)*14}px)`}}/><div className="ambient ambient-two"/></>};
const Footer=({light=false}:{light?:boolean})=><div className={`footer ${light?'light':''}`}><span>A LITTLE CARE. EVERY SINGLE DAY.</span><span>BUILD PERSONAL AGENTS · PRODUCT DEMO</span></div>;

export const Opening:React.FC=()=>{
 const f=useCurrentFrame();const {fps}=useVideoConfig();const pop=spring({frame:f-12,fps,config:{damping:20,stiffness:85}});
 const opacity=interpolate(f,[0,20,INTRO-14,INTRO],[0,1,1,0],clamp);
 return <AbsoluteFill className="canvas opening" style={{opacity}}><Background/><div className="topbar"><Brand/><span className="edition">MEET YOUR PERSONAL CARE COMPANION</span></div>
 <div className="opening-copy" style={{transform:`translateY(${(1-pop)*40}px)`,opacity:pop}}><div className="eyebrow"><span className="live-dot"/> BUILT AROUND YOU</div><h1>You have big plans.<br/>Let’s take care<br/>of <span>you</span>, too.</h1><p>A companion for your everyday care,<br/>your next trip, and the moments in between.</p><div className="tags"><span>Everyday wellbeing</span><span>Travel preparation</span><span>Your health context</span></div></div>
 <div className="mascot-stage" style={{transform:`scale(${.92+.08*pop})`,opacity:pop}}><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="mascot-disc"/><MascotSprite size={630} greeting/><div className="hello-bubble" style={{opacity:interpolate(f,[55,72],[0,1],clamp)}}>Hello. I am Baymax.<span>It’s good to meet you.</span></div></div><Footer/></AbsoluteFill>;
};

const shortCaptions:Record<string,string[]>={
 welcome:['A personal care space, at your pace.','Start with a simple hello.','Tell Baymax what’s on your mind.','Your everyday care, together.'],
 care:['Plan your hackathon week.','A practical plan, inside the conversation.','Check off a few small wins.','Check in with your energy.','Save your daily check-in.','Log water. See your progress.'],
 travel:['Add your destination and departure.','Prepare your medication travel checklist.','Pack the essentials. Track what’s ready.','Carry your context into a doctor brief.'],
 prescription:['Compare the fictional pharmacies.','Choose a pharmacy. Adjust the packs.','Review the quantity and sample total.','Approve the simulated checkout.','Demo confirmed. No purchase or payment.'],
 brief:['Edit the context you want to share.','Check the recipient and subject.','Review the exact email draft.','Approve the handoff. You choose when to send.'],
};
export const DemoChapter:React.FC<{scene:DemoScene;index:number}>=({scene,index})=>{
 const f=useCurrentFrame();const {fps}=useVideoConfig();const total=framesFor(scene);
 const current=Math.max(0,scene.captions.findLastIndex(c=>c.at*fps<=f));
 const captionAt=Math.round((scene.captions[current]?.at??0)*fps);
 const opacity=interpolate(f,[0,6,total-6,total],[0,1,1,0],clamp);
 return <AbsoluteFill className="canvas demo" style={{opacity}}><Background/>
 <div className="topbar"><Brand/><div className="chapter-count">{String(index+1).padStart(2,'0')} / 05 <span>{labels[index]}</span></div></div>
 <div className="wide-heading"><h2>{scene.title}</h2></div>
 <div className="large-browser"><div className="browser-chrome"><div className="traffic"><i/><i/><i/></div><div className="url">Baymax · Your personal care space</div></div>
 <div className="large-screen"><DemoApp sceneId={scene.id} step={current} stepFrame={f-captionAt}/></div></div>
 <div className="large-caption"><span className="step-number">{String(current+1).padStart(2,'0')}</span><span>{shortCaptions[scene.id][current]}</span></div>
 {(scene.id==='prescription'||scene.id==='brief')&&<div className="flow-note">{scene.id==='prescription'?'SIMULATED ORDER · NO PAYMENT OR PURCHASE':'EMAIL DRAFT · YOU HANDLE THE FINAL SEND'}</div>}
 <div className="scene-progress"><i style={{width:`${f/total*100}%`}}/></div>
 </AbsoluteFill>;
};

export const Closing:React.FC=()=>{
 const f=useCurrentFrame();const {fps}=useVideoConfig();const pop=spring({frame:f-8,fps,config:{damping:22}});
 return <AbsoluteFill className="canvas closing"><Background/><div className="topbar"><Brand light/><span className="edition">YOUR CARE. YOUR PACE.</span></div><div className="closing-copy" style={{opacity:pop,transform:`translateY(${(1-pop)*24}px)`}}><div className="eyebrow">A COMPANION IN YOUR CORNER</div><h1>A little care.<br/><span>A long way.</span></h1><p>Plan your days. Prepare for travel.<br/>Bring your story to your next doctor.</p><div className="closing-cta">Meet Baymax <span>↗</span></div><div className="closing-note">Prototype demonstration with fictional information.<br/>Prescription checkout is simulated. Email opens a draft for you to send.<br/>Baymax supports care organization and does not replace a clinician.</div></div><div className="closing-mascot"><div className="mascot-disc"/><MascotSprite size={590}/></div><Footer light/></AbsoluteFill>;
};
export const LaunchVideo:React.FC=()=>{
 let start=INTRO;
 return <AbsoluteFill className="canvas"><Sequence durationInFrames={INTRO} name="Meet Baymax"><Opening/></Sequence>{scenes.map((scene,index)=>{const from=start;start+=framesFor(scene);return <Sequence key={scene.id} from={from} durationInFrames={framesFor(scene)} name={scene.title}><DemoChapter scene={scene} index={index}/></Sequence>})}<Sequence from={start} durationInFrames={OUTRO} name="A little care. A long way."><Closing/></Sequence></AbsoluteFill>;
};
