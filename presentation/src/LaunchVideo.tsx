import React from 'react';
import {AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import sceneData from './scene-data.json';
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
const labels=['Hello, Baymax','Everyday care','Travel ready','Refill demo','Doctor brief'];


const Brand=({light=false}:{light?:boolean})=><div className={`brand ${light?'light':''}`}><span className="face"><i/><em/><i/></span><span>baymax<span className="brand-dot">.</span></span></div>;
const Background=()=>{const f=useCurrentFrame();return <><div className="grain"/><div className="ambient ambient-one" style={{transform:`translateY(${Math.sin(f/80)*14}px)`}}/><div className="ambient ambient-two"/></>};
export const Opening:React.FC=()=>{
 const f=useCurrentFrame();const {fps}=useVideoConfig();const pop=spring({frame:f-5,fps,config:{damping:22}});
 return <AbsoluteFill className="canvas opening"><div className="topbar"><Brand/></div><div className="intro-minimal" style={{opacity:pop,transform:`translateY(${(1-pop)*25}px)`}}><h1>A little care.<br/><span>Every day.</span></h1></div><div className="hero-sprite"><MascotSprite size={670} greeting/></div></AbsoluteFill>;
};

export const DemoChapter:React.FC<{scene:DemoScene;index:number}>=({scene,index})=>{
 const f=useCurrentFrame();const {fps}=useVideoConfig();const total=framesFor(scene);
 const current=Math.max(0,scene.captions.findLastIndex(c=>c.at*fps<=f));
 const captionAt=Math.round((scene.captions[current]?.at??0)*fps);
 const opacity=interpolate(f,[0,6,total-6,total],[0,1,1,0],clamp);
 return <AbsoluteFill className="canvas demo" style={{opacity}}>
 <div className="topbar"><Brand/><h2 className="feature-label">{scene.title}</h2></div>
 <div className="clean-demo"><DemoApp sceneId={scene.id} step={current} stepFrame={f-captionAt}/></div>
 <div className="minimal-caption" key={current}>{scene.captions[current].text}</div>
 </AbsoluteFill>;
};

export const Closing:React.FC=()=>{
 const f=useCurrentFrame();const {fps}=useVideoConfig();const pop=spring({frame:f-5,fps,config:{damping:22}});
 return <AbsoluteFill className="canvas closing"><div className="topbar"><Brand light/></div><div className="outro-minimal" style={{opacity:pop}}><h1>Your care.<br/><span>Your pace.</span></h1><p>Meet Baymax.</p></div><div className="hero-sprite"><MascotSprite size={670}/></div></AbsoluteFill>;
};
export const LaunchVideo:React.FC=()=>{
 let start=INTRO;
 return <AbsoluteFill className="canvas"><Sequence durationInFrames={INTRO} name="Meet Baymax"><Opening/></Sequence>{scenes.map((scene,index)=>{const from=start;start+=framesFor(scene);return <Sequence key={scene.id} from={from} durationInFrames={framesFor(scene)} name={scene.title}><DemoChapter scene={scene} index={index}/></Sequence>})}<Sequence from={start} durationInFrames={OUTRO} name="A little care. A long way."><Closing/></Sequence></AbsoluteFill>;
};
