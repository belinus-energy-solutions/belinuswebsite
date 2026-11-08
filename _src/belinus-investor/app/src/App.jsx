// Shell in the Clavoris platform layout (sidebar with sections, account at the foot, fold rail; phones: top bar and tab bar) with the Belinus brand.
const I = {
  home: 'M3 11l9-8 9 8M5 10v10h14V10', keuze: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9', afspraak: 'M7 3v4M17 3v4M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2', users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8', flag: 'M4 22V4s2-1 5-1 5 2 8 2 3-1 3-1v11s-1 1-3 1-5-2-8-2-5 1-5 1', clock: 'M12 7v5l3 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20', cog: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19 12l2-1-2-4-2 1-2-1V5h-4v2l-2 1-2-1-2 4 2 1v2l-2 1 2 4 2-1 2 1v2h4v-2l2-1 2 1 2-4-2-1z', menu: 'M4 7h16M4 12h16M4 17h16', search: 'M21 21l-4.3-4.3M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16',
};
const Ic = ({ n }) => <svg className="ic" viewBox="0 0 24 24"><path d={I[n]} /></svg>;
function Shell({ page, investor, role, email, name, children }) {
  const [menu, setMenu] = useState(false), [q, setQ] = useState('');
  const initials = (name || email).split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join('');
  const secs = [];
  if (investor) secs.push(['Mijn investering', [['', 'Mijn investering', 'home'], ['keuze', 'Uw keuze', 'keuze'], ['afspraak', 'Maak een afspraak', 'afspraak']]]);
  if (role) secs.push(['Beheer', [['beheer', 'Overzicht', 'chart'], ['investeerders', 'Investeerders', 'users'], ['opvolging', 'Opvolging', 'flag'], ['afspraken', 'Afspraken', 'afspraak'], ['beschikbaarheid', 'Beschikbaarheid', 'clock'], ...(role === 'belinus' ? [['instellingen', 'Instellingen', 'cog']] : [])]]);
  const tabs = secs.flatMap((s) => s[1]).slice(0, 3);
  const filt = (r) => !q || r[1].toLowerCase().includes(q.toLowerCase());
  const toggleRail = () => { const on = document.documentElement.classList.toggle('rail'); try { localStorage.setItem('inv_rail', on ? '1' : ''); } catch (e) {} };
  const out = () => sb.auth.signOut().then(() => { location.hash = ''; location.reload(); });
  useEffect(() => { if (!menu) return; const f = (e) => { if (!e.target.closest('.sb-foot')) setMenu(false); }; addEventListener('click', f); return () => removeEventListener('click', f); }, [menu]);
  return <div>
    <aside className="sb-side">
      <a className="sb-brand" href="#/"><img src="assets/logo-belinus.png" alt="belinus" /><span className="sb-lbl">Investeerdersportaal</span><span className="sb-co"><i />EVChargeking</span></a>
      <label className="sb-search"><span className="sr">Zoeken</span><Ic n="search" /><input type="search" placeholder="Zoeken" value={q} onChange={(e) => setQ(e.target.value)} /></label>
      <nav className="sb-nav">{secs.map(([h, rows]) => <div key={h}><p className="sb-h">{h}</p>{rows.filter(filt).map((r) => <a key={r[0]} className={'nav-row' + (page === r[0] ? ' on' : '')} href={'#/' + r[0]} title={r[1]}><Ic n={r[2]} /><span>{r[1]}</span></a>)}</div>)}</nav>
      <div className="sb-foot">{menu && <div className="sb-menu"><a href="#/account" onClick={() => setMenu(false)}>Mijn account</a><button onClick={out}>Afmelden</button></div>}<button className="sb-acct" onClick={() => setMenu(!menu)}><span className="av">{initials}</span><div><b>{name || email}</b><small>{role ? (role === 'belinus' ? 'Beheerder Belinus' : 'Beheerder EVChargeking') : 'Investeerder'}</small></div></button></div>
      <button className="sb-edge" onClick={toggleRail} aria-label="Menu in- of uitklappen"><svg viewBox="0 0 24 24"><path d="M14 7l-5 5 5 5" /></svg></button>
    </aside>
    <div className="sb-scrim" onClick={() => document.documentElement.classList.remove('drawer')} />
    <header className="sb-top"><div className="logos"><Evc /><img src="assets/logo-belinus.png" alt="belinus" /></div><a className="av" href="#/account" aria-label="Mijn account">{initials}</a></header>
    <main className="main"><div className="main-in">{children}<p className="foot">EVChargeking (Some BV), Hooilaar 40, 2230 Herselt · nu deel van de Belinus-groep · <a href="https://belinus.com/#/privacy" target="_blank" rel="noopener">Privacybeleid</a></p></div></main>
    <nav className="sb-tabs">{tabs.map((r) => <a key={r[0]} className={'sb-tab' + (page === r[0] ? ' on' : '')} href={'#/' + r[0]}><Ic n={r[2]} /><span>{r[1].replace('Mijn investering', 'Investering').replace('Maak een afspraak', 'Afspraak')}</span></a>)}<button className="sb-tab" onClick={() => document.documentElement.classList.add('drawer')}><Ic n="menu" /><span>Meer</span></button></nav>
  </div>;
}
function App() {
  const route = useRoute();
  const [st, setSt] = useState({ phase: 'boot' });
  const loadData = useCallback(async () => { const d = await fn('bel-inv', { action: 'me' }); setSt((s) => ({ ...s, phase: 'in', d })); return d; }, []);
  const load = useCallback(async () => {
    const { data: s } = await sb.auth.getSession();
    if (!s?.session) { setSt({ phase: 'out' }); return; }
    let m;
    try { m = await fn('bel-inv', { action: 'mfa_status' }); } catch (e) { await sb.auth.signOut(); setSt({ phase: 'out', denied: e.status === 403 }); return; }
    if (!m.verified) { setSt({ phase: 'mfa', status: m }); return; }
    setSt({ phase: 'in', email: s.session.user.email });
    await loadData();
  }, [loadData]);
  useEffect(() => { try { if (localStorage.getItem('inv_rail')) document.documentElement.classList.add('rail'); } catch (e) {} load(); }, [load]);
  useEffect(() => { if (st.phase !== 'in') return; let last = Date.now(); const bump = () => { last = Date.now(); }; ['click', 'keydown', 'touchstart'].forEach((e) => addEventListener(e, bump, { passive: true })); const iv = setInterval(() => { if (Date.now() - last > 30 * 60000) sb.auth.signOut().then(() => location.reload()); }, 60000); return () => { clearInterval(iv); ['click', 'keydown', 'touchstart'].forEach((e) => removeEventListener(e, bump)); }; }, [st.phase]);
  const page = route.parts[0] || '';
  if (page === 'wachtwoord') return <SetPassword route={route} onIn={load} />;
  if (st.phase === 'boot') return <div className="boot"><span className="spin" /></div>;
  if (st.phase === 'out') return page === 'start' ? <Start route={route} /> : <Login onIn={load} />;
  if (st.phase === 'mfa') return <SecondFactor status={st.status} onDone={load} />;
  const d = st.d;
  if (!d) return <div className="boot"><span className="spin" /></div>;
  const hasInv = !!d.investor, role = d.admin;
  const name = hasInv ? (d.investor.company_name || [d.investor.first_name, d.investor.last_name].filter(Boolean).join(' ')) : '';
  const P = { beheer: AdmOverview, investeerders: AdmInvestors, opvolging: AdmFollow, afspraken: AdmBookings, beschikbaarheid: AdmAvail, instellingen: AdmSettings };
  let body;
  if (page === 'account') body = <Account d={d} reload={loadData} email={st.email} />;
  else if (role && P[page]) { const C = P[page]; body = <C />; }
  else if (hasInv && page === 'keuze') body = <Keuze d={d} reload={loadData} />;
  else if (hasInv && page === 'afspraak') body = <Afspraak d={d} reload={loadData} />;
  else if (hasInv) body = <Home d={d} />;
  else if (role) body = <AdmOverview />;
  return <Shell page={!hasInv && !P[page] && page !== 'account' ? 'beheer' : page} investor={hasInv} role={role} email={st.email} name={name}>{body}</Shell>;
}
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
