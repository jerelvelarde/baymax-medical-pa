import React from 'react';
import {SlideDeck, slideDeckSchema, slideDeckMetadata} from './SlideDeck';
import {Composition, Folder} from 'remotion';
import {LaunchVideo, Opening, Closing, DemoChapter, INTRO, OUTRO, TOTAL, FPS, scenes, framesFor} from './LaunchVideo';
export const VideoRoot:React.FC=()=><><Composition id="Baymax-Slides" component={SlideDeck} schema={slideDeckSchema} defaultProps={{
  slideNumber: 12,
  holdSeconds: 2,
  showSlideNumber: true,
}} calculateMetadata={slideDeckMetadata} durationInFrames={150} fps={FPS} width={1920} height={1080}/><Composition id="Baymax-Launch" component={LaunchVideo} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080}/><Folder name="Chapters"><Composition id="00-Intro" component={Opening} durationInFrames={INTRO} fps={FPS} width={1920} height={1080}/>{scenes.map((scene,index)=><Composition key={scene.id} id={`${String(index+1).padStart(2,'0')}-${scene.id}`} component={DemoChapter} defaultProps={{scene,index}} durationInFrames={framesFor(scene)} fps={FPS} width={1920} height={1080}/>)}<Composition id="09-Closing" component={Closing} durationInFrames={OUTRO} fps={FPS} width={1920} height={1080}/></Folder></>;
