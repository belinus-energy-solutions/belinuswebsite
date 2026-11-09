// Investor area of EVChargeking / Belinus (investor.belinus.com). EN/NL/FR (see I18n.jsx). Everything goes through the bel-inv* functions.
const { useState, useEffect, useRef, useCallback } = React;
const CFG = window.BELINUS_INV;
const sb = window.supabase.createClient(CFG.url, CFG.key, { auth: { storage: window.sessionStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'pkce' } });
const ERR = {
  'already-active': 'Deze investeerder heeft al een wachtwoord ingesteld.', 'view-only': 'Dit kan niet: u kijkt mee als investeerder.', 'bad-email': 'Vul een geldig e-mailadres in.', 'mail-not-configured': 'Het versturen van e-mails is nog niet actief.', 'mail-failed': 'De e-mail kon niet verstuurd worden. Probeer het later opnieuw.',
  expired: 'Deze link of code is verlopen of al gebruikt. Vraag een nieuwe aan.', 'weak-password': 'Dit wachtwoord voldoet niet aan alle voorwaarden.', 'leaked-password': 'Dit wachtwoord komt voor in gekende datalekken. Kies een ander wachtwoord.',
  'wrong-code': 'Deze code klopt niet.', 'bad-code': 'Vul de 6 cijfers van de code in.', 'too-many-attempts': 'Te veel pogingen. Vraag een nieuwe code aan.', wait: 'Wacht even voor u een nieuwe code vraagt.', 'too-many': 'Te veel aanvragen. Probeer het over een uur opnieuw.',
  closed: 'De uiterste datum is verstreken. Uw keuze kan niet meer gewijzigd worden.', 'already-chosen': 'Uw keuze is al vastgelegd en kan niet meer gewijzigd worden.','reason-required': 'Vermeld kort waarom u niet akkoord gaat.', 'confirm-required': 'Bevestig uw keuze met het vinkje.',
  'already-booked': 'U hebt al een open afspraak van dit type. Annuleer die eerst.', 'event-full': 'Deze investeerdersdag is volzet of heeft te weinig plaatsen.', 'slot-taken': 'Dit moment is net ingenomen. Kies een ander moment.', 'phone-required': 'Vul uw telefoonnummer in.', 'too-late': 'Deze afspraak kan niet meer geannuleerd worden. Neem contact op met info@evchargeking.com.', forbidden: 'U hebt geen toegang.', 'bad-input': 'Controleer de ingevulde gegevens.', generic: 'Er ging iets mis. Probeer het opnieuw.',
};
Object.assign(ERR, {
  'email-mismatch': 'Dit Microsoft- of Google-account heeft een ander e-mailadres dan uw uitnodiging. Meld u aan met het e-mailadres waarop u de uitnodiging ontving, of kies een wachtwoord.',
  'provider-required': 'Meld u aan met een Microsoft- of Google-account, of kies een wachtwoord.',
  'account-conflict': 'Dit e-mailadres is al aan een ander account gekoppeld. Neem contact op met info@evchargeking.com.',
});
const errText = (e) => t(ERR[e && e.message] || ERR.generic);
let AS = ''; try { AS = sessionStorage.getItem('inv_as') || ''; } catch (e) {}
function viewAs(id) { try { sessionStorage.setItem('inv_as', id); } catch (e) {} location.hash = '#/'; location.reload(); }
function stopAs() { try { sessionStorage.removeItem('inv_as'); } catch (e) {} location.hash = '#/investeerders'; location.reload(); }
// The stored session no longer exists on the server (ended elsewhere): forget it in this tab only and show the sign-in
// screen. Clears the stored tokens directly, because a sign-out call fails for a session the server no longer knows.
let SESSION_DROPPED = false;
function dropSession() {
  if (SESSION_DROPPED) return; SESSION_DROPPED = true;
  try { for (const k of Object.keys(sessionStorage)) if (k.startsWith('sb-')) sessionStorage.removeItem(k); } catch (e) {}
  sb.auth.signOut({ scope: 'local' }).catch(() => {});
  location.hash = '#/'; setTimeout(() => location.reload(), 50);
}
async function fn(name, body) {
  if (name === 'bel-inv' && AS) body = { ...(body || {}), as: AS };
  const { data: s } = await sb.auth.getSession();
  const token = s?.session?.access_token;
  const res = await fetch(`${CFG.url}/functions/v1/${name}`, { method: 'POST', headers: { 'content-type': 'application/json', apikey: CFG.key, ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body || {}) });
  const j = await res.json().catch(() => ({}));
  // Session ended elsewhere (signed out on another tab or device): back to the sign-in screen instead of an error.
  if (token && res.status === 401 && j.error === 'unauthorized') dropSession();
  if (!res.ok || j.error) { const e = new Error(j.error || 'generic'); e.status = res.status; throw e; }
  return j;
}
function useRoute() {
  const parse = () => { const h = location.hash.replace(/^#\/?/, ''); const [p, q] = h.split('?'); return { parts: p.split('/').filter(Boolean), q: new URLSearchParams(q || '') }; };
  const [r, set] = useState(parse);
  useEffect(() => { const f = () => { set(parse()); window.scrollTo(0, 0); document.documentElement.classList.remove('drawer'); }; addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  return r;
}
const go = (p) => { location.hash = '#/' + p; };
const eur = (n) => (n == null ? '—' : new Intl.NumberFormat(LOC[LANG], { style: 'currency', currency: 'EUR' }).format(Number(n)));
const dayNl = (d) => (d ? new Date(d).toLocaleDateString(LOC[LANG], { timeZone: 'Europe/Brussels', day: 'numeric', month: 'long', year: 'numeric' }) : '—');
const timeNl = (d) => new Date(d).toLocaleTimeString(LOC[LANG], { timeZone: 'Europe/Brussels', hour: '2-digit', minute: '2-digit' });
const whenNl = (d) => new Date(d).toLocaleString(LOC[LANG], { timeZone: 'Europe/Brussels', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
const pct = (r) => (Number(r) * 100).toLocaleString(LOC[LANG], { maximumFractionDigits: 2 }) + '%';
const KIND = { visit: 'Bezoek op een investeerdersdag', video: 'Videogesprek', callback: 'Terugbelverzoek' };
const TOPIC = { keuze: 'Vraag over mijn keuze', terugbetaling: 'Vraag over terugbetaling', andere: 'Andere' };

function Btn({ busy, kind = '', children, ...p }) { return <button className={'btn ' + kind} disabled={busy || p.disabled} {...p}>{busy ? <span className="spin" /> : children}</button>; }
function Note({ kind = '', children }) { return children ? <div className={'note ' + kind} role={kind === 'error' ? 'alert' : 'status'}>{children}</div> : null; }
function Field({ label, hint, children }) { return <label className="field"><span>{label}</span>{children}{hint && <em className="hint" style={{ fontStyle: 'normal' }}>{hint}</em>}</label>; }
function Evc({ light }) { return light ? <img src="assets/logo-evchargeking-white.png" alt="EVChargeking" /> : <><img className="th-dark" src="assets/logo-evchargeking-white.png" alt="EVChargeking" /><img className="th-light" src="assets/logo-evchargeking.png" alt="" /></>; }
function Logos({ light }) { return <div className="logos"><Evc light={light} /><img src={light ? 'assets/logo-belinus-white.png' : 'assets/logo-belinus.png'} alt="belinus" /></div>; }
function AuthFrame({ children }) {
  return <div className="auth"><div className="auth-panel"><div><img className="auth-belinus" src="assets/logo-belinus-blue.png" alt="belinus" /></div><div><h1>{t('Investeerdersportaal')}<img className="auth-evc" src="assets/logo-evchargeking-white.png" alt="EVChargeking" /></h1><p>a belinus group company</p></div><div /></div><div className="auth-form"><div><div className="tools"><LangSwitch /><ThemeToggle /></div><div className="auth-box">{children}</div></div></div></div>;
}
function PwInput(props) {
  const [show, setShow] = useState(false);
  const label = t(show ? 'Wachtwoord verbergen' : 'Wachtwoord tonen');
  return <div className="pw-wrap"><input {...props} type={show ? 'text' : 'password'} /><button type="button" className="pw-eye" aria-label={label} title={label} aria-pressed={show} onClick={() => setShow(!show)}><svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />{show && <path d="M4 4l16 16" />}</svg></button></div>;
}
// Microsoft is live; Google goes on once its OAuth client is set up in Supabase.
const PROVIDERS_ON = { azure: true, google: true };
function providerStart(provider, code) {
  try { sessionStorage.setItem('inv_pcode', code); } catch (e) {}
  return sb.auth.signInWithOAuth({ provider, options: { redirectTo: location.origin + '/investor/?oauth=1' } });
}
// Back from Microsoft/Google: exchange the code, check the invitation server-side, then continue like after a password set.
async function providerReturn() {
  const q = new URLSearchParams(location.search);
  if (q.get('oauth') !== '1' || !q.get('code')) return;
  history.replaceState(null, '', location.pathname + '#/');
  let code = ''; try { code = sessionStorage.getItem('inv_pcode') || ''; sessionStorage.removeItem('inv_pcode'); } catch (e) {}
  const { error } = await sb.auth.exchangeCodeForSession(q.get('code'));
  try {
    if (error || !code) throw new Error('expired');
    await fn('bel-inv-auth', { action: 'provider_link', code });
    await fn('bel-inv', { action: 'mfa_link', code });
  } catch (x) {
    try { await sb.auth.signOut({ scope: 'local' }); } catch (e) {}
    try { sessionStorage.setItem('inv_provider_err', x.message || 'generic'); } catch (e) {}
  }
}
function providerErr() {
  try { const v = sessionStorage.getItem('inv_provider_err') || ''; sessionStorage.removeItem('inv_provider_err'); return v ? t(ERR[v] || ERR.generic) : ''; } catch (e) { return ''; }
}
// Standard sign-in buttons (Microsoft and Google brand look). The user picks the account he received the invitation on.
const MS_LOGO = <svg width="21" height="21" viewBox="0 0 21 21" aria-hidden="true"><rect x="1" y="1" width="9" height="9" fill="#f25022" /><rect x="11" y="1" width="9" height="9" fill="#7fba00" /><rect x="1" y="11" width="9" height="9" fill="#00a4ef" /><rect x="11" y="11" width="9" height="9" fill="#ffb900" /></svg>;
const G_LOGO = <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2045c0-.6382-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2582h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z" /><path fill="#34A853" d="M9 18c2.43 0 4.4673-.8064 5.9564-2.1805l-2.9087-2.2582c-.8064.54-1.8368.859-3.0477.859-2.344 0-4.3282-1.5831-5.036-3.7104H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z" /><path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.2822-1.1168-.2822-1.71s.1023-1.17.2823-1.71V4.9582H.9573A8.9965 8.9965 0 0 0 0 9c0 1.4523.3477 2.8268.9573 4.0418L3.964 10.71z" /><path fill="#EA4335" d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.4259 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.6559 3.5795 9 3.5795z" /></svg>;
function ProviderButtons({ code }) {
  const [busy, setBusy] = useState(false), [err, setErr] = useState('');
  async function go1(p) { setBusy(true); setErr(''); try { const { error } = await providerStart(p, code); if (error) throw error; } catch (x) { setErr(t(ERR.generic)); setBusy(false); } }
  const pb = (p, logo, label) => <button type="button" className={'pbtn pbtn-' + p} disabled={busy} onClick={() => go1(p)}>{logo}<span>{label}</span></button>;
  return <div className="stack pwrap"><h3 className="ptitle">{t('Meld u aan met het Microsoft- of Google-account waarop u de uitnodiging ontving')}</h3>
    {pb('azure', MS_LOGO, t('Aanmelden met Microsoft'))}
    {PROVIDERS_ON.google && pb('google', G_LOGO, t('Aanmelden met Google'))}
    <Note kind="error">{err}</Note>
    <div className="or"><span>{t('of')}</span></div>
    <h3 className="ptitle">{t('Stel een wachtwoord in')}</h3></div>;
}
function Login({ onIn }) {
  const [email, setEmail] = useState(''), [pw, setPw] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState(() => providerErr()), [needs, setNeeds] = useState(false), [sending, setSending] = useState(false), [sent, setSent] = useState(false);
  const addr = () => email.trim().toLowerCase();
  async function needsPassword() { try { const r = await fn('bel-inv-auth', { action: 'account_status', email: addr() }); const v = !!(r && r.needs_password); setNeeds(v); return v; } catch (x) { return false; } }
  async function submit(e) { e.preventDefault(); setBusy(true); setErr(''); setSent(false);
    if (!pw) { if (!(await needsPassword())) setErr(t('Vul uw wachtwoord in.')); setBusy(false); return; }
    const { error } = await sb.auth.signInWithPassword({ email: addr(), password: pw });
    if (error) { if (!(await needsPassword())) setErr(t('E-mailadres of wachtwoord niet herkend.')); setBusy(false); return; }
    await onIn(); setBusy(false); }
  async function sendLink() { setSending(true); setErr(''); try { await fn('bel-inv-auth', { action: 'start', email: addr(), lang: LANG }); setSent(true); } catch (x) { setErr(errText(x)); } setSending(false); }
  return <AuthFrame><h2>{t('Aanmelden')}</h2>
    <form className="stack" onSubmit={submit}>
      <Field label={t('E-mailadres')}><input type="email" autoComplete="username" required value={email} onChange={(e) => { setEmail(e.target.value); setNeeds(false); setSent(false); }} onBlur={() => { if (/.+@.+\..+/.test(email)) needsPassword(); }} /></Field>
      {needs ? (sent ? <Note kind="ok">{t('Is dit het e-mailadres waarmee u investeerde? Dan ontvangt u binnen enkele minuten een e-mail met een link. De link is 24 uur geldig. Kijk ook bij uw ongewenste e-mail.')}</Note>
        : <div className="note"><p style={{ margin: '0 0 12px' }}>{t('U hebt al een account op dit platform, maar u hebt nog geen wachtwoord ingesteld.')}</p><Btn busy={sending} type="button" onClick={sendLink}>{t('Stuur mij de link')}</Btn></div>)
      : <><Field label={t('Wachtwoord')}><PwInput autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
      <Note kind="error">{err}</Note><Btn busy={busy} type="submit">{t('Aanmelden')}</Btn></>}</form>
    <div className="auth-links"><a href="#/start?vergeten=1">{t('Wachtwoord vergeten?')}</a></div></AuthFrame>;
}
function Start({ route }) {
  const forgot = route.q.get('vergeten');
  const [email, setEmail] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [sent, setSent] = useState(false);
  async function submit(e) { e.preventDefault(); setBusy(true); setErr(''); try { await fn('bel-inv-auth', { action: 'start', email, lang: LANG }); setSent(true); } catch (x) { setErr(errText(x)); } setBusy(false); }
  return <AuthFrame><h2>{forgot ? t('Wachtwoord vergeten') : t('Stel uw wachtwoord in')}</h2>
    {sent ? <Note kind="ok">{t('Is dit het e-mailadres waarmee u investeerde? Dan ontvangt u binnen enkele minuten een e-mail met een link. De link is 24 uur geldig. Kijk ook bij uw ongewenste e-mail.')}</Note> :
      <><p className="lead">{t('Vul het e-mailadres in waarmee u via Winwinner of Bolero investeerde. U ontvangt een link om uw wachtwoord in te stellen.')}</p>
      <form className="stack" onSubmit={submit}><Field label={t('E-mailadres')}><input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field><Note kind="error">{err}</Note><Btn busy={busy} type="submit">{t('Stuur mij de link')}</Btn></form></>}
    <div className="auth-links"><a href="#/">{t('← Terug naar aanmelden')}</a></div></AuthFrame>;
}
function pwCheck(p) {
  const t = { lower: /[a-z]/.test(p), upper: /[A-Z]/.test(p), digit: /[0-9]/.test(p), special: /[^A-Za-z0-9]/.test(p) };
  const types = Object.values(t).filter(Boolean).length;
  const r = { ...t, length: p.length >= 12 && p.length <= 128, three: types >= 3, repeat: p.length > 0 && !/(.)\1\1/su.test(p) };
  return { ...r, ok: r.length && r.three && r.repeat };
}
const PLATFORMS = { winwinner: 'Winwinner', bolero: 'Bolero Crowdfunding (KBC)' };
const platformName = (c) => PLATFORMS[c] || PLATFORMS.winwinner;
function PwRules({ c }) {
  const R = ({ on, sub, children }) => <li className={(on ? 'on' : '') + (sub ? ' sub' : '')}><i aria-hidden="true">{on ? '✓' : '○'}</i><span>{children}<span className="sr">{on ? t(' (in orde)') : t(' (nog niet in orde)')}</span></span></li>;
  return <div className="pw-rules"><p>{t('Uw wachtwoord moet bevatten:')}</p><ul><R on={c.length}>{t('Minstens 12 tekens')}</R><R on={c.three}>{t('Minstens 3 van de volgende:')}</R><R sub on={c.lower}>{t('Kleine letters (a-z)')}</R><R sub on={c.upper}>{t('Hoofdletters (A-Z)')}</R><R sub on={c.digit}>{t('Cijfers (0-9)')}</R><R sub on={c.special}>{t('Speciale tekens (bv. !@#$%^&*)')}</R><R on={c.repeat}>{t('Niet meer dan 2 identieke tekens na elkaar')}</R></ul></div>;
}
function SetPassword({ route, onIn }) {
  // Opened from the personal invitation (uitnodiging=1) or from a "set / forgot password" link. After saving, the investor
  // is signed in straight away; the link counts as the second factor for this first sign-in.
  const code = route.q.get('code') || '', invite = route.q.get('uitnodiging') === '1';
  const [email, setEmail] = useState(null), [bad, setBad] = useState(''), [p1, setP1] = useState(''), [p2, setP2] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [renewed, setRenewed] = useState(false);
  useEffect(() => { fn('bel-inv-auth', { action: 'check', code }).then((r) => setEmail(r.email)).catch((e) => setBad(e.message === 'already-active' ? 'active' : 'expired')); }, [code]);
  async function submit(e) { e.preventDefault(); setErr(''); if (p1 !== p2) return; if (!pwCheck(p1).ok) { setErr(t(ERR['weak-password'])); return; } setBusy(true);
    try {
      const r = await fn('bel-inv-auth', { action: 'set_password', code, password: p1, lang: LANG });
      const { error } = await sb.auth.signInWithPassword({ email: r.email, password: p1 }); if (error) throw new Error('generic');
      try { await fn('bel-inv', { action: 'mfa_link', code }); } catch (x) { /* falls back to the code by e-mail */ }
      go(''); await onIn();
    } catch (x) { setErr(errText(x)); } setBusy(false); }
  async function renew() { setBusy(true); setErr(''); try { await fn('bel-inv-auth', { action: 'renew', code }); setRenewed(true); } catch (x) { setErr(errText(x)); } setBusy(false); }
  if (bad === 'active') return <AuthFrame><h2>{t('U hebt al een wachtwoord')}</h2><p className="lead">{t('Uw account is al geactiveerd. Meld u aan met uw e-mailadres en wachtwoord.')}</p><Btn type="button" onClick={() => go('')}>{t('Naar aanmelden')}</Btn><div className="auth-links"><a href="#/start?vergeten=1">{t('Wachtwoord vergeten?')}</a></div></AuthFrame>;
  if (bad) return <AuthFrame><h2>{t('Link niet meer geldig')}</h2>{renewed
    ? <Note kind="ok">{t('We stuurden een nieuwe link naar uw e-mailadres. Kijk ook in uw map met ongewenste e-mail.')}</Note>
    : <><p className="lead">{t('Deze link is verlopen of al gebruikt. Met één klik sturen we een nieuwe link naar het e-mailadres waarop u de uitnodiging ontving.')}</p><Note kind="error">{err}</Note><Btn busy={busy} type="button" onClick={renew}>{t('Stuur mij een nieuwe link')}</Btn></>}
    <div className="auth-links"><a href="#/">{t('Naar aanmelden')}</a></div></AuthFrame>;
  if (!email) return <AuthFrame><div className="boot" style={{ minHeight: 200 }}><span className="spin" /></div></AuthFrame>;
  return <AuthFrame>{invite ? <><h2>{t('Welkom in het investeerdersportaal')}</h2><p className="lead">{t('Uw account staat klaar. Uw gebruikersnaam is uw e-mailadres:')} <b>{email}</b>. {t('Kies een wachtwoord en u komt meteen bij uw investering en uw keuze.')}</p></> : <><h2>{t('Kies een wachtwoord')}</h2><p className="lead">{t('Voor')} {email}.</p></>}
    {invite && <ProviderButtons code={code} />}
    <form className="stack" onSubmit={submit}><input type="email" autoComplete="username" value={email} readOnly hidden /><Field label={t('Nieuw wachtwoord')}><input type="password" autoComplete="new-password" required value={p1} onChange={(e) => setP1(e.target.value)} /></Field><PwRules c={pwCheck(p1)} /><Field label={t('Herhaal het wachtwoord')}><input type="password" autoComplete="new-password" required value={p2} aria-invalid={p2 !== '' && p1 !== p2} onChange={(e) => setP2(e.target.value)} /></Field>{p2 !== '' && p1 !== p2 && <Note kind="error">{t('De twee wachtwoorden zijn niet gelijk.')}</Note>}<Note kind="error">{err}</Note><Btn busy={busy} disabled={p1 !== p2} type="submit">{invite ? t('Wachtwoord opslaan en verder') : t('Wachtwoord opslaan')}</Btn></form></AuthFrame>;
}
function SecondFactor({ status, onDone }) {
  const [mode, setMode] = useState(status.totp ? 'app' : 'email'), [code, setCode] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [info, setInfo] = useState('');
  const once = useRef(false);
  const send = useCallback(async () => { setErr(''); try { await fn('bel-inv', { action: 'mfa_send' }); setInfo(t('We stuurden een code naar') + ' ' + status.email + '.'); } catch (x) { setErr(errText(x)); } }, [status.email]);
  useEffect(() => { if (mode === 'email' && !once.current) { once.current = true; send(); } }, [mode, send]);
  async function submit(e) { e.preventDefault(); setBusy(true); setErr('');
    try {
      if (mode === 'app') { const { data: f } = await sb.auth.mfa.listFactors(); const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: f.totp[0].id, code: code.trim() }); if (error) throw new Error('wrong-code'); await sb.auth.refreshSession(); await fn('bel-inv', { action: 'mfa_totp_done' }); }
      else { await fn('bel-inv', { action: 'mfa_verify', code }); try { sessionStorage.setItem('inv_ask_totp', '1'); } catch (x) {} }
      await onDone();
    } catch (x) { setErr(errText(x)); } setBusy(false); }
  return <AuthFrame><h2>{t('Bevestig dat u het bent')}</h2><p className="lead">{mode === 'app' ? t('Vul de 6 cijfers uit uw Google Authenticator-app in.') : t('Vul de code van 6 cijfers in die u per e-mail ontving.')}</p>
    <form className="stack" onSubmit={submit}><Field label={t('Code')}><OtpBoxes value={code} onChange={setCode} autoFocus autoSubmit label={t('Code')} /></Field><Note kind="error">{err}</Note><Note>{mode === 'email' ? info : ''}</Note><Btn busy={busy} type="submit">{t('Bevestigen')}</Btn></form>
    <div className="auth-links">{mode === 'email' && <button className="link" onClick={send}>{t('Stuur een nieuwe code')}</button>}{status.totp && <button className="link" onClick={() => { setMode(mode === 'app' ? 'email' : 'app'); setCode(''); setErr(''); }}>{mode === 'app' ? t('Gebruik een code per e-mail') : t('Gebruik de Google Authenticator-app')}</button>}<button className="link" onClick={() => sb.auth.signOut({ scope: 'local' }).then(() => location.reload())}>{t('Afmelden')}</button></div></AuthFrame>;
}

const SCH_STATUS = { planned: ['gepland', ''], paid: ['betaald', 'ok'], deferred: ['uitgesteld', 'warn'] };
// Payment date shown as the deadline: three months after the scheduled date (paid rows keep the actual date).
function addMonths(d, n) { const x = new Date(d + 'T12:00:00Z'); x.setUTCMonth(x.getUTCMonth() + n); return x.toISOString().slice(0, 10); }
// Payment date of the current contract that a choice replaces (first unpaid original row).
function curDueOf(d) { return (d.original || []).find((r) => r.status !== 'paid')?.due; }
// leadDue: when set, the first unpaid row of this table shows "binnen de drie maanden, ten laatste" + that date.
function Schedule({ rows, leadDue }) {
  if (!rows || !rows.length) return <p className="hint">{t('De planning wordt nog geladen.')}</p>;
  const L = ['Datum', 'Bruto interest', 'Roerende voorheffing', 'Netto interest', 'Kapitaal', 'Totaal ontvangen', 'Resterend kapitaal', 'Status'].map((x) => t(x));
  return <div className="tblw"><table className="tbl cards"><thead><tr>{L.map((h, i) => <th key={h} className={i > 0 && i < 7 ? 'n' : ''}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={r.period}>
    <td data-l={L[0]}>{leadDue && i === rows.findIndex((x) => x.status !== 'paid') ? <>{t('Binnen de drie maanden, ten laatste')} {dayNl(leadDue)}</> : dayNl(r.due)}</td><td data-l={L[1]} className="n">{eur(r.gross_interest)}</td><td data-l={L[2]} className="n">{eur(r.withholding)}</td><td data-l={L[3]} className="n">{eur(r.net_interest)}</td><td data-l={L[4]} className="n">{eur(r.principal)}</td><td data-l={L[5]} className="n"><b>{eur(Number(r.net_interest) + Number(r.principal))}</b></td><td data-l={L[6]} className="n">{eur(r.remaining)}</td><td data-l={L[7]}><span className={'chip ' + SCH_STATUS[r.status][1]}>{t(SCH_STATUS[r.status][0])}</span></td></tr>)}</tbody></table></div>;
}
// Transactions: one row per payment until the end of the bond. Originals stay visible; a chosen option adds its rows as pending until Winwinner confirms the signature, then the old planned rows are cancelled.
const TX_STATUS = { paid: ['betaald', 'ok'], planned: ['gepland', ''], pending: ['in afwachting van handtekening', 'warn'], cancelled: ['geannuleerd', 'info'] };
function txRows(d) {
  const c = d.choice?.choice, signed = d.choice?.addendum_status === 'signed';
  const chosen = (c === 'A' || c === 'B') ? (c === 'A' ? d.optionA : d.optionB) || [] : [];
  const rows = [];
  for (const r of d.original || []) rows.push({ ...r, src: 'orig', status: r.status === 'paid' ? 'paid' : (chosen.length && signed ? 'cancelled' : 'planned') });
  for (const r of chosen) if (r.status !== 'paid') rows.push({ ...r, src: 'opt', status: signed ? 'planned' : 'pending' });
  return rows.sort((a, b) => String(a.due).localeCompare(String(b.due)) || (a.src === 'opt') - (b.src === 'opt'));
}
function Transacties({ d }) {
  const rows = txRows(d);
  // Planned payment date of the current contract (the row a choice would replace). Used for the "Ten laatste" line on the first new transaction.
  const curDue = (d.original || []).find((r) => r.status !== 'paid')?.due;
  const L = ['Datum', 'Kapitaal', 'Bruto interest', 'Roerende voorheffing', 'Netto interest', 'Totaal ontvangen', 'Status'].map((x) => t(x));
  return <div className="stack">
    <h2 style={{ margin: 0 }}>{t('Transacties')}</h2>
    <p className="hint" style={{ margin: 0 }}>{t('Alle betalingen tot het einde van uw lening. Bij een gekozen optie verschijnen de nieuwe betalingen eerst als "in afwachting van handtekening"; zodra Winwinner de handtekening bevestigt, worden ze gepland en worden de vervallen geplande betalingen geannuleerd.')}</p>
    {d.choice?.choice && <p style={{ margin: 0 }}><b>{t('Uw keuze:')}</b> {d.choice.choice} {choiceChip(d)}</p>}
    {!rows.length ? <p className="hint">{t('De planning wordt nog geladen.')}</p> : <div className="tblw"><table className="tbl cards"><thead><tr>{L.map((h, i) => <th key={h} className={i > 0 && i < 6 ? 'n' : ''}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={r.src + r.period + i} style={r.status === 'cancelled' ? { opacity: 0.55 } : undefined}>
      <td data-l={L[0]}>{curDue && i === rows.findIndex((x) => x.src === 'opt' && x.status !== 'paid') ? <>{t('Ten laatste')} {dayNl(addMonths(curDue, 3))}</> : dayNl(r.due)}</td><td data-l={L[1]} className="n">{eur(r.principal)}</td><td data-l={L[2]} className="n">{eur(r.gross_interest)}</td><td data-l={L[3]} className="n">{eur(r.withholding)}</td><td data-l={L[4]} className="n">{eur(r.net_interest)}</td><td data-l={L[5]} className="n"><b>{eur(Number(r.net_interest) + Number(r.principal))}</b></td><td data-l={L[6]}><span className={'chip ' + TX_STATUS[r.status][1]}>{t(TX_STATUS[r.status][0])}</span></td></tr>)}</tbody></table></div>}
  </div>;
}
function choiceChip(d) {
  const c = d.choice;
  if (!c) return <span className="chip warn">{t('Nog te kiezen')}</span>;
  if (c.addendum_status === 'signed') return <span className="chip ok">{t('Addendum ondertekend')}</span>;
  return <span className="chip info">{t('Gekozen:')} {c.choice} ({dayNl(c.confirmed_at)})</span>;
}
// Join button for a video appointment. Always visible; before the window it shows a message instead of opening the meeting.
function JoinLink({ url, starts }) {
  const [msg, setMsg] = useState('');
  const from = new Date(starts).getTime() - 10 * 60000;
  function join(e) {
    if (Date.now() < from) { e.preventDefault(); setMsg(t('Dit videogesprek is nog niet beschikbaar. U kunt deelnemen vanaf 10 minuten voor het geplande tijdstip ({time}). Kom dan terug op deze pagina.').replace('{time}', whenNl(starts))); return; }
    setMsg('');
  }
  return <div>
    <a className={'btn sm' + (Date.now() < from ? ' ghost' : '')} href={url} target="_blank" rel="noopener" onClick={join}>{t('Deelnemen aan videogesprek')}</a>
    {msg && <p className="hint" style={{ margin: '8px 0 0' }}>{msg}</p>}
  </div>;
}
function Home({ d }) {
  const end = d.original.length ? d.original[d.original.length - 1].due : null;
  const next = (d.bookings || []).filter((b) => b.status === 'confirmed' && new Date(b.ends_at) > new Date());
  return <>
    <div className="page-head"><div><h1 className="page-title">{t('Mijn investering')}</h1><p className="page-sub">{d.investor.company_name || [d.investor.first_name, d.investor.last_name].filter(Boolean).join(' ')} · {tLoan(d.tranche.name)}</p></div>{choiceChip(d)}</div>
    {!d.choice && !d.closed && <div className="note warn" style={{ marginBottom: 18 }}><b>{t('Uw keuze wordt gevraagd vóór 14 november 2026.')}</b> <a href="#/keuze">{t('Maak uw keuze')}</a></div>}
    <div className="tiles"><div className="tile"><b>{eur(d.investor.invested)}</b><span>{t('Geïnvesteerd bedrag')}{d.investor.invested_on ? ' ' + t('op') + ' ' + dayNl(d.investor.invested_on) : ''}</span></div><div className="tile"><b style={{ fontSize: 19, lineHeight: '36px' }}>{platformName(d.tranche.platform)}</b><span>{t('Platform van uw investering')}</span></div><div className="tile"><b>{pct(d.tranche.gross_rate)}</b><span>{t('Bruto rentevoet')}</span></div><div className="tile"><b>{d.tranche.term_years} {t('jaar')}</b><span>{t(d.tranche.structure)}</span></div><div className="tile"><b style={{ fontSize: 19, lineHeight: '36px' }}>{dayNl(end)}</b><span>{t('Oorspronkelijke einddatum')}</span></div></div>
    <div className="card"><h2>{t('Uw betaalplanning')}</h2><p className="hint">{t('De oorspronkelijke planning blijft geldig tot een addendum ondertekend is.')} {d.original.some((r) => Number(r.withholding) > 0) ? t('Op de interesten wordt 30% roerende voorheffing ingehouden.') : ''}</p><Schedule rows={d.original} /></div>
    {d.gift && <div className="card"><h2>{t(d.gift.title)}</h2><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{d.gift.text}</p></div>}
    <div className="card"><h2>{t('Afspraken')}</h2>{next.length ? next.map((b) => <div key={b.id} style={{ marginBottom: 10 }}><p style={{ marginBottom: 6 }}><b>{t(KIND[b.kind])}</b> · {whenNl(b.starts_at)}</p>{b.kind === 'video' && b.meet_url && <JoinLink url={b.meet_url} starts={b.starts_at} />}</div>) : <p>{t('U hebt nog geen afspraak.')}</p>}<div className="row" style={{ marginTop: 10 }}><a className="btn ghost sm" href="#/afspraak">{t('Maak een afspraak')}</a><a className="btn ghost sm" href="mailto:info@evchargeking.com">info@evchargeking.com</a></div></div>
  </>;
}
const OPT = [
  ['A', 'A – Ik ga akkoord met een verlenging van mijn contract met één jaar.','De volgende betaling bevat enkel de interesten, geen kapitaal, en gebeurt binnen de drie maanden. Daarna loopt uw lening verder zoals gepland, één jaar langer.'],
  ['B', 'B – Ik behoud de einddatum en kies het stijgend terugbetalingsplan.','Ik ga akkoord dat binnen de drie maanden enkel de interesten worden betaald, geen kapitaal. Vanaf 2027 wordt mijn kapitaal in stappen terugbetaald volgens de planning hieronder; de interesten worden betaald op het resterende kapitaal.'],
  ['C', 'C – Ik ga niet akkoord.', 'Vermeld kort waarom. We nemen binnen de 5 werkdagen contact met u op. Uw bestaande overeenkomst blijft ongewijzigd van toepassing.'],
];
function Keuze({ d, reload }) {
  const locked = d.closed || !!d.choice?.choice;
  const [c, setC] = useState(d.choice?.choice || ''), [wish, setWish] = useState(d.choice?.wish || ''), [reason, setReason] = useState(d.choice?.reason || ''), [ok, setOk] = useState(false), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [done, setDone] = useState(false);
  async function save() { setErr(''); setBusy(true); try { await fn('bel-inv', { action: 'choose', choice: c, wish, reason, confirm: ok }); await reload(); setDone(true); setOk(false); window.scrollTo(0, 0); } catch (x) { setErr(errText(x)); } setBusy(false); }
  return <>
    <div className="page-head"><div><h1 className="page-title">{t('Uw keuze')}</h1><p className="page-sub">{t('We rekenen verder op uw steun en vragen uw vertrouwen in EVChargeking. Maak hieronder uw keuze.')}</p></div>{choiceChip(d)}</div>
    {done && <div style={{ marginBottom: 16 }}><Note kind="ok">{t('Uw keuze is bewaard. U ontvangt een bevestiging per e-mail.')}</Note></div>}
    {locked && <div style={{ marginBottom: 16 }}><Note kind="warn">{t('Uw keuze kan niet meer gewijzigd worden.')}</Note></div>}
    {d.choice?.choice && <div style={{ marginBottom: 16 }}><Note kind="ok">{t('Hartelijk dank voor uw vertrouwen en uw steun aan EVChargeking.')}</Note></div>}
    {/* Accordion: the selected option expands under its own block (one open at a time). After confirming, only the chosen option is shown. */}
    <div className="stack" style={{ marginBottom: 18 }}>{OPT.filter(([k]) => !locked || c === k).map(([k, ti, x]) => <div key={k} className="stack" style={{ gap: 8 }}>
      <label className={'opt' + (c === k ? ' on' : '') + (locked ? ' dis' : '')}><input type="radio" name="keuze" disabled={locked} checked={c === k} onChange={() => setC(k)} /><div><b>{t(ti)}</b>{t(x)}</div></label>
      {c === k && k === 'A' && <div className="card"><h2>{t('Uw nieuwe planning bij keuze A')}</h2>{d.interest_only_date ? null : <p className="hint">{t('De exacte datum van de interestbetaling (binnen de drie maanden) volgt nog.')}</p>}<Schedule rows={d.optionA} leadDue={curDueOf(d) ? addMonths(curDueOf(d), 3) : null} /></div>}
      {c === k && k === 'B' && <div className="card"><h2>{t('Uw nieuwe planning bij keuze B')}</h2><p className="hint">{t('Vanaf 2027 wordt uw kapitaal terugbetaald in stappen. Dit is de planning bij keuze B, zoals ze wordt opgenomen in het addendum.')}</p><Schedule rows={d.optionB} leadDue={curDueOf(d) ? addMonths(curDueOf(d), 3) : null} /></div>}
      {c === k && k === 'B' && <div className="card"><Field label={t('Uw wensen voor het voorstel (niet verplicht)')}><textarea disabled={locked} maxLength="2000" value={wish} onChange={(e) => setWish(e.target.value)} /></Field></div>}
      {c === k && k === 'C' && <div className="card"><Field label={t('Waarom gaat u niet akkoord? (verplicht)')}><textarea disabled={locked} maxLength="2000" value={reason} onChange={(e) => setReason(e.target.value)} /></Field></div>}
    </div>)}</div>
    {c && !locked && <div className="card stack" style={{ border: '2px solid #2EB9EA', boxShadow: '0 0 0 4px rgba(46,185,234,.18)' }}><h2>{t('Bevestig uw keuze')}</h2><p className="hint" style={{ margin: 0 }}>{t('Vink het vakje aan en klik daarna op “Bevestig mijn keuze”.')}</p><label className="check"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} /><span>{t('Ik bevestig mijn keuze. Ik begrijp dat Winwinner mij een addendum ter ondertekening zal bezorgen.')}</span></label><Note kind="error">{err}</Note><div><Btn busy={busy} disabled={!ok || (c === 'C' && !reason.trim())} onClick={save}>{t('Bevestig mijn keuze')}</Btn></div></div>}
  </>;
}
const dayLong = (k) => new Date(k + 'T12:00:00Z').toLocaleDateString(LOC[LANG], { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
// Month view: only days with a free moment can be picked.
function MonthCal({ days, day, onPick }) {
  const by = Object.fromEntries(days.map((x) => [x.day, x])), first = days[0].day.slice(0, 7), last = days[days.length - 1].day.slice(0, 7);
  const [m, setM] = useState((days.find((x) => x.slots.length) || days[0]).day.slice(0, 7));
  const [y, mo] = m.split('-').map(Number), shift = (n) => { const x = new Date(Date.UTC(y, mo - 1 + n, 1)); setM(x.toISOString().slice(0, 7)); };
  const blanks = (new Date(Date.UTC(y, mo - 1, 1)).getUTCDay() + 6) % 7, total = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const wd = Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(2024, 0, 1 + i)).toLocaleDateString(LOC[LANG], { weekday: 'short', timeZone: 'UTC' }));
  return <div className="cal"><div className="cal-head"><button type="button" className="cal-nav" disabled={m <= first} aria-label={t('Vorige maand')} onClick={() => shift(-1)}>‹</button><b>{new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString(LOC[LANG], { month: 'long', year: 'numeric', timeZone: 'UTC' })}</b><button type="button" className="cal-nav" disabled={m >= last} aria-label={t('Volgende maand')} onClick={() => shift(1)}>›</button></div>
    <div className="cal-grid">{wd.map((w) => <span key={w} className="cal-wd">{w}</span>)}{Array.from({ length: blanks }, (_, i) => <span key={'b' + i} />)}{Array.from({ length: total }, (_, i) => { const k = `${m}-${String(i + 1).padStart(2, '0')}`, x = by[k], free = !!(x && x.slots.length); return <button type="button" key={k} disabled={!free} className={'cal-day' + (day === k ? ' on' : '') + (free ? ' free' : '')} aria-label={free ? x.slots.length + ' ' + t('vrije momenten') : undefined} onClick={() => onPick(k)}>{i + 1}</button>; })}</div></div>;
}
function Afspraak({ d, reload }) {
  const [kind, setKind] = useState(''), [ev, setEv] = useState(''), [arrival, setArrival] = useState(''), [persons, setPersons] = useState(1), [days, setDays] = useState(null), [day, setDay] = useState(''), [slot, setSlot] = useState(''), [phone, setPhone] = useState(d.investor.phone || ''), [topic, setTopic] = useState('keuze'), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [done, setDone] = useState(false), [mv, setMv] = useState('');
  useEffect(() => { setSlot(''); setDay(''); setDays(null); setErr(''); if (kind !== 'video' && kind !== 'callback') return;
    let live = true;
    const pull = (first) => fn('bel-inv', { action: 'slots', kind }).then((r) => { if (!live) return; setDays(r.days);
      const freeDays = r.days.filter((x) => x.slots.length);
      setDay((cur) => (cur && freeDays.some((x) => x.day === cur) ? cur : first && freeDays[0] ? freeDays[0].day : (freeDays.some((x) => x.day === cur) ? cur : '')));
      setSlot((cur) => (cur && r.days.some((x) => x.slots.includes(cur)) ? cur : ''));
    }).catch((x) => { if (first) setErr(errText(x)); });
    pull(true);
    const iv = setInterval(() => pull(false), 60000), f = () => pull(false); addEventListener('focus', f);
    return () => { live = false; clearInterval(iv); removeEventListener('focus', f); }; }, [kind]);
  const open = (d.bookings || []).filter((b) => b.status === 'confirmed' && new Date(b.ends_at) > new Date());
  const event = (d.events || []).find((e) => e.id === ev);
  // Places left at the chosen arrival time; a visit needs a time with at least one free place.
  const slotFree = event?.slots?.find((x) => x.time === arrival)?.free ?? 0;
  const valid = kind === 'visit' ? ev && arrival && slotFree > 0 : kind && slot && (kind !== 'callback' || phone.trim());
  async function book() { setBusy(true); setErr(''); try { await fn('bel-inv', { action: 'book', kind, event_id: ev, arrival, persons, starts_at: slot, phone, topic, message: msg }); await reload(); setDone(true); setKind(''); setEv(''); setSlot(''); window.scrollTo(0, 0); } catch (x) { setErr(errText(x)); } setBusy(false); }
  async function cancel(id) { setErr(''); try { await fn('bel-inv', { action: 'cancel', id }); await reload(); } catch (x) { setErr(errText(x)); } }
  function startMove(b) { setMv(b.id); setKind(b.kind); setSlot(''); setDay(''); setErr(''); window.scrollTo({ top: 0 }); }
  async function move() { setBusy(true); setErr(''); try { await fn('bel-inv', { action: 'move', id: mv, starts_at: slot }); await reload(); setDone('move'); setMv(''); setKind(''); setSlot(''); window.scrollTo(0, 0); } catch (x) { setErr(errText(x)); } setBusy(false); }
  return <>
    <div className="page-head"><div><h1 className="page-title">{t('Maak een afspraak')}</h1><p className="page-sub">{t('Kom langs op een investeerdersdag, of spreek met Erwin Raets via video of telefoon.')}</p></div></div>
    {done && <div style={{ marginBottom: 16 }}><Note kind="ok">{done === 'move' ? t('Uw afspraak is verplaatst. U ontvangt een nieuwe bevestiging per e-mail.') : t('Uw afspraak is bevestigd. U ontvangt een e-mail met alle gegevens.')}</Note></div>}
    {open.length > 0 && <div className="card"><h2>{t('Uw afspraken')}</h2>{open.map((b) => <div key={b.id} className="row" style={{ justifyContent: 'space-between', padding: '8px 0' }}><div><b>{t(KIND[b.kind])}</b><br /><span className="hint">{whenNl(b.starts_at)}{b.arrival ? ' · ' + t('aankomst') + ' ' + b.arrival : ''}</span></div>{b.kind === 'video' && b.meet_url && <div style={{ marginTop: 6 }}><JoinLink url={b.meet_url} starts={b.starts_at} /></div>}<div className="row" style={{ gap: 6 }}>{b.kind !== 'visit' && <button className="btn ghost sm" onClick={() => startMove(b)}>{t('Verplaatsen')}</button>}<button className="btn danger sm" onClick={() => cancel(b.id)}>{t('Annuleren')}</button></div></div>)}</div>}
    {!mv && <div className="card"><h2>{t('1. Hoe wilt u ons spreken?')}</h2><div className="stack">{[['visit', t('Bezoek op een investeerdersdag'), t('Bij EVChargeking, Hooilaar 40, 2230 Herselt, van 10 tot 12 uur, met koffie en iets lekkers.')], ['video', t('Videogesprek'), t('Online, maximaal 30 minuten.')], ['callback', t('Terugbelverzoek'), t('Erwin belt u op, maximaal 30 minuten.')]].map(([k, ti, x]) => <label key={k} className={'opt' + (kind === k ? ' on' : '')}><input type="radio" name="soort" checked={kind === k} onChange={() => setKind(k)} /><div><b>{ti}</b>{x}</div></label>)}</div></div>}
    {kind === 'visit' && <div className="card stack"><h2>{t('2. Kies uw dag')}</h2>{(d.events || []).map((e) => <label key={e.id} className={'opt' + (ev === e.id ? ' on' : '') + (e.free <= 0 ? ' dis' : '')}><input type="radio" name="dag" disabled={e.free <= 0} checked={ev === e.id} onChange={() => { setEv(e.id); setArrival(''); }} /><div><b>{t(e.title)}</b>{e.free <= 0 ? t('Volzet') : t('Nog {n} plaatsen').replace('{n}', e.free)}</div></label>)}
      {event && <div className="grid2">{event.slots.length > 0 && <Field label={t('Aankomstuur')}><select value={arrival} onChange={(e) => { setArrival(e.target.value); setPersons(1); }}><option value="">{t('Kies…')}</option>{event.slots.map((x) => <option key={x.time} value={x.time} disabled={x.free <= 0}>{x.time} · {x.free <= 0 ? t('Volzet') : t('Nog {n} plaatsen').replace('{n}', x.free)}</option>)}</select></Field>}<Field label={t('Aantal personen')}><select value={persons} onChange={(e) => setPersons(Number(e.target.value))}>{Array.from({ length: Math.max(1, Math.min(d.booking.max_persons, arrival ? slotFree : d.booking.max_persons)) }, (_, i) => i + 1).map((n) => <option key={n}>{n}</option>)}</select></Field></div>}</div>}
    {(kind === 'video' || kind === 'callback') && <div className="card stack"><h2>{t('2. Kies dag en uur')}</h2>{days === null ? <span className="spin" /> : !days.some((x) => x.slots.length) ? <Note>{t('Er zijn momenteel geen vrije momenten. Probeer het later opnieuw.')}</Note> : <div className="picker"><MonthCal days={days} day={day} onPick={(x) => { setDay(x); setSlot(''); }} /><div className="picker-times"><p className="picker-day">{day ? dayLong(day) : t('Kies een dag')}</p>{day && (days.find((x) => x.day === day)?.slots || []).length ? <div className="slots">{days.find((x) => x.day === day).slots.map((s) => <button key={s} className={'slot' + (slot === s ? ' on' : '')} onClick={() => setSlot(s)}>{timeNl(s)}</button>)}</div> : <p className="hint" style={{ margin: 0 }}>{t('Kies een dag in de kalender. U ziet dan de vrije uren.')}</p>}</div></div>}</div>}
    {mv && <div className="card stack"><h2>{t('Nieuw moment')}</h2><p className="hint" style={{ margin: 0 }}>{t('Kies een nieuwe dag en uur in de kalender hierboven.')}</p><Note kind="error">{err}</Note><div className="row" style={{ gap: 8 }}><Btn busy={busy} disabled={!slot} onClick={move}>{t('Bevestig nieuw moment')}</Btn><button className="btn ghost" onClick={() => { setMv(''); setKind(''); setSlot(''); setErr(''); }}>{t('Terug')}</button></div></div>}
    {kind && !mv && <div className="card stack"><h2>{t('3. Uw gegevens')}</h2><Field label={t('Telefoonnummer') + (kind === 'callback' ? ' (' + t('verplicht') + ')' : '')}><input type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field><Field label={t('Onderwerp')}><select value={topic} onChange={(e) => setTopic(e.target.value)}>{Object.entries(TOPIC).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}</select></Field><Field label={t('Bericht (niet verplicht)')}><textarea maxLength="1000" value={msg} onChange={(e) => setMsg(e.target.value)} /></Field><Note kind="error">{err}</Note><div><Btn busy={busy} disabled={!valid} onClick={book}>{t('Bevestig mijn afspraak')}</Btn></div></div>}
    {!kind && <Note kind="error">{err}</Note>}
  </>;
}
function Account({ d, reload, email }) {
  const [phone, setPhone] = useState(d?.investor?.phone || ''), [msg, setMsg] = useState(''), [err, setErr] = useState(''), [factor, setFactor] = useState(null), [enroll, setEnroll] = useState(null), [code, setCode] = useState(''), [busy, setBusy] = useState(false);
  const loadF = () => sb.auth.mfa.listFactors().then(({ data }) => setFactor((data?.totp || []).find((f) => f.status === 'verified') || null));
  useEffect(() => { loadF().then(() => { if (/[?&]totp=1/.test(location.hash)) { history.replaceState(null, '', '#/account'); sb.auth.mfa.listFactors().then(({ data }) => { if (!(data?.totp || []).some((f) => f.status === 'verified')) start(); }); } }); }, []);
  async function saveLang(l) { setErr(''); setLang(l); if (d?.investor) try { await fn('bel-inv', { action: 'set_lang', lang: l }); setMsg(t('Opgeslagen.')); } catch (x) { setErr(errText(x)); } }
  async function savePhone() { setErr(''); try { await fn('bel-inv', { action: 'set_phone', phone }); await reload(); setMsg(t('Opgeslagen.')); } catch (x) { setErr(errText(x)); } }
  async function start() { setErr(''); setBusy(true); const { data: all } = await sb.auth.mfa.listFactors(); for (const f of (all?.all || []).filter((f) => f.status !== 'verified')) await sb.auth.mfa.unenroll({ factorId: f.id }); const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp', issuer: 'EVChargeking investeerdersportaal', friendlyName: 'Belinus ' + new Date().toISOString().slice(0, 10) }); setBusy(false); if (error) setErr(t(ERR.generic)); else setEnroll(data); }
  async function confirm(e) { e.preventDefault(); setBusy(true); setErr(''); const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: enroll.id, code: code.trim() }); if (error) setErr(t(ERR['wrong-code'])); else { await sb.auth.refreshSession(); await fn('bel-inv', { action: 'mfa_totp_done' }).catch(() => {}); setEnroll(null); setCode(''); setMsg(t('De Google Authenticator-app is geactiveerd.')); loadF(); } setBusy(false); }
  async function remove() { const { error } = await sb.auth.mfa.unenroll({ factorId: factor.id }); if (error) setErr(t(ERR.generic)); else { setMsg(t('De Google Authenticator-app is verwijderd.')); loadF(); } }
  async function newPw() { setErr(''); try { await fn('bel-inv-auth', { action: 'start', email, lang: LANG }); setMsg(t('We stuurden u een e-mail met een link om uw wachtwoord te wijzigen.')); } catch (x) { setErr(errText(x)); } }
  return <>
    <div className="page-head"><div><h1 className="page-title">{t('Mijn account')}</h1><p className="page-sub">{email}</p></div></div>
    <Note kind="ok">{msg}</Note><Note kind="error">{err}</Note><div style={{ height: 12 }} />
    {d?.investor && <div className="card stack"><h2>{t('Telefoonnummer')}</h2><Field label={t('Voor terugbelverzoeken')}><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field><div><Btn kind="ghost" onClick={savePhone}>{t('Opslaan')}</Btn></div></div>}
    <div className="card stack"><h2>{t('Taal')}</h2><Field label={t('Taal van het portaal en van uw e-mails')}><select value={LANG} onChange={(e) => saveLang(e.target.value)}><option value="nl">Nederlands</option><option value="fr">Français</option><option value="en">English</option></select></Field></div>
    <div className="card stack"><h2>{t('Aanmelden in twee stappen')}</h2><p style={{ margin: 0 }}>{t('Na uw wachtwoord bevestigt u elke aanmelding met een code per e-mail of, als u die activeert, met een Google Authenticator-app.')}</p>
      {factor ? <div className="row"><span className="chip ok">{t('Google Authenticator-app actief')}</span><button className="btn danger sm" onClick={remove}>{t('Verwijderen')}</button></div> : !enroll ? <div><Btn kind="ghost" busy={busy} onClick={start}>{t('Google Authenticator-app activeren')}</Btn></div> :
        <form className="stack" onSubmit={confirm}><p style={{ margin: 0 }}>{t('Scan deze QR-code met uw Google Authenticator-app en vul de code in.')}</p><img src={enroll.totp.qr_code} alt="QR-code" width="180" height="180" /><p className="hint" style={{ margin: 0, wordBreak: 'break-all' }}>{t('Handmatige sleutel:')} {enroll.totp.secret}</p><Field label={t('Code')}><OtpBoxes value={code} onChange={setCode} autoFocus label={t('Code')} /></Field><div><Btn busy={busy} type="submit">{t('Activeren')}</Btn></div></form>}
    </div>
    <div className="card stack"><h2>{t('Wachtwoord')}</h2><div><Btn kind="ghost" onClick={newPw}>{t('Stuur mij een link om te wijzigen')}</Btn></div></div>
  </>;
}

// Messages from EVChargeking / Belinus. The investor answers here only; the e-mail notice cannot be answered.
function Berichten({ d, reload }) {
  const [err, setErr] = useState(''), [ok, setOk] = useState('');
  const msgs = d.messages || [];
  useEffect(() => { if (msgs.some((m) => m.direction === 'out' && !m.read_at) && !d.as) fn('bel-inv', { action: 'messages_read' }).then(reload).catch(() => {}); }, [msgs.length]);
  async function send(txt) { setErr(''); setOk(''); try { await fn('bel-inv', { action: 'message_reply', body: txt }); setOk(t('Uw bericht is verstuurd. We antwoorden zo snel mogelijk.')); await reload(); } catch (x) { setErr(errText(x)); throw x; } }
  return <>
    <div className="page-head"><div><h1 className="page-title">{t('Berichten')}</h1><p className="page-sub">{t('Berichten van EVChargeking en Belinus. U kunt hier antwoorden.')}</p></div></div>
    <div className="card stack"><Thread msgs={msgs} mine={(m) => m.direction === 'in'} nameIn={t('U')} /><Note kind="ok">{ok}</Note><Note kind="error">{err}</Note><Composer placeholder={t('Uw antwoord…')} onSend={send} /></div></>;
}

// Six separate boxes for a 6-digit code (as in Clavoris): typing moves to the next box, Backspace goes back, arrows move,
// pasting or SMS/mail autofill of the whole code fills all boxes. With autoSubmit the form is sent once all 6 are in.
function OtpBoxes({ value, onChange, autoFocus, autoSubmit, label }) {
  const refs = useRef([]), v = (value || '').replace(/\D/g, '').slice(0, 6), cells = Array.from({ length: 6 }, (_, i) => v[i] || '');
  useEffect(() => { if (autoFocus) refs.current[Math.min(v.length, 5)]?.focus(); }, []);
  const set = (next, focusAt, form) => { const s = next.replace(/\D/g, '').slice(0, 6); onChange(s); if (focusAt != null) setTimeout(() => refs.current[Math.max(0, Math.min(5, focusAt))]?.focus(), 0); if (autoSubmit && s.length === 6 && form) setTimeout(() => form.requestSubmit ? form.requestSubmit() : form.submit(), 60); };
  const onInput = (i, e) => { const d = e.target.value.replace(/\D/g, ''); if (!d) return; if (d.length > 1) { set((v.slice(0, i) + d).slice(0, 6), i + d.length, e.target.form); return; } const arr = cells.slice(); arr[i] = d; set(arr.join(''), i + 1, e.target.form); };
  const onKey = (i, e) => {
    if (e.key === 'Backspace') { e.preventDefault(); const arr = cells.slice(); if (arr[i]) { arr[i] = ''; set(arr.join(''), i); } else if (i > 0) { arr[i - 1] = ''; set(arr.join(''), i - 1); } }
    else if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); refs.current[i - 1]?.focus(); }
    else if (e.key === 'ArrowRight' && i < 5) { e.preventDefault(); refs.current[i + 1]?.focus(); }
  };
  const onPaste = (i, e) => { const d = (e.clipboardData?.getData('text') || '').replace(/\D/g, ''); if (!d) return; e.preventDefault(); set((v.slice(0, i) + d).slice(0, 6), i + d.length, e.target.form); };
  return <div className="otp" role="group" aria-label={label || 'Code'}>{cells.map((c, i) => <input key={i} ref={(el) => (refs.current[i] = el)} className={'otp-box' + (c ? ' on' : '')} inputMode="numeric" pattern="[0-9]*" autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={i === 0 ? 6 : 1} aria-label={(label || 'Code') + ' ' + (i + 1)} value={c} onChange={(e) => onInput(i, e)} onKeyDown={(e) => onKey(i, e)} onPaste={(e) => onPaste(i, e)} onFocus={(e) => e.target.select()} required={i === 0} />)}</div>;
}

// One conversation, chat-style. `mine` decides which side is "ours": admins see EVChargeking on the right, the investor
// sees their own messages on the right. Long URLs wrap; long messages fold; the full original e-mail can be opened (admins).
function Thread({ msgs, mine, nameIn, showRaw }) {
  const end = useRef(null), [open, setOpen] = useState({});
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [msgs.length]);
  if (!msgs.length) return <p className="hint" style={{ margin: 0 }}>{t('Nog geen berichten.')}</p>;
  return <div className="thread">{msgs.map((m) => { const right = mine(m), long = m.body.length > 700 && !open[m.id];
    return <div key={m.id} className={'msg' + (right ? ' right' : '')}><div className="msg-head"><b>{m.direction === 'out' ? 'EVChargeking' + (showRaw && m.author_email ? ' · ' + m.author_email.split('@')[0] : '') : nameIn}</b><span>{whenNl(m.created_at)}</span>{m.direction === 'in' && <span className="msg-tag">{m.channel === 'email' ? t('via e-mail') : t('via portaal')}</span>}{showRaw && m.direction === 'out' && <span className="msg-tag">{m.mail_status === 'sent' ? (m.read_at ? t('gelezen') : t('per e-mail gemeld')) : t('e-mail mislukt')}</span>}</div>
      <div className="msg-body">{long ? m.body.slice(0, 600) + '…' : m.body}</div>
      {(long || (showRaw && m.raw_body)) && <div className="msg-foot">{long && <button className="link" onClick={() => setOpen({ ...open, [m.id]: true })}>{t('Meer tonen')}</button>}{showRaw && m.raw_body && <button className="link" onClick={() => setOpen({ ...open, ['r' + m.id]: !open['r' + m.id] })}>{open['r' + m.id] ? t('Verberg volledige e-mail') : t('Toon volledige e-mail')}</button>}</div>}
      {showRaw && open['r' + m.id] && <pre className="msg-raw">{m.raw_body}</pre>}</div>; })}<div ref={end} /></div>;
}
function Composer({ placeholder, onSend, label }) {
  const [txt, setTxt] = useState(''), [busy, setBusy] = useState(false);
  async function go() { if (!txt.trim() || busy) return; setBusy(true); try { await onSend(txt); setTxt(''); } catch (e) {} setBusy(false); }
  return <div className="composer"><textarea rows={3} maxLength="8000" placeholder={placeholder} value={txt} onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); go(); } }} /><div className="composer-row"><span className="hint">{t('Ctrl + Enter om te versturen')}</span><Btn busy={busy} disabled={!txt.trim()} onClick={go}>{label || t('Versturen')}</Btn></div></div>;
}

// From the second sign-in on (the first is through the invitation link): suggest an Google Authenticator app, once per sign-in,
// unless the investor already has one or chose "not for 6 months" (kept on the account, so it holds on every device).
const SNOOZE_DAYS = 182;
function TotpNudge() {
  const [show, setShow] = useState(false), [later, setLater] = useState(false);
  useEffect(() => { (async () => {
    let ask = false; try { ask = sessionStorage.getItem('inv_ask_totp') === '1'; sessionStorage.removeItem('inv_ask_totp'); } catch (e) {}
    if (!ask) return;
    const { data: f } = await sb.auth.mfa.listFactors(); if ((f?.totp || []).some((x) => x.status === 'verified')) return;
    const { data: u } = await sb.auth.getUser(); const until = u?.user?.user_metadata?.bel_totp_snooze_until;
    if (until && new Date(until) > new Date()) return;
    setShow(true);
  })().catch(() => {}); }, []);
  if (!show) return null;
  async function close(setup) {
    setShow(false);
    if (later) await sb.auth.updateUser({ data: { bel_totp_snooze_until: new Date(Date.now() + SNOOZE_DAYS * 86400000).toISOString() } }).catch(() => {});
    if (setup) location.hash = '#/account?totp=1';
  }
  return <div className="modal-bg" role="dialog" aria-modal="true" aria-labelledby="totp-h"><div className="modal stack totp-nudge">
    <svg className="totp-phone" viewBox="0 0 120 170" aria-hidden="true"><rect x="22" y="6" width="76" height="158" rx="14" className="ph-body" /><rect x="29" y="22" width="62" height="118" rx="4" className="ph-screen" /><rect x="50" y="12" width="20" height="4" rx="2" className="ph-dot" /><circle cx="60" cy="152" r="5" className="ph-dot" /><path d="M60 40l16 6v12c0 10-7 18-16 21-9-3-16-11-16-21V46z" className="ph-shield" /><path d="M53 58l5 5 9-10" className="ph-check" /><text x="60" y="108" textAnchor="middle" className="ph-code">482 913</text><rect x="38" y="118" width="44" height="4" rx="2" className="ph-bar" /></svg>
    <h2 id="totp-h" style={{ margin: 0 }}>{t('Sneller en veiliger aanmelden')}</h2>
    <p style={{ margin: 0 }}>{t('Koppel de Google Authenticator-app aan uw account. U hoeft dan niet meer op een code per e-mail te wachten: de app op uw smartphone toont meteen een nieuwe code. Het instellen duurt ongeveer een minuut.')}</p>
    <label className="check"><input type="checkbox" checked={later} onChange={(e) => setLater(e.target.checked)} /><span>{t('Niet meer herinneren voor 6 maanden')}</span></label>
    <div className="row"><Btn type="button" onClick={() => close(true)}>{t('OK, instellen')}</Btn><Btn kind="ghost" type="button" onClick={() => close(false)}>{t('Sluiten')}</Btn></div>
  </div></div>;
}

// Terms of use of the investor platform. Shown full screen until accepted; again at the next login after each change (TERMS_VERSION in the backend).
const TERMS = {
  nl: {
    title: 'Gebruiksvoorwaarden investeerdersplatform', ver: 'Versie 2026-11-09',
    sec: [
      ['Wie wij zijn en uw overeenkomst', ['Het investeerdersplatform op investor.belinus.com wordt aangeboden door EVChargeking (Some BV, Hooilaar 40, 2230 Herselt, ondernemingsnummer BE 0829.249.337), hierna "EVChargeking". Belinus voert het platform en de administratie uit namens EVChargeking.', 'Elke investeerder is contractueel gebonden aan EVChargeking op grond van de obligatie- of leningsovereenkomst van de tranche waarin hij of zij heeft ingeschreven, hierna "de overeenkomst". Deze voorwaarden regelen het gebruik van het platform en vullen de overeenkomst aan. Bij tegenstrijdigheid geldt de overeenkomst.']],
      ['Toegang en veiligheid', ['U meldt zich aan met uw persoonlijke account en een tweede verificatiestap (e-mailcode, authenticator-app of persoonlijke link). U houdt uw aanmeldgegevens geheim en deelt uw toegang niet met derden. Het platform is uitsluitend bestemd voor de investeerder zelf. Bij vermoeden van misbruik van uw account meldt u dit zo snel mogelijk.']],
      ['E-mails van Belinus', ['U stemt ermee in dat Belinus namens EVChargeking e-mails naar het e-mailadres van uw account stuurt over uw investering en het platform. Het gaat om uitnodigingen, toegangslinks, inlogcodes, bevestigingen en herinneringen van afspraken, informatie over betalingen en rapportering, wijzigingen van deze voorwaarden en antwoorden op uw berichten.', 'Die e-mails worden verstuurd vanaf adressen van belinus.com en dienen de uitvoering van de overeenkomst en het beheer van uw investering. Bij de verzending kan worden gemeten of een e-mail is afgeleverd, geopend of geweigerd, om de levering te controleren. U kunt uw toestemming intrekken via investor@belinus.com. Mededelingen die noodzakelijk zijn voor de overeenkomst blijven we ook dan sturen.']],
      ['Verwerking van uw persoonsgegevens (AVG)', ['Verwerkingsverantwoordelijke is EVChargeking (Some BV), Hooilaar 40, 2230 Herselt. Belinus verwerkt de gegevens namens EVChargeking als verwerker. Contact voor privacyvragen: legal@belinus.com.', 'Verwerkte gegevens: identiteits- en contactgegevens, investeringsgegevens, betalings- en rekeninggegevens, uw keuzes en afspraken, berichten, inlog- en beveiligingsgegevens (zoals tijdstip, IP-adres en verificatie) en gegevens over de bezorging van e-mails.', 'Doeleinden en grondslag: de uitvoering van de overeenkomst en de daaraan verbonden betalingen en rapportering (art. 6.1.b AVG); wettelijke verplichtingen, zoals fiscale, boekhoudkundige en antiwitwasverplichtingen (art. 6.1.c); de beveiliging van het platform en de preventie van fraude (art. 6.1.f); en uw toestemming voor e-mails die niet noodzakelijk zijn voor de overeenkomst (art. 6.1.a).', 'Verwerking op het platform: uw gegevens worden verwerkt op het investeerdersplatform investor.belinus.com. Hosting, database, serverfuncties en e-mailverzending worden verzorgd door gespecialiseerde dienstverleners die onder verwerkersovereenkomsten werken De hosting en de database staan in Frankfurt (Duitsland).. Gegevens worden niet verkocht en niet voor marketing van derden gebruikt.', 'Uw rechten: u kunt inzage, rectificatie, wissing, beperking, overdraagbaarheid en bezwaar vragen en uw toestemming intrekken. U kunt een klacht indienen bij de Gegevensbeschermingsautoriteit (www.gegevensbeschermingsautoriteit.be).', 'Beveiliging: verificatie in twee stappen, versleutelde verbindingen, beperkte toegang voor medewerkers en een logboek van beheerhandelingen.']],
      ['Bewaartermijnen', ['Investeringsgegevens en de overeenkomst: gedurende de looptijd en daarna 10 jaar, en in elk geval de wettelijke bewaartermijn van zeven jaar voor boekhoudkundige en fiscale stukken.', 'Berichten en e-mails: 10 jaar na het laatste contact.', 'Inlog- en beveiligingslogboeken: 10 jaar.', 'Na afloop van de bewaartermijn worden gegevens verwijderd of geanonimiseerd, tenzij een wettelijke verplichting of een lopend geschil langer bewaren vereist.']],
      ['Aanvaarding en wijzigingen', ['U aanvaardt deze voorwaarden bij uw eerste aanmelding door ze te lezen en te bevestigen. Zonder aanvaarding hebt u geen toegang tot het platform.', 'Bij elke wijziging worden deze voorwaarden bij uw eerstvolgende aanmelding opnieuw voorgelegd. Per aanvaarding bewaren we de versie, het tijdstip en uw keuze voor e-mails.']],
      ['Beschikbaarheid en aansprakelijkheid', ['Het platform wordt met zorg aangeboden, zonder garantie van ononderbroken beschikbaarheid. Informatie op het platform is informatief en vervangt niet de overeenkomst of de officiële mededelingen.']],
      ['Toepasselijk recht', ['Op deze voorwaarden is Belgisch recht van toepassing. Geschillen worden voorgelegd aan de bevoegde rechtbank van Antwerpen.']],
    ],
    scroll: 'Scrol naar beneden om de volledige voorwaarden te lezen.',
    consent: 'Ik heb de voorwaarden gelezen en ik aanvaard ze. Ik ga ermee akkoord dat Belinus namens EVChargeking e-mails naar mij stuurt over mijn investering en het platform, zoals beschreven in punt 3.',
    accept: 'Aanvaarden en verder', out: 'Afmelden', err: 'Er ging iets mis. Probeer het opnieuw.',
  },
  fr: {
    title: 'Conditions d’utilisation de la plateforme investisseurs', ver: 'Version 2026-11-09',
    sec: [
      ['Qui nous sommes et votre contrat', ['La plateforme investisseurs sur investor.belinus.com est proposée par EVChargeking (Some BV, Hooilaar 40, 2230 Herselt, numéro d’entreprise BE 0829.249.337), ci-après « EVChargeking ». Belinus gère la plateforme et l’administration au nom d’EVChargeking.', 'Chaque investisseur est lié contractuellement à EVChargeking par l’obligation ou le contrat de prêt de la tranche à laquelle il a souscrit, ci-après « le contrat ». Les présentes conditions règlent l’usage de la plateforme et complètent le contrat. En cas de contradiction, le contrat prévaut.']],
      ['Accès et sécurité', ['Vous vous connectez avec votre compte personnel et une deuxième étape de vérification (code par e-mail, application d’authentification ou lien personnel). Vous gardez vos identifiants secrets et ne partagez pas votre accès. La plateforme est réservée à l’investisseur lui-même. Signalez-nous au plus vite tout usage suspect de votre compte.']],
      ['E-mails de Belinus', ['Vous acceptez que Belinus envoie, au nom d’EVChargeking, des e-mails à l’adresse de votre compte au sujet de votre investissement et de la plateforme : invitations, liens d’accès, codes de connexion, confirmations et rappels de rendez-vous, informations sur les paiements et le reporting, modifications des présentes conditions et réponses à vos messages.', 'Ces e-mails sont envoyés depuis des adresses belinus.com et servent à l’exécution du contrat et à la gestion de votre investissement. Lors de l’envoi, la livraison, l’ouverture ou le refus de l’e-mail peuvent être mesurés pour en contrôler la distribution. Vous pouvez retirer votre consentement via investor@belinus.com. Les communications nécessaires au contrat continueront d’être envoyées.']],
      ['Traitement de vos données personnelles (RGPD)', ['Le responsable du traitement est EVChargeking (Some BV), Hooilaar 40, 2230 Herselt. Belinus traite les données au nom d’EVChargeking en qualité de sous-traitant. Contact pour les questions de vie privée : legal@belinus.com.', 'Données traitées : données d’identité et de contact, données d’investissement, données de paiement et de compte bancaire, vos choix et rendez-vous, messages, données de connexion et de sécurité (moment, adresse IP, vérification) et données de livraison des e-mails.', 'Finalités et base juridique : l’exécution du contrat et les paiements et reporting qui s’y rattachent (art. 6.1.b RGPD) ; les obligations légales, notamment fiscales, comptables et de lutte contre le blanchiment (art. 6.1.c) ; la sécurité de la plateforme et la prévention de la fraude (art. 6.1.f) ; et votre consentement pour les e-mails non nécessaires au contrat (art. 6.1.a).', 'Traitement sur la plateforme : vos données sont traitées sur la plateforme investisseurs investor.belinus.com. L’hébergement, la base de données, les fonctions serveur et l’envoi d’e-mails sont assurés par des prestataires spécialisés liés par des contrats de sous-traitance L’hébergement et la base de données se trouvent à Francfort (Allemagne).. Les données ne sont ni vendues ni utilisées pour le marketing de tiers.', 'Vos droits : accès, rectification, effacement, limitation, portabilité et opposition, ainsi que le retrait de votre consentement. Vous pouvez introduire une réclamation auprès de l’Autorité de protection des données (www.autoriteprotectiondonnees.be).', 'Sécurité : vérification en deux étapes, connexions chiffrées, accès limité pour le personnel et journal des actions d’administration.']],
      ['Durées de conservation', ['Données d’investissement et contrat : pendant la durée du contrat puis 10 ans, et en tout cas le délai légal de sept ans pour les pièces comptables et fiscales.', 'Messages et e-mails : 10 ans après le dernier contact.', 'Journaux de connexion et de sécurité : 10 ans.', 'À l’issue de ces délais, les données sont supprimées ou anonymisées, sauf si une obligation légale ou un litige en cours impose une conservation plus longue.']],
      ['Acceptation et modifications', ['Vous acceptez les présentes conditions lors de votre première connexion en les lisant et en les confirmant. Sans acceptation, vous n’avez pas accès à la plateforme.', 'En cas de modification, les conditions vous seront à nouveau présentées lors de votre connexion suivante. Pour chaque acceptation, nous conservons la version, la date et heure et votre choix concernant les e-mails.']],
      ['Disponibilité et responsabilité', ['La plateforme est proposée avec soin, sans garantie de disponibilité ininterrompue. Les informations qu’elle contient sont indicatives et ne remplacent ni le contrat ni les communications officielles.']],
      ['Droit applicable', ['Le droit belge est applicable aux présentes conditions. Les litiges sont soumis au tribunal compétent d’Anvers.']],
    ],
    scroll: 'Faites défiler jusqu’en bas pour lire l’intégralité des conditions.',
    consent: 'J’ai lu les conditions et je les accepte. J’accepte qu’EVChargeking, par l’intermédiaire de Belinus, m’envoie des e-mails au sujet de mon investissement et de la plateforme, comme décrit au point 3.',
    accept: 'Accepter et continuer', out: 'Se déconnecter', err: 'Une erreur s’est produite. Réessayez.',
  },
  en: {
    title: 'Terms of use of the investor platform', ver: 'Version 2026-11-09',
    sec: [
      ['Who we are and your contract', ['The investor platform at investor.belinus.com is provided by EVChargeking (Some BV, Hooilaar 40, 2230 Herselt, company number BE 0829.249.337), "EVChargeking". Belinus operates the platform and administration on behalf of EVChargeking.', 'Each investor is contractually bound to EVChargeking under the bond or loan agreement of the tranche they subscribed to, "the agreement". These terms govern the use of the platform and supplement the agreement. In case of conflict, the agreement prevails.']],
      ['Access and security', ['You sign in with your personal account and a second verification step (e-mail code, authenticator app or personal link). You keep your sign-in details secret and do not share your access. The platform is for the investor only. Tell us as soon as possible if you suspect misuse of your account.']],
      ['E-mails from Belinus', ['You agree that Belinus, on behalf of EVChargeking, sends e-mails to the address of your account about your investment and the platform: invitations, access links, sign-in codes, confirmations and appointment reminders, payment and reporting information, changes to these terms and replies to your messages.', 'These e-mails are sent from belinus.com addresses and serve the performance of the agreement and the management of your investment. Delivery, opening or rejection of an e-mail may be measured to check distribution. You may withdraw your consent via investor@belinus.com. Communications necessary for the agreement will continue to be sent.']],
      ['Processing of your personal data (GDPR)', ['The controller is EVChargeking (Some BV), Hooilaar 40, 2230 Herselt. Belinus processes the data on behalf of EVChargeking as processor. Privacy contact: legal@belinus.com.', 'Data processed: identity and contact details, investment data, payment and bank account details, your choices and appointments, messages, sign-in and security data (such as time, IP address and verification) and e-mail delivery data.', 'Purposes and legal basis: performance of the agreement and the related payments and reporting (art. 6.1.b GDPR); legal obligations, such as tax, accounting and anti-money-laundering obligations (art. 6.1.c); security of the platform and prevention of fraud (art. 6.1.f); and your consent for e-mails that are not necessary for the agreement (art. 6.1.a).', 'Processing on the platform: your data is processed on the investor platform investor.belinus.com. Hosting, database, server functions and e-mail sending are provided by specialised service providers under processing agreements Hosting and the database are located in Frankfurt (Germany).. Data is not sold and not used for third-party marketing.', 'Your rights: access, rectification, erasure, restriction, portability and objection, and withdrawal of consent. You may lodge a complaint with the Belgian Data Protection Authority (www.dataprotectionauthority.be).', 'Security: two-step verification, encrypted connections, restricted staff access and a log of administrative actions.']],
      ['Retention periods', ['Investment data and the agreement: for the duration of the agreement and then 10 years, and in any case the legal retention period of seven years for accounting and tax records.', 'Messages and e-mails: 10 years after the last contact.', 'Sign-in and security logs: 10 years.', 'After these periods the data is deleted or anonymised, unless a legal obligation or an ongoing dispute requires longer retention.']],
      ['Acceptance and changes', ['You accept these terms at your first sign-in by reading and confirming them. Without acceptance you have no access to the platform.', 'If these terms change, they will be presented to you again at your next sign-in. For each acceptance we keep the version, the date and time, and your choice regarding e-mails.']],
      ['Availability and liability', ['The platform is provided with care, without a guarantee of uninterrupted availability. Information on the platform is for information only and does not replace the agreement or official communications.']],
      ['Governing law', ['Belgian law applies to these terms. Disputes are submitted to the competent court of Antwerp.']],
    ],
    scroll: 'Scroll down to read the full terms.',
    consent: 'I have read these terms and I accept them. I agree that Belinus, on behalf of EVChargeking, sends me e-mails about my investment and the platform, as described in point 3.',
    accept: 'Accept and continue', out: 'Sign out', err: 'Something went wrong. Please try again.',
  },
};
function Terms({ d, reload }) {
  const T = TERMS[LANG] || TERMS.nl;
  const box = useRef(null);
  const [read, setRead] = useState(false), [ok, setOk] = useState(false), [busy, setBusy] = useState(false), [err, setErr] = useState(false);
  // Short texts fit without scrolling; then the whole text counts as read.
  useEffect(() => { const el = box.current; if (el && el.scrollHeight <= el.clientHeight + 12) setRead(true); }, []);
  const onScroll = (e) => { const el = e.currentTarget; if (el.scrollTop + el.clientHeight >= el.scrollHeight - 12) setRead(true); };
  const accept = async () => {
    setBusy(true); setErr(false);
    try { await fn('bel-inv', { action: 'terms_accept', version: d.terms.version, email_consent: true }); await reload(); }
    catch (e) { setErr(true); setBusy(false); }
  };
  const out = () => sb.auth.signOut({ scope: 'local' }).then(() => { location.hash = ''; location.reload(); });
  return <div className="auth"><div className="card terms">
    <div className="terms-head"><img src="assets/logo-belinus-blue.png" alt="belinus" /><button className="link" onClick={out}>{T.out}</button></div>
    <h1 className="page-title">{T.title}</h1>
    <p className="eyebrow">{T.ver}</p>
    <div className="terms-box" ref={box} onScroll={onScroll} tabIndex={0} aria-label={T.title}>
      {T.sec.map(([h, ps], i) => <section key={i}><h2>{i + 1}. {h}</h2>{ps.map((p, j) => <p key={j}>{p}</p>)}</section>)}
    </div>
    {!read && <p className="note-it">{T.scroll}</p>}
    <label className="check"><input type="checkbox" checked={ok} disabled={!read || busy} onChange={(e) => setOk(e.target.checked)} /><span>{T.consent}</span></label>
    {err && <Note kind="error">{T.err}</Note>}
    <Btn busy={busy || !read || !ok} onClick={accept}>{T.accept}</Btn>
  </div></div>;
}
