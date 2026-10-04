import React from 'react';
import {AbsoluteFill, Freeze, useCurrentFrame, type CalculateMetadataFunction} from 'remotion';
import {z} from 'zod';
import {Opening, Closing, DemoChapter, FPS, INTRO, OUTRO, scenes} from './LaunchVideo';

type Slide = {title:string;sceneId?:string;from:number;duration:number;kind?:'intro'|'closing'};
const chapter = (sceneId:string, title:string):Slide => {
  const scene = scenes.find(s => s.id === sceneId);
  if (!scene) throw new Error(`Missing slide chapter: ${sceneId}`);
  return {title,sceneId,from:0,duration:scene.durationInFrames};
};
export const slides:Slide[] = [
  {title:'Meet Baymax',kind:'intro',from:0,duration:INTRO},
  {title:'Choose your goals',sceneId:'welcome',from:0,duration:100},
  {title:'Add medical records',sceneId:'welcome',from:100,duration:100},
  {title:'Privacy first',sceneId:'welcome',from:200,duration:150},
  {title:'Review your records',sceneId:'welcome',from:350,duration:170},
  chapter('care','Today & your plan'),
  chapter('reminders','Gentle reminders'),
  chapter('travel','Travel preparation'),
  chapter('prescription','Diabetes & marathon supplies'),
  chapter('computer','Your shared computer'),
  chapter('brief','Doctor-ready brief'),
  chapter('summary','Key use cases'),
  {title:'Fully open source',kind:'closing',from:0,duration:OUTRO},
];
export const slideDeckSchema = z.object({
  slideNumber:z.number().int().min(1).max(slides.length).describe(slides.map((s,i)=>`${i+1}: ${s.title}`).join(' · ')),
  holdSeconds:z.number().min(0).max(15).describe('Hold the final state before the selected slide loops.'),
  showSlideNumber:z.boolean().describe('Show a small slide number on the presentation.'),
});
export type SlideDeckProps = z.infer<typeof slideDeckSchema>;
export function resolveSlide(props:SlideDeckProps) {
  const index=Math.max(0,Math.min(slides.length-1,Math.round(props.slideNumber)-1));
  return {slide:slides[index],index};
}
export const slideDeckMetadata:CalculateMetadataFunction<SlideDeckProps> = ({props}) => ({
  durationInFrames:resolveSlide(props).slide.duration+Math.round(props.holdSeconds*FPS),
});
export function SlideDeck(props:SlideDeckProps) {
  const frame=useCurrentFrame();
  const {slide,index}=resolveSlide(props);
  const scene=scenes.find(s=>s.id===slide.sceneId);
  // Freeze uses the source chapter's clock, including offsets for onboarding slices.
  // The final state holds, then Studio's Loop playback repeats only this slide.
  return <AbsoluteFill className="canvas">
    <Freeze frame={slide.from+Math.min(frame,slide.duration-1)}>
      {slide.kind==='intro'?<Opening/>:slide.kind==='closing'?<Closing/>:scene?<DemoChapter scene={scene} index={scenes.indexOf(scene)}/>:null}
    </Freeze>
    {props.showSlideNumber&&<div style={{position:'absolute',right:28,bottom:15,padding:'7px 13px',borderRadius:12,background:'#ffffffe0',color:'#64765b',fontSize:22,fontWeight:600,fontFamily:'Avenir Next, Arial, sans-serif',letterSpacing:1}}>{String(index+1).padStart(2,'0')} / {slides.length}</div>}
  </AbsoluteFill>;
}
