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
function Btn({ kind = 'primary', busy, children, ...p }) { return <button className={'btn btn-' + kind} disabled={busy || p.disabled} {...p}>{busy ? <span className="spin" /> : children}</button>; }
function Note({ kind = 'info', children }) { return children ? <div className={'note note-' + kind} role={kind === 'error' ? 'alert' : 'status'}>{children}</div> : null; }
function Badge({ tone = 'grey', children }) { return <span className={'badge badge-' + tone}>{children}</span>; }
function Empty({ children }) { return <div className="empty">{children}</div>; }
function PageHead({ title, lead, action }) { return <div className="page-head"><div><h1>{title}</h1>{lead && <p className="lead">{lead}</p>}</div>{action}</div>; }
const TONE = { active: 'green', delivered: 'green', installed: 'green', paid: 'green', signed: 'green', replaced: 'green', answered: 'blue', open: 'amber', opened: 'amber', sent: 'red', recalled: 'red', overdue: 'red', service: 'amber', closed: 'grey', cancelled: 'grey' };

// ---------- auth screens ----------
function AuthFrame({ children }) {
  const { t, lang, setLang } = useT();
  return (
    <div className="auth">
      <div className="auth-side">
        <Logo light />
        <div className="auth-side-txt"><p className="eyebrow">{t.portal}</p><h2>{lang === 'fr' ? 'Votre installation, votre support, au même endroit.' : lang === 'en' ? 'Your installation and your support, in one place.' : 'Uw installatie en uw support, op één plek.'}</h2></div>
        <LangSwitch dark />
      </div>
      <div className="auth-main"><div className="auth-box">{children}</div></div>
    </div>
  );
}
function LangSwitch({ dark }) {
  const { lang, setLang } = useT();
  return <div className={'langs' + (dark ? ' dark' : '')}>{LANGS.map((l) => <button key={l} className={l === lang ? 'on' : ''} onClick={() => setLang(l)}>{l.toUpperCase()}</button>)}</div>;
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
        <Field label={t.password}><input type="password" autoComplete="current-password" required value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
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
      {done ? <><Note kind="ok">{t.signupDone}</Note><a className="btn btn-primary" href={'#/login?email=' + encodeURIComponent(f.email)}>{t.signIn}</a></> : (
        <form onSubmit={submit} className="stack">
          <div className="row2">
            <Field label={t.firstName}><input required autoComplete="given-name" value={f.first_name} onChange={set('first_name')} /></Field>
            <Field label={t.lastName}><input required autoComplete="family-name" value={f.last_name} onChange={set('last_name')} /></Field>
          </div>
          <Field label={t.email}><input type="email" required autoComplete="email" value={f.email} onChange={set('email')} /></Field>
          <label className="field"><span className="field-l">{t.password}</span><input type="password" required autoComplete="new-password" value={f.password} onChange={set('password')} /><PwRules pw={f.password} /></label>
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
      {stage === 'expired' && <><Note kind="error">{err}</Note><a className="btn btn-primary" href="#/forgot">{t.sendReset}</a></>}
      {stage === 'form' && (
        <form onSubmit={submit} className="stack">
          <label className="field"><span className="field-l">{t.newPassword}</span><input type="password" required autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /><PwRules pw={pw} /></label>
          <Field label={t.repeatPassword}><input type="password" required autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></Field>
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
        <button className="link" onClick={() => sb.auth.signOut().then(() => location.reload())}>{t.signOut}</button>
      </div>
    </AuthFrame>
  );
}

// ---------- signed-in shell ----------
const MENU = ['products', 'recall', 'orders', 'invoices', 'support', 'assistant'];
const ICON = {
  products: 'M4 7h16v12H4zM8 7V5h8v2M9 12h6', recall: 'M12 3l9 16H3zM12 10v4M12 17h.01', orders: 'M3 7h11v10H3zM14 10h4l3 3v4h-7M7 20a2 2 0 1 0 0-.01M17 20a2 2 0 1 0 0-.01',
  invoices: 'M6 3h9l3 3v15H6zM9 10h6M9 14h6M9 18h4', support: 'M4 12a8 8 0 1 1 16 0v5h-4v-5h4M4 12v5h4v-5H4', assistant: 'M4 5h16v11H9l-5 4zM9 10h.01M12 10h.01M15 10h.01', account: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
};
const Icon = ({ n }) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICON[n]} /></svg>;

function Shell({ me, route, children, counts }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const cur = route.parts[0] || 'products';
  const initials = ((me.first_name || me.email)[0] + (me.last_name || '')[0] || '').toUpperCase();
  return (
    <div className="shell">
      <header className="topbar">
        <button className="burger" aria-label="Menu" onClick={() => setOpen(!open)}><span /><span /><span /></button>
        <a href="#/products" className="brand"><Logo light /><span className="brand-sub">{t.portal}</span></a>
        <div className="top-right"><LangSwitch dark /><a href="#/account" className={'avatar' + (cur === 'account' ? ' on' : '')} title={t.menu.account}>{initials}</a></div>
      </header>
      <nav className={'side' + (open ? ' open' : '')} onClick={() => setOpen(false)}>
        {MENU.map((m) => (
          <a key={m} href={'#/' + m} className={'nav' + (cur === m ? ' on' : '') + (m === 'recall' && counts.recall ? ' alert' : '')}>
            <Icon n={m} /><span>{t.menu[m]}</span>{counts[m] ? <b className="count">{counts[m]}</b> : null}
          </a>
        ))}
        <div className="side-foot">
          <a href="#/account" className={'nav' + (cur === 'account' ? ' on' : '')}><Icon n="account" /><span>{t.menu.account}</span></a>
          <button className="nav" onClick={() => sb.auth.signOut().then(() => { go('login'); location.reload(); })}><span className="nav-out">↩</span><span>{t.signOut}</span></button>
        </div>
      </nav>
      <main className="main">{children}</main>
    </div>
  );
}

// ---------- My products ----------
function Products({ me }) {
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
      <PageHead title={t.menu.products} lead={t.productsLead} />
      {!data.systems.length && <Empty>{t.productsEmpty} <a href="#/support/new?cat=account">{t.newRequest} →</a></Empty>}
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
                  <a className="btn btn-ghost sm" href={'#/support/new?system=' + y.id + '&cat=' + y.kind}>{t.askSupport}</a>
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
  if (!list) return <p className="muted">{t.loading}</p>;
  return (
    <>
      <PageHead title={t.menu.recall} lead={t.recallLead} />
      {!list.length ? <Empty>{t.recallEmpty}</Empty> : (
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
      {n.pdf && <div className="pdf-wrap"><iframe title={t.recallDoc} src={n.pdf} /><a className="btn btn-ghost sm" href={n.pdf} target="_blank" rel="noopener">{t.recallDoc} ↗</a></div>}
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
function Orders() {
  const { t, lang } = useT();
  const [orders, setOrders] = useState(null);
  useEffect(() => { sb.from('bel_orders').select('*, bel_order_lines(*), bel_deliveries(*)').order('ordered_at', { ascending: false }).then(({ data }) => setOrders(data || [])); }, []);
  if (!orders) return <p className="muted">{t.loading}</p>;
  return (
    <>
      <PageHead title={t.menu.orders} lead={t.ordersLead} />
      {!orders.length ? <Empty>{t.ordersEmpty}</Empty> : orders.map((o) => {
        const idx = ORDER_STEPS.indexOf(o.status === 'partly_delivered' ? 'ready' : o.status);
        return (
          <article key={o.id} className="card order">
            <div className="card-top"><h3>{t.order} <span className="mono">{o.number}</span></h3><Badge tone={TONE[o.status] || 'blue'}>{t.oStatus[o.status]}</Badge></div>
            {o.status !== 'cancelled' && o.status !== 'quote' && (
              <ol className="steps">{ORDER_STEPS.map((s, i) => <li key={s} className={i <= idx ? 'done' : ''}><span />{t.oStatus[s]}</li>)}</ol>
            )}
            <dl className="kv">
              <dt>{t.ordered}</dt><dd>{day(o.ordered_at, lang)}</dd>
              <dt>{t.expected}</dt><dd>{day(o.expected_delivery, lang)}</dd>
              <dt>{t.installation}</dt><dd>{day(o.installation_date, lang)}</dd>
              {o.total_incl != null && <><dt>{t.total}</dt><dd>{eur(o.total_incl, lang)}</dd></>}
            </dl>
            {(o.bel_order_lines || []).length ? <ul className="lines">{o.bel_order_lines.sort((a, b) => a.position - b.position).map((l) => <li key={l.id}><span>{l.quantity} ×</span> {l.product}{l.description ? <small> — {l.description}</small> : null}</li>)}</ul> : null}
            {(o.bel_deliveries || []).length ? <><h4>{t.deliveries}</h4><ul className="lines">{o.bel_deliveries.map((d) => <li key={d.id}><Badge tone={TONE[d.status] || 'blue'}>{t.dStatus[d.status]}</Badge> {d.carrier || ''} {d.delivered_at ? day(d.delivered_at, lang) : d.planned_at ? day(d.planned_at, lang) : ''} {d.tracking_url ? <a href={d.tracking_url} target="_blank" rel="noopener">{t.track} ↗</a> : d.tracking_number ? <span className="mono">{d.tracking_number}</span> : null}</li>)}</ul></> : null}
          </article>
        );
      })}
    </>
  );
}

// ---------- Invoices and payments ----------
function Invoices() {
  const { t, lang } = useT();
  const [d, setD] = useState(null);
  useEffect(() => { Promise.all([sb.from('bel_invoices').select('*').order('issued_at', { ascending: false }), sb.from('bel_payments').select('*').order('paid_at', { ascending: false })]).then(([i, p]) => setD({ inv: i.data || [], pay: p.data || [] })); }, []);
  if (!d) return <p className="muted">{t.loading}</p>;
  const openSum = d.inv.filter((i) => ['open', 'partly_paid', 'overdue'].includes(i.status)).reduce((s, i) => s + Number(i.total_incl) - Number(i.amount_paid), 0);
  const openDoc = async (id) => { try { const r = await fn('bel-portal', { action: 'doc_url', id }); window.open(r.url, '_blank', 'noopener'); } catch (e) { alert(errText(t, e)); } };
  return (
    <>
      <PageHead title={t.menu.invoices} lead={t.invoicesLead} action={openSum > 0 ? <div className="kpi"><small>{t.toPay}</small><b>{eur(openSum, lang)}</b></div> : null} />
      {!d.inv.length ? <Empty>{t.invoicesEmpty}</Empty> : (
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>{t.invoice}</th><th>{t.issued}</th><th>{t.due}</th><th className="num">{t.amount}</th><th className="num">{t.paid}</th><th></th><th></th></tr></thead>
          <tbody>{d.inv.map((i) => (
            <tr key={i.id}>
              <td className="mono">{i.number}{i.status !== 'paid' && i.structured_ref ? <small className="ref">{t.payRef}: {i.structured_ref}</small> : null}</td>
              <td data-l={t.issued}>{day(i.issued_at, lang)}</td><td data-l={t.due}>{day(i.due_at, lang)}</td>
              <td className="num" data-l={t.amount}>{eur(i.total_incl, lang)}</td><td className="num" data-l={t.paid}>{eur(i.amount_paid, lang)}</td>
              <td><Badge tone={TONE[i.status] || 'amber'}>{t.iStatus[i.status]}</Badge></td>
              <td>{i.document_id ? <button className="link" onClick={() => openDoc(i.document_id)}>PDF</button> : null}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {d.pay.length ? <section className="block"><h2>{t.payments}</h2><div className="table-wrap"><table className="tbl"><tbody>{d.pay.map((p) => <tr key={p.id}><td>{day(p.paid_at, lang)}</td><td>{p.reference || p.method || ''}</td><td className="num">{eur(p.amount, lang)}</td></tr>)}</tbody></table></div></section> : null}
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
      <PageHead title={t.menu.support} lead={t.supportLead} action={<div className="acts"><a className="btn btn-danger" href="#/support/new?safety=1">{t.safetyReport}</a><a className="btn btn-primary" href="#/support/new">{t.newRequest}</a></div>} />
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
        action={k.status === 'closed' ? <button className="btn btn-ghost" onClick={() => fn('bel-support', { action: 'reopen', id }).then(load)}>{t.reopen}</button> : <button className="btn btn-ghost" onClick={() => fn('bel-support', { action: 'close', id }).then(load)}>{t.close}</button>} />
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
      <PageHead title={t.menu.assistant} lead={t.assistantLead} action={<button className="btn btn-ghost" onClick={() => { setCur(null); setMsgs([]); setInfo(''); }}>{t.newChat}</button>} />
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
        {factor === undefined ? null : factor ? <button className="btn btn-ghost sm" onClick={removeTotp} disabled={busy === 'totp'}>{t.totpRemove}</button> : !enroll && <Btn busy={busy === 'totp'} onClick={startEnroll}>{t.totpActivate}</Btn>}
      </div>
      {enroll && (
        <form className="enroll" onSubmit={confirmEnroll}>
          <img src={enroll.totp.qr_code} alt="QR" width="180" height="180" />
          <div className="stack"><p>{t.totpScan}</p><p className="mono small">{enroll.totp.secret}</p>
            <Field label={t.code}><input className="code-in" inputMode="numeric" maxLength="6" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} required /></Field>
            <div className="acts"><Btn busy={busy === 'totp'} type="submit">{t.verify}</Btn><button type="button" className="btn btn-ghost" onClick={() => setEnroll(null)}>{t.cancel}</button></div></div>
        </form>
      )}
      <form className="stack" onSubmit={changePw}>
        <h3>{t.changePassword}</h3>
        <div className="row3">
          <Field label={t.currentPassword}><input type="password" autoComplete="current-password" value={pw.cur} onChange={(e) => setPw({ ...pw, cur: e.target.value })} required /></Field>
          <label className="field"><span className="field-l">{t.newPassword}</span><input type="password" autoComplete="new-password" value={pw.n1} onChange={(e) => setPw({ ...pw, n1: e.target.value })} required /><PwRules pw={pw.n1} /></label>
          <Field label={t.repeatPassword}><input type="password" autoComplete="new-password" value={pw.n2} onChange={(e) => setPw({ ...pw, n2: e.target.value })} required /></Field>
        </div>
        {!factor && <div className="row-code"><Field label={t.code}><input className="code-in" inputMode="numeric" maxLength="6" value={pw.code} onChange={(e) => setPw({ ...pw, code: e.target.value.replace(/\D/g, '') })} /></Field><button type="button" className="btn btn-ghost" onClick={sendCode}>{t.sendCode}</button></div>}
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
      <div className="acts"><button className="btn btn-primary" onClick={() => { answer(false); go('account'); }}>{t.activateNow}</button><button className="btn btn-ghost" onClick={() => answer(false)}>{t.later}</button><button className="link" onClick={() => answer(true)}>{t.never}</button></div>
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
    try { st = await fn('bel-mfa', { action: 'status' }); } catch (e) { await sb.auth.signOut(); setState({ phase: 'out' }); return; }
    if (st.remind) setRemind(true);
    if (!st.verified) { setState({ phase: 'mfa', status: st }); return; }
    const { data: me } = await sb.from('bel_profiles').select('*').eq('id', s.session.user.id).maybeSingle();
    if (!me) { await sb.auth.signOut(); setState({ phase: 'out' }); return; }
    if (me.lang && LANGS.includes(me.lang) && !safeGet('bel_lang')) setLangS(me.lang);
    setState({ phase: 'in', me });
  }, []);
  const loadCounts = useCallback(async () => {
    const [{ count: rc }, { count: ic }] = await Promise.all([
      sb.from('bel_recall_notices').select('id', { count: 'exact', head: true }).is('signed_at', null),
      sb.from('bel_invoices').select('id', { count: 'exact', head: true }).in('status', ['open', 'overdue', 'partly_paid']),
    ]);
    setCounts({ recall: rc || 0, invoices: ic || 0 });
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => { loadMe(); }, [loadMe]);
  useEffect(() => { if (state.phase === 'in') loadCounts(); }, [state.phase, loadCounts]);
  // Signed in, no activity for 30 minutes: sign out.
  useEffect(() => {
    if (state.phase !== 'in') return;
    let last = Date.now();
    const bump = () => { last = Date.now(); };
    ['click', 'keydown', 'scroll', 'touchstart'].forEach((e) => addEventListener(e, bump, { passive: true }));
    const iv = setInterval(() => { if (Date.now() - last > 30 * 60 * 1000) sb.auth.signOut().then(() => location.reload()); }, 60000);
    return () => { clearInterval(iv); ['click', 'keydown', 'scroll', 'touchstart'].forEach((e) => removeEventListener(e, bump)); };
  }, [state.phase]);

  const page = route.parts[0] || '';
  let body;
  if (page === 'reset') body = <Reset route={route} onSignedIn={loadMe} />;
  else if (state.phase === 'boot') body = <div className="boot"><Logo /></div>;
  else if (state.phase === 'out') body = page === 'signup' ? <Signup /> : page === 'forgot' ? <Forgot /> : <Login route={route} onSignedIn={loadMe} />;
  else if (state.phase === 'mfa') body = <SecondFactor status={state.status} onDone={(r) => { if (r.remind) setRemind(true); loadMe(); }} />;
  else {
    const me = state.me;
    if (['login', 'signup', 'forgot', ''].includes(page)) { go(counts.recall ? 'recall' : 'products'); }
    const P = { products: Products, recall: Recall, orders: Orders, invoices: Invoices, support: Support, assistant: Assistant, account: Account }[page] || Products;
    body = <Shell me={me} route={route} counts={counts}><P me={me} route={route} refresh={loadCounts} reloadMe={loadMe} /></Shell>;
  }
  return <LangCtx.Provider value={{ t, lang, setLang }}>{body}{remind && state.phase === 'in' && <Remind onClose={() => setRemind(false)} />}</LangCtx.Provider>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
