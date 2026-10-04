import React from 'react';
import {interpolate,useCurrentFrame} from 'remotion';
const notifications=[
 {at:18,title:'Your routine called. You’ve got this. 💊',body:'Time for your scheduled medication. Take it as prescribed, then collect a little win.',action:'Let’s do this'},
 {at:65,title:'Future you says: nice refill planning. ✨',body:'Your refill reminder is due. Review your prescription with your pharmacy before you run low.',action:'Review refill'},
 {at:112,title:'Ten minutes. One small win. 🚶',body:'A comfy pace. A little fresh air. Baymax is cheering for your next step.',action:'I’m in'},
];
export const ReminderDemo=()=>{
 const frame=useCurrentFrame();
 return <div className="reminder-phone"><div className="phone-status"><b>9:41</b><span className="phone-island"/><span>▰ ▰</span></div><div className="phone-date">Sunday, October 4</div><div className="phone-clock">9:41</div><div className="phone-face">•—•</div><div className="phone-notifications">{notifications.map(n=>{const progress=interpolate(frame,[n.at,n.at+14],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});return <div key={n.at} className="phone-notification" style={{opacity:progress,transform:`translateY(${(1-progress)*22}px)`}}><div className="notification-source"><span>● BAYMAX</span><span>now</span></div><h3>{n.title}</h3><p>{n.body}</p><div className="notification-actions"><span>{n.action}</span><span>Later</span></div></div>;})}</div><div className="phone-footer">Your next small win is waiting. You choose when.</div><div className="phone-home"/></div>;
};
