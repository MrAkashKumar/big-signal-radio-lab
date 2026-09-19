import { useId, useState } from "react";
import { walkthroughLanguages, walkthroughStops } from "../../../../../content/explanations/walkthrough";
import "./walkthrough-console.css";

export interface WalkthroughConsoleProps {
  step: number;
  language: string;
  onStep: (step: number) => void;
  onLanguage: (language: string) => void;
  onNarrate: () => void;
  onClose: () => void;
  voiceReady: boolean;
}

export function WalkthroughConsole({ step, language, onStep, onLanguage, onNarrate, onClose, voiceReady }: WalkthroughConsoleProps) {
  const [paused, setPaused] = useState(false);
  const headingId = useId();
  const selected = Number.isInteger(step) ? Math.max(0, Math.min(step, walkthroughStops.length - 1)) : 0;
  const stop = walkthroughStops[selected]!;
  return <section className={`walkthrough-console${paused ? " walkthrough-paused" : ""}`} aria-labelledby={headingId}>
    <div className="walkthrough-topline"><span>YOUR PROJECT WALKTHROUGH · {selected + 1} / {walkthroughStops.length}</span><button type="button" onClick={onClose}>End tour <span aria-hidden="true">×</span></button></div>
    <div className="walkthrough-body">
      <div className="walkthrough-visual">
        <svg viewBox="0 0 420 190" role="img" aria-label="Illustrative radio message travelling from a hospital, over a hill via a relay, to a relief team. Not a simulation result.">
          <path d="M0 154 76 127 112 145 210 49 292 135 342 114 420 150V190H0Z" fill="#e0edf1"/>
          <path d="m143 119 67-70 66 69-42-22-25 12-19-17Z" fill="#c0d8df"/>
          <path d="M50 123Q124 26 210 35Q311 17 368 125" fill="none" stroke="#087c76" strokeWidth="3" strokeDasharray="7 8" className="walkthrough-route"/>
          <g stroke="#254958" strokeWidth="3" strokeLinejoin="round"><path d="M190 99 210 29 230 99m-33-20h27m-21-27h14m-27 47h40" fill="none"/><path d="M21 160v-50h60v50m-43 0v-22h25v22" fill="#fff"/><path d="M45 115v17m-9-8h18" stroke="#087c76" strokeWidth="5"/><rect x="340" y="114" width="52" height="47" rx="8" fill="#fff"/><path d="m348 113-5-27m14 44h18m-18 10h18" fill="none"/></g>
          <circle cx="210" cy="29" r="7" fill="#087c76" className="walkthrough-beacon"/>
          <g fill="#294653" fontSize="12" fontWeight="600" textAnchor="middle"><text x="50" y="180">Hospital</text><text x="210" y="120">Relay</text><text x="366" y="180">Relief team</text></g>
        </svg>
        <div className="walkthrough-visual-caption"><span>Illustration · not a live result</span><button type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? "Play animation" : "Pause animation"}</button></div>
      </div>
      <div className="walkthrough-copy" aria-live="polite" aria-atomic="true"><h2 id={headingId}>{stop.title}</h2><p>{stop.description}</p><span className="walkthrough-tip">Ask: “Explain this with an example in my language.”</span></div>
    </div>
    <nav className="walkthrough-stops" aria-label="Walkthrough stops">{walkthroughStops.map((item, index) => <button type="button" key={item.id} aria-current={index === selected ? "step" : undefined} onClick={() => onStep(index)}><span aria-hidden="true">{index + 1}</span>{["The idea", "Radio lab", "Hospital mission", "What if?", "The evidence"][index]}</button>)}</nav>
    <div className="walkthrough-controls"><label>Voice explanation language<select value={language} onChange={event => onLanguage(event.target.value)}>{walkthroughLanguages.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><button type="button" className="walkthrough-speak" onClick={onNarrate}><span aria-hidden="true">◉</span> {voiceReady ? "Explain this stop aloud" : "Open voice guide"}</button><div className="walkthrough-paging"><button type="button" disabled={selected === 0} onClick={() => onStep(selected - 1)}>← Back</button><button type="button" onClick={() => selected === walkthroughStops.length - 1 ? onClose() : onStep(selected + 1)}>{selected === walkthroughStops.length - 1 ? "Finish tour ✓" : "Next stop →"}</button></div></div>
    <p className="walkthrough-privacy">Voice requires Ask Signal, an online connection, and your microphone consent. The visual tour works without voice. Language selection changes the guide’s explanation, not the app’s labels.</p>
  </section>;
}
