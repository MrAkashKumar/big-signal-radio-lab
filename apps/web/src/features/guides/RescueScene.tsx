import { useState } from "react";
import { rescueStory } from "../../../../../content/explanations/radio-guide";

export function RescueScene() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  return <figure className={`rescue-scene ${playing ? "rescue-playing" : ""}`}>
    <div className="rescue-topline"><span>● FIELD STORY / COASTAL RELIEF</span><span>Illustrative scenario</span></div>
    <svg viewBox="0 0 900 500" role="img" aria-label={`Hospital, mountain relay and relief base. ${rescueStory[step].title}. Teaching illustration, not a coverage prediction.`}>
      <defs><linearGradient id="rs-sky" x2="0" y2="1"><stop stopColor="#142b44"/><stop offset="1" stopColor="#91a49f"/></linearGradient><linearGradient id="rs-land" x2="0" y2="1"><stop stopColor="#6f8e76"/><stop offset="1" stopColor="#183c3c"/></linearGradient><radialGradient id="rs-sun"><stop stopColor="#edc88b" stopOpacity=".7"/><stop offset="1" stopColor="#edc88b" stopOpacity="0"/></radialGradient></defs>
      <rect width="900" height="500" fill="url(#rs-sky)"/><circle cx="700" cy="110" r="200" fill="url(#rs-sun)"/>
      <path d="M0 245L90 170 150 211 250 118 330 190 411 92 510 181 600 132 730 228 820 170 900 220V500H0Z" fill="#425e68"/>
      <path d="M0 290L100 220 190 260 290 201 370 250 462 140 560 224 660 275 780 232 900 295V500H0Z" fill="url(#rs-land)"/>
      <path d="M462 140L434 203 471 190 489 206Z" fill="#bdc9b5" opacity=".6"/>
      <path d="M0 393Q200 330 337 393T630 374Q735 350 900 430V500H0Z" fill="#183d53"/>
      {[413,435,461,483].map(y=><path key={y} d={`M0 ${y}q100 -15 180 0t190 0t190 0t340 0`} stroke="#91c7d2" strokeOpacity=".2" fill="none" className="rescue-water"/>)}
      <path d="M120 350Q220 275 320 304T450 253T760 345" stroke="#c7c2a4" strokeWidth="5" fill="none" opacity=".45"/>
      {[65,255,295,560,625,830].map((x,i)=><g key={x} transform={`translate(${x} ${290+i%3*15})`}><path d="M0 0L-12 28H-6L-17 42H17L6 28H12Z" fill="#183d32"/><path d="M0 40v10" stroke="#355347" strokeWidth="4"/></g>)}
      <g transform="translate(120 280)"><path d="M0 14L55 -8 118 15 65 39Z" fill="#ece7d8"/><path d="M0 14V75L65 100V39Z" fill="#b7cac4"/><path d="M65 39L118 15V75L65 100Z" fill="#75929a"/><path d="M20 35h24v24H20Z" fill="#fff5e4"/><path d="M32 39v16m-8-8h16" stroke="#cd554d" strokeWidth="5"/><path d="M80 45v16m17-23v16M80 68v16m17-23v16" stroke="#f3cc81" strokeWidth="8"/><path d="M56 6v-45m-10 10h20" stroke="#dfebdf" strokeWidth="3"/></g>
      <g transform="translate(718 308)"><path d="M0 35L35 -4 72 35Z" fill="#e4be86"/><path d="M0 35H72V70H0Z" fill="#bfa06e"/><path d="M28 70V38H46V70" fill="#334a4e"/><path d="M83 61V-40m-12 14h24" stroke="#d9e4d7" strokeWidth="3"/></g>
      <g opacity={step===0 ? .3 : 1}><path d="M462 100L442 203H482ZM450 170H474M455 145H469M442 203L469 145M482 203L455 145" fill="none" stroke="#d5e4d6" strokeWidth="3"/><circle cx="462" cy="100" r="5" fill="#a1f4d0"/></g>
      {step===0 ? <g><path d="M176 247L404 252" stroke="#ffad86" strokeWidth="3" strokeDasharray="7 7" className="rescue-transmission"/><circle cx="410" cy="252" r="16" fill="#744c40"/><path d="M404 246l12 12m0-12l-12 12" stroke="#ffd5b0" strokeWidth="3"/></g> : <g><path d="M176 247Q300 92 462 100Q644 100 801 268" stroke="#9cf6d3" strokeWidth="3" strokeDasharray="9 8" fill="none" className="rescue-transmission"/>{[176,462,801].map((x,i)=><circle key={x} cx={x} cy={[247,100,268][i]} r="18" fill="none" stroke="#b7ffe0" className="rescue-beacon"/>)}</g>}
      <g fill="#f1f5e9" fontFamily="sans-serif" fontSize="13" fontWeight="600"><text x="115" y="410">01 / HOSPITAL</text><text x="397" y="73">02 / HILLTOP RELAY</text><text x="687" y="414">03 / RELIEF BASE</text></g>
      <rect x="28" y="28" width="246" height="64" rx="9" fill="#102639" fillOpacity=".85"/><text x="44" y="51" fill="#e9bc81" fontSize="10" fontFamily="monospace" letterSpacing="2">THE MESSAGE</text><text x="44" y="75" fill="#fff2db" fontSize="15" fontFamily="sans-serif">“We need medical supplies.”</text>
    </svg>
    <div className="rescue-story-controls" role="group" aria-label="Explore rescue story">{rescueStory.map((item,i)=><button key={item.title} aria-pressed={step===i} onClick={()=>setStep(i)}><span>0{i+1}</span>{item.short}</button>)}</div>
    <figcaption><div><small>{step===0 ? "THE CHALLENGE" : "A POSSIBLE DESIGN"}</small><strong>{rescueStory[step].title}</strong><p>{rescueStory[step].body}</p></div><button onClick={()=>setPlaying(!playing)} aria-pressed={playing}>{playing ? "Pause animation" : "Play animation"}</button></figcaption>
    <div className="rescue-disclaimer">Illustrative terrain and routes · test modeled links in the laboratory.</div>
  </figure>;
}
