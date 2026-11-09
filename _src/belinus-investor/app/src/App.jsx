// Shell in the Clavoris platform layout (sidebar with sections, account at the foot, fold rail; phones: top bar and tab bar) with the Belinus brand.
const I = {
  trend: 'M22 7l-8.5 8.5-5-5L2 17M16 7h6v6',
  support: 'M4 12a8 8 0 1 1 16 0v5h-4v-5h4M4 12v5h4v-5H4',
  home: 'M3 11l9-8 9 8M5 10v10h14V10', keuze: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9', afspraak: 'M7 3v4M17 3v4M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2', users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8', flag: 'M4 22V4s2-1 5-1 5 2 8 2 3-1 3-1v11s-1 1-3 1-5-2-8-2-5 1-5 1', clock: 'M12 7v5l3 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20', cog: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19 12l2-1-2-4-2 1-2-1V5h-4v2l-2 1-2-1-2 4 2 1v2l-2 1 2 4 2-1 2 1v2h4v-2l2-1 2 1 2-4-2-1z', menu: 'M4 7h16M4 12h16M4 17h16', mail: 'M4 6h16v12H4zM4 7l8 6 8-6', search: 'M21 21l-4.3-4.3M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16',
};
const Ic = ({ n }) => <svg className="ic" viewBox="0 0 24 24"><path d={I[n]} /></svg>;
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
function Shell({ page, investor, role, email, name, unread = 0, children }) {
  const fold = useNavFold();
  const [menu, setMenu] = useState(false), [q, setQ] = useState('');
  const [support, setSupport] = useState(false);
  useEffect(() => { if (!AS) fn('bel-switch', { action: 'targets' }).then((r) => setSupport(!!r.support)).catch(() => {}); }, []);
  const toSupport = async (e) => { e.preventDefault(); try { const r = await fn('bel-switch', { action: 'create', to: 'support' }); location.href = r.url; } catch (x) {} };
  const initials = (name || email).split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join('');
  const secs = [];
  if (investor) secs.push(['Mijn investering', [['', 'Mijn investering', 'trend'], ['keuze', 'Uw keuze', 'keuze'], ['transacties', 'Transacties', 'chart'], ['afspraak', 'Maak een afspraak', 'afspraak'], ['berichten', 'Berichten', 'mail']]]);
  if (role) secs.push(['Beheer', [['beheer', 'Overzicht', 'chart'], ['investeerders', 'Investeerders', 'users'], ['investeerdersgroepen', 'Investeerdersgroepen', 'users'], ['opvolging', 'Messaging', 'flag'], ['afspraken', 'Afspraken', 'afspraak'], ['beschikbaarheid', 'Beschikbaarheid', 'clock'], ['financieel', 'Financieel', 'chart'], ['campagnes', 'E-mailcampagnes', 'mail'], ['automatisch', 'Automatische e-mails', 'cog'], ['instellingen', 'Instellingen', 'cog']]]);
  const tabs = secs.flatMap((s) => s[1]).slice(0, 3);
  const filt = (r) => !q || t(r[1]).toLowerCase().includes(q.toLowerCase());
  const toggleRail = () => { const on = document.documentElement.classList.toggle('rail'); try { localStorage.setItem('inv_rail', on ? '1' : ''); } catch (e) {} };
  const out = () => sb.auth.signOut({ scope: 'local' }).then(() => { location.hash = ''; location.reload(); });
  useEffect(() => { if (!menu) return; const f = (e) => { if (!e.target.closest('.sb-foot')) setMenu(false); }; addEventListener('click', f); return () => removeEventListener('click', f); }, [menu]);
  return <div>
    <aside className="sb-side">
      <a className="sb-brand" href="#/"><img src="assets/logo-belinus-blue.png" alt="belinus" /><img className="sb-b" src="assets/favicon-180.png" alt="belinus" /><span className="sb-lbl">{t('Investeerdersportaal')}</span><span className="sb-co"><i />EVChargeking</span></a>
      <label className="sb-search"><span className="sr">{t('Zoeken')}</span><Ic n="search" /><input type="search" placeholder={t('Zoeken')} value={q} onChange={(e) => setQ(e.target.value)} /></label>
      <nav className="sb-nav">{secs.map(([h, rows]) => <SbSec key={h} id={h} label={t(h)} on={rows.some((r) => r[0] === page)} force={!!q} fold={fold}>{rows.filter(filt).map((r) => <a key={r[0]} className={'nav-row' + (page === r[0] ? ' on' : '')} href={'#/' + r[0]} title={t(r[1])}><Ic n={r[2]} /><span>{t(r[1])}</span>{r[0] === 'berichten' && unread > 0 && <em className="nav-badge">{unread}</em>}</a>)}</SbSec>)}{support && <SbSec id="other" label={t('Andere portalen')} on={false} force={!!q} fold={fold}><a className="nav-row" href="#/" onClick={toSupport} title={t('Supportportaal')}><Ic n="support" /><span>{t('Supportportaal')}</span></a></SbSec>}</nav>
      <div className="sb-foot">{menu && <div className="sb-menu"><a href="#/account" onClick={() => setMenu(false)}>{t('Mijn account')}</a><button onClick={out}>{t('Afmelden')}</button></div>}<button className="sb-acct" onClick={() => setMenu(!menu)}><span className="av">{initials}</span><div><b>{name || email}</b><small>{role ? (role === 'belinus' ? 'Beheerder Belinus' : 'Beheerder EVChargeking') : t('Investeerder')}</small></div></button><ThemeToggle /></div>
      <button className="sb-edge" onClick={toggleRail} aria-label="Menu in- of uitklappen"><svg viewBox="0 0 24 24"><path d="M14 7l-5 5 5 5" /></svg></button>
    </aside>
    <div className="sb-scrim" onClick={() => document.documentElement.classList.remove('drawer')} />
    <header className="sb-top"><div className="logos"><img src="assets/logo-belinus-blue.png" alt="belinus" /></div><div className="acts"><ThemeToggle /><a className="av" href="#/account" aria-label="Mijn account">{initials}</a></div></header>
    <main className="main"><div className="main-in"><p className="eyebrow">{t('Investeerdersportaal')} · EVChargeking</p>{children}<p className="foot">EVChargeking (Some BV), Probastraat 21, 2235 Westmeerbeek · a belinus group company · <a href="https://belinus.com/#/privacy" target="_blank" rel="noopener">{t('Privacybeleid')}</a></p></div></main>
    <nav className="sb-tabs">{tabs.map((r) => <a key={r[0]} className={'sb-tab' + (page === r[0] ? ' on' : '')} href={'#/' + r[0]}><Ic n={r[2]} /><span>{t(r[1].replace('Mijn investering', 'Investering').replace('Maak een afspraak', 'Afspraak'))}</span></a>)}<button className="sb-tab" onClick={() => document.documentElement.classList.add('drawer')}><Ic n="menu" /><span>{t('Meer')}</span></button></nav>
  </div>;
}
// The language saved on the account decides (standard NL); it is changed on the account page.
function syncLang(d) { if (d.investor && d.investor.lang && d.investor.lang !== LANG) setLang(d.investor.lang); }
// Arrival from the other portal: one-time code -> session, no second sign-in.
function SwitchIn({ route }) {
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
  return <div className="boot">{err ? <p>{t('Deze overstap is verlopen. Meld u opnieuw aan.')} <a href="#/" onClick={() => setTimeout(() => location.reload(), 0)}>{t('Aanmelden')}</a></p> : <span className="spin" />}</div>;
}
function App() {
  const route = useRoute();
  const [st, setSt] = useState({ phase: 'boot' });
  const loadData = useCallback(async () => { let d; try { d = await fn('bel-inv', { action: 'me' }); } catch (e) { if (AS) { stopAs(); return; } throw e; } if (!d.as) syncLang(d); setSt((s) => ({ ...s, phase: 'in', d })); return d; }, []);
  const load = useCallback(async (fromLogin = false) => {
    const { data: s } = await sb.auth.getSession();
    if (!s?.session) { setSt({ phase: 'out' }); return; }
    let m;
    try { m = await fn('bel-inv', { action: 'mfa_status' }); } catch (e) { try { for (const k of Object.keys(sessionStorage)) if (k.startsWith('sb-')) sessionStorage.removeItem(k); } catch (x) {} sb.auth.signOut({ scope: 'local' }).catch(() => {}); setSt({ phase: 'out', denied: e.status === 403 }); return; }
    if (!m.verified) { setSt({ phase: 'mfa', status: m }); return; }
    setSt({ phase: 'in', email: s.session.user.email });
    // The terms are asked only after a password (or provider) sign-in, not on a page reload. Admins are exempt.
    const d0 = await loadData();
    // A reload also shows it to someone who has never accepted yet (their sign-in was not finished); a change of the terms during a session waits for the next sign-in.
    if (d0 && d0.investor && d0.terms && d0.terms.pending && (fromLogin || !d0.terms.accepted_version) && !d0.admin && !d0.as) setSt((s0) => ({ ...s0, gate: true }));
  }, [loadData]);
  useEffect(() => { try { if (localStorage.getItem('inv_rail')) document.documentElement.classList.add('rail'); } catch (e) {} const back = new URLSearchParams(location.search).get('oauth') === '1'; providerReturn().catch(() => {}).then(() => load(back)); }, [load]);
  useEffect(() => { if (st.phase !== 'in') return; let last = Date.now(); const bump = () => { last = Date.now(); }; ['click', 'keydown', 'touchstart'].forEach((e) => addEventListener(e, bump, { passive: true })); const iv = setInterval(() => { if (Date.now() - last > 30 * 60000) sb.auth.signOut({ scope: 'local' }).then(() => location.reload()); }, 60000); return () => { clearInterval(iv); ['click', 'keydown', 'touchstart'].forEach((e) => removeEventListener(e, bump)); }; }, [st.phase]);
  const page = route.parts[0] || '';
  if (page === 'switch') return <SwitchIn route={route} />;
  if (page === 'wachtwoord') return <SetPassword route={route} onIn={() => load(true)} />;
  if (st.phase === 'boot') return <div className="boot"><span className="spin" /></div>;
  if (st.phase === 'out') return page === 'start' ? <Start route={route} /> : <Login onIn={() => load(true)} />;
  if (st.phase === 'mfa') return <SecondFactor status={st.status} onDone={() => load(true)} />;
  const d = st.d;
  if (!d) return <div className="boot"><span className="spin" /></div>;
  if (st.gate && d.investor && d.terms && d.terms.pending && !d.as && !d.admin) return <Terms d={d} reload={loadData} />;
  const acting = d.as, role = d.admin, hasInv = !!d.investor && (!role || !!acting);
  const name = hasInv ? (d.investor.company_name || [d.investor.first_name, d.investor.last_name].filter(Boolean).join(' ')) : '';
  const P = { beheer: AdmOverview, investeerders: AdmInvestors, opvolging: AdmFollow, afspraken: AdmBookings, beschikbaarheid: AdmAvail, financieel: AdmFinancial, instellingen: AdmSettings };
  let body;
  if (role && page === 'investeerdersgroepen') body = route.parts[1] === 'nieuw' ? <AdmGroupNew /> : route.parts[1] ? <AdmGroup code={route.parts[1]} key={route.parts[1]} /> : <AdmGroups />;
  else if (role && page === 'campagnes') body = route.parts[1] ? <AdmCampaign id={route.parts[1]} key={route.parts[1]} /> : <AdmCampaigns />;
  else if (role && page === 'automatisch') body = <AdmAutomated />;
  else if (page === 'account') body = <Account d={d} reload={loadData} email={st.email} />;
  else if (role && !acting && page === 'investeerders' && route.parts[1]) body = <InvPage id={route.parts[1]} key={route.parts[1]} />;
  else if (role && !acting && P[page]) { const C = P[page]; body = <C />; }
  else if (hasInv && page === 'berichten') body = <Berichten d={d} reload={loadData} />;
  else if (hasInv && page === 'keuze') body = <Keuze d={d} reload={loadData} />;
  else if (hasInv && page === 'transacties') body = <Transacties d={d} />;
  else if (hasInv && page === 'afspraak') body = <Afspraak d={d} reload={loadData} />;
  else if (hasInv) body = <Home d={d} />;
  else if (role) body = <AdmOverview />;
  return <><TotpNudge /><Shell page={!hasInv && !P[page] && page !== 'account' ? 'beheer' : page} investor={hasInv} role={acting ? null : role} email={st.email} name={name} unread={hasInv ? (d.messages || []).filter((m) => m.direction === 'out' && !m.read_at).length : 0}>{acting && <AsBanner d={d} reload={loadData} />}{body}</Shell></>;
}
function Root() { useLang(); return <App />; }
ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
