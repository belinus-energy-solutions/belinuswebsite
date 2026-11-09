// Investor area of EVChargeking / Belinus (investor.belinus.com). EN/NL/FR (see I18n.jsx). Everything goes through the bel-inv* functions.
const { useState, useEffect, useRef, useCallback } = React;
const CFG = window.BELINUS_INV;
const sb = window.supabase.createClient(CFG.url, CFG.key, { auth: { storage: window.sessionStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'pkce' } });
const ERR = {
  'already-active': 'Deze investeerder heeft al een wachtwoord ingesteld.', 'view-only': 'Dit kan niet: u kijkt mee als investeerder.', 'bad-email': 'Vul een geldig e-mailadres in.', 'mail-not-configured': 'Het versturen van e-mails is nog niet actief.', 'mail-failed': 'De e-mail kon niet verstuurd worden. Probeer het later opnieuw.',
  expired: 'Deze link of code is verlopen of al gebruikt. Vraag een nieuwe aan.', 'weak-password': 'Dit wachtwoord voldoet niet aan alle voorwaarden.', 'leaked-password': 'Dit wachtwoord komt voor in gekende datalekken. Kies een ander wachtwoord.',
  'wrong-code': 'Deze code klopt niet.', 'bad-code': 'Vul de 6 cijfers van de code in.', 'too-many-attempts': 'Te veel pogingen. Vraag een nieuwe code aan.', wait: 'Wacht even voor u een nieuwe code vraagt.', 'too-many': 'Te veel aanvragen. Probeer het over een uur opnieuw.',
  closed: 'De uiterste datum is verstreken. Uw keuze kan niet meer gewijzigd worden.', 'reason-required': 'Vermeld kort waarom u niet akkoord gaat.', 'confirm-required': 'Bevestig uw keuze met het vinkje.',
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
function Schedule({ rows }) {
  if (!rows || !rows.length) return <p className="hint">{t('De planning wordt nog geladen.')}</p>;
  const L = ['Datum', 'Bruto interest', 'Roerende voorheffing', 'Netto interest', 'Kapitaal', 'Totaal ontvangen', 'Resterend kapitaal', 'Status'].map((x) => t(x));
  return <div className="tblw"><table className="tbl cards"><thead><tr>{L.map((h, i) => <th key={h} className={i > 0 && i < 7 ? 'n' : ''}>{h}</th>)}</tr></thead><tbody>{rows.map((r) => <tr key={r.period}>
    <td data-l={L[0]}>{r.status === 'paid' ? dayNl(r.due) : <>{t('Ten laatste')} {dayNl(addMonths(r.due, 3))}</>}</td><td data-l={L[1]} className="n">{eur(r.gross_interest)}</td><td data-l={L[2]} className="n">{eur(r.withholding)}</td><td data-l={L[3]} className="n">{eur(r.net_interest)}</td><td data-l={L[4]} className="n">{eur(r.principal)}</td><td data-l={L[5]} className="n"><b>{eur(Number(r.net_interest) + Number(r.principal))}</b></td><td data-l={L[6]} className="n">{eur(r.remaining)}</td><td data-l={L[7]}><span className={'chip ' + SCH_STATUS[r.status][1]}>{t(SCH_STATUS[r.status][0])}</span></td></tr>)}</tbody></table></div>;
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
  const L = ['Datum', 'Kapitaal', 'Bruto interest', 'Roerende voorheffing', 'Netto interest', 'Totaal ontvangen', 'Status'].map((x) => t(x));
  return <div className="stack">
    <h2 style={{ margin: 0 }}>{t('Transacties')}</h2>
    <p className="hint" style={{ margin: 0 }}>{t('Alle betalingen tot het einde van uw lening. Bij een gekozen optie verschijnen de nieuwe betalingen eerst als "in afwachting van handtekening"; zodra Winwinner de handtekening bevestigt, worden ze gepland en worden de vervallen geplande betalingen geannuleerd.')}</p>
    {d.choice?.choice && <p style={{ margin: 0 }}><b>{t('Uw keuze:')}</b> {d.choice.choice} {choiceChip(d)}</p>}
    {!rows.length ? <p className="hint">{t('De planning wordt nog geladen.')}</p> : <div className="tblw"><table className="tbl cards"><thead><tr>{L.map((h, i) => <th key={h} className={i > 0 && i < 6 ? 'n' : ''}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={r.src + r.period + i} style={r.status === 'cancelled' ? { opacity: 0.55 } : undefined}>
      <td data-l={L[0]}>{['planned', 'pending'].includes(r.status) ? <>{t('Ten laatste')} {dayNl(addMonths(r.due, 3))}</> : dayNl(r.due)}</td><td data-l={L[1]} className="n">{eur(r.principal)}</td><td data-l={L[2]} className="n">{eur(r.gross_interest)}</td><td data-l={L[3]} className="n">{eur(r.withholding)}</td><td data-l={L[4]} className="n">{eur(r.net_interest)}</td><td data-l={L[5]} className="n"><b>{eur(Number(r.net_interest) + Number(r.principal))}</b></td><td data-l={L[6]}><span className={'chip ' + TX_STATUS[r.status][1]}>{t(TX_STATUS[r.status][0])}</span></td></tr>)}</tbody></table></div>}
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
  ['A', 'A – Ik ga akkoord met de verlenging.', 'De volgende betaling bevat enkel de interesten, geen kapitaal, en gebeurt binnen de drie maanden. Daarna loopt uw lening verder zoals gepland, één jaar langer.'],
  ['B', 'B – Ik kies het stijgend terugbetalingsplan.', 'Ik ga akkoord dat binnen de drie maanden enkel de interesten worden betaald, geen kapitaal. Vanaf 2027 wordt mijn kapitaal in stappen terugbetaald volgens de planning hieronder; de interesten worden betaald op het resterende kapitaal.'],
  ['C', 'C – Ik ga niet akkoord.', 'Vermeld kort waarom. We nemen binnen de 5 werkdagen contact met u op. Uw bestaande overeenkomst blijft ongewijzigd van toepassing.'],
];
function Keuze({ d, reload }) {
  const locked = d.closed || (d.choice && d.choice.addendum_status !== 'none');
  const [c, setC] = useState(d.choice?.choice || ''), [wish, setWish] = useState(d.choice?.wish || ''), [reason, setReason] = useState(d.choice?.reason || ''), [ok, setOk] = useState(false), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [done, setDone] = useState(false);
  async function save() { setErr(''); setBusy(true); try { await fn('bel-inv', { action: 'choose', choice: c, wish, reason, confirm: ok }); await reload(); setDone(true); setOk(false); window.scrollTo(0, 0); } catch (x) { setErr(errText(x)); } setBusy(false); }
  return <>
    <div className="page-head"><div><h1 className="page-title">{t('Uw keuze')}</h1><p className="page-sub">{t('De looptijd van uw lening wordt met één jaar verlengd. De volgende betaling bevat enkel de interesten en gebeurt binnen de drie maanden. Vanaf 2027 loopt alles verder zoals gepland, maar één jaar langer. De rentevoet blijft dezelfde.')}</p></div>{choiceChip(d)}</div>
    {done && <div style={{ marginBottom: 16 }}><Note kind="ok">{t('Uw keuze is bewaard. U ontvangt een bevestiging per e-mail. U kunt uw keuze wijzigen tot aan de uiterste datum.')}</Note></div>}
    {locked && <div style={{ marginBottom: 16 }}><Note kind="warn">{t('Uw keuze kan niet meer gewijzigd worden.')}</Note></div>}
    {/* Accordion: the selected option expands under its own block (one open at a time). After confirming, only the chosen option is shown. */}
    <div className="stack" style={{ marginBottom: 18 }}>{OPT.filter(([k]) => !locked || c === k).map(([k, ti, x]) => <div key={k} className="stack" style={{ gap: 8 }}>
      <label className={'opt' + (c === k ? ' on' : '') + (locked ? ' dis' : '')}><input type="radio" name="keuze" disabled={locked} checked={c === k} onChange={() => setC(k)} /><div><b>{t(ti)}</b>{t(x)}</div></label>
      {c === k && k === 'A' && <div className="card"><h2>{t('Uw nieuwe planning bij keuze A')}</h2>{d.interest_only_date ? null : <p className="hint">{t('De exacte datum van de interestbetaling (binnen de drie maanden) volgt nog.')}</p>}<Schedule rows={d.optionA} /></div>}
      {c === k && k === 'B' && <div className="card"><h2>{t('Uw nieuwe planning bij keuze B')}</h2><p className="hint">{t('Vanaf 2027 wordt uw kapitaal terugbetaald in stappen. Dit is de planning bij keuze B, zoals ze wordt opgenomen in het addendum.')}</p><Schedule rows={d.optionB} /></div>}
      {c === k && k === 'B' && <div className="card"><Field label={t('Uw wensen voor het voorstel (niet verplicht)')}><textarea disabled={locked} maxLength="2000" value={wish} onChange={(e) => setWish(e.target.value)} /></Field></div>}
      {c === k && k === 'C' && <div className="card"><Field label={t('Waarom gaat u niet akkoord? (verplicht)')}><textarea disabled={locked} maxLength="2000" value={reason} onChange={(e) => setReason(e.target.value)} /></Field></div>}
    </div>)}</div>
    {c && !locked && <div className="card stack"><label className="check"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} /><span>{t('Ik bevestig mijn keuze. Ik begrijp dat Winwinner mij een addendum ter ondertekening zal bezorgen.')}</span></label><Note kind="error">{err}</Note><div><Btn busy={busy} disabled={!ok || (c === 'C' && !reason.trim())} onClick={save}>{t('Bevestig mijn keuze')}</Btn></div></div>}
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
  const valid = kind === 'visit' ? ev && (!event?.arrival_slots.length || arrival) : kind && slot && (kind !== 'callback' || phone.trim());
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
      {event && <div className="grid2">{event.arrival_slots.length > 0 && <Field label={t('Aankomstuur')}><select value={arrival} onChange={(e) => setArrival(e.target.value)}><option value="">{t('Kies…')}</option>{event.arrival_slots.map((a) => <option key={a}>{a}</option>)}</select></Field>}<Field label={t('Aantal personen')}><select value={persons} onChange={(e) => setPersons(Number(e.target.value))}>{Array.from({ length: d.booking.max_persons }, (_, i) => i + 1).map((n) => <option key={n}>{n}</option>)}</select></Field></div>}</div>}
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
