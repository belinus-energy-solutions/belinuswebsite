// Investor area of EVChargeking / Belinus (investor.belinus.com). Dutch only. Everything goes through the bel-inv* functions.
const { useState, useEffect, useRef, useCallback } = React;
const CFG = window.BELINUS_INV;
const sb = window.supabase.createClient(CFG.url, CFG.key, { auth: { storage: window.sessionStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
const ERR = {
  'bad-email': 'Vul een geldig e-mailadres in.', 'mail-not-configured': 'Het versturen van e-mails is nog niet actief.', 'mail-failed': 'De e-mail kon niet verstuurd worden. Probeer het later opnieuw.',
  expired: 'Deze link of code is verlopen of al gebruikt. Vraag een nieuwe aan.', 'weak-password': 'Dit wachtwoord voldoet niet aan alle voorwaarden.', 'leaked-password': 'Dit wachtwoord komt voor in gekende datalekken. Kies een ander wachtwoord.',
  'wrong-code': 'Deze code klopt niet.', 'bad-code': 'Vul de 6 cijfers van de code in.', 'too-many-attempts': 'Te veel pogingen. Vraag een nieuwe code aan.', wait: 'Wacht even voor u een nieuwe code vraagt.', 'too-many': 'Te veel aanvragen. Probeer het over een uur opnieuw.',
  closed: 'De uiterste datum is verstreken. Uw keuze kan niet meer gewijzigd worden.', 'reason-required': 'Vermeld kort waarom u niet akkoord gaat.', 'confirm-required': 'Bevestig uw keuze met het vinkje.',
  'already-booked': 'U hebt al een open afspraak van dit type. Annuleer die eerst.', 'event-full': 'Deze investeerdersdag is volzet of heeft te weinig plaatsen.', 'slot-taken': 'Dit moment is net ingenomen. Kies een ander moment.', 'phone-required': 'Vul uw telefoonnummer in.', 'too-late': 'Deze afspraak kan niet meer geannuleerd worden. Neem contact op met info@evchargeking.com.', forbidden: 'U hebt geen toegang.', 'bad-input': 'Controleer de ingevulde gegevens.', generic: 'Er ging iets mis. Probeer het opnieuw.',
};
const errText = (e) => ERR[e && e.message] || ERR.generic;
async function fn(name, body) {
  const { data: s } = await sb.auth.getSession();
  const token = s?.session?.access_token;
  const res = await fetch(`${CFG.url}/functions/v1/${name}`, { method: 'POST', headers: { 'content-type': 'application/json', apikey: CFG.key, ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body || {}) });
  const j = await res.json().catch(() => ({}));
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
const eur = (n) => (n == null ? '—' : new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(Number(n)));
const dayNl = (d) => (d ? new Date(d).toLocaleDateString('nl-BE', { timeZone: 'Europe/Brussels', day: 'numeric', month: 'long', year: 'numeric' }) : '—');
const timeNl = (d) => new Date(d).toLocaleTimeString('nl-BE', { timeZone: 'Europe/Brussels', hour: '2-digit', minute: '2-digit' });
const whenNl = (d) => new Date(d).toLocaleString('nl-BE', { timeZone: 'Europe/Brussels', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
const pct = (r) => (Number(r) * 100).toLocaleString('nl-BE', { maximumFractionDigits: 2 }) + '%';
const KIND = { visit: 'Bezoek op een investeerdersdag', video: 'Videogesprek', callback: 'Terugbelverzoek' };
const TOPIC = { keuze: 'Vraag over mijn keuze', terugbetaling: 'Vraag over terugbetaling', andere: 'Andere' };

function Btn({ busy, kind = '', children, ...p }) { return <button className={'btn ' + kind} disabled={busy || p.disabled} {...p}>{busy ? <span className="spin" /> : children}</button>; }
function Note({ kind = '', children }) { return children ? <div className={'note ' + kind} role={kind === 'error' ? 'alert' : 'status'}>{children}</div> : null; }
function Field({ label, hint, children }) { return <label className="field"><span>{label}</span>{children}{hint && <em className="hint" style={{ fontStyle: 'normal' }}>{hint}</em>}</label>; }
function Evc({ light }) { const [bad, setBad] = useState(false); return bad ? <span className="evc-txt" style={{ color: light ? '#fff' : 'inherit' }}>EVChargeking</span> : <img src={light ? 'assets/logo-evchargeking-white.png' : 'assets/logo-evchargeking.png'} alt="EVChargeking" onError={() => setBad(true)} />; }
function Logos({ light }) { return <div className="logos"><Evc light={light} /><img src={light ? 'assets/logo-belinus-white.png' : 'assets/logo-belinus.png'} alt="belinus" /></div>; }
function AuthFrame({ children }) {
  return <div className="auth"><div className="auth-panel"><div><img className="auth-belinus" src="assets/logo-belinus-blue.png" alt="belinus" /></div><div><h1>Investeerdersportaal<img className="auth-evc" src="assets/logo-evchargeking-white.png" alt="EVChargeking" /></h1><p>EVChargeking – nu deel van de Belinus-groep</p></div><div /></div><div className="auth-form"><div>{children}</div></div></div>;
}
function Login({ onIn }) {
  const [email, setEmail] = useState(''), [pw, setPw] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  async function submit(e) { e.preventDefault(); setBusy(true); setErr('');
    const { error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: pw });
    if (error) { setErr('E-mailadres of wachtwoord niet herkend. Is dit uw eerste bezoek? Stel dan eerst uw wachtwoord in.'); setBusy(false); return; }
    await onIn(); setBusy(false); }
  return <AuthFrame><h2>Aanmelden</h2><p className="lead">Enkel voor investeerders van EVChargeking.</p>
    <a className="btn ghost" style={{ width: '100%', marginBottom: 18 }} href="#/start">Eerste keer? Stel uw wachtwoord in</a>
    <form className="stack" onSubmit={submit}>
      <Field label="E-mailadres"><input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <Field label="Wachtwoord"><input type="password" autoComplete="current-password" required value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
      <Note kind="error">{err}</Note><Btn busy={busy} type="submit">Aanmelden</Btn></form>
    <div className="auth-links"><a href="#/start?vergeten=1">Wachtwoord vergeten?</a></div></AuthFrame>;
}
function Start({ route }) {
  const forgot = route.q.get('vergeten');
  const [email, setEmail] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [sent, setSent] = useState(false);
  async function submit(e) { e.preventDefault(); setBusy(true); setErr(''); try { await fn('bel-inv-auth', { action: 'start', email }); setSent(true); } catch (x) { setErr(errText(x)); } setBusy(false); }
  return <AuthFrame><h2>{forgot ? 'Wachtwoord vergeten' : 'Stel uw wachtwoord in'}</h2>
    {sent ? <Note kind="ok">Is dit het e-mailadres waarmee u investeerde? Dan ontvangt u binnen enkele minuten een e-mail met een link. De link is 24 uur geldig. Kijk ook bij uw ongewenste e-mail.</Note> :
      <><p className="lead">Vul het e-mailadres in waarmee u via Winwinner of Bolero investeerde. U ontvangt een link om uw wachtwoord in te stellen.</p>
      <form className="stack" onSubmit={submit}><Field label="E-mailadres"><input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field><Note kind="error">{err}</Note><Btn busy={busy} type="submit">Stuur mij de link</Btn></form></>}
    <div className="auth-links"><a href="#/">← Terug naar aanmelden</a></div></AuthFrame>;
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
  const R = ({ on, sub, children }) => <li className={(on ? 'on' : '') + (sub ? ' sub' : '')}><i aria-hidden="true">{on ? '✓' : '○'}</i><span>{children}<span className="sr">{on ? ' (in orde)' : ' (nog niet in orde)'}</span></span></li>;
  return <div className="pw-rules"><p>Uw wachtwoord moet bevatten:</p><ul><R on={c.length}>Minstens 12 tekens</R><R on={c.three}>Minstens 3 van de volgende:</R><R sub on={c.lower}>Kleine letters (a-z)</R><R sub on={c.upper}>Hoofdletters (A-Z)</R><R sub on={c.digit}>Cijfers (0-9)</R><R sub on={c.special}>Speciale tekens (bv. !@#$%^&*)</R><R on={c.repeat}>Niet meer dan 2 identieke tekens na elkaar</R></ul></div>;
}
function SetPassword({ route, onIn }) {
  const code = route.q.get('code') || '';
  const [email, setEmail] = useState(null), [bad, setBad] = useState(false), [p1, setP1] = useState(''), [p2, setP2] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  useEffect(() => { fn('bel-inv-auth', { action: 'check', code }).then((r) => setEmail(r.email)).catch(() => setBad(true)); }, [code]);
  async function submit(e) { e.preventDefault(); setErr(''); if (p1 !== p2) return; if (!pwCheck(p1).ok) { setErr(ERR['weak-password']); return; } setBusy(true);
    try { const r = await fn('bel-inv-auth', { action: 'set_password', code, password: p1 }); const { error } = await sb.auth.signInWithPassword({ email: r.email, password: p1 }); if (error) throw new Error('generic'); go(''); await onIn(); } catch (x) { setErr(errText(x)); } setBusy(false); }
  if (bad) return <AuthFrame><h2>Link niet meer geldig</h2><Note kind="error">{ERR.expired}</Note><div className="auth-links"><a href="#/start">Vraag een nieuwe link aan</a></div></AuthFrame>;
  if (!email) return <AuthFrame><div className="boot" style={{ minHeight: 200 }}><span className="spin" /></div></AuthFrame>;
  return <AuthFrame><h2>Kies een wachtwoord</h2><p className="lead">Voor {email}.</p>
    <form className="stack" onSubmit={submit}><Field label="Nieuw wachtwoord"><input type="password" autoComplete="new-password" required value={p1} onChange={(e) => setP1(e.target.value)} /></Field><PwRules c={pwCheck(p1)} /><Field label="Herhaal het wachtwoord"><input type="password" autoComplete="new-password" required value={p2} aria-invalid={p2 !== '' && p1 !== p2} onChange={(e) => setP2(e.target.value)} /></Field>{p2 !== '' && p1 !== p2 && <Note kind="error">De twee wachtwoorden zijn niet gelijk.</Note>}<Note kind="error">{err}</Note><Btn busy={busy} disabled={p1 !== p2} type="submit">Wachtwoord opslaan</Btn></form></AuthFrame>;
}
function SecondFactor({ status, onDone }) {
  const [mode, setMode] = useState(status.totp ? 'app' : 'email'), [code, setCode] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [info, setInfo] = useState('');
  const once = useRef(false);
  const send = useCallback(async () => { setErr(''); try { await fn('bel-inv', { action: 'mfa_send' }); setInfo('We stuurden een code naar ' + status.email + '.'); } catch (x) { setErr(errText(x)); } }, [status.email]);
  useEffect(() => { if (mode === 'email' && !once.current) { once.current = true; send(); } }, [mode, send]);
  async function submit(e) { e.preventDefault(); setBusy(true); setErr('');
    try {
      if (mode === 'app') { const { data: f } = await sb.auth.mfa.listFactors(); const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: f.totp[0].id, code: code.trim() }); if (error) throw new Error('wrong-code'); await sb.auth.refreshSession(); await fn('bel-inv', { action: 'mfa_totp_done' }); }
      else await fn('bel-inv', { action: 'mfa_verify', code });
      await onDone();
    } catch (x) { setErr(errText(x)); } setBusy(false); }
  return <AuthFrame><h2>Bevestig dat u het bent</h2><p className="lead">{mode === 'app' ? 'Vul de 6 cijfers uit uw authenticator-app in.' : 'Vul de code van 6 cijfers in die u per e-mail ontving.'}</p>
    <form className="stack" onSubmit={submit}><Field label="Code"><input className="code" inputMode="numeric" autoComplete="one-time-code" maxLength="6" required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /></Field><Note kind="error">{err}</Note><Note>{mode === 'email' ? info : ''}</Note><Btn busy={busy} type="submit">Bevestigen</Btn></form>
    <div className="auth-links">{mode === 'email' && <button className="link" onClick={send}>Stuur een nieuwe code</button>}{status.totp && <button className="link" onClick={() => { setMode(mode === 'app' ? 'email' : 'app'); setCode(''); setErr(''); }}>{mode === 'app' ? 'Gebruik een code per e-mail' : 'Gebruik de authenticator-app'}</button>}<button className="link" onClick={() => sb.auth.signOut().then(() => location.reload())}>Afmelden</button></div></AuthFrame>;
}

const SCH_STATUS = { planned: ['gepland', ''], paid: ['betaald', 'ok'], deferred: ['uitgesteld', 'warn'] };
function Schedule({ rows }) {
  if (!rows || !rows.length) return <p className="hint">De planning wordt nog geladen.</p>;
  const L = ['Datum', 'Bruto interest', 'Roerende voorheffing', 'Netto interest', 'Kapitaal', 'Totaal ontvangen', 'Resterend kapitaal', 'Status'];
  return <div className="tblw"><table className="tbl cards"><thead><tr>{L.map((h, i) => <th key={h} className={i > 0 && i < 7 ? 'n' : ''}>{h}</th>)}</tr></thead><tbody>{rows.map((r) => <tr key={r.period}>
    <td data-l={L[0]}>{dayNl(r.due)}</td><td data-l={L[1]} className="n">{eur(r.gross_interest)}</td><td data-l={L[2]} className="n">{eur(r.withholding)}</td><td data-l={L[3]} className="n">{eur(r.net_interest)}</td><td data-l={L[4]} className="n">{eur(r.principal)}</td><td data-l={L[5]} className="n"><b>{eur(Number(r.net_interest) + Number(r.principal))}</b></td><td data-l={L[6]} className="n">{eur(r.remaining)}</td><td data-l={L[7]}><span className={'chip ' + SCH_STATUS[r.status][1]}>{SCH_STATUS[r.status][0]}</span></td></tr>)}</tbody></table></div>;
}
function choiceChip(d) {
  const c = d.choice;
  if (!c) return <span className="chip warn">Nog te kiezen</span>;
  if (c.addendum_status === 'signed') return <span className="chip ok">Addendum ondertekend</span>;
  return <span className="chip info">Gekozen: {c.choice} ({dayNl(c.confirmed_at)})</span>;
}
function Home({ d }) {
  const end = d.original.length ? d.original[d.original.length - 1].due : null;
  const next = (d.bookings || []).filter((b) => b.status === 'confirmed' && new Date(b.ends_at) > new Date());
  return <>
    <div className="page-head"><div><h1 className="page-title">Mijn investering</h1><p className="page-sub">{d.investor.company_name || [d.investor.first_name, d.investor.last_name].filter(Boolean).join(' ')} · {d.tranche.name}</p></div>{choiceChip(d)}</div>
    {!d.choice && !d.closed && <div className="note warn" style={{ marginBottom: 18 }}><b>Uw keuze wordt gevraagd vóór 14 november 2026.</b> <a href="#/keuze">Maak uw keuze</a></div>}
    <div className="tiles"><div className="tile"><b>{eur(d.investor.invested)}</b><span>Geïnvesteerd bedrag{d.investor.invested_on ? ' op ' + dayNl(d.investor.invested_on) : ''}</span></div><div className="tile"><b style={{ fontSize: 19, lineHeight: '36px' }}>{platformName(d.tranche.platform)}</b><span>Platform van uw investering</span></div><div className="tile"><b>{pct(d.tranche.gross_rate)}</b><span>Bruto rentevoet</span></div><div className="tile"><b>{d.tranche.term_years} jaar</b><span>{d.tranche.structure}</span></div><div className="tile"><b style={{ fontSize: 19, lineHeight: '36px' }}>{dayNl(end)}</b><span>Oorspronkelijke einddatum</span></div></div>
    <div className="card"><h2>Uw betaalplanning</h2><p className="hint">De oorspronkelijke planning blijft geldig tot een addendum ondertekend is. {d.original.some((r) => Number(r.withholding) > 0) ? 'Op de interesten wordt 30% roerende voorheffing ingehouden.' : ''}</p><Schedule rows={d.original} /></div>
    {d.gift && <div className="card"><h2>{d.gift.title}</h2><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{d.gift.text}</p></div>}
    <div className="card"><h2>Afspraken</h2>{next.length ? next.map((b) => <p key={b.id} style={{ marginBottom: 6 }}><b>{KIND[b.kind]}</b> · {whenNl(b.starts_at)}</p>) : <p>U hebt nog geen afspraak.</p>}<div className="row" style={{ marginTop: 10 }}><a className="btn ghost sm" href="#/afspraak">Maak een afspraak</a><a className="btn ghost sm" href="mailto:info@evchargeking.com">info@evchargeking.com</a></div></div>
  </>;
}
const OPT = [
  ['A', 'A – Ik ga akkoord met de verlenging.', 'De volgende betaling bevat enkel de interesten en gebeurt binnen de drie maanden. Daarna loopt uw lening verder zoals gepland, één jaar langer.'],
  ['B', 'B – Ik wil een voorstel voor volledige terugbetaling binnen de looptijd.', 'Ik ga akkoord dat de interesten binnen de drie maanden worden betaald, maar ik wil een voorstel om mijn investering en interesten volledig terugbetaald te krijgen binnen de looptijd van mijn contract.'],
  ['C', 'C – Ik ga niet akkoord.', 'Vermeld kort waarom. We nemen binnen de 5 werkdagen contact met u op. Uw bestaande overeenkomst blijft ongewijzigd van toepassing.'],
];
function Keuze({ d, reload }) {
  const locked = d.closed || (d.choice && d.choice.addendum_status !== 'none');
  const [c, setC] = useState(d.choice?.choice || ''), [wish, setWish] = useState(d.choice?.wish || ''), [reason, setReason] = useState(d.choice?.reason || ''), [ok, setOk] = useState(false), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [done, setDone] = useState(false);
  async function save() { setErr(''); setBusy(true); try { await fn('bel-inv', { action: 'choose', choice: c, wish, reason, confirm: ok }); await reload(); setDone(true); setOk(false); window.scrollTo(0, 0); } catch (x) { setErr(errText(x)); } setBusy(false); }
  return <>
    <div className="page-head"><div><h1 className="page-title">Uw keuze</h1><p className="page-sub">De looptijd van uw lening wordt met één jaar verlengd. De volgende betaling bevat enkel de interesten en gebeurt binnen de drie maanden. Vanaf 2027 loopt alles verder zoals gepland, maar één jaar langer. De rentevoet blijft dezelfde.</p></div>{choiceChip(d)}</div>
    {done && <div style={{ marginBottom: 16 }}><Note kind="ok">Uw keuze is bewaard. U ontvangt een bevestiging per e-mail. U kunt uw keuze wijzigen tot aan de uiterste datum.</Note></div>}
    {locked && <div style={{ marginBottom: 16 }}><Note kind="warn">Uw keuze kan niet meer gewijzigd worden.</Note></div>}
    <div className="stack" style={{ marginBottom: 18 }}>{OPT.map(([k, t, x]) => <label key={k} className={'opt' + (c === k ? ' on' : '') + (locked ? ' dis' : '')}><input type="radio" name="keuze" disabled={locked} checked={c === k} onChange={() => setC(k)} /><div><b>{t}</b>{x}</div></label>)}</div>
    {c === 'A' && <div className="card"><h2>Uw nieuwe planning bij keuze A</h2>{d.interest_only_date ? null : <p className="hint">De exacte datum van de interestbetaling (binnen de drie maanden) volgt nog.</p>}<Schedule rows={d.optionA} /></div>}
    {c === 'B' && <div className="card"><Field label="Uw wensen voor het voorstel (niet verplicht)"><textarea disabled={locked} maxLength="2000" value={wish} onChange={(e) => setWish(e.target.value)} /></Field></div>}
    {c === 'C' && <div className="card"><Field label="Waarom gaat u niet akkoord? (verplicht)"><textarea disabled={locked} maxLength="2000" value={reason} onChange={(e) => setReason(e.target.value)} /></Field></div>}
    {c && !locked && <div className="card stack"><label className="check"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} /><span>Ik bevestig mijn keuze. Ik begrijp dat Winwinner mij een addendum ter ondertekening zal bezorgen.</span></label><Note kind="error">{err}</Note><div><Btn busy={busy} disabled={!ok || (c === 'C' && !reason.trim())} onClick={save}>Bevestig mijn keuze</Btn></div></div>}
  </>;
}
function Afspraak({ d, reload }) {
  const [kind, setKind] = useState(''), [ev, setEv] = useState(''), [arrival, setArrival] = useState(''), [persons, setPersons] = useState(1), [days, setDays] = useState(null), [day, setDay] = useState(''), [slot, setSlot] = useState(''), [phone, setPhone] = useState(d.investor.phone || ''), [topic, setTopic] = useState('keuze'), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [done, setDone] = useState(false);
  useEffect(() => { setSlot(''); setDay(''); setDays(null); setErr(''); if (kind === 'video' || kind === 'callback') fn('bel-inv', { action: 'slots', kind }).then((r) => setDays(r.days)).catch((x) => setErr(errText(x))); }, [kind]);
  const open = (d.bookings || []).filter((b) => b.status === 'confirmed' && new Date(b.ends_at) > new Date());
  const event = (d.events || []).find((e) => e.id === ev);
  const valid = kind === 'visit' ? ev && (!event?.arrival_slots.length || arrival) : kind && slot && (kind !== 'callback' || phone.trim());
  async function book() { setBusy(true); setErr(''); try { await fn('bel-inv', { action: 'book', kind, event_id: ev, arrival, persons, starts_at: slot, phone, topic, message: msg }); await reload(); setDone(true); setKind(''); setEv(''); setSlot(''); window.scrollTo(0, 0); } catch (x) { setErr(errText(x)); } setBusy(false); }
  async function cancel(id) { setErr(''); try { await fn('bel-inv', { action: 'cancel', id }); await reload(); } catch (x) { setErr(errText(x)); } }
  return <>
    <div className="page-head"><div><h1 className="page-title">Maak een afspraak</h1><p className="page-sub">Kom langs op een investeerdersdag, of spreek met Erwin Raets via video of telefoon.</p></div></div>
    {done && <div style={{ marginBottom: 16 }}><Note kind="ok">Uw afspraak is bevestigd. U ontvangt een e-mail met alle gegevens.</Note></div>}
    {open.length > 0 && <div className="card"><h2>Uw afspraken</h2>{open.map((b) => <div key={b.id} className="row" style={{ justifyContent: 'space-between', padding: '8px 0' }}><div><b>{KIND[b.kind]}</b><br /><span className="hint">{whenNl(b.starts_at)}{b.arrival ? ' · aankomst ' + b.arrival : ''}</span></div><button className="btn danger sm" onClick={() => cancel(b.id)}>Annuleren</button></div>)}<p className="hint" style={{ margin: '8px 0 0' }}>Verplaatsen? Annuleer de afspraak en maak een nieuwe.</p></div>}
    <div className="card"><h2>1. Hoe wilt u ons spreken?</h2><div className="stack">{[['visit', 'Bezoek op een investeerdersdag', 'Bij EVChargeking, Hooilaar 40, 2230 Herselt, van 10 tot 12 uur, met koffie en iets lekkers.'], ['video', 'Videogesprek', 'Online, maximaal 30 minuten.'], ['callback', 'Terugbelverzoek', 'Erwin belt u op, maximaal 30 minuten.']].map(([k, t, x]) => <label key={k} className={'opt' + (kind === k ? ' on' : '')}><input type="radio" name="soort" checked={kind === k} onChange={() => setKind(k)} /><div><b>{t}</b>{x}</div></label>)}</div></div>
    {kind === 'visit' && <div className="card stack"><h2>2. Kies uw dag</h2>{(d.events || []).map((e) => <label key={e.id} className={'opt' + (ev === e.id ? ' on' : '') + (e.free <= 0 ? ' dis' : '')}><input type="radio" name="dag" disabled={e.free <= 0} checked={ev === e.id} onChange={() => { setEv(e.id); setArrival(''); }} /><div><b>{e.title}</b>{e.free <= 0 ? 'Volzet' : 'Nog ' + e.free + ' plaatsen'}</div></label>)}
      {event && <div className="grid2">{event.arrival_slots.length > 0 && <Field label="Aankomstuur"><select value={arrival} onChange={(e) => setArrival(e.target.value)}><option value="">Kies…</option>{event.arrival_slots.map((a) => <option key={a}>{a}</option>)}</select></Field>}<Field label="Aantal personen"><select value={persons} onChange={(e) => setPersons(Number(e.target.value))}>{Array.from({ length: d.booking.max_persons }, (_, i) => i + 1).map((n) => <option key={n}>{n}</option>)}</select></Field></div>}</div>}
    {(kind === 'video' || kind === 'callback') && <div className="card stack"><h2>2. Kies dag en uur</h2>{days === null ? <span className="spin" /> : !days.length ? <Note>Er zijn momenteel geen vrije momenten. Probeer het later opnieuw of mail naar info@evchargeking.com.</Note> : <><Field label="Dag"><select value={day} onChange={(e) => { setDay(e.target.value); setSlot(''); }}><option value="">Kies een dag…</option>{days.map((x) => <option key={x.day} value={x.day}>{dayNl(x.day + 'T12:00:00Z')}</option>)}</select></Field>{day && <div className="slots">{days.find((x) => x.day === day).slots.map((s) => <button key={s} className={'slot' + (slot === s ? ' on' : '')} onClick={() => setSlot(s)}>{timeNl(s)}</button>)}</div>}</>}</div>}
    {kind && <div className="card stack"><h2>3. Uw gegevens</h2><Field label={'Telefoonnummer' + (kind === 'callback' ? ' (verplicht)' : '')}><input type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field><Field label="Onderwerp"><select value={topic} onChange={(e) => setTopic(e.target.value)}>{Object.entries(TOPIC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field><Field label="Bericht (niet verplicht)"><textarea maxLength="1000" value={msg} onChange={(e) => setMsg(e.target.value)} /></Field><Note kind="error">{err}</Note><div><Btn busy={busy} disabled={!valid} onClick={book}>Bevestig mijn afspraak</Btn></div></div>}
    {!kind && <Note kind="error">{err}</Note>}
  </>;
}
function Account({ d, reload, email }) {
  const [phone, setPhone] = useState(d?.investor?.phone || ''), [msg, setMsg] = useState(''), [err, setErr] = useState(''), [factor, setFactor] = useState(null), [enroll, setEnroll] = useState(null), [code, setCode] = useState(''), [busy, setBusy] = useState(false);
  const loadF = () => sb.auth.mfa.listFactors().then(({ data }) => setFactor((data?.totp || []).find((f) => f.status === 'verified') || null));
  useEffect(() => { loadF(); }, []);
  async function savePhone() { setErr(''); try { await fn('bel-inv', { action: 'set_phone', phone }); await reload(); setMsg('Opgeslagen.'); } catch (x) { setErr(errText(x)); } }
  async function start() { setErr(''); setBusy(true); const { data: all } = await sb.auth.mfa.listFactors(); for (const f of (all?.all || []).filter((f) => f.status !== 'verified')) await sb.auth.mfa.unenroll({ factorId: f.id }); const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Belinus ' + new Date().toISOString().slice(0, 10) }); setBusy(false); if (error) setErr(ERR.generic); else setEnroll(data); }
  async function confirm(e) { e.preventDefault(); setBusy(true); setErr(''); const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: enroll.id, code: code.trim() }); if (error) setErr(ERR['wrong-code']); else { await sb.auth.refreshSession(); await fn('bel-inv', { action: 'mfa_totp_done' }).catch(() => {}); setEnroll(null); setCode(''); setMsg('De authenticator-app is geactiveerd.'); loadF(); } setBusy(false); }
  async function remove() { const { error } = await sb.auth.mfa.unenroll({ factorId: factor.id }); if (error) setErr(ERR.generic); else { setMsg('De authenticator-app is verwijderd.'); loadF(); } }
  async function newPw() { setErr(''); try { await fn('bel-inv-auth', { action: 'start', email }); setMsg('We stuurden u een e-mail met een link om uw wachtwoord te wijzigen.'); } catch (x) { setErr(errText(x)); } }
  return <>
    <div className="page-head"><div><h1 className="page-title">Mijn account</h1><p className="page-sub">{email}</p></div></div>
    <Note kind="ok">{msg}</Note><Note kind="error">{err}</Note><div style={{ height: 12 }} />
    {d?.investor && <div className="card stack"><h2>Telefoonnummer</h2><Field label="Voor terugbelverzoeken"><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field><div><Btn kind="ghost" onClick={savePhone}>Opslaan</Btn></div></div>}
    <div className="card stack"><h2>Aanmelden in twee stappen</h2><p style={{ margin: 0 }}>Na uw wachtwoord bevestigt u elke aanmelding met een code per e-mail of, als u die activeert, met een authenticator-app.</p>
      {factor ? <div className="row"><span className="chip ok">Authenticator-app actief</span><button className="btn danger sm" onClick={remove}>Verwijderen</button></div> : !enroll ? <div><Btn kind="ghost" busy={busy} onClick={start}>Authenticator-app activeren</Btn></div> :
        <form className="stack" onSubmit={confirm}><p style={{ margin: 0 }}>Scan deze QR-code met uw authenticator-app en vul de code in.</p><img src={enroll.totp.qr_code} alt="QR-code" width="180" height="180" /><p className="hint" style={{ margin: 0, wordBreak: 'break-all' }}>Handmatige sleutel: {enroll.totp.secret}</p><Field label="Code"><input className="code" inputMode="numeric" maxLength="6" required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /></Field><div><Btn busy={busy} type="submit">Activeren</Btn></div></form>}
    </div>
    <div className="card stack"><h2>Wachtwoord</h2><div><Btn kind="ghost" onClick={newPw}>Stuur mij een link om te wijzigen</Btn></div></div>
  </>;
}
