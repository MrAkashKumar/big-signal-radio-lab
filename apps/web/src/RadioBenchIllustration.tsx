import { useState } from "react";
import { radioStory } from "../../../content/explanations/radio-guide";

export function RadioBenchIllustration() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  return (
    <figure className={`bench-illustration radio-story ${playing ? "is-playing" : ""}`}>
      <div className="bench-figure-label"><span><i /> THE INVISIBLE, MADE VISIBLE</span><span>How radio works</span></div>
      <svg viewBox="0 0 600 330" role="img" aria-label="Illustration: a sender's radio carries a message across a landscape to a listening radio. This is a concept diagram, not a simulated path.">
        <defs><pattern id="bench-grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="#45657b" strokeWidth=".5" /></pattern></defs>
        <rect width="600" height="330" fill="url(#bench-grid)" />
        <circle cx="300" cy="150" r="114" fill="#203e52" opacity=".45" />
        <path d="M0 269L70 254 146 267 216 244 275 255 330 208 381 229 421 262 505 246 600 270V330H0Z" fill="#284b58" />
        <path d="M0 293L106 278 219 295 350 266 437 288 521 275 600 296V330H0Z" fill="#315e63" />
        <path className="story-wave" d="M135 112Q300 10 463 112" fill="none" stroke="#73e0cb" strokeWidth="3" strokeDasharray="8 9" />
        <g className="story-packet"><rect x="280" y="48" width="40" height="28" rx="8" fill="#f3c566" /><path d="M287 56l13 9 13-9" fill="none" stroke="#22384c" strokeWidth="2" /></g>
        {[100, 436].map((x, i) => <g key={x} transform={`translate(${x} 130)`}>
          <circle className="story-halo" cx="12" cy="-28" r="24" fill="none" stroke={i ? "#a5b5ff" : "#73e0cb"} opacity=".5" />
          <rect x="8" y="-40" width="7" height="52" rx="4" fill="#d7e9ee" />
          <rect width="64" height="121" rx="12" fill={i ? "#a5b5ff" : "#73e0cb"} />
          <rect x="6" y="7" width="52" height="107" rx="8" fill="#162c40" />
          <rect x="13" y="18" width="38" height="31" rx="4" fill={i ? "#dbe0ff" : "#c9f6e9"} />
          <text x="32" y="38" textAnchor="middle" fill="#20384b" fontSize="13" fontFamily="monospace">{i ? "RX" : "TX"}</text>
          {[64, 72, 80].map(y => <path key={y} d={`M18 ${y}H46`} stroke="#577a8b" strokeWidth="3" />)}
          <circle cx="32" cy="98" r="6" fill="#f3c566" />
        </g>)}
        <text x="132" y="285" textAnchor="middle" fill="#baf4e6" fontSize="15" fontWeight="700">YOU SEND</text>
        <text x="468" y="285" textAnchor="middle" fill="#d5dcff" fontSize="15" fontWeight="700">THEY LISTEN</text>
        <text x="300" y="173" textAnchor="middle" fill="#cfdee9" fontSize="12">One message. An invisible journey.</text>
      </svg>
      <div className="story-steps" role="group" aria-label="Explore how radio works">
        {radioStory.map((item, index) => <button key={item.short} aria-pressed={step === index} onClick={() => setStep(index)}><span>0{index + 1}</span>{item.short}</button>)}
      </div>
      <figcaption>
        <strong>{radioStory[step].title}</strong>
        <p>{radioStory[step].body}</p>
        <div className="story-caption-bottom"><small>Concept illustration · not a simulation</small><button aria-pressed={playing} onClick={() => setPlaying(!playing)}>{playing ? "Pause motion" : "Animate the signal"} <span aria-hidden="true">{playing ? "Ⅱ" : "▷"}</span></button></div>
      </figcaption>
    </figure>
  );
}
