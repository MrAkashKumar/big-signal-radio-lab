/** Decorative brand mark. The enclosing home button supplies its accessible name. */
export function SignalLogo() {
  return <svg className="signal-logo" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <rect x="2" y="2" width="60" height="60" rx="19" fill="#113b45" />
    <circle cx="23" cy="33" r="6" fill="#79e3bd" />
    <path className="signal-logo-wave signal-logo-wave-one" d="M33 23Q43 33 33 43" fill="none" stroke="#79e3bd" strokeWidth="5" strokeLinecap="round" />
    <path className="signal-logo-wave signal-logo-wave-two" d="M42 15Q60 33 42 51" fill="none" stroke="#bbabff" strokeWidth="5" strokeLinecap="round" />
    <circle cx="17" cy="16" r="3" fill="#ffd27c" />
    <path d="m16 49 6-9 5 9" fill="none" stroke="#ffd27c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}
