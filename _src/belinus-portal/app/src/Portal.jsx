// Belinus customer portal (portal.belinus.com). React 18 UMD + supabase-js UMD; hash routing.
// Reads go straight to the bel_* tables (row-level security: own rows, after the second factor);
// actions go through the bel-* edge functions.
const { useState, useEffect, useRef, useCallback } = React;
const CFG = window.BELINUS_PORTAL;
const sb = window.supabase.createClient(CFG.url, CFG.key, { auth: { storage: window.sessionStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });

// ---------- language ----------
const LANGS = ['nl', 'fr', 'en'];
function initialLang() {
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  const l = (q.get('lang') || safeGet('bel_lang') || (navigator.language || 'nl')).slice(0, 2).toLowerCase();
  return LANGS.includes(l) ? l : 'nl';
}
function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
const LangCtx = React.createContext({ t: T.nl, lang: 'nl' });
const useT = () => React.useContext(LangCtx);
const fmt = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => (v && v[k] != null ? v[k] : ''));
const locale = (l) => (l === 'en' ? 'en-GB' : l + '-BE');
const day = (d, l) => (d ? new Date(d).toLocaleDateString(locale(l), { day: 'numeric', month: 'long', year: 'numeric' }) : '—');
const when = (d, l) => (d ? new Date(d).toLocaleString(locale(l), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const eur = (n, l) => (n == null ? '—' : new Intl.NumberFormat(locale(l), { style: 'currency', currency: 'EUR' }).format(Number(n)));

// ---------- routing ----------
function useRoute() {
  const parse = () => { const h = location.hash.replace(/^#\/?/, ''); const [path, qs] = h.split('?'); return { parts: path.split('/').filter(Boolean), q: new URLSearchParams(qs || '') }; };
  const [r, setR] = useState(parse);
  useEffect(() => { const f = () => { setR(parse()); window.scrollTo(0, 0); }; window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  return r;
}
const go = (p) => { location.hash = '#/' + p; };

// ---------- API ----------
async function fn(name, body) {
  const { data: s } = await sb.auth.getSession();
  const token = s?.session?.access_token;
  const res = await fetch(`${CFG.url}/functions/v1/${name}`, { method: 'POST', headers: { 'content-type': 'application/json', apikey: CFG.key, ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body || {}) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.error) { const e = new Error(j.error || 'generic'); e.data = j; e.status = res.status; throw e; }
  return j;
}
function errText(t, e) { const k = (e && (e.message || e)) || 'generic'; return t.errors[k] || t.errors.generic; }

// ---------- small UI ----------
function Logo({ light }) { return <img className="logo" src={light ? 'assets/logo-belinus-white.png' : 'assets/logo-belinus.png'} alt="belinus" />; }
function Field({ label, children, hint }) { return <label className="field"><span className="field-l">{label}</span>{children}{hint && <span className="field-h">{hint}</span>}</label>; }
function Btn({ kind = 'primary', busy, children, ...p }) { return <button className={'btn' + (kind === 'primary' ? '' : ' ' + kind)} disabled={busy || p.disabled} {...p}>{busy ? <span className="spin" /> : children}</button>; }
function Note({ kind = 'info', children }) { return children ? <div className={'note' + (kind === 'info' ? '' : ' ' + kind)} role={kind === 'error' ? 'alert' : 'status'}>{children}</div> : null; }
function Badge({ tone = 'grey', children }) { return <span className={'chip ' + ({ green: 'ok', amber: 'warn', red: 'bad', blue: 'info' }[tone] || '')}>{children}</span>; }
function Empty({ children }) { return <div className="empty">{children}</div>; }
function PageHead({ title, lead, action }) { return <div className="page-head"><div><h1 className="page-title">{title}</h1>{lead && <p className="page-sub">{lead}</p>}</div>{action}</div>; }
const TONE = { repay_pending: 'amber', repay_partial: 'amber', repaid: 'green', pending: 'amber', active: 'green', delivered: 'green', installed: 'green', paid: 'green', signed: 'green', replaced: 'green', answered: 'blue', open: 'amber', opened: 'amber', sent: 'red', recalled: 'red', overdue: 'red', service: 'amber', closed: 'grey', cancelled: 'grey' };

// ---------- auth screens ----------
function AuthFrame({ children }) {
  const { t } = useT();
  return (
    <div className="auth">
      <div className="auth-panel"><div><img className="auth-belinus" src="assets/logo-belinus-blue.png" alt="belinus" /></div><div><h1>{t.portal}</h1><p>{t.portalTag}</p></div><div /></div>
      <div className="auth-form"><div><div className="tools"><LangSwitch /><ThemeToggle /></div><div className="auth-box">{children}</div></div></div>
    </div>
  );
}
function PwInput(props) {
  const { t } = useT();
  const [show, setShow] = useState(false);
  const label = show ? t.hidePw : t.showPw;
  return <div className="pw-wrap"><input {...props} type={show ? 'text' : 'password'} /><button type="button" className="pw-eye" aria-label={label} title={label} aria-pressed={show} onClick={() => setShow(!show)}><svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />{show && <path d="M4 4l16 16" />}</svg></button></div>;
}
function LangSwitch() {
  const { lang, setLang } = useT();
  return <div className="lang-switch" role="group" aria-label="Language">{LANGS.map((l) => <button key={l} type="button" className={l === lang ? 'on' : ''} onClick={() => setLang(l)}>{l.toUpperCase()}</button>)}</div>;
}
function ThemeToggle() {
  const { t } = useT();
  const [theme, set] = useState(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  const next = theme === 'light' ? 'dark' : 'light';
  const flip = () => { if (next === 'light') document.documentElement.dataset.theme = 'light'; else delete document.documentElement.dataset.theme; safeSet('inv_theme', next); set(next); };
  const label = next === 'light' ? t.themeLight : t.themeDark;
  return <button type="button" className="theme-btn" onClick={flip} aria-label={label} title={label}><svg className="ic" viewBox="0 0 24 24" aria-hidden="true">{next === 'light' ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></> : <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />}</svg></button>;
}

function Login({ onSignedIn, route }) {
  const { t } = useT();
  const [email, setEmail] = useState(route.q.get('email') || '');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false), [err, setErr] = useState('');
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: pw });
    setBusy(false);
    if (error) { setErr(t.errors['invalid-credentials']); return; }
    onSignedIn();
  }
  return (
    <AuthFrame>
      <h1>{t.signIn}</h1>
      <form onSubmit={submit} className="stack">
        <Field label={t.email}><input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label={t.password}><PwInput autoComplete="current-password" required value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
        <Note kind="error">{err}</Note>
        <Btn busy={busy} type="submit">{t.signIn}</Btn>
      </form>
      <div className="auth-links"><a href="#/forgot">{t.forgot}</a><span>{t.noAccount} <a href="#/signup">{t.createAccount}</a></span></div>
    </AuthFrame>
  );
}

function PwRules({ pw }) {
  const { t } = useT();
  const ok = pw.length >= 12 && /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw);
  return <span className={'field-h' + (pw ? (ok ? ' ok' : ' bad') : '')}>{t.pwRules}</span>;
}

function Signup() {
  const { t, lang } = useT();
  const [f, setF] = useState({ first_name: '', last_name: '', email: '', password: '', accept: false, website: '' });
  const [busy, setBusy] = useState(false), [err, setErr] = useState(''), [done, setDone] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  async function submit(e) {
    e.preventDefault(); setErr('');
    if (!f.accept) { setErr(t.errors['terms-required']); return; }
    setBusy(true);
    try { await fn('bel-auth', { action: 'signup', email: f.email, password: f.password, first_name: f.first_name, last_name: f.last_name, lang, accept_terms: true, website: f.website }); setDone(true); }
    catch (x) { setErr(errText(t, x)); }
    setBusy(false);
  }
  return (
    <AuthFrame>
      <h1>{t.createAccount}</h1>
      {done ? <><Note kind="ok">{t.signupDone}</Note><a className="btn" href={'#/login?email=' + encodeURIComponent(f.email)}>{t.signIn}</a></> : (
        <form onSubmit={submit} className="stack">
          <div className="row2">
            <Field label={t.firstName}><input required autoComplete="given-name" value={f.first_name} onChange={set('first_name')} /></Field>
            <Field label={t.lastName}><input required autoComplete="family-name" value={f.last_name} onChange={set('last_name')} /></Field>
          </div>
          <Field label={t.email}><input type="email" required autoComplete="email" value={f.email} onChange={set('email')} /></Field>
          <label className="field"><span className="field-l">{t.password}</span><PwInput required autoComplete="new-password" value={f.password} onChange={set('password')} /><PwRules pw={f.password} /></label>
          <input className="trap" tabIndex="-1" autoComplete="off" value={f.website} onChange={set('website')} aria-hidden="true" />
          <label className="check"><input type="checkbox" checked={f.accept} onChange={set('accept')} /> <span>{t.acceptTerms} <a href="https://belinus.com/#/legal" target="_blank" rel="noopener">↗</a></span></label>
          <Note kind="error">{err}</Note>
          <Btn busy={busy} type="submit">{t.createAccount}</Btn>
        </form>
      )}
      <div className="auth-links"><span>{t.haveAccount} <a href="#/login">{t.signIn}</a></span></div>
    </AuthFrame>
  );
}

function Forgot() {
  const { t } = useT();
  const [email, setEmail] = useState(''), [busy, setBusy] = useState(false), [done, setDone] = useState(false), [err, setErr] = useState('');
  async function submit(e) { e.preventDefault(); setBusy(true); setErr(''); try { await fn('bel-auth', { action: 'recovery', email }); setDone(true); } catch (x) { setErr(errText(t, x)); } setBusy(false); }
  return (
    <AuthFrame>
      <h1>{t.forgot.replace('?', '')}</h1>
      {done ? <Note kind="ok">{t.resetSent}</Note> : (
        <form onSubmit={submit} className="stack">
          <Field label={t.email}><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Note kind="error">{err}</Note>
          <Btn busy={busy} type="submit">{t.sendReset}</Btn>
        </form>
      )}
      <div className="auth-links"><a href="#/login">{t.back}</a></div>
    </AuthFrame>
  );
}

function Reset({ route, onSignedIn }) {
  const { t } = useT();
  const [stage, setStage] = useState(route.q.get('code') ? 'ready' : 'form');
  const [pw, setPw] = useState(''), [pw2, setPw2] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  async function redeem() {
    setBusy(true); setErr('');
    try { const r = await fn('bel-auth', { action: 'redeem', code: route.q.get('code') }); await sb.auth.setSession(r.session); setStage('form'); }
    catch (x) { setErr(t.linkExpired); setStage('expired'); }
    setBusy(false);
  }
  async function submit(e) {
    e.preventDefault(); setErr('');
    if (pw !== pw2) { setErr(t.errors.mismatch); return; }
    setBusy(true);
    try { const r = await fn('bel-mfa', { action: 'change_password', password: pw }); if (r.session) await sb.auth.setSession(r.session); onSignedIn(); go('products'); }
    catch (x) { setErr(errText(t, x)); }
    setBusy(false);
  }
  return (
    <AuthFrame>
      <h1>{t.newPassword}</h1>
      {stage === 'ready' && <><p>{t.resetContinue}</p><Btn busy={busy} onClick={redeem}>{t.continue}</Btn></>}
      {stage === 'expired' && <><Note kind="error">{err}</Note><a className="btn" href="#/forgot">{t.sendReset}</a></>}
      {stage === 'form' && (
        <form onSubmit={submit} className="stack">
          <label className="field"><span className="field-l">{t.newPassword}</span><PwInput required autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /><PwRules pw={pw} /></label>
          <Field label={t.repeatPassword}><PwInput required autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></Field>
          <Note kind="error">{err}</Note>
          <Btn busy={busy} type="submit">{t.setPassword}</Btn>
        </form>
      )}
    </AuthFrame>
  );
}

// Second factor after the password: authenticator app (aal2) or a code by e-mail.
function SecondFactor({ status, onDone }) {
  const { t } = useT();
  const [mode, setMode] = useState(status.totp ? 'app' : 'email');
  const [code, setCode] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [sent, setSent] = useState(false), [info, setInfo] = useState('');
  const sentOnce = useRef(false);
  const send = useCallback(async () => {
    setErr(''); setInfo('');
    try { await fn('bel-mfa', { action: 'send' }); setSent(true); } catch (x) { setErr(errText(t, x)); }
  }, [t]);
  useEffect(() => { if (mode === 'email' && !sentOnce.current) { sentOnce.current = true; send(); } }, [mode, send]);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      if (mode === 'app') {
        const { data: f } = await sb.auth.mfa.listFactors();
        const factor = (f?.totp || [])[0];
        const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() });
        if (error) throw new Error('wrong-code');
        await sb.auth.refreshSession();
        const r = await fn('bel-mfa', { action: 'totp_done' });
        onDone(r);
      } else {
        const r = await fn('bel-mfa', { action: 'verify', code });
        onDone(r);
      }
    } catch (x) { setErr(errText(t, x)); }
    setBusy(false);
  }
  return (
    <AuthFrame>
      <h1>{t.codeTitle}</h1>
      <p>{mode === 'app' ? t.appCode : fmt(t.codeSent, { email: status.email })}</p>
      <form onSubmit={submit} className="stack">
        <Field label={t.code}><input className="code-in" inputMode="numeric" autoComplete="one-time-code" maxLength="6" required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /></Field>
        <Note kind="error">{err}</Note><Note>{info}</Note>
        <Btn busy={busy} type="submit">{t.verify}</Btn>
      </form>
      <div className="auth-links">
        {mode === 'email' && <button className="link" onClick={send}>{t.resend}</button>}
        {status.totp && <button className="link" onClick={() => { setMode(mode === 'app' ? 'email' : 'app'); setCode(''); setErr(''); }}>{mode === 'app' ? t.useEmail : t.useApp}</button>}
        <button className="link" onClick={() => sb.auth.signOut({ scope: 'local' }).then(() => location.reload())}>{t.signOut}</button>
      </div>
    </AuthFrame>
  );
}

// Arrival from the other portal: one-time code -> session, no second sign-in.
function SwitchIn({ route }) {
  const { t } = useT();
  const [err, setErr] = useState(false), once = useRef(false);
  useEffect(() => {
    if (once.current) return; once.current = true;
    const code = route.q.get('code');
    history.replaceState(null, '', location.pathname + '#/switch');
    (async () => {
      try {
        const r = await fn('bel-switch', { action: 'redeem', code });
        if (!r.session) throw new Error('expired');
        const { error: sErr } = await sb.auth.setSession(r.session); if (sErr) throw sErr;
        history.replaceState(null, '', location.pathname + '#/');
        location.reload();
      } catch (e) { setErr(true); }
    })();
  }, []);
  return <AuthFrame>{err ? <><Note kind="error">{t.switchFail}</Note><a className="btn" href="#/login" onClick={() => setTimeout(() => location.reload(), 0)}>{t.signIn}</a></> : <p className="muted">{t.loading}</p>}</AuthFrame>;
}

// ---------- signed-in shell ----------
const MENU = ['products', 'library', 'recall', 'orders', 'invoices', 'support', 'assistant'];
const ICON = {
  products: 'M4 7h16v12H4zM8 7V5h8v2M9 12h6', library: 'M5 4h4v16H5zM10 4h4v16h-4zM15.5 5l3.8-1 3.2 15.5-3.8 1z', recall: 'M12 3l9 16H3zM12 10v4M12 17h.01', orders: 'M3 7h11v10H3zM14 10h4l3 3v4h-7M7 20a2 2 0 1 0 0-.01M17 20a2 2 0 1 0 0-.01',
  desk: 'M3 5h18v14H3zM3 10h18M8 15h3', services: 'M12 3l2.5 5.5L20 9.3l-4 4 1 5.7-5-2.8L7 19l1-5.7-4-4 5.5-.8z', messages: 'M3 6h18v12H3zM3 7l9 6 9-6', dashboard: 'M4 20V10M10 20V4M16 20v-7M22 20H2', customers: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8', invest: 'M22 7l-8.5 8.5-5-5L2 17M16 7h6v6', menu: 'M4 7h16M4 12h16M4 17h16', search: 'M21 21l-4.3-4.3M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16', invoices: 'M6 3h9l3 3v15H6zM9 10h6M9 14h6M9 18h4', support: 'M4 12a8 8 0 1 1 16 0v5h-4v-5h4M4 12v5h4v-5H4', assistant: 'M4 5h16v11H9l-5 4zM9 10h.01M12 10h.01M15 10h.01', account: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
};
const Icon = ({ n }) => <svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><path d={ICON[n]} /></svg>;

// Collapsible menu sections; the choice is remembered in this browser (same behaviour in both portals).
function useNavFold() {
  const read = () => { try { return JSON.parse(localStorage.getItem('nav_closed')) || []; } catch (e) { return []; } };
  const [closed, set] = useState(read);
  const toggle = (id) => set((c) => { const n = c.includes(id) ? c.filter((x) => x !== id) : [...c, id]; try { localStorage.setItem('nav_closed', JSON.stringify(n)); } catch (e) {} return n; });
  return { closed, toggle };
}
function SbSec({ id, label, on, force, fold, children }) {
  const shut = !force && fold.closed.includes(id);
  return <div className={'sb-sec' + (shut ? ' shut' : '')}><button type="button" className={'sb-h sb-fold' + (shut && on ? ' on' : '')} aria-expanded={!shut} onClick={(e) => { e.preventDefault(); e.stopPropagation(); fold.toggle(id); }}><span>{label}</span><svg className="sb-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg></button><div className="sb-rows">{children}</div></div>;
}
function Shell({ me, route, children, counts }) {
  const fold = useNavFold();
  const { t } = useT();
  const [menu, setMenu] = useState(false), [q, setQ] = useState(''), [investor, setInvestor] = useState(false), [switching, setSwitching] = useState(false);
  useEffect(() => { fn('bel-switch', { action: 'targets' }).then((r) => setInvestor(!!r.investor)).catch(() => {}); }, []);
  useEffect(() => { if (safeGet('inv_rail')) document.documentElement.classList.add('rail'); }, []);
  useEffect(() => { if (!menu) return; const f = (e) => { if (!e.target.closest('.sb-foot')) setMenu(false); }; addEventListener('click', f); return () => removeEventListener('click', f); }, [menu]);
  async function toInvestor(e) { e.preventDefault(); if (switching) return; setSwitching(true); try { const r = await fn('bel-switch', { action: 'create', to: 'investor' }); location.href = r.url; } catch (x) { setSwitching(false); } }
  const cur = route.parts[0] || 'products';
  const staff = isStaffUser(me);
  const name = me.full_name || [me.first_name, me.last_name].filter(Boolean).join(' ') || me.email;
  const initials = name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((x) => x[0].toUpperCase()).join('');
  const secs = [];
  if (staff) secs.push([t.secManage, me.role === 'super' ? ['dashboard', 'desk', 'customers'] : ['desk'], 'manage']);
  secs.push([t.secInstall, ['products', 'services', 'library', 'recall'], 'install'], [t.secOrders, ['orders', 'invoices'], 'orders'], [t.secHelp, ['messages', 'support', 'assistant'], 'help']);
  const filt = (m) => !q || t.menu[m].toLowerCase().includes(q.toLowerCase());
  const tabs = staff ? ['desk', 'products', 'support'] : ['products', 'support', 'assistant'];
  const toggleRail = () => { const on = document.documentElement.classList.toggle('rail'); safeSet('inv_rail', on ? '1' : ''); };
  const closeDrawer = () => document.documentElement.classList.remove('drawer');
  const out = () => sb.auth.signOut({ scope: 'local' }).then(() => { go('login'); location.reload(); });
  return (
    <div>
      <aside className="sb-side">
        <a className="sb-brand" href="#/products"><img src="assets/logo-belinus-blue.png" alt="belinus" /><img className="sb-b" src="assets/favicon-180.png" alt="belinus" /><span className="sb-lbl">{t.portal}</span></a>
        <label className="sb-search"><span className="sr">{t.search}</span><Icon n="search" /><input type="search" placeholder={t.search} value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <nav className="sb-nav" onClick={closeDrawer}>
          {secs.map(([h, rows, id]) => { const vis = rows.filter(filt); return vis.length ? <SbSec key={id} id={id} label={h} on={rows.includes(cur)} force={!!q} fold={fold}>{vis.map((m) => (
            <a key={m} href={'#/' + m} title={t.menu[m]} className={'nav-row' + (cur === m ? ' on' : '') + (m === 'recall' && counts.recall ? ' alert' : '')}><Icon n={m} /><span>{t.menu[m]}</span>{counts[m] ? <b className="count">{counts[m]}</b> : null}</a>
          ))}</SbSec> : null; })}
          {investor && <SbSec id="other" label={t.secOther} on={false} force={!!q} fold={fold}><a className="nav-row" href="#/" onClick={toInvestor} title={t.switchInvestor}><Icon n="invest" /><span>{t.switchInvestor}</span></a></SbSec>}
        </nav>
        <div className="sb-foot">
          {menu && <div className="sb-menu"><a href="#/account" onClick={() => { setMenu(false); closeDrawer(); }}>{t.menu.account}</a><button onClick={out}>{t.signOut}</button></div>}
          <button className="sb-acct" onClick={() => setMenu(!menu)}><span className="av">{initials}</span><div><b>{name}</b><small>{staff ? t.roleStaff : t.roleCustomer}</small></div></button>
          <ThemeToggle />
        </div>
        <button className="sb-edge" onClick={toggleRail} aria-label={t.foldMenu}><svg viewBox="0 0 24 24"><path d="M14 7l-5 5 5 5" /></svg></button>
      </aside>
      <div className="sb-scrim" onClick={closeDrawer} />
      <header className="sb-top"><div className="logos"><img src="assets/logo-belinus-blue.png" alt="belinus" /></div><div className="acts"><ThemeToggle /><a className="av" href="#/account" aria-label={t.menu.account}>{initials}</a></div></header>
      <main className="main"><div className="main-in"><p className="eyebrow">{t.portal}</p>{children}<p className="foot">Belinus Energy BV · a belinus group company · <a href="https://belinus.com/#/privacy" target="_blank" rel="noopener">{t.privacy}</a></p></div></main>
      <nav className="sb-tabs">{tabs.map((m) => <a key={m} className={'sb-tab' + (cur === m ? ' on' : '')} href={'#/' + m}><Icon n={m} /><span>{t.menu[m]}</span></a>)}<button className="sb-tab" onClick={() => document.documentElement.classList.add('drawer')}><Icon n="menu" /><span>{t.more}</span></button></nav>
    </div>
  );
}

// ---------- My products ----------
function Products({ me, route }) {
  if (route && route.parts[1] === 'register') return <RegisterSystem key={location.hash} route={route} />;
  return <ProductsList me={me} />;
}
async function odooFile(id, name, t) {
  try {
    const { data: x } = await sb.auth.getSession();
    const res = await fetch(`${CFG.url}/functions/v1/bel-services`, { method: 'POST', headers: { 'content-type': 'application/json', apikey: CFG.key, authorization: 'Bearer ' + x?.session?.access_token }, body: JSON.stringify({ action: 'attachment', id }) });
    if (!res.ok) throw new Error('pdf-unavailable');
    const url = URL.createObjectURL(await res.blob());
    const l = document.createElement('a'); l.href = url; l.download = name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch (e) { alert(errText(t, e)); }
}
function OdooProducts({ hasSystems }) {
  const { t, lang } = useT();
  const [p, setP] = useState(null), [d, setD] = useState(null), [err, setErr] = useState('');
  useEffect(() => {
    fn('bel-services', { action: 'products' }).then((r) => setP(r.products)).catch((e) => { setErr(errText(t, e)); setP([]); });
    fn('bel-services', { action: 'documents' }).then(setD).catch(() => setD({ orders: [], invoices: [], files: [] }));
  }, []);
  if (!p) return <p className="muted">{t.loading}</p>;
  const docs = d ? d.orders.length + d.invoices.length + d.files.length : 0;
  return (
    <>
      <Note kind="error">{err}</Note>
      {!p.length && !hasSystems && !err && <Empty>{t.productsEmpty} <a href="#/products/register">{t.registerBtn} →</a> · <a href="#/library">{t.menu.library} →</a></Empty>}
      {p.length ? <section className="block" style={{ marginTop: 0 }}><h2 className="site-h">{t.boughtTitle}</h2><div className="cards">{p.map((x) => <article key={x.id} className="card sys"><h3>{x.product}{x.quantity > 1 ? ' × ' + x.quantity : ''}</h3><dl className="kv"><dt>{t.order}</dt><dd className="mono">{x.order}</dd><dt>{t.ordered}</dt><dd>{day(x.ordered_at, lang)}</dd></dl><a className="btn ghost sm" href="#/support/new">{t.askSupport}</a></article>)}</div></section> : null}
      {docs ? <section className="block"><h2>{t.documents}</h2><ul className="doc-rows card">
        {d.orders.map((o) => <li key={'o' + o.id} className="doc-row"><span className="grow">{o.state === 'sent' ? t.oStatus.quote : t.order} <span className="mono">{o.number}</span> · {day(o.date, lang)}</span><button className="link" onClick={() => odooPdf('order', o.id, o.number, t)}>PDF</button></li>)}
        {d.invoices.map((i) => <li key={'i' + i.id} className="doc-row"><span className="grow">{i.credit ? t.creditNote : t.invoice} <span className="mono">{i.number}</span> · {day(i.date, lang)}</span><button className="link" onClick={() => odooPdf('invoice', i.id, i.number, t)}>PDF</button></li>)}
        {d.files.map((f) => <li key={'f' + f.id} className="doc-row"><span className="grow">{f.name}{f.ref ? <small className="muted"> · {f.ref}</small> : null} · {day(f.date, lang)}</span><button className="link" onClick={() => odooFile(f.id, f.name, t)}>{t.download}</button></li>)}
      </ul></section> : null}
    </>
  );
}
function ProductsList({ me }) {
  const { t, lang } = useT();
  const [data, setData] = useState(null);
  useEffect(() => { (async () => {
    const [{ data: sites }, { data: systems }, { data: docs }] = await Promise.all([
      sb.from('bel_sites').select('*').order('created_at'),
      sb.from('bel_systems').select('*').order('installed_at', { ascending: false }),
      sb.from('bel_documents').select('id, title, category, system_id, site_id, created_at').order('created_at', { ascending: false }),
    ]);
    setData({ sites: sites || [], systems: systems || [], docs: docs || [] });
  })(); }, []);
  if (!data) return <p className="muted">{t.loading}</p>;
  return (
    <>
      <PageHead title={t.menu.products} lead={t.productsLead} action={<a className="btn ghost sm" href="#/products/register">{t.registerBtn}</a>} />
      <OdooProducts hasSystems={!!data.systems.length} />
      {data.sites.map((s) => {
        const sys = data.systems.filter((y) => y.site_id === s.id);
        if (!sys.length) return null;
        return (
          <section key={s.id} className="block">
            <p className="eyebrow">{t.site}</p>
            <h2 className="site-h">{[s.street, [s.postal_code, s.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') || s.label}</h2>
            <div className="cards">
              {sys.map((y) => (
                <article key={y.id} className={'card sys sys-' + y.kind}>
                  <div className="card-top"><span className="kind">{t.kind[y.kind] || y.kind}</span><Badge tone={TONE[y.status]}>{t.sysStatus[y.status]}</Badge></div>
                  <h3>{y.product}{y.model ? ' · ' + y.model : ''}{y.quantity > 1 ? ' × ' + y.quantity : ''}</h3>
                  <dl className="kv">
                    {y.capacity_kwh ? <><dt>kWh</dt><dd>{y.capacity_kwh}</dd></> : null}
                    {y.power_kw ? <><dt>kW</dt><dd>{y.power_kw}</dd></> : null}
                    <dt>{t.serial}</dt><dd className="mono">{y.serial || '—'}</dd>
                    <dt>{t.installed}</dt><dd>{day(y.installed_at, lang)}</dd>
                    <dt>{t.warrantyUntil}</dt><dd>{day(y.warranty_until, lang)}</dd>
                  </dl>
                  {y.warranty_product_years ? <p className="warr">{t.warranty}: {y.warranty_product_years} {t.years} {t.product}{y.warranty_performance_years ? ` · ${y.warranty_performance_years} ${t.years} ${t.performance}` : ''}</p> : null}
                  <DocList docs={data.docs.filter((d) => d.system_id === y.id)} />
                  <a className="btn ghost sm" href={'#/support/new?system=' + y.id + '&cat=' + y.kind}>{t.askSupport}</a>
                </article>
              ))}
            </div>
          </section>
        );
      })}
      {data.docs.filter((d) => !d.system_id).length ? <section className="block"><h2>{t.documents}</h2><DocList docs={data.docs.filter((d) => !d.system_id)} wide /></section> : null}
    </>
  );
}

// ---------- Product library (current + discontinued) ----------
const SITE_URL = 'https://www.belinus.com/';
function discList(lang) { return CATALOG.discontinued[lang] || CATALOG.discontinued.nl; }
function Library() {
  const { t, lang } = useT();
  const kinds = ['solar', 'inverter', 'battery', 'ev_charger', 'ems'];
  return (
    <>
      <PageHead title={t.menu.library} lead={t.libraryLead} action={<a className="btn ghost sm" href="#/products/register">{t.registerBtn}</a>} />
      <section className="block">
        <h2>{t.libCurrent}</h2>
        <div className="card">
          {kinds.map((k) => {
            const items = CATALOG.current.filter((x) => x.kind === k);
            if (!items.length) return null;
            return (
              <div key={k} className="lib-group">
                <p className="eyebrow">{t.kind[k]}</p>
                <ul className="lib-list">
                  {items.map((x) => (
                    <li key={x.id}>
                      <span className="lib-name">{x.name}</span>
                      {x.sheet ? <a href={SITE_URL + x.sheet} target="_blank" rel="noopener">{t.libSheet} ↓</a> : <span className="muted">{t.libOnRequest}</span>}
                      <a href={'#/products/register?p=' + x.id}>{t.registerThis} →</a>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
      <section className="block">
        <h2>{t.libDiscontinued}</h2>
        <div className="cards">
          {discList(lang).map((x) => (
            <article key={x.id} className="card lib-card">
              <div className="card-top"><span className="kind">{t.kind[x.cat]}</span><span className="muted small">{t.libSold} {x.years}</span></div>
              <h3>{x.name}</h3>
              <p className="muted small">{x.desc}</p>
              <dl className="kv">{x.specs.slice(1, 6).map((s) => <React.Fragment key={s[0]}><dt>{s[0]}</dt><dd>{s[1]}</dd></React.Fragment>)}</dl>
              <div className="lib-actions">
                <a href={SITE_URL + x.sheet} target="_blank" rel="noopener">{t.libSheet} ↓</a>
                <a href={'#/products/register?p=' + x.id}>{t.registerThis} →</a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

// ---------- Register an existing system ----------
function RegisterSystem({ route }) {
  const { t, lang } = useT();
  const disc = discList(lang).map((x) => ({ id: x.id, kind: x.cat, name: x.name }));
  const all = [...CATALOG.current, ...disc, ...CATALOG.other];
  const blank = (id) => ({ pid: id && all.some((p) => p.id === id) ? id : '', other: '', model: '', serial: '', quantity: 1, installed_at: '' });
  const [sites, setSites] = useState([]);
  const [siteId, setSiteId] = useState('new');
  const [site, setSite] = useState({ street: '', postal_code: '', city: '', country: 'BE' });
  const [items, setItems] = useState([blank(route.q.get('p'))]);
  const [installer, setInstaller] = useState(''), [note, setNote] = useState('');
  const [busy, setBusy] = useState(false), [err, setErr] = useState(''), [done, setDone] = useState(false);
  useEffect(() => { sb.from('bel_sites').select('*').order('created_at').then(({ data }) => { setSites(data || []); if ((data || []).length) setSiteId(data[0].id); }); }, []);
  const upd = (i, k, v) => setItems(items.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const payload = items.filter((x) => x.pid).map((x) => {
        if (x.pid === '__other') return { kind: 'other', product: x.other, model: x.model, serial: x.serial, quantity: x.quantity, installed_at: x.installed_at };
        const p = all.find((y) => y.id === x.pid);
        return { kind: p.kind, product: p.name, model: x.model, serial: x.serial, quantity: x.quantity, installed_at: x.installed_at };
      });
      await fn('bel-portal', { action: 'register_system', site_id: siteId !== 'new' ? siteId : null, site: siteId === 'new' ? site : null, items: payload, installer, note });
      setDone(true); window.scrollTo(0, 0);
    } catch (x) { setErr(errText(t, x)); }
    setBusy(false);
  }
  if (done) return (<><PageHead title={t.registerTitle} /><div className="card stack"><p>{t.regDone}</p><a className="btn" href="#/products">{t.menu.products} →</a></div></>);
  const groups = [['cur', t.libCurrent, CATALOG.current], ['disc', t.libDiscontinued, disc], ['oth', t.regEarlier, CATALOG.other]];
  return (
    <>
      <a href="#/products" className="back">‹ {t.back}</a>
      <PageHead title={t.registerTitle} lead={t.registerLead} />
      <form className="card stack" onSubmit={submit}>
        <h3>{t.site}</h3>
        {sites.length ? <Field label={t.site}><select value={siteId} onChange={(e) => setSiteId(e.target.value)}>{sites.map((s) => <option key={s.id} value={s.id}>{[s.street, [s.postal_code, s.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') || s.label}</option>)}<option value="new">{t.regNewSite}</option></select></Field> : null}
        {siteId === 'new' && (
          <>
            <Field label={t.street}><input required maxLength="160" value={site.street} onChange={(e) => setSite({ ...site, street: e.target.value })} /></Field>
            <div className="row2">
              <Field label={t.postal}><input required maxLength="20" value={site.postal_code} onChange={(e) => setSite({ ...site, postal_code: e.target.value })} /></Field>
              <Field label={t.city}><input required maxLength="100" value={site.city} onChange={(e) => setSite({ ...site, city: e.target.value })} /></Field>
            </div>
            <Field label={t.country}><select value={site.country} onChange={(e) => setSite({ ...site, country: e.target.value })}>{['BE', 'NL', 'FR', 'LU', 'DE'].map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
          </>
        )}
        <h3>{t.regItems}</h3>
        {items.map((x, i) => (
          <div key={i} className="reg-item">
            <Field label={t.regProduct}>
              <select required value={x.pid} onChange={(e) => upd(i, 'pid', e.target.value)}>
                <option value="">{t.regChoose}</option>
                {groups.map(([g, label, list]) => <optgroup key={g} label={label}>{list.map((p) => <option key={p.id} value={p.id}>{t.kind[p.kind]} · {p.name}</option>)}</optgroup>)}
                <option value="__other">{t.regOther}</option>
              </select>
            </Field>
            {x.pid === '__other' && <Field label={t.regOtherName}><input required maxLength="120" value={x.other} onChange={(e) => upd(i, 'other', e.target.value)} /></Field>}
            <div className="row2">
              <Field label={t.regModel}><input maxLength="120" value={x.model} onChange={(e) => upd(i, 'model', e.target.value)} /></Field>
              <Field label={t.serial}><input maxLength="120" value={x.serial} onChange={(e) => upd(i, 'serial', e.target.value)} /></Field>
            </div>
            <div className="row2">
              <Field label={t.regQty}><input type="number" min="1" max="500" value={x.quantity} onChange={(e) => upd(i, 'quantity', e.target.value)} /></Field>
              <Field label={t.regInstalledOn}><input type="date" value={x.installed_at} onChange={(e) => upd(i, 'installed_at', e.target.value)} /></Field>
            </div>
            {items.length > 1 && <button type="button" className="link" onClick={() => setItems(items.filter((_, j) => j !== i))}>{t.regRemove}</button>}
          </div>
        ))}
        {items.length < 12 && <button type="button" className="btn ghost sm" onClick={() => setItems([...items, blank()])}>+ {t.regAddItem}</button>}
        <Field label={t.regInstaller}><input maxLength="160" value={installer} onChange={(e) => setInstaller(e.target.value)} /></Field>
        <Field label={t.regNote}><textarea rows="3" maxLength="1000" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <p className="muted small">{t.regPendingInfo}</p>
        <Note kind="error">{err}</Note>
        <Btn kind="primary" busy={busy} type="submit">{t.regSubmit}</Btn>
      </form>
    </>
  );
}

function DocList({ docs, wide }) {
  const { t, lang } = useT();
  if (!docs.length) return null;
  const open = async (d, download) => { try { const r = await fn('bel-portal', { action: 'doc_url', id: d.id, download }); window.open(r.url, '_blank', 'noopener'); } catch (e) { alert(errText(t, e)); } };
  return (
    <ul className={'docs' + (wide ? ' wide' : '')}>
      {docs.map((d) => <li key={d.id}><span className="doc-ic">PDF</span><span className="doc-t">{d.title}<small>{day(d.created_at, lang)}</small></span><button className="link" onClick={() => open(d, false)}>{t.open}</button><button className="link" onClick={() => open(d, true)}>{t.download}</button></li>)}
    </ul>
  );
}

// ---------- Recall ----------
function Recall({ route, me, refresh }) {
  const { t, lang } = useT();
  const id = route.parts[1];
  const [list, setList] = useState(null);
  useEffect(() => { if (!id) sb.from('bel_recall_notices').select('id, status, signed_at, created_at, system_id, bel_recalls(code, title, risk)').order('created_at', { ascending: false }).then(({ data }) => setList(data || [])); }, [id]);
  if (id) return <RecallNotice id={id} me={me} refresh={refresh} />;
  if (me.role === 'super') return <RecallAdmin />;
  if (!list) return <p className="muted">{t.loading}</p>;
  return (
    <>
      <PageHead title={t.menu.recall} lead={t.recallLead} />
      {!list.length ? <><RecallBanner /><Empty>{t.recallEmpty}</Empty></> : (
        <div className="list">
          {list.map((n) => (
            <a key={n.id} href={'#/recall/' + n.id} className={'row-link' + (!n.signed_at ? ' urgent' : '')}>
              <span className="mono">{n.bel_recalls?.code}</span>
              <span className="grow">{(n.bel_recalls?.title || {})[lang] || (n.bel_recalls?.title || {}).nl}</span>
              <Badge tone={TONE[n.status]}>{t.rStatus[n.status]}</Badge>
              <span className="chev">›</span>
            </a>
          ))}
        </div>
      )}
    </>
  );
}
function RecallAdmin() {
  const { t, lang } = useT();
  const A = t.adm;
  const [d, setD] = useState(null);
  useEffect(() => { (async () => {
    const [{ data: recalls }, { data: notices }] = await Promise.all([sb.from('bel_recalls').select('*').neq('status', 'draft').order('starts_at', { ascending: false }), sb.from('bel_recall_notices').select('*').order('created_at')]);
    const owners = [...new Set((notices || []).map((n) => n.owner_id))], sysIds = (notices || []).map((n) => n.system_id).filter(Boolean);
    const [{ data: people }, { data: systems }] = await Promise.all([owners.length ? sb.from('bel_profiles').select('id, full_name, first_name, last_name, email, mobile, city').in('id', owners) : { data: [] }, sysIds.length ? sb.from('bel_systems').select('id, product, model, serial').in('id', sysIds) : { data: [] }]);
    setD({ recalls: recalls || [], notices: notices || [], people: people || [], systems: systems || [] });
  })(); }, []);
  if (!d) return <p className="muted">{t.loading}</p>;
  const pick = (o) => (o && (o[lang] || o.nl)) || '';
  return (
    <>
      <PageHead title={t.menu.recall} lead={A.recallAdminLead} action={<a className="btn ghost sm" href="#/customers">{A.assignFrom}</a>} />
      {d.recalls.map((r) => {
        const list = d.notices.filter((n) => n.recall_id === r.id);
        const by = (...s) => list.filter((n) => s.includes(n.status)).length;
        return (
          <section key={r.id}>
            <article className="card stack">
              <div className="card-top"><h2 style={{ margin: 0 }}>{pick(r.title)}</h2><Badge tone={r.status === 'active' ? 'red' : 'green'}>{r.status === 'active' ? A.recallActive : A.recallClosed}</Badge></div>
              <dl className="kv"><dt>{A.code}</dt><dd className="mono">{r.code}</dd><dt>{A.recallStart}</dt><dd>{day(r.starts_at, lang)}</dd><dt>{t.recallDoc}</dt><dd>{r.document_path ? A.yes : A.noDoc}</dd></dl>
              <p style={{ margin: 0 }}>{pick(r.summary)}</p>
              <p style={{ margin: 0 }}><b>{t.recallInstructions}:</b> {pick(r.instructions)}</p>
            </article>
            <div className="tiles"><div className="tile"><b>{list.length}</b><span>{A.recallTotal}</span></div><div className="tile"><b>{by('sent')}</b><span>{A.recallWaiting}</span></div><div className="tile"><b>{by('opened')}</b><span>{A.recallOpened}</span></div><div className="tile"><b>{by('signed', 'appointment', 'replaced', 'closed')}</b><span>{A.recallSigned}</span></div></div>
            {!list.length ? <Empty>{A.recallNone} <a href="#/customers">{t.menu.customers} →</a></Empty> : <div className="table-wrap"><table className="tbl"><thead><tr><th>{A.name}</th><th>{t.menu.products}</th><th>{A.statusL}</th><th>{A.openedOn}</th><th>{A.signedOn}</th><th>{A.choiceL}</th><th>{A.datesL}</th></tr></thead><tbody>
              {list.map((n) => { const p = d.people.find((x) => x.id === n.owner_id) || {}, y = d.systems.find((x) => x.id === n.system_id); return (
                <tr key={n.id} className="click" onClick={() => go('customers/' + n.owner_id)}><td>{p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email}<small className="ref">{p.email}{p.mobile ? ' · ' + p.mobile : ''}</small></td><td data-l={t.menu.products}>{y ? `${y.product}${y.serial ? ' · ' + y.serial : ''}` : '—'}</td><td><Badge tone={TONE[n.status] || 'red'}>{t.rStatus[n.status]}</Badge></td><td data-l={A.openedOn}>{n.opened_at ? when(n.opened_at, lang) : '—'}</td><td data-l={A.signedOn}>{n.signed_at ? `${when(n.signed_at, lang)} · ${n.signed_name || ''}` : '—'}</td><td data-l={A.choiceL}>{n.choice ? t.choice[n.choice] : '—'}</td><td data-l={A.datesL}>{n.appointment_at ? when(n.appointment_at, lang) : Array.isArray(n.preferred_dates) && n.preferred_dates.length ? n.preferred_dates.join(', ') : '—'}</td></tr>
              ); })}
            </tbody></table></div>}
          </section>
        );
      })}
    </>
  );
}
function RecallNotice({ id, me, refresh }) {
  const { t, lang } = useT();
  const [n, setN] = useState(null), [err, setErr] = useState('');
  const [f, setF] = useState({ read: false, choice: '', name: '', dates: '', phone: me.mobile || '' });
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => fn('bel-portal', { action: 'recall_open', id }).then((r) => { setN(r.notice); refresh(); }).catch((e) => setErr(errText(t, e))), [id]);
  useEffect(() => { load(); }, [load]);
  async function sign(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await fn('bel-portal', { action: 'recall_sign', id, typed_name: f.name, choice: f.choice, read_confirmed: f.read, phone: f.phone, preferred_dates: f.dates ? f.dates.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean) : [] }); await load(); }
    catch (x) { setErr(x.message === 'name-mismatch' ? t.nameMismatch : errText(t, x)); }
    setBusy(false);
  }
  if (!n) return <>{err ? <Note kind="error">{err}</Note> : <p className="muted">{t.loading}</p>}</>;
  return (
    <>
      <a href="#/recall" className="back">‹ {t.back}</a>
      <PageHead title={n.title} lead={<><span className="mono">{n.code}</span> · <Badge tone={n.risk === 'low' ? 'amber' : 'red'}>{t.risk[n.risk]}</Badge></>} />
      {n.system && <p className="muted">{t.kind[n.system.kind]} · {n.system.product} {n.system.model || ''} · {t.serial} <span className="mono">{n.system.serial || '—'}</span></p>}
      {n.instructions && <div className="alertbox"><h3>{t.recallInstructions}</h3><p className="pre">{n.instructions}</p></div>}
      {n.summary && <p className="pre">{n.summary}</p>}
      {n.pdf && <div className="pdf-wrap"><iframe title={t.recallDoc} src={n.pdf} /><a className="btn ghost sm" href={n.pdf} target="_blank" rel="noopener">{t.recallDoc} ↗</a></div>}
      {n.signed_at ? (
        <div className="signed"><Badge tone="green">{t.rStatus[n.status]}</Badge> {fmt(t.signedOn, { date: when(n.signed_at, lang), name: n.signed_name })}{n.choice ? <> · {t.choice[n.choice]}</> : null}</div>
      ) : (
        <form className="card sign" onSubmit={sign}>
          <h3>{t.recallChoice}</h3>
          <div className="choices">{['replace', 'return', 'other'].map((c) => <label key={c} className={'choice' + (f.choice === c ? ' on' : '')}><input type="radio" name="choice" checked={f.choice === c} onChange={() => setF({ ...f, choice: c })} required /> {t.choice[c]}</label>)}</div>
          <div className="row2">
            <Field label={t.phone}><input type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
            <Field label={t.preferredDates}><input value={f.dates} onChange={(e) => setF({ ...f, dates: e.target.value })} placeholder="ma 9/11, wo 11/11" /></Field>
          </div>
          <label className="check"><input type="checkbox" checked={f.read} onChange={(e) => setF({ ...f, read: e.target.checked })} required /> <span>{t.readConfirm}</span></label>
          <Field label={fmt(t.typeName, { name: n.account_name })}><input className="sig-in" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="off" /></Field>
          <Note kind="error">{err}</Note>
          <Btn busy={busy} type="submit">{t.signRecall}</Btn>
        </form>
      )}
    </>
  );
}

// ---------- Orders and deliveries ----------
const ORDER_STEPS = ['confirmed', 'in_production', 'ready', 'delivered', 'installed'];
async function odooPdf(kind, id, name, t) {
  try {
    const { data: x } = await sb.auth.getSession();
    const res = await fetch(`${CFG.url}/functions/v1/bel-odoo`, { method: 'POST', headers: { 'content-type': 'application/json', apikey: CFG.key, authorization: 'Bearer ' + x?.session?.access_token }, body: JSON.stringify({ action: 'pdf', kind, id }) });
    if (!res.ok) throw new Error('pdf-unavailable');
    const url = URL.createObjectURL(await res.blob());
    const l = document.createElement('a'); l.href = url; l.download = String(name).replace(/[^\w.-]+/g, '_') + '.pdf'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch (e) { alert(errText(t, e)); }
}
function DocRow({ d }) {
  const { t, lang } = useT();
  return <li className="doc-row"><span className="grow">{d.kind === 'credit' ? t.creditNote : t.invoice} <span className="mono">{d.number}</span> · {day(d.issued_at, lang)}</span><b>{eur(d.total_incl, lang)}</b><Badge tone={TONE[d.status] || 'amber'}>{t.iStatus[d.status]}</Badge><button className="link" onClick={() => odooPdf('invoice', d.odoo_id, d.number, t)}>PDF</button></li>;
}
const CANCEL_STEPS = ['cancelled', 'credit', 'repay_pending', 'repaid'];
function Orders() {
  const { t, lang } = useT();
  const [orders, setOrders] = useState(null), [err, setErr] = useState('');
  useEffect(() => { fn('bel-odoo', { action: 'orders' }).then((r) => setOrders(r.orders)).catch((e) => { setErr(errText(t, e)); setOrders([]); }); }, []);
  if (!orders) return <p className="muted">{t.loading}</p>;
  return (
    <>
      <PageHead title={t.menu.orders} lead={t.ordersLead} />
      <Note kind="error">{err}</Note>
      {!orders.length ? (err ? null : <Empty>{t.ordersEmpty}</Empty>) : orders.map((o) => {
        const idx = ORDER_STEPS.indexOf(o.status === 'partly_delivered' ? 'ready' : o.status);
        const cancelled = o.status === 'cancelled';
        const cIdx = !o.repayment ? 0 : o.repayment === 'repaid' ? 3 : 2;
        const pending = (o.docs || []).filter((d) => d.kind === 'credit' && ['repay_pending', 'repay_partial'].includes(d.status)).reduce((x, d) => x + Number(d.residual), 0);
        return (
          <article key={o.id} className="card order">
            <div className="card-top"><h3>{o.status === 'quote' ? t.oStatus.quote : t.order} <span className="mono">{o.number}</span></h3><Badge tone={TONE[o.status] || 'blue'}>{t.oStatus[o.status]}</Badge></div>
            {cancelled ? <ol className="steps" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>{CANCEL_STEPS.map((k, i) => <li key={k} className={i <= cIdx ? 'done' : ''}><span />{k === 'cancelled' ? t.oStatus.cancelled : k === 'credit' ? t.creditIssued : t.iStatus[k]}</li>)}</ol>
              : o.status !== 'quote' && <ol className="steps">{ORDER_STEPS.map((k, i) => <li key={k} className={i <= idx ? 'done' : ''}><span />{t.oStatus[k]}</li>)}</ol>}
            {pending > 0 && <Note>{fmt(t.repayNote, { amount: eur(pending, lang) })}</Note>}
            <dl className="kv">
              <dt>{t.ordered}</dt><dd>{day(o.ordered_at, lang)}</dd>
              {!cancelled && <><dt>{t.expected}</dt><dd>{day(o.expected_delivery, lang)}</dd></>}
              {o.total_incl != null && <><dt>{t.total}</dt><dd>{eur(o.total_incl, lang)}</dd></>}
            </dl>
            {(o.bel_order_lines || []).length ? <ul className="lines">{o.bel_order_lines.map((l) => <li key={l.id}><span>{l.quantity} ×</span> {l.product}{l.description ? <small> — {l.description}</small> : null}</li>)}</ul> : null}
            {(o.bel_deliveries || []).length ? <><h4>{t.deliveries}</h4><ul className="lines">{o.bel_deliveries.map((d) => <li key={d.id}><Badge tone={TONE[d.status] || 'blue'}>{t.dStatus[d.status]}</Badge> {d.carrier || ''} {d.delivered_at ? day(d.delivered_at, lang) : d.planned_at ? day(d.planned_at, lang) : ''} {d.tracking_url ? <a href={d.tracking_url} target="_blank" rel="noopener">{t.track} ↗</a> : d.tracking_number || ''}</li>)}</ul></> : null}
            {(o.docs || []).length ? <><h4>{t.documents}</h4><ul className="doc-rows">{o.docs.map((d) => <DocRow key={d.id} d={d} />)}</ul></> : null}
            <button className="btn ghost sm" onClick={() => odooPdf('order', o.odoo_id, o.number, t)}>{o.status === 'quote' ? t.oStatus.quote : t.order} PDF</button>
          </article>
        );
      })}
    </>
  );
}

// ---------- Invoices and payments ----------
function Invoices() {
  const { t, lang } = useT();
  const [d, setD] = useState(null), [err, setErr] = useState('');
  useEffect(() => { fn('bel-odoo', { action: 'invoices' }).then((r) => setD({ inv: r.invoices, pay: r.payments })).catch((e) => { setErr(errText(t, e)); setD({ inv: [], pay: [] }); }); }, []);
  if (!d) return <p className="muted">{t.loading}</p>;
  const openSum = d.inv.filter((i) => i.kind === 'invoice' && ['open', 'partly_paid', 'overdue'].includes(i.status)).reduce((x, i) => x + Number(i.residual), 0);
  return (
    <>
      <PageHead title={t.menu.invoices} lead={t.invoicesLead} action={openSum > 0 ? <div className="kpi"><small>{t.toPay}</small><b>{eur(openSum, lang)}</b></div> : null} />
      <Note kind="error">{err}</Note>
      {!d.inv.length ? (err ? null : <Empty>{t.invoicesEmpty}</Empty>) : (
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>{t.invoice}</th><th>{t.issued}</th><th>{t.due}</th><th className="num">{t.amount}</th><th className="num">{t.paid}</th><th></th><th></th></tr></thead>
          <tbody>{d.inv.map((i) => (
            <tr key={i.id}>
              <td className="mono">{i.number}{i.kind === 'credit' ? <small className="ref">{t.creditNote}</small> : i.status !== 'paid' && i.structured_ref ? <small className="ref">{t.payRef}: {i.structured_ref}</small> : null}</td>
              <td data-l={t.issued}>{day(i.issued_at, lang)}</td><td data-l={t.due}>{day(i.due_at, lang)}</td>
              <td className="num" data-l={t.amount}>{eur(i.total_incl, lang)}</td><td className="num" data-l={t.paid}>{eur(i.amount_paid, lang)}</td>
              <td><Badge tone={TONE[i.status] || 'amber'}>{t.iStatus[i.status]}</Badge></td>
              <td><button className="link" onClick={() => odooPdf('invoice', i.odoo_id, i.number, t)}>PDF</button></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {d.pay.length ? <section className="block"><h2>{t.payments}</h2><div className="table-wrap"><table className="tbl"><tbody>{d.pay.map((p) => <tr key={p.id}><td>{day(p.paid_at, lang)}</td><td>{p.reference || ''}</td><td className="num">{eur(p.amount, lang)}</td></tr>)}</tbody></table></div></section> : null}
    </>
  );
}

// ---------- My services ----------
function Services() {
  const { t, lang } = useT();
  const [list, setList] = useState(null), [err, setErr] = useState('');
  useEffect(() => { fn('bel-services', { action: 'list' }).then((r) => setList(r.services)).catch((e) => { setErr(errText(t, e)); setList([]); }); }, []);
  if (!list) return <p className="muted">{t.loading}</p>;
  return (
    <>
      <PageHead title={t.menu.services} lead={t.svcLead} />
      <Note kind="error">{err}</Note>
      {list.map((x) => (
        <article key={x.service} className="card stack">
          <div className="card-top"><h3>Themis</h3><span className="acts"><Badge tone="green">{t.svcActive}</Badge>{x.promo && <Badge tone="blue">{t.svcPromo}</Badge>}</span></div>
          <p style={{ margin: 0 }}>{t.svcThemis}</p>
          <dl className="kv">
            <dt>{t.svcFee}</dt><dd>{x.promo ? t.svcFree : x.pending ? '—' : fmt(t.svcPrice, { excl: eur(x.price_excl, lang), incl: eur(Number(x.price_excl) * (1 + Number(x.vat_rate) / 100), lang) })}</dd>
            {x.started_at && <><dt>{t.svcStart}</dt><dd>{day(x.started_at, lang)}</dd></>}
            {!x.promo && !x.pending && <><dt>{t.svcTerm}</dt><dd>{fmt(t.svcTermText, { date: day(x.min_until, lang) })}</dd></>}
          </dl>
        </article>
      ))}
    </>
  );
}

// ---------- Messages ----------
function Thread({ msgs, mine }) {
  const { t, lang } = useT();
  return <div className="thread">{msgs.map((m) => { const isOut = m.direction === 'out'; return <div key={m.id} className={'msg' + (isOut === mine ? ' staff' : ' customer')}><div className="msg-h"><b>{isOut ? (mine ? (m.author_email || 'Belinus').split('@')[0] : 'Belinus') : (mine ? t.adm.customer : t.you)}</b><span>{when(m.created_at, lang)}{mine && isOut ? ' · ' + (m.mail_status === 'sent' ? t.adm.mailed : t.adm.mailFailed) : ''}</span></div><p className="pre">{m.body}</p></div>; })}</div>;
}
function Messages({ refresh }) {
  const { t } = useT();
  const [list, setList] = useState(null), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const load = useCallback(() => fn('bel-hub', { action: 'messages' }).then((r) => setList(r.messages)), []);
  useEffect(() => { load().then(() => fn('bel-hub', { action: 'messages_read' })).then(refresh).catch((e) => { setErr(errText(t, e)); setList((l) => l || []); }); }, [load]);
  async function send(e) { e.preventDefault(); setBusy(true); setErr(''); try { await fn('bel-hub', { action: 'message_reply', body: msg }); setMsg(''); await load(); } catch (x) { setErr(errText(t, x)); } setBusy(false); }
  if (!list) return <p className="muted">{t.loading}</p>;
  return (
    <>
      <PageHead title={t.menu.messages} lead={t.msgLead} />
      {!list.length ? <Empty>{t.msgEmpty}</Empty> : <Thread msgs={list} mine={false} />}
      <form className="card stack" onSubmit={send}><Field label={t.reply}><textarea required rows="4" value={msg} onChange={(e) => setMsg(e.target.value)} /></Field><Note kind="error">{err}</Note><Btn busy={busy} type="submit">{t.send}</Btn></form>
    </>
  );
}

// ---------- Recall notice for everyone ----------
function RecallBanner() {
  const { t, lang } = useT();
  const [list, setList] = useState([]);
  useEffect(() => { fn('bel-hub', { action: 'recall_info' }).then((r) => setList(r.recalls)).catch(() => {}); }, []);
  return list.map((r) => <div key={r.code} className="alertbox"><h3>{r.title[lang] || r.title.nl}</h3><p>{r.summary[lang] || r.summary.nl}</p><p style={{ margin: 0 }}>{r.instructions[lang] || r.instructions.nl} <a href="#/recall">{t.menu.recall} →</a></p></div>);
}

// ---------- Super admin ----------
function SuperOnly({ me, children }) { const { t } = useT(); return me.role === 'super' ? children : <Note kind="error">{t.errors.forbidden}</Note>; }
function Dashboard({ me }) {
  const { t, lang } = useT();
  const A = t.adm;
  const [d, setD] = useState(null), [o, setO] = useState(null), [err, setErr] = useState('');
  useEffect(() => { if (me.role !== 'super') return; fn('bel-hub', { action: 'dashboard' }).then(setD).catch((e) => setErr(errText(t, e))); fn('bel-odoo', { action: 'summary' }).then(setO).catch(() => setO(false)); }, []);
  if (me.role !== 'super') return <Note kind="error">{t.errors.forbidden}</Note>;
  if (!d) return err ? <Note kind="error">{err}</Note> : <p className="muted">{t.loading}</p>;
  const Tile = ({ v, l, to, bad }) => <a className="tile dash-tile" href={to}><b style={bad ? { color: 'var(--bad)' } : null}>{v}</b><span>{l}</span></a>;
  return (
    <>
      <PageHead title={t.menu.dashboard} lead={A.dashLead} />
      <h2>{A.secCustomers}</h2>
      <div className="tiles"><Tile v={d.customers.total} l={A.registered} to="#/customers" /><Tile v={d.customers.new7} l={A.new7} to="#/customers" /><Tile v={d.customers.active30} l={A.active30} to="#/customers" /><Tile v={d.customers.unread} l={A.unread} to="#/customers?f=unread" bad={d.customers.unread > 0} /></div>
      <h2>{A.secSupport}</h2>
      <div className="tiles"><Tile v={d.tickets.open} l={A.openTickets} to="#/desk" /><Tile v={d.tickets.safety} l={A.safety} to="#/desk?q=safety" bad={d.tickets.safety > 0} /><Tile v={d.tickets.overdue} l={A.overdue} to="#/desk" bad={d.tickets.overdue > 0} /><Tile v={d.tickets.unassigned} l={A.unassigned} to="#/desk?q=unassigned" /></div>
      <h2>{t.menu.recall}</h2>
      <div className="tiles"><Tile v={d.recall.total} l={A.recallTotal} to="#/customers?f=recall" /><Tile v={d.recall.waiting} l={A.recallWaiting} to="#/customers?f=recall" bad={d.recall.waiting > 0} /><Tile v={d.recall.opened} l={A.recallOpened} to="#/customers?f=recall" /><Tile v={d.recall.signed + d.recall.done} l={A.recallSigned} to="#/customers?f=recall" /></div>
      {o ? <><h2>Odoo · Belinus Energy BV</h2><div className="tiles"><Tile v={eur(o.open_amount, lang)} l={fmt(A.openInv, { n: o.open_invoices })} to="#/dashboard" /><Tile v={eur(o.repay_amount, lang)} l={fmt(A.repay, { n: o.repay_count })} to="#/dashboard" bad={o.repay_count > 0} /><Tile v={o.orders_to_deliver} l={A.toDeliver} to="#/dashboard" /></div></> : o === false ? <Note>{t.errors['odoo-unavailable']}</Note> : null}
      <h2>{A.latest}</h2>
      {!d.latest.length ? <Empty>{A.noCustomers}</Empty> : <div className="list">{d.latest.map((p) => <a key={p.id} className="row-link" href={'#/customers/' + p.id}><span className="grow">{p.name}<small>{p.email} · {day(p.created_at, lang)}</small></span>{p.recall && <Badge tone="red">{t.rStatus[p.recall]}</Badge>}<span className="chev">›</span></a>)}</div>}
    </>
  );
}
const CUST_F = ['all', 'recall', 'unread'];
function Customers({ route, me }) {
  if (me.role !== 'super') return <SuperOnly me={me} />;
  return route.parts[1] ? <CustomerDetail key={route.parts[1]} id={route.parts[1]} /> : <CustomerList route={route} />;
}
function CustomerList({ route }) {
  const { t, lang } = useT();
  const A = t.adm;
  const f = CUST_F.includes(route.q.get('f')) ? route.q.get('f') : 'all';
  const [list, setList] = useState(null), [find, setFind] = useState(''), [open, setOpen] = useState(false), [aud, setAud] = useState('all'), [body, setBody] = useState(''), [busy, setBusy] = useState(false), [note, setNote] = useState(''), [err, setErr] = useState('');
  useEffect(() => { fn('bel-hub', { action: 'customers' }).then((r) => setList(r.customers)).catch((e) => { setErr(errText(t, e)); setList([]); }); }, []);
  async function broadcast(e) { e.preventDefault(); setBusy(true); setErr(''); setNote(''); try { const r = await fn('bel-hub', { action: 'broadcast', audience: aud, body }); setNote(fmt(A.sentCount, { sent: r.sent, failed: r.failed })); setBody(''); } catch (x) { setErr(errText(t, x)); } setBusy(false); }
  if (!list) return <p className="muted">{t.loading}</p>;
  const n = find.trim().toLowerCase();
  const rows = list.filter((p) => (f === 'all' || (f === 'recall' ? p.recall : p.unread > 0)) && (!n || `${p.name} ${p.email} ${p.company_name || ''} ${p.city || ''}`.toLowerCase().includes(n)));
  return (
    <>
      <PageHead title={t.menu.customers} lead={fmt(A.custLead, { n: list.length })} action={<button className="btn ghost" onClick={() => setOpen(!open)}>{A.toAll}</button>} />
      {open && <form className="card stack" onSubmit={broadcast}><Field label={A.audience}><select value={aud} onChange={(e) => setAud(e.target.value)}><option value="all">{A.audAll}</option><option value="recall">{A.audRecall}</option></select></Field><Field label={A.message} hint={A.mailHint}><textarea required rows="5" value={body} onChange={(e) => setBody(e.target.value)} /></Field><Btn busy={busy} type="submit">{t.send}</Btn></form>}
      <Note kind="error">{err}</Note><Note kind="ok">{note}</Note>
      <div className="seg desk-seg" role="tablist">{CUST_F.map((k) => <a key={k} role="tab" aria-selected={k === f} className={'seg-b' + (k === f ? ' on' : '')} href={'#/customers?f=' + k}>{A.filter[k]}</a>)}</div>
      <div className="desk-find"><input type="search" aria-label={A.search} placeholder={A.search} value={find} onChange={(e) => setFind(e.target.value)} /></div>
      {!rows.length ? <Empty>{A.noCustomers}</Empty> : <div className="table-wrap"><table className="tbl"><thead><tr><th>{A.name}</th><th>{A.city}</th><th>{A.lastLogin}</th><th className="num">{t.menu.products}</th><th className="num">{A.openTickets}</th><th>{t.menu.recall}</th></tr></thead>
        <tbody>{rows.map((p) => <tr key={p.id} className="click" onClick={() => go('customers/' + p.id)}><td>{p.name}{p.unread ? <> <Badge tone="blue">{p.unread}</Badge></> : null}<small className="ref">{p.email}{p.company_name ? ' · ' + p.company_name : ''}</small></td><td data-l={A.city}>{p.city || '—'}</td><td data-l={A.lastLogin}>{p.last_login_at ? when(p.last_login_at, lang) : '—'}</td><td className="num" data-l={t.menu.products}>{p.systems}</td><td className="num" data-l={A.openTickets}>{p.open_tickets}</td><td>{p.recall ? <Badge tone={TONE[p.recall] || 'red'}>{t.rStatus[p.recall]}</Badge> : <span className="muted">{A.noRecall}</span>}</td></tr>)}</tbody></table></div>}
    </>
  );
}
function CustomerDetail({ id }) {
  const { t, lang } = useT();
  const A = t.adm;
  const [d, setD] = useState(null), [msg, setMsg] = useState(''), [busy, setBusy] = useState(''), [err, setErr] = useState(''), [note, setNote] = useState('');
  const load = useCallback(() => fn('bel-hub', { action: 'customer', id }).then(setD).catch((e) => setErr(errText(t, e))), [id]);
  useEffect(() => { load(); }, [load]);
  async function act(key, body, done) { setBusy(key); setErr(''); setNote(''); try { await fn('bel-hub', { id, ...body }); await load(); if (done) done(); } catch (x) { setErr(errText(t, x)); } setBusy(''); }
  if (!d) return err ? <Note kind="error">{err}</Note> : <p className="muted">{t.loading}</p>;
  const c = d.customer;
  return (
    <>
      <a href="#/customers" className="back">‹ {t.back}</a>
      <PageHead title={c.name} lead={c.email} />
      <Note kind="error">{err}</Note><Note kind="ok">{note}</Note>
      <div className="desk-grid">
        <div>
          <div className="card stack"><h2 style={{ margin: 0 }}>{t.menu.messages}</h2>{d.messages.length ? <Thread msgs={d.messages} mine={true} /> : <p className="muted" style={{ margin: 0 }}>{A.noMessages}</p>}
            <Field label={A.message} hint={A.mailHint}><textarea rows="4" value={msg} onChange={(e) => setMsg(e.target.value)} /></Field>
            <Btn busy={busy === 'msg'} disabled={!msg.trim() || !!busy} onClick={() => act('msg', { action: 'message_send', body: msg }, () => setMsg(''))}>{t.send}</Btn></div>
          <div className="card stack"><h2 style={{ margin: 0 }}>{t.menu.support}</h2>{d.tickets.length ? <div className="list">{d.tickets.map((x) => <a key={x.id} className={'row-link' + (x.safety && x.status !== 'closed' ? ' urgent' : '')} href={'#/desk/' + x.id}><span className="mono">#{x.number}</span><span className="grow">{x.subject}<small>{when(x.last_message_at, lang)}</small></span><Badge tone={STATUS_TONE[x.status]}>{t.desk.status[x.status]}</Badge></a>)}</div> : <p className="muted" style={{ margin: 0 }}>{A.noTickets}</p>}</div>
        </div>
        <aside className="desk-side">
          <div className="card stack"><h3>{t.desk.customer}</h3><dl className="kv"><dt>{t.desk.phone}</dt><dd>{c.mobile ? <a href={'tel:' + c.mobile}>{c.mobile}</a> : '—'}</dd><dt>{t.desk.city}</dt><dd>{c.city || '—'}</dd><dt>{t.desk.language}</dt><dd>{String(c.lang).toUpperCase()}</dd><dt>{A.registeredOn}</dt><dd>{day(c.created_at, lang)}</dd><dt>{A.lastLogin}</dt><dd>{c.last_login_at ? when(c.last_login_at, lang) : '—'}</dd></dl></div>
          <div className="card stack"><h3>{t.menu.recall}</h3>
            {d.notices.map((n) => <div key={n.id} className="desk-assign"><span>{n.bel_recalls?.code}</span><span className="acts"><Badge tone={TONE[n.status] || 'red'}>{t.rStatus[n.status]}</Badge>{['sent', 'opened'].includes(n.status) ? <button className="link" onClick={() => { if (confirm(A.removeAsk)) act('rm', { action: 'recall_remove', notice_id: n.id }); }}>{A.remove}</button> : null}</span></div>)}
            {!d.notices.length && <><p className="muted" style={{ margin: 0 }}>{A.noRecall}</p>{d.recalls.length ? <Btn kind="ghost" busy={busy === 'rec'} disabled={!!busy} onClick={() => { if (confirm(A.assignAsk)) act('rec', { action: 'recall_assign' }, () => setNote(A.assigned)); }}>{A.assign}</Btn> : null}</>}
          </div>
          <div className="card stack"><h3>{t.menu.products}</h3>{d.systems.length ? <ul className="lines">{d.systems.map((y) => <li key={y.id}>{y.product}{y.serial ? <small> — {y.serial}</small> : null}</li>)}</ul> : <p className="muted" style={{ margin: 0 }}>{t.none}</p>}</div>
        </aside>
      </div>
    </>
  );
}

// ---------- Support ----------
function Support({ route, me }) {
  const id = route.parts[1];
  if (id === 'new') return <NewRequest route={route} />;
  if (id) return <Ticket id={id} />;
  return <TicketList />;
}
function TicketList() {
  const { t, lang } = useT();
  const [list, setList] = useState(null);
  useEffect(() => { fn('bel-support', { action: 'list' }).then((r) => setList(r.tickets)).catch(() => setList([])); }, []);
  return (
    <>
      <RecallBanner /><PageHead title={t.menu.support} lead={t.supportLead} action={<div className="acts"><a className="btn danger" href="#/support/new?safety=1">{t.safetyReport}</a><a className="btn" href="#/support/new">{t.newRequest}</a></div>} />
      {!list ? <p className="muted">{t.loading}</p> : !list.length ? <Empty>{t.none}</Empty> : (
        <div className="list">{list.map((x) => (
          <a key={x.id} href={'#/support/' + x.id} className={'row-link' + (x.safety && x.status !== 'closed' ? ' urgent' : '')}>
            <span className="mono">#{x.number}</span><span className="grow">{x.subject}<small>{t.cat[x.category]} · {when(x.last_message_at, lang)}</small></span>
            <Badge tone={TONE[x.status]}>{t.tStatus[x.status]}</Badge><span className="chev">›</span>
          </a>
        ))}</div>
      )}
    </>
  );
}
async function uploadFiles(files) {
  const out = [];
  for (const file of Array.from(files || []).slice(0, 5)) {
    const u = await fn('bel-support', { action: 'upload_url', name: file.name, size: file.size, type: file.type });
    const { error } = await sb.storage.from(u.bucket).uploadToSignedUrl(u.path, u.token, file, { contentType: file.type });
    if (error) throw new Error('generic');
    out.push({ path: u.path, name: file.name, size: file.size, type: file.type });
  }
  return out;
}
function NewRequest({ route }) {
  const { t } = useT();
  const safety = route.q.get('safety') === '1';
  const [systems, setSystems] = useState([]);
  const [f, setF] = useState({ subject: '', category: route.q.get('cat') || (safety ? 'battery' : 'other'), system_id: route.q.get('system') || '', body: '' });
  const [files, setFiles] = useState(null), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  useEffect(() => { sb.from('bel_systems').select('id, kind, product, model, serial').then(({ data }) => setSystems(data || [])); }, []);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const attachments = await uploadFiles(files);
      const r = await fn('bel-support', { action: 'create', ...f, system_id: f.system_id || null, safety, attachments, context: { page: location.hash, screen: innerWidth + 'x' + innerHeight } });
      go('support/' + r.id);
    } catch (x) { setErr(errText(t, x)); }
    setBusy(false);
  }
  return (
    <>
      <a href="#/support" className="back">‹ {t.back}</a>
      <PageHead title={safety ? t.safetyReport : t.newRequest} />
      {safety && <div className="alertbox">{t.safetyHint}</div>}
      <form className="card stack" onSubmit={submit}>
        <div className="row2">
          <Field label={t.category}><select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{Object.keys(t.cat).map((k) => <option key={k} value={k}>{t.cat[k]}</option>)}</select></Field>
          <Field label={t.aboutSystem}><select value={f.system_id} onChange={(e) => setF({ ...f, system_id: e.target.value })}><option value="">{t.noSystem}</option>{systems.map((y) => <option key={y.id} value={y.id}>{t.kind[y.kind]} · {y.product}{y.serial ? ' · ' + y.serial : ''}</option>)}</select></Field>
        </div>
        <Field label={t.subject}><input required maxLength="160" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field>
        <Field label={t.message}><textarea required rows="7" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
        <Field label={t.attach}><input type="file" multiple accept="image/png,image/jpeg,application/pdf,text/plain,video/mp4" onChange={(e) => setFiles(e.target.files)} /></Field>
        <Note kind="error">{err}</Note>
        <Btn kind={safety ? 'danger' : 'primary'} busy={busy} type="submit">{t.send}</Btn>
      </form>
    </>
  );
}
function Ticket({ id }) {
  const { t, lang } = useT();
  const [d, setD] = useState(null), [msg, setMsg] = useState(''), [files, setFiles] = useState(null), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const fileRef = useRef();
  const load = useCallback(() => fn('bel-support', { action: 'get', id }).then(setD).catch((e) => setErr(errText(t, e))), [id]);
  useEffect(() => { load(); }, [load]);
  async function reply(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { const attachments = await uploadFiles(files); await fn('bel-support', { action: 'reply', id, body: msg, attachments }); setMsg(''); setFiles(null); if (fileRef.current) fileRef.current.value = ''; await load(); }
    catch (x) { setErr(errText(t, x)); }
    setBusy(false);
  }
  if (!d) return err ? <Note kind="error">{err}</Note> : <p className="muted">{t.loading}</p>;
  const k = d.ticket;
  return (
    <>
      <a href="#/support" className="back">‹ {t.back}</a>
      <PageHead title={k.subject} lead={<><span className="mono">#{k.number}</span> · {t.cat[k.category]}{k.system ? ` · ${k.system.product}${k.system.serial ? ' ' + k.system.serial : ''}` : ''} · <Badge tone={TONE[k.status]}>{t.tStatus[k.status]}</Badge></>}
        action={k.status === 'closed' ? <button className="btn ghost" onClick={() => fn('bel-support', { action: 'reopen', id }).then(load)}>{t.reopen}</button> : <button className="btn ghost" onClick={() => fn('bel-support', { action: 'close', id }).then(load)}>{t.close}</button>} />
      <div className="thread">{d.messages.map((m) => (
        <div key={m.id} className={'msg' + (m.staff ? ' staff' : ' mine')}>
          <div className="msg-h"><b>{m.author}</b><span>{when(m.created_at, lang)}</span></div>
          <p className="pre">{m.body}</p>
          {(m.attachments || []).length ? <ul className="atts">{m.attachments.map((a, i) => <li key={i}><a href={a.url} target="_blank" rel="noopener">📎 {a.name}</a></li>)}</ul> : null}
        </div>
      ))}</div>
      <form className="card stack" onSubmit={reply}>
        <Field label={t.reply}><textarea required rows="4" value={msg} onChange={(e) => setMsg(e.target.value)} /></Field>
        <input ref={fileRef} type="file" multiple accept="image/png,image/jpeg,application/pdf,text/plain,video/mp4" onChange={(e) => setFiles(e.target.files)} />
        <Note kind="error">{err}</Note>
        <Btn busy={busy} type="submit">{t.send}</Btn>
      </form>
    </>
  );
}

// ---------- Support desk (Belinus staff) ----------
const isStaffUser = (me) => !!me && (me.role === 'staff' || me.role === 'super');
const QUEUES = ['open', 'safety', 'unassigned', 'mine', 'answered', 'closed', 'all'];
const PRIO_TONE = { low: 'grey', normal: 'grey', high: 'amber', urgent: 'red' };
const DESK_STATUS = ['open', 'on_hold', 'answered', 'closed'];
const DESK_PRIO = ['low', 'normal', 'high', 'urgent'];
const STATUS_TONE = { open: 'amber', on_hold: 'grey', answered: 'blue', closed: 'green' };
const isLate = (due) => !!due && new Date(due).getTime() < Date.now();

function Desk({ route, me }) {
  const { t } = useT();
  if (!isStaffUser(me)) return <Note kind="error">{t.errors.forbidden || t.errors.generic}</Note>;
  return route.parts[1] ? <DeskTicket key={route.parts[1]} id={route.parts[1]} route={route} /> : <DeskList route={route} />;
}
function DeskList({ route }) {
  const { t, lang } = useT();
  const d = t.desk;
  const queue = QUEUES.includes(route.q.get('q')) ? route.q.get('q') : 'open';
  const [list, setList] = useState(null), [err, setErr] = useState(''), [find, setFind] = useState('');
  const load = useCallback(() => fn('bel-support', { action: 'admin_list', queue }).then((r) => { setList(r.tickets); setErr(''); }).catch((e) => { setErr(errText(t, e)); setList((l) => l || []); }), [queue]);
  useEffect(() => { setList(null); load(); const iv = setInterval(load, 60000); return () => clearInterval(iv); }, [load]);
  const needle = find.trim().toLowerCase();
  const rows = (list || []).filter((x) => !needle || (`#${x.number} ${x.subject} ${x.customer} ${x.assignee}`).toLowerCase().includes(needle))
    .sort((a, b) => Number(b.safety && b.status !== 'closed') - Number(a.safety && a.status !== 'closed'));
  return (
    <>
      <PageHead title={d.title} lead={d.lead} />
      <div className="seg desk-seg" role="tablist">{QUEUES.map((q) => <a key={q} role="tab" aria-selected={q === queue} className={'seg-b' + (q === queue ? ' on' : '')} href={'#/desk?q=' + q}>{d.queue[q]}</a>)}</div>
      <div className="desk-find"><input type="search" aria-label={d.search} placeholder={d.search} value={find} onChange={(e) => setFind(e.target.value)} /></div>
      <Note kind="error">{err}</Note>
      {!list ? <p className="muted">{t.loading}</p> : !rows.length ? <Empty>{d.empty}</Empty> : (
        <div className="list">{rows.map((x) => {
          const late = x.status !== 'closed' && (isLate(x.response_due) || !!x.response_breached_at);
          return (
            <a key={x.id} href={'#/desk/' + x.id} className={'row-link desk-row' + (x.safety && x.status !== 'closed' ? ' urgent' : '')}>
              <span className="mono">#{x.number}</span>
              <span className="grow">{x.subject}<small>{x.customer || '—'} · {t.cat[x.category]} · {when(x.last_message_at, lang)}{x.assignee ? ' · ' + x.assignee : ' · ' + d.nobody}</small></span>
              <span className="desk-badges">
                {x.safety && <Badge tone="red">{d.safety}</Badge>}
                {late && <Badge tone="red">{d.late}</Badge>}
                {x.priority !== 'normal' && <Badge tone={PRIO_TONE[x.priority]}>{d.prio[x.priority]}</Badge>}
                <Badge tone={STATUS_TONE[x.status]}>{d.status[x.status]}</Badge>
              </span>
              <span className="chev">›</span>
            </a>
          );
        })}</div>
      )}
    </>
  );
}
function DeskTicket({ id }) {
  const { t, lang } = useT();
  const d = t.desk;
  const [x, setX] = useState(null), [msg, setMsg] = useState(''), [files, setFiles] = useState(null), [busy, setBusy] = useState(''), [err, setErr] = useState(''), [info, setInfo] = useState('');
  const fileRef = useRef();
  const load = useCallback(() => fn('bel-support', { action: 'get', id }).then((r) => { setX(r); setErr(''); }).catch((e) => setErr(errText(t, e))), [id]);
  useEffect(() => { load(); }, [load]);
  async function act(body) { setErr(''); setInfo(''); try { await fn('bel-support', { id, ...body }); await load(); setInfo(d.saved); } catch (e) { setErr(errText(t, e)); } }
  async function send(mode) {
    if (!msg.trim()) { setErr(d.writeFirst); return; }
    setBusy(mode); setErr(''); setInfo('');
    try {
      const attachments = await uploadFiles(files);
      await fn('bel-support', { action: 'reply', id, body: msg, attachments, internal: mode === 'note', close: mode === 'close' });
      setMsg(''); setFiles(null); if (fileRef.current) fileRef.current.value = '';
      await load();
      setInfo(mode === 'note' ? d.noteSaved : d.sent);
    } catch (e) { setErr(errText(t, e)); }
    setBusy('');
  }
  if (!x) return err ? <Note kind="error">{err}</Note> : <p className="muted">{t.loading}</p>;
  const k = x.ticket, c = x.customer || {}, sla = k.sla || {};
  const sel = (name, value, opts, label) => <Field label={label}><select value={value} onChange={(e) => act({ action: 'set', [name]: name === 'level' ? Number(e.target.value) : e.target.value })}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>;
  return (
    <>
      <a href="#/desk" className="back">‹ {t.back}</a>
      <PageHead title={k.subject} lead={<><span className="mono">#{k.number}</span> · {t.cat[k.category]} · <Badge tone={STATUS_TONE[k.status]}>{d.status[k.status]}</Badge>{k.safety ? <> <Badge tone="red">{d.safety}</Badge></> : null}</>} />
      {k.safety && k.status !== 'closed' && <div className="alertbox">{d.safetyNote}</div>}
      <div className="desk-grid">
        <div>
          <div className="thread">{x.messages.map((m) => (
            <div key={m.id} className={'msg' + (m.internal ? ' internal' : m.staff ? ' staff' : ' customer')}>
              <div className="msg-h"><b>{m.author || '—'}{m.internal ? ' · ' + d.internal : ''}</b><span>{when(m.created_at, lang)}</span></div>
              <p className="pre">{m.body}</p>
              {(m.attachments || []).length ? <ul className="atts">{m.attachments.map((a, i) => <li key={i}><a href={a.url} target="_blank" rel="noopener">📎 {a.name}</a></li>)}</ul> : null}
            </div>
          ))}</div>
          <div className="card stack">
            <Field label={d.answer} hint={c.lang ? fmt(d.writeIn, { lang: String(c.lang).toUpperCase() }) : null}><textarea rows="6" value={msg} onChange={(e) => setMsg(e.target.value)} /></Field>
            <input ref={fileRef} type="file" multiple aria-label={t.attach} accept="image/png,image/jpeg,application/pdf,text/plain,video/mp4" onChange={(e) => setFiles(e.target.files)} />
            <Note kind="error">{err}</Note><Note kind="ok">{info}</Note>
            <div className="acts">
              <Btn busy={busy === 'send'} disabled={!!busy} onClick={() => send('send')}>{d.send}</Btn>
              <Btn kind="ghost" busy={busy === 'close'} disabled={!!busy} onClick={() => send('close')}>{d.sendClose}</Btn>
              <Btn kind="ghost" busy={busy === 'note'} disabled={!!busy} onClick={() => send('note')}>{d.saveNote}</Btn>
            </div>
          </div>
        </div>
        <aside className="desk-side">
          <div className="card stack">
            <h3>{d.customer}</h3>
            <dl className="kv">
              <dt>{d.name}</dt><dd>{c.full_name || '—'}</dd>
              <dt>{t.email}</dt><dd>{c.email ? <a href={'mailto:' + c.email}>{c.email}</a> : '—'}</dd>
              <dt>{d.phone}</dt><dd>{c.mobile ? <a href={'tel:' + c.mobile}>{c.mobile}</a> : '—'}</dd>
              <dt>{d.city}</dt><dd>{c.city || '—'}</dd>
              <dt>{d.language}</dt><dd>{c.lang ? String(c.lang).toUpperCase() : '—'}</dd>
              {k.system ? <><dt>{d.system}</dt><dd>{k.system.product}{k.system.serial ? ' · ' + k.system.serial : ''}</dd></> : null}
            </dl>
          </div>
          <div className="card stack">
            <h3>{d.handling}</h3>
            <div className="desk-assign"><span>{k.assignee || d.nobody}</span><span className="acts">
              <button className="link" onClick={() => act({ action: 'assign', to: 'me' })}>{d.takeIt}</button>
              {k.assigned_to ? <button className="link" onClick={() => act({ action: 'assign', to: null })}>{d.release}</button> : null}
            </span></div>
            {sel('status', k.status, DESK_STATUS.map((v) => [v, d.status[v]]), d.statusL)}
            {sel('priority', k.priority, DESK_PRIO.map((v) => [v, d.prio[v]]), d.priorityL)}
            {sel('category', k.category, Object.keys(t.cat).map((v) => [v, t.cat[v]]), t.category)}
            {sel('level', k.level, [1, 2, 3].map((v) => [v, d.level + ' ' + v]), d.levelL)}
            <dl className="kv">
              <dt>{d.respDue}</dt><dd className={!sla.first_response_at && isLate(sla.response_due) ? 'late' : ''}>{sla.first_response_at ? d.answered : when(sla.response_due, lang)}</dd>
              <dt>{d.resoDue}</dt><dd className={k.status !== 'closed' && isLate(sla.resolution_due) ? 'late' : ''}>{when(sla.resolution_due, lang)}</dd>
            </dl>
          </div>
          <div className="card stack">
            <h3>{d.history}</h3>
            <ul className="desk-hist">{(x.history || []).map((h, i) => <li key={i}><span>{d.ev[h.kind] || h.kind}</span><small>{when(h.created_at, lang)}</small></li>)}</ul>
          </div>
        </aside>
      </div>
    </>
  );
}

// ---------- Assistant ----------
function Assistant() {
  const { t, lang } = useT();
  const [chats, setChats] = useState([]), [cur, setCur] = useState(null), [msgs, setMsgs] = useState([]);
  const [q, setQ] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [info, setInfo] = useState('');
  const end = useRef();
  const loadList = () => fn('bel-assistant', { action: 'list' }).then((r) => setChats(r.chats)).catch(() => {});
  useEffect(() => { loadList(); }, []);
  useEffect(() => { end.current && end.current.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs, busy]);
  async function open(id) { setErr(''); setInfo(''); const r = await fn('bel-assistant', { action: 'get', id }); setCur(id); setMsgs(r.chat.messages); }
  async function send(e) {
    e.preventDefault(); const text = q.trim(); if (!text) return;
    setBusy(true); setErr(''); setInfo(''); setMsgs((m) => [...m, { role: 'user', content: text }]); setQ('');
    try { const r = await fn('bel-assistant', { action: 'send', id: cur, message: text }); setCur(r.id); setMsgs((m) => [...m, { role: 'assistant', content: r.answer }]); if (!cur) loadList(); }
    catch (x) { setErr(errText(t, x)); }
    setBusy(false);
  }
  async function toSupport() { try { const r = await fn('bel-assistant', { action: 'to_support', id: cur }); setInfo(fmt(t.sentToSupport, { n: r.number || '' })); } catch (x) { setErr(errText(t, x)); } }
  const starters = lang === 'fr' ? ['Comment fonctionne la garantie de 35 ans sur Gaia ?', 'Pourquoi le sodium-ion est-il plus sûr que le lithium ?', 'Que dois-je faire si ma batterie affiche une alarme ?']
    : lang === 'en' ? ['How does the 35-year Gaia warranty work?', 'Why is sodium-ion safer than lithium?', 'What should I do if my battery shows an alarm?']
    : ['Hoe werkt de garantie van 35 jaar op Gaia?', 'Waarom is natrium-ion veiliger dan lithium?', 'Wat doe ik als mijn batterij een alarm geeft?'];
  return (
    <>
      <PageHead title={t.menu.assistant} lead={t.assistantLead} action={<button className="btn ghost" onClick={() => { setCur(null); setMsgs([]); setInfo(''); }}>{t.newChat}</button>} />
      <div className="chat-wrap">
        {chats.length ? <aside className="chat-list">{chats.map((c) => <button key={c.id} className={c.id === cur ? 'on' : ''} onClick={() => open(c.id)}>{c.title}<small>{when(c.updated_at, lang)}</small></button>)}</aside> : null}
        <section className="chat">
          <div className="chat-msgs">
            {!msgs.length && <div className="starters">{starters.map((s) => <button key={s} onClick={() => setQ(s)}>{s}</button>)}</div>}
            {msgs.map((m, i) => <div key={i} className={'bubble ' + m.role}><p className="pre">{m.content}</p></div>)}
            {busy && <div className="bubble assistant typing"><span /><span /><span /></div>}
            <div ref={end} />
          </div>
          <Note kind="error">{err}</Note><Note kind="ok">{info}</Note>
          <form className="chat-in" onSubmit={send}>
            <textarea rows="2" placeholder={t.ask} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) send(e); }} maxLength="4000" />
            <Btn busy={busy} type="submit">{t.send}</Btn>
          </form>
          <p className="fine">{t.assistantNote} {cur && <button className="link" onClick={toSupport}>{t.toSupport}</button>}</p>
        </section>
      </div>
    </>
  );
}

// ---------- Account ----------
function Account({ me, reloadMe }) {
  const { t, lang, setLang } = useT();
  const [p, setP] = useState({ salutation: me.salutation || '', first_name: me.first_name || '', last_name: me.last_name || '', mobile: me.mobile || '', street: me.street || '', postal_code: me.postal_code || '', city: me.city || '', country: me.country || 'BE', lang: me.lang || lang });
  const [msg, setMsg] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault(); setBusy(true); setErr(''); setMsg('');
    const full_name = [p.first_name, p.last_name].filter(Boolean).join(' ');
    const { error } = await sb.from('bel_profiles').update({ ...p, salutation: p.salutation || null, full_name, updated_at: new Date().toISOString() }).eq('id', me.id);
    setBusy(false);
    if (error) setErr(t.errors.generic); else { setMsg(t.saved); setLang(p.lang); reloadMe(); }
  }
  const set = (k) => (e) => setP({ ...p, [k]: e.target.value });
  return (
    <>
      <PageHead title={t.menu.account} lead={t.accountLead} />
      <form className="card stack" onSubmit={save}>
        <h2>{t.profile}</h2>
        <p className="muted">{me.email}</p>
        <div className="row3">
          <Field label={t.salutation}><select value={p.salutation} onChange={set('salutation')}><option value="">—</option><option value="mr">{t.mr}</option><option value="mrs">{t.mrs}</option></select></Field>
          <Field label={t.firstName}><input value={p.first_name} onChange={set('first_name')} required /></Field>
          <Field label={t.lastName}><input value={p.last_name} onChange={set('last_name')} required /></Field>
        </div>
        <div className="row3">
          <Field label={t.mobile}><input type="tel" value={p.mobile} onChange={set('mobile')} /></Field>
          <Field label={t.language}><select value={p.lang} onChange={set('lang')}><option value="nl">Nederlands</option><option value="fr">Français</option><option value="en">English</option></select></Field>
          <Field label={t.country}><select value={p.country} onChange={set('country')}><option value="BE">België / Belgique</option><option value="NL">Nederland</option><option value="LU">Luxembourg</option></select></Field>
        </div>
        <div className="row3">
          <Field label={t.street}><input value={p.street} onChange={set('street')} /></Field>
          <Field label={t.postal}><input value={p.postal_code} onChange={set('postal_code')} /></Field>
          <Field label={t.city}><input value={p.city} onChange={set('city')} /></Field>
        </div>
        <Note kind="error">{err}</Note><Note kind="ok">{msg}</Note>
        <Btn busy={busy} type="submit">{t.save}</Btn>
      </form>
      <Security me={me} />
    </>
  );
}
function Security({ me }) {
  const { t } = useT();
  const [factor, setFactor] = useState(undefined), [enroll, setEnroll] = useState(null), [code, setCode] = useState('');
  const [pw, setPw] = useState({ cur: '', n1: '', n2: '', code: '' }), [busy, setBusy] = useState(''), [err, setErr] = useState(''), [msg, setMsg] = useState('');
  const loadF = () => sb.auth.mfa.listFactors().then(({ data }) => setFactor((data?.totp || []).find((f) => f.status === 'verified') || null));
  useEffect(() => { loadF(); }, []);
  async function startEnroll() {
    setErr(''); setBusy('totp');
    const { data: all } = await sb.auth.mfa.listFactors();
    for (const f of (all?.all || []).filter((f) => f.status !== 'verified')) await sb.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Belinus ' + new Date().toISOString().slice(0, 10) });
    setBusy(''); if (error) { setErr(t.errors.generic); return; }
    setEnroll(data);
  }
  async function confirmEnroll(e) {
    e.preventDefault(); setBusy('totp'); setErr('');
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: enroll.id, code: code.trim() });
    setBusy(''); if (error) { setErr(t.errors['wrong-code']); return; }
    await sb.auth.refreshSession(); setEnroll(null); setCode(''); loadF();
  }
  async function removeTotp() { if (!factor) return; setBusy('totp'); const { error } = await sb.auth.mfa.unenroll({ factorId: factor.id }); setBusy(''); if (error) setErr(t.errors.generic); else loadF(); }
  async function sendCode() { setErr(''); try { await fn('bel-mfa', { action: 'send', purpose: 'password' }); setMsg(fmt(t.codeSent, { email: me.email })); } catch (x) { setErr(errText(t, x)); } }
  async function changePw(e) {
    e.preventDefault(); setErr(''); setMsg('');
    if (pw.n1 !== pw.n2) { setErr(t.errors.mismatch); return; }
    setBusy('pw');
    try { const r = await fn('bel-mfa', { action: 'change_password', password: pw.n1, current_password: pw.cur, code: pw.code || undefined }); if (r.session) await sb.auth.setSession(r.session); setMsg(t.passwordChanged); setPw({ cur: '', n1: '', n2: '', code: '' }); }
    catch (x) { setErr(errText(t, x)); }
    setBusy('');
  }
  return (
    <section className="card stack">
      <h2>{t.security}</h2>
      <div className="sec-row">
        <p>{factor ? t.totpOn : t.totpOff}</p>
        {factor === undefined ? null : factor ? <button className="btn ghost sm" onClick={removeTotp} disabled={busy === 'totp'}>{t.totpRemove}</button> : !enroll && <Btn busy={busy === 'totp'} onClick={startEnroll}>{t.totpActivate}</Btn>}
      </div>
      {enroll && (
        <form className="enroll" onSubmit={confirmEnroll}>
          <img src={enroll.totp.qr_code} alt="QR" width="180" height="180" />
          <div className="stack"><p>{t.totpScan}</p><p className="mono small">{enroll.totp.secret}</p>
            <Field label={t.code}><input className="code-in" inputMode="numeric" maxLength="6" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} required /></Field>
            <div className="acts"><Btn busy={busy === 'totp'} type="submit">{t.verify}</Btn><button type="button" className="btn ghost" onClick={() => setEnroll(null)}>{t.cancel}</button></div></div>
        </form>
      )}
      <form className="stack" onSubmit={changePw}>
        <h3>{t.changePassword}</h3>
        <div className="row3">
          <Field label={t.currentPassword}><PwInput autoComplete="current-password" value={pw.cur} onChange={(e) => setPw({ ...pw, cur: e.target.value })} required /></Field>
          <label className="field"><span className="field-l">{t.newPassword}</span><PwInput autoComplete="new-password" value={pw.n1} onChange={(e) => setPw({ ...pw, n1: e.target.value })} required /><PwRules pw={pw.n1} /></label>
          <Field label={t.repeatPassword}><PwInput autoComplete="new-password" value={pw.n2} onChange={(e) => setPw({ ...pw, n2: e.target.value })} required /></Field>
        </div>
        {!factor && <div className="row-code"><Field label={t.code}><input className="code-in" inputMode="numeric" maxLength="6" value={pw.code} onChange={(e) => setPw({ ...pw, code: e.target.value.replace(/\D/g, '') })} /></Field><button type="button" className="btn ghost" onClick={sendCode}>{t.sendCode}</button></div>}
        <Note kind="error">{err}</Note><Note kind="ok">{msg}</Note>
        <Btn busy={busy === 'pw'} type="submit">{t.changePassword}</Btn>
      </form>
    </section>
  );
}

function Remind({ onClose }) {
  const { t } = useT();
  const answer = (never) => { fn('bel-mfa', { action: 'remind', never }).catch(() => {}); onClose(); };
  return (
    <div className="modal-bg"><div className="modal">
      <h3>{t.remindTitle}</h3><p>{t.remindText}</p>
      <div className="acts"><button className="btn" onClick={() => { answer(false); go('account'); }}>{t.activateNow}</button><button className="btn ghost" onClick={() => answer(false)}>{t.later}</button><button className="link" onClick={() => answer(true)}>{t.never}</button></div>
    </div></div>
  );
}

// ---------- App ----------
function App() {
  const [lang, setLangS] = useState(initialLang);
  const setLang = (l) => { setLangS(l); safeSet('bel_lang', l); document.documentElement.lang = l; };
  const route = useRoute();
  const [state, setState] = useState({ phase: 'boot' });
  const [counts, setCounts] = useState({});
  const [remind, setRemind] = useState(false);
  const t = T[lang];

  const loadMe = useCallback(async () => {
    const { data: s } = await sb.auth.getSession();
    if (!s?.session) { setState({ phase: 'out' }); return; }
    let st;
    try { st = await fn('bel-mfa', { action: 'status' }); } catch (e) { await sb.auth.signOut({ scope: 'local' }); setState({ phase: 'out' }); return; }
    if (st.remind) setRemind(true);
    if (!st.verified) { setState({ phase: 'mfa', status: st }); return; }
    const { data: me } = await sb.from('bel_profiles').select('*').eq('id', s.session.user.id).maybeSingle();
    if (!me) { await sb.auth.signOut({ scope: 'local' }); setState({ phase: 'out' }); return; }
    if (me.lang && LANGS.includes(me.lang) && !safeGet('bel_lang')) setLangS(me.lang);
    setState({ phase: 'in', me });
  }, []);
  const loadCounts = useCallback(async () => {
    const [{ count: rc }, inv, msg] = await Promise.all([
      sb.from('bel_recall_notices').select('id', { count: 'exact', head: true }).is('signed_at', null),
      fn('bel-odoo', { action: 'invoices' }).catch(() => ({ invoices: [] })),
      fn('bel-hub', { action: 'messages' }).catch(() => ({ messages: [] })),
    ]);
    let desk = 0, customers = 0;
    if (isStaffUser(state.me)) { try { desk = (await fn('bel-support', { action: 'admin_list', queue: 'open' })).tickets.length; } catch (e) {} }
    if (state.me && state.me.role === 'super') { try { customers = (await fn('bel-hub', { action: 'customers' })).customers.reduce((x, p) => x + p.unread, 0); } catch (e) {} }
    setCounts({ recall: rc || 0, invoices: inv.invoices.filter((i) => i.kind === 'invoice' && ['open', 'partly_paid', 'overdue'].includes(i.status)).length, desk, customers, messages: msg.messages.filter((m) => m.direction === 'out' && !m.read_at).length });
  }, [state.me]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => { loadMe(); }, [loadMe]);
  useEffect(() => { if (state.phase === 'in') loadCounts(); }, [state.phase, loadCounts]);
  // Signed in, no activity for 30 minutes: sign out.
  useEffect(() => {
    if (state.phase !== 'in') return;
    let last = Date.now();
    const bump = () => { last = Date.now(); };
    ['click', 'keydown', 'scroll', 'touchstart'].forEach((e) => addEventListener(e, bump, { passive: true }));
    const iv = setInterval(() => { if (Date.now() - last > 30 * 60 * 1000) sb.auth.signOut({ scope: 'local' }).then(() => location.reload()); }, 60000);
    return () => { clearInterval(iv); ['click', 'keydown', 'scroll', 'touchstart'].forEach((e) => removeEventListener(e, bump)); };
  }, [state.phase]);

  const page = route.parts[0] || '';
  let body;
  if (page === 'switch') body = <SwitchIn route={route} />;
  else if (page === 'reset') body = <Reset route={route} onSignedIn={loadMe} />;
  else if (state.phase === 'boot') body = <div className="boot"><Logo /></div>;
  else if (state.phase === 'out') body = page === 'signup' ? <Signup /> : page === 'forgot' ? <Forgot /> : <Login route={route} onSignedIn={loadMe} />;
  else if (state.phase === 'mfa') body = <SecondFactor status={state.status} onDone={(r) => { if (r.remind) setRemind(true); loadMe(); }} />;
  else {
    const me = state.me;
    if (['login', 'signup', 'forgot', ''].includes(page)) { go(me.role === 'super' ? 'dashboard' : isStaffUser(me) ? 'desk' : counts.recall ? 'recall' : 'products'); }
    const P = { products: Products, library: Library, recall: Recall, orders: Orders, invoices: Invoices, support: Support, desk: Desk, assistant: Assistant, account: Account, services: Services, messages: Messages, dashboard: Dashboard, customers: Customers }[page] || Products;
    body = <Shell me={me} route={route} counts={counts}><P me={me} route={route} refresh={loadCounts} reloadMe={loadMe} /></Shell>;
  }
  return <LangCtx.Provider value={{ t, lang, setLang }}>{body}{remind && state.phase === 'in' && <Remind onClose={() => setRemind(false)} />}</LangCtx.Provider>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
