import { radioKnobs } from "../../../../../content/explanations/radio-guide";

export function RadioGuide() {
  return <details className="radio-guide">
    <summary><span className="guide-icon" aria-hidden="true">≋</span><span><b>New to radio? Start here.</b><small>Four ideas that make the controls make sense</small></span><span className="guide-open">Quick guide +</span></summary>
    <div className="radio-guide-grid">{radioKnobs.map(item => <article key={item.title} data-color={item.color}><span className="radio-concept-symbol" aria-hidden="true">{item.symbol}</span><h3>{item.title}</h3><b>{item.analogy}</b><p>{item.detail}</p></article>)}</div>
    <p className="guide-takeaway">Try this: make a prediction → change one control → SEND IT → read WHY. Explain what changed before trying again.</p>
  </details>;
}
