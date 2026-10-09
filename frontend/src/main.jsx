import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  ScrollText,
  LogOut,
  Search,
  Plus,
  Activity,
  CheckCircle2,
  LockKeyhole,
  RefreshCw
} from 'lucide-react';
import './style.css';

const API = 'http://127.0.0.1:8000';

async function request(path, token, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  const data = await res.json().catch(() => ({
    detail: 'Unexpected server response'
  }));

  if (!res.ok) {
    throw new Error(data.detail || `Request failed (${res.status})`);
  }

  return data;
}

function App() {
  const [token, setToken] = useState(
    localStorage.getItem('iam_token') || ''
  );
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('Overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [audit, setAudit] = useState([]);

  const [email, setEmail] = useState('admin@acme.local');
  const [password, setPassword] = useState('ChangeMe_Admin123!');

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const [form, setForm] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'viewer'
  });

  async function load(t = token) {
    const [me, s, u] = await Promise.all([
      request('/api/auth/me', t),
      request('/api/dashboard', t),
      request('/api/users', t)
    ]);

    setUser(me);
    setStats(s);
    setUsers(u);

    if (me.role === 'admin' || me.role === 'manager') {
      setAudit(await request('/api/audit', t));
    } else {
      setAudit([]);
    }
  }

  useEffect(() => {
    if (token) {
      load(token).catch((e) => {
        setError(e.message);
        setToken('');
        setUser(null);
        localStorage.removeItem('iam_token');
      });
    }
  }, []);

  async function login(e) {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      const d = await request('/api/auth/login', '', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      localStorage.setItem('iam_token', d.access_token);
      setToken(d.access_token);

      await load(d.access_token);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem('iam_token');
    setToken('');
    setUser(null);
    setStats(null);
    setUsers([]);
    setAudit([]);
    setError('');
    setPage('Overview');
  }

  async function refresh() {
    setError('');

    try {
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function createUser(e) {
    e.preventDefault();
    setError('');

    try {
      await request('/api/users', token, {
        method: 'POST',
        body: JSON.stringify(form)
      });

      setShowCreate(false);
      setForm({
        email: '',
        full_name: '',
        password: '',
        role: 'viewer'
      });

      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  async function toggle(u) {
    setError('');

    try {
      await request(
        `/api/users/${u.id}/status?active=${!u.is_active}`,
        token,
        { method: 'PATCH' }
      );

      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  if (!token || !user) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <div className="brand-mark">
            <ShieldCheck size={28} />
          </div>

          <div className="eyebrow">NORTHSTAR SECURITY CLOUD</div>

          <h1>Identity, under control.</h1>

          <p className="muted">
            Secure access starts with knowing who has it.
          </p>

          <form onSubmit={login} className="login-form">
            <label>Work email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />

            <label>Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />

            <button className="primary full" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in securely'}
              <span>→</span>
            </button>
          </form>

          {error && <div className="error">{error}</div>}

          <div className="demo-note">
            <LockKeyhole size={15} />
            <span>
              Local starter credentials are prefilled. Run the API to sign in.
            </span>
          </div>

          <div className="login-foot">
            IAM PLATFORM <span>•</span> ACCESS MANAGEMENT
          </div>
        </div>
      </div>
    );
  }

  const filtered = users.filter((u) =>
    (u.full_name + ' ' + u.email + ' ' + u.role)
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark small">
            <ShieldCheck size={21} />
          </div>
          <div>
            <b>northstar</b>
            <small>IDENTITY CLOUD</small>
          </div>
        </div>

        <div className="workspace">
          <div className="workspace-dot">A</div>
          <div>
            <b>Acme Corporation</b>
            <small>Enterprise workspace</small>
          </div>
          <span>⌄</span>
        </div>

        <div className="nav-label">WORKSPACE</div>

        <nav>
          <button
            className={page === 'Overview' ? 'active' : ''}
            onClick={() => setPage('Overview')}
          >
            <LayoutDashboard size={18} />
            Overview
          </button>

          <button
            className={page === 'User directory' ? 'active' : ''}
            onClick={() => setPage('User directory')}
          >
            <Users size={18} />
            User directory
            <span className="nav-count">{users.length}</span>
          </button>

          {(user.role === 'admin' || user.role === 'manager') && (
            <button
              className={page === 'Audit trail' ? 'active' : ''}
              onClick={() => setPage('Audit trail')}
            >
              <ScrollText size={18} />
              Audit trail
            </button>
          )}
        </nav>

        <div className="sidebar-bottom">
          <div className="secure-status">
            <span className="pulse"></span>
            <div>
              <b>Systems operational</b>
              <small>All services responding</small>
            </div>
          </div>

          <div className="profile">
            <div className="avatar">
              {user.full_name
                .split(' ')
                .map((x) => x[0])
                .slice(0, 2)
                .join('')}
            </div>

            <div className="profile-info">
              <b>{user.full_name}</b>
              <small>{user.role.toUpperCase()}</small>
            </div>

            <button
              title="Sign out"
              className="icon-btn"
              onClick={logout}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="crumb">
            Workspace <span>/</span> <b>{page}</b>
          </div>

          <div className="top-actions">
            <span className="live">
              <i /> LIVE
            </span>

            <button
              className="icon-btn"
              onClick={refresh}
              title="Refresh"
            >
              <RefreshCw size={17} />
            </button>

            <div className="avatar mini">
              {user.full_name
                .split(' ')
                .map((x) => x[0])
                .slice(0, 2)
                .join('')}
            </div>
          </div>
        </header>

        <div className="content">
          {error && (
            <div className="error banner">
              {error}
              <button onClick={() => setError('')}>×</button>
            </div>
          )}

          {page === 'Overview' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">SECURITY OVERVIEW</div>
                  <h1>
                    Good morning, {user.full_name.split(' ')[0]}.
                  </h1>
                  <p className="muted">
                    Here’s what’s happening across your identity environment.
                  </p>
                </div>

                <button className="secondary" onClick={refresh}>
                  <RefreshCw size={15} />
                  Refresh data
                </button>
              </div>

              <div className="hero">
                <div className="hero-copy">
                  <div className="hero-tag">
                    <ShieldCheck size={14} />
                    IDENTITY HEALTH <span>● NOMINAL</span>
                  </div>

                  <h2>
                    Every identity.
                    <br />
                    <em>One secure place.</em>
                  </h2>

                  <p>
                    Manage access, monitor activity, and keep your organization
                    protected.
                  </p>

                  <button
                    className="hero-button"
                    onClick={() => setPage('User directory')}
                  >
                    Explore directory <span>↗</span>
                  </button>
                </div>

                <div className="orb-wrap">
                  <div className="orb-ring ring1"></div>
                  <div className="orb-ring ring2"></div>

                  <div className="orb">
                    <ShieldCheck size={55} />
                  </div>

                  <div className="float-card card-a">
                    <CheckCircle2 size={16} />
                    <div>
                      <b>Access verified</b>
                      <small>Policy enforcement active</small>
                    </div>
                  </div>

                  <div className="float-card card-b">
                    <Activity size={16} />
                    <div>
                      <b>Live monitoring</b>
                      <small>Audit stream connected</small>
                    </div>
                  </div>
                </div>
              </div>

              <div className="section-head">
                <div>
                  <h3>Identity metrics</h3>
                  <p className="muted">
                    A live snapshot of your workspace
                  </p>
                </div>
                <span className="updated">UPDATED JUST NOW</span>
              </div>

              <div className="metrics">
                <Metric
                  icon={<Users />}
                  label="Total identities"
                  value={stats?.total_users ?? '—'}
                  note="Registered accounts"
                  tone="violet"
                />

                <Metric
                  icon={<CheckCircle2 />}
                  label="Active identities"
                  value={stats?.active_users ?? '—'}
                  note="Enabled accounts"
                  tone="green"
                />

                <Metric
                  icon={<ScrollText />}
                  label="Audit events"
                  value={stats?.audit_events ?? '—'}
                  note="Recorded activities"
                  tone="blue"
                />

                <Metric
                  icon={<ShieldCheck />}
                  label="Your access level"
                  value={user.role}
                  note="Role-based permissions"
                  tone="amber"
                  capitalize
                />
              </div>

              <div className="lower-grid">
                <section className="panel">
                  <div className="panel-head">
                    <div>
                      <h3>Recently added identities</h3>
                      <p className="muted">
                        People with access to your workspace
                      </p>
                    </div>

                    <button
                      className="text-btn"
                      onClick={() => setPage('User directory')}
                    >
                      View all →
                    </button>
                  </div>

                  <UserRows users={users.slice(-4).reverse()} />
                </section>

                <section className="panel activity-panel">
                  <div className="panel-head">
                    <div>
                      <h3>Recent activity</h3>
                      <p className="muted">Latest security events</p>
                    </div>

                    {(user.role === 'admin' || user.role === 'manager') && (
                      <button
                        className="text-btn"
                        onClick={() => setPage('Audit trail')}
                      >
                        View logs →
                      </button>
                    )}
                  </div>

                  {audit.slice(0, 4).map((a) => (
                    <div className="activity-row" key={a.id}>
                      <div className="activity-icon">
                        <Activity size={16} />
                      </div>

                      <div className="activity-text">
                        <b>{a.action.replaceAll('_', ' ')}</b>
                        <small>
                          {a.actor_email} · {a.target}
                        </small>
                      </div>

                      <time>
                        {new Date(a.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </time>
                    </div>
                  ))}
                </section>
              </div>
            </>
          )}

          {page === 'User directory' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">ACCESS GOVERNANCE</div>
                  <h1>User directory</h1>
                  <p className="muted">
                    Manage identities, roles, and account status.
                  </p>
                </div>

                {user.role === 'admin' && (
                  <button
                    className="primary"
                    onClick={() => setShowCreate(true)}
                  >
                    <Plus size={17} />
                    Add identity
                  </button>
                )}
              </div>

              <section className="panel directory-panel">
                <div className="directory-tools">
                  <div className="search">
                    <Search size={17} />
                    <input
                      placeholder="Search by name, email, or role…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>

                  <span className="muted">
                    {filtered.length} identities
                  </span>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>IDENTITY</th>
                        <th>ROLE</th>
                        <th>STATUS</th>
                        <th>CREATED</th>
                        {user.role === 'admin' && <th>ACTION</th>}
                      </tr>
                    </thead>

                    <tbody>
                      {filtered.map((u) => (
                        <tr key={u.id}>
                          <td>
                            <div className="person">
                              <div className="avatar">
                                {u.full_name
                                  .split(' ')
                                  .map((x) => x[0])
                                  .slice(0, 2)
                                  .join('')}
                              </div>

                              <div>
                                <b>{u.full_name}</b>
                                <small>{u.email}</small>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className={`role role-${u.role}`}>
                              {u.role}
                            </span>
                          </td>

                          <td>
                            <span
                              className={
                                u.is_active
                                  ? 'status-active'
                                  : 'status-disabled'
                              }
                            >
                              <i />
                              {u.is_active ? 'Active' : 'Disabled'}
                            </span>
                          </td>

                          <td>
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>

                          {user.role === 'admin' && (
                            <td>
                              <button
                                className="secondary compact"
                                disabled={u.id === user.id}
                                onClick={() => toggle(u)}
                              >
                                {u.is_active ? 'Disable' : 'Enable'}
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {page === 'Audit trail' &&
            (user.role === 'admin' || user.role === 'manager') && (
              <>
                <div className="page-heading">
                  <div>
                    <div className="eyebrow">SECURITY & COMPLIANCE</div>
                    <h1>Audit trail</h1>
                    <p className="muted">
                      A chronological record of identity-related events.
                    </p>
                  </div>

                  <button className="secondary" onClick={refresh}>
                    <RefreshCw size={15} />
                    Refresh
                  </button>
                </div>

                <section className="panel directory-panel">
                  <div className="directory-tools">
                    <b>Event log</b>
                    <span className="muted">
                      {audit.length} recent events
                    </span>
                  </div>

                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>EVENT</th>
                          <th>ACTOR</th>
                          <th>TARGET</th>
                          <th>DETAIL</th>
                          <th>TIMESTAMP</th>
                        </tr>
                      </thead>

                      <tbody>
                        {audit.map((a) => (
                          <tr key={a.id}>
                            <td>
                              <span className="event-pill">{a.action}</span>
                            </td>
                            <td>{a.actor_email}</td>
                            <td>{a.target}</td>
                            <td>{a.detail || '—'}</td>
                            <td>
                              {new Date(a.created_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}

          <footer>
            © 2026 Northstar Identity Cloud
            <span>•</span> Built for secure access management
            <span className="footer-right">
              <ShieldCheck size={13} /> Security-first by design
            </span>
          </footer>
        </div>
      </main>

      {showCreate && (
        <div
          className="modal-backdrop"
          onClick={() => setShowCreate(false)}
        >
          <form
            className="modal"
            onSubmit={createUser}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h2>Add identity</h2>
                <p className="muted">
                  Create an account and assign its access role.
                </p>
              </div>

              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowCreate(false)}
              >
                ×
              </button>
            </div>

            <label>Full name</label>
            <input
              required
              minLength={2}
              value={form.full_name}
              onChange={(e) =>
                setForm({ ...form, full_name: e.target.value })
              }
            />

            <label>Work email</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
            />

            <label>Temporary password (12+ characters)</label>
            <input
              required
              minLength={12}
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm({ ...form, password: e.target.value })
              }
            />

            <label>Role</label>
            <select
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value })
              }
            >
              <option value="viewer">Viewer — read only</option>
              <option value="manager">Manager — audit access</option>
              <option value="admin">Admin — user management</option>
            </select>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>

              <button className="primary" type="submit">
                Create identity
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Metric({ icon, label, value, note, tone, capitalize }) {
  return (
    <div className="metric">
      <div className={'metric-icon ' + tone}>{icon}</div>
      <div className="metric-label">{label}</div>
      <div
        className={
          'metric-value ' + (capitalize ? 'capitalize' : '')
        }
      >
        {value}
      </div>
      <div className="metric-note">{note}</div>
    </div>
  );
}

function UserRows({ users }) {
  return (
    <div className="user-rows">
      {users.map((u) => (
        <div className="user-row" key={u.id}>
          <div className="avatar">
            {u.full_name
              .split(' ')
              .map((x) => x[0])
              .slice(0, 2)
              .join('')}
          </div>

          <div className="user-row-name">
            <b>{u.full_name}</b>
            <small>{u.email}</small>
          </div>

          <span className={`role role-${u.role}`}>{u.role}</span>

          <span
            className={
              u.is_active ? 'status-active' : 'status-disabled'
            }
          >
            <i />
          </span>
        </div>
      ))}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);