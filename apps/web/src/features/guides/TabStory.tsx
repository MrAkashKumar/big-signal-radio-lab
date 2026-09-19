import { useId, useState } from "react";
import { tabStories, type StoryPage } from "../../../../../content/explanations/tab-stories";
import "./tab-story.css";

export function TabStory({ page }: { page: StoryPage }) {
  const story = tabStories[page];
  const [step, setStep] = useState(0);
  const [expanded, setExpanded] = useState(true);
  const [playing, setPlaying] = useState(false);
  const id = useId();
  const landscape = ["lab", "disaster", "tsunami", "unreasonable"].includes(page);
  return <section className={`tab-story ${playing ? "tab-story-playing" : ""}`} data-tone={story.color} aria-label={`${story.kicker} visual guide`}>
    <header><div><span>{story.kicker}</span><h2>{story.title}</h2></div><button aria-expanded={expanded} aria-controls={id} onClick={()=>setExpanded(!expanded)}>{expanded ? "Hide guide −" : "Show visual guide +"}</button></header>
    {expanded && <div id={id} className="tab-story-body">
      <div className="tab-story-visual">
        <svg viewBox="0 0 640 240" role="img" aria-label={`${story.places.join(" → ")}. Concept illustration only, not live simulation output.`}>
          <defs><linearGradient id={`${id}-sky`} x2="0" y2="1"><stop stopColor="#173b51"/><stop offset="1" stopColor="#638a8c"/></linearGradient></defs>
          <rect width="640" height="240" rx="12" fill={`url(#${id}-sky)`}/>
          <circle cx="530" cy="45" r="26" fill="#ecd7a4" opacity=".7"/>
          {landscape ? <><path d="M0 137L70 92 139 128 230 55 320 138 410 74 510 130 578 88 640 137V240H0Z" fill="#466d70"/><path d="M0 165L120 125 210 176 320 109 412 167 520 136 640 177V240H0Z" fill="#284f50"/><path d="M0 211Q140 170 270 213T640 204V240H0Z" fill={page==="tsunami" ? "#214e6e" : "#1e3f46"}/></> : <><path d="M0 40H640M0 80H640M0 120H640M0 160H640M0 200H640M80 0V240M160 0V240M240 0V240M320 0V240M400 0V240M480 0V240M560 0V240" stroke="#91b7bb" opacity=".12"/></>}
          <path className="tab-story-route" d="M110 147Q206 40 320 75Q446 40 530 147" fill="none" stroke="#b0eddb" strokeWidth="2" strokeDasharray="7 7"/>
          {[110,320,530].map((x,i)=><g key={x} transform={`translate(${x} ${i===1 ? 76 : 147})`}>
            <circle className={step===i ? "tab-story-selected" : ""} r="31" fill="#183f4d" stroke={step===i ? "#eacf91" : "#a6cfc6"} strokeWidth={step===i ? 3 : 1}/>
            {landscape ? i===1 ? <path d="M0 -22L-13 22H13ZM-8 7H8M-5 -5H5M-13 22L5 -5M13 22L-5 -5" fill="none" stroke="#d7ece4" strokeWidth="2"/> : <><path d="M-18 -4L0 -19 18 -4V20H-18Z" fill={i===0 ? "#d2dace" : "#e1c08b"}/><path d="M-4 20V5H5V20" fill="#325364"/>{page==="tsunami" && i===0 && <path d="M0 -14v13m-6-6H6" stroke="#ba5548" strokeWidth="3"/>}</> : <><rect x="-14" y="-19" width="28" height="38" rx="3" fill="#dae6d9"/><path d="M-8 -8H8M-8 0H8M-8 8H3" stroke="#426673" strokeWidth="2"/></>}
            <text y="53" textAnchor="middle" fill="#f1f4e8" fontSize="10" fontFamily="monospace">{story.places[i]}</text>
          </g>)}
        </svg>
        <div className="tab-story-visual-footer"><small>ILLUSTRATED USE CASE · NOT LIVE RESULTS</small><button aria-pressed={playing} onClick={()=>setPlaying(!playing)}>{playing ? "Pause motion" : "Animate route"}</button></div>
      </div>
      <div className="tab-story-copy"><p>{story.description}</p><div className="tab-story-steps" role="group" aria-label="Use-case steps">{story.steps.map((item,i)=><button aria-pressed={step===i} onClick={()=>setStep(i)} key={item.title}><b>0{i+1}</b>{item.title}</button>)}</div><p className="tab-story-explanation" aria-live="polite">{story.steps[step].text}</p><span className="tab-story-next">↓ Use the workspace below to try it</span></div>
    </div>}
  </section>;
}
