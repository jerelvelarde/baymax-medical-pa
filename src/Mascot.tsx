import React, { createContext, useContext, useEffect, useId, useRef, useState } from "react";

export const MascotActivity = createContext({ responding: false, setResponding: (_: boolean) => {} });
type Spring = { value: number; velocity: number };
export type Motion = {
  time: number; sinceResponse: number; wasResponding: boolean; greeted: boolean;
  arm: Spring; hand: Spring; attention: Spring;
};
export const createMotion = (): Motion => ({
  time: 0, sinceResponse: 0, wasResponding: false, greeted: false,
  arm: { value: 0, velocity: 0 }, hand: { value: 0, velocity: 0 }, attention: { value: 0, velocity: 0 },
});
function spring(s: Spring, target: number, dt: number, frequency: number) {
  // Exact critically damped integration: interruption preserves position and velocity.
  const offset = s.value - target;
  const impulse = s.velocity + frequency * offset;
  const decay = Math.exp(-frequency * dt);
  s.value = target + (offset + impulse * dt) * decay;
  s.velocity = (s.velocity - frequency * impulse * dt) * decay;
}
export function advanceMotion(m: Motion, dt: number, responding: boolean) {
  m.time += dt;
  if (responding !== m.wasResponding) m.sinceResponse = 0;
  m.sinceResponse += dt;
  if (responding) m.greeted = true;
  const t = m.time;
  const greeting = !m.greeted && t < 3.4;
  const reach = greeting ? (t < .45 ? 0 : t < 1.35 ? 1 : t < 1.65 ? .88 : t < 2.05 ? 1 : 0) : 0;
  spring(m.arm, reach, dt, 9);
  spring(m.hand, m.arm.value, dt, 12);
  const anticipate = responding && m.sinceResponse < .14;
  spring(m.attention, responding ? (anticipate ? -.18 : 1) : 0, dt, 8);
  if (t >= 3.4) m.greeted = true;
  m.wasResponding = responding;
  const settling = !responding && (Math.abs(m.attention.value) > .015 || Math.abs(m.arm.value) > .015);
  return {
    time: t, arm: m.arm.value, hand: m.hand.value, attention: m.attention.value,
    phase: responding ? "responding" : greeting ? "greeting" : settling ? "settling" : "idle",
  };
}
export type Pose = ReturnType<typeof advanceMotion>;
const rest = [196,147, 215,148,230,172,239,196, 247,218,247,236,234,239, 222,242,217,225,212,211, 205,192,198,179,187,167];
const raised = [196,147, 214,148,224,143,233,128, 243,113,244,95,256,97, 270,100,262,121,250,141, 233,167,213,179,193,172];
function armPath(arm: number, hand: number) {
  const points = rest.map((v, i) => v + (raised[i] - v) * (i >= 6 && i < 20 ? hand : arm));
  return "M" + points.slice(0,2).join(" ") + " C" + points.slice(2).join(" ") + "Z";
}
export function MascotArt({ pose, id, small = false }: { pose: Pose; id: string; small?: boolean }) {
  const a = pose.attention;
  const breath = (1 - Math.cos(pose.time * Math.PI / 3)) / 2;
  const blinkCycle = pose.time % 6.7;
  const blink = blinkCycle > 4.8 && blinkCycle < 5.04 ? 1 - .92 * Math.sin((blinkCycle - 4.8) / .24 * Math.PI) : 1;
  const fill = `url(#${id}-shell)`;
  return <svg className={`mascot ${small ? "small" : ""}`} viewBox="0 0 300 330"
    data-phase={pose.phase} role="img" aria-label="Baymax, your care companion">
    <defs>
      <radialGradient id={`${id}-shell`} gradientUnits="userSpaceOnUse" cx="111" cy="103" r="205">
        <stop offset="0" stopColor="#fff"/><stop offset=".65" stopColor="#f9faf7"/><stop offset="1" stopColor="#dfe5d9"/>
      </radialGradient>
    </defs>
    <ellipse cx="150" cy="302" rx="59" ry="6" fill="#354532" opacity=".09"/>
    {/* Feet remain outside the breathing and gesture transforms. */}
    <path d="M107 264C105 278 107 298 122 299C137 300 142 289 141 271Z" fill={fill}/>
    <path d="M159 271C158 289 163 300 178 299C193 298 195 278 193 264Z" fill={fill}/>
    <g transform={`rotate(${-1.5 * pose.arm} 150 279)`}>
      <path d="M104 147C85 147 65 175 59 204C54 224 59 238 70 238C83 238 85 222 91 205L113 169Z" fill={fill} stroke="#dae1d4" strokeWidth=".7"/>
      {/* Path deformation bends the elbow; the hand follows the shoulder. */}
      <path d={armPath(pose.arm, pose.hand)} fill={fill} stroke="#dae1d4" strokeWidth=".7"/>
      <g transform={`translate(0 ${-.8 * breath}) translate(150 280) scale(${1 + .008 * breath} ${1 + .006 * breath}) translate(-150 -280)`}>
        <path d="M150 125C119 125 97 142 89 174C81 200 73 223 80 249C87 278 113 288 150 288C187 288 213 278 220 249C227 223 219 200 211 174C203 142 181 125 150 125Z" fill={fill}/>
      </g>
      <g transform={`translate(0 ${-.55 * breath - 2 * a}) rotate(${2 * pose.hand - 9 * a} 150 135)`}>
        <ellipse cx="150" cy="104" rx="61" ry="38" fill={fill}/>
        <g transform={`translate(${2 * a} 0)`}>
          <path d="M124 105h52" stroke="#28302c" strokeWidth="2.2"/>
          <g transform={`translate(0 105) scale(1 ${blink}) translate(0 -105)`} fill="#28302c">
            <circle cx="124" cy="105" r="6"/><circle cx="176" cy="105" r="6"/>
          </g>
        </g>
      </g>
    </g>
    <g fill="#718267" opacity={Math.max(0,a)} aria-hidden="true">
      {[135,150,165].map((x,i) => <circle key={x} cx={x} cy={318 - 2 * (1 + Math.sin(pose.time * 3.5 - i * .8))} r="3"/>)}
    </g>
  </svg>;
}
export default function Mascot({ small = false }: { small?: boolean }) {
  const { responding } = useContext(MascotActivity);
  const active = useRef(responding);
  active.current = responding;
  const model = useRef(createMotion());
  const [pose, setPose] = useState<Pose>({ time: 0, arm: 0, hand: 0, attention: 0, phase: "idle" });
  const id = useId().replace(/:/g, "");
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0, last = 0;
    const tick = (now: number) => {
      const dt = last ? Math.min((now-last)/1000, 1/30) : 0;
      last = now;
      if (!document.hidden) {
        if (preference.matches) {
          setPose({ time: 0, arm: 0, hand: 0, attention: active.current ? 1 : 0, phase: active.current ? "responding" : "idle" });
        } else setPose(advanceMotion(model.current, dt, active.current));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  return <MascotArt pose={pose} id={id} small={small}/>;
}
