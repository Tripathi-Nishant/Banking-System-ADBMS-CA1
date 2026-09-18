import React, { useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  LayoutGrid, Users, CreditCard, ArrowLeftRight, BarChart3, Search,
  RefreshCw, ArrowDownToLine, ArrowUpFromLine, CornerDownRight, CornerUpRight,
  CheckCircle2, Bell, ChevronRight, Wallet,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Mock data — stands in for the live Oracle-backed API responses described
// in the brief (GET /api/health, /api/accounts, /api/transactions, etc).
// ---------------------------------------------------------------------------

const CUSTOMERS = [
  { id: "CUST-001", name: "Rahul Sharma" },
  { id: "CUST-002", name: "Aman Verma" },
  { id: "CUST-003", name: "Priya Nair" },
];

const ACCOUNTS = [
  { acct: "1001", type: "SAVINGS", customer: "Rahul Sharma", balance: 7000, status: "ACTIVE" },
  { acct: "1002", type: "SAVINGS", customer: "Aman Verma", balance: 3500, status: "ACTIVE" },
  { acct: "1003", type: "CURRENT", customer: "Priya Nair", balance: 8000, status: "ACTIVE" },
];

const TRANSACTIONS = [
  { id: "TX-006", type: "DEPOSIT", customer: "Priya Nair", acct: "1003", amount: 1500, date: "14 Sep, 08:10 PM", status: "Completed" },
  { id: "TX-005", type: "TRANSFER", customer: "Rahul Sharma", acct: "1001", amount: -500, to: "1002", date: "14 Sep, 06:44 PM", status: "Completed" },
  { id: "TX-004", type: "WITHDRAW", customer: "Aman Verma", acct: "1002", amount: -750, date: "13 Sep, 03:21 PM", status: "Completed" },
  { id: "TX-003", type: "DEPOSIT", customer: "Rahul Sharma", acct: "1001", amount: 2000, date: "12 Sep, 11:05 AM", status: "Completed" },
  { id: "TX-002", type: "WITHDRAW", customer: "Priya Nair", acct: "1003", amount: -300, date: "11 Sep, 09:52 AM", status: "Pending" },
  { id: "TX-001", type: "DEPOSIT", customer: "Aman Verma", acct: "1002", amount: 1000, date: "10 Sep, 04:18 PM", status: "Completed" },
];

const BALANCE_HISTORY = [
  { day: "Mon", balance: 15200 },
  { day: "Tue", balance: 15900 },
  { day: "Wed", balance: 15400 },
  { day: "Thu", balance: 16800 },
  { day: "Fri", balance: 17250 },
  { day: "Sat", balance: 17900 },
  { day: "Sun", balance: 18500 },
];

const ACTIVITY = [
  { day: "Mon", deposits: 2000, withdrawals: 600, transfers: 300 },
  { day: "Tue", deposits: 1200, withdrawals: 400, transfers: 500 },
  { day: "Wed", deposits: 900, withdrawals: 1100, transfers: 200 },
  { day: "Thu", deposits: 2600, withdrawals: 300, transfers: 800 },
  { day: "Fri", deposits: 1800, withdrawals: 950, transfers: 400 },
  { day: "Sat", deposits: 2100, withdrawals: 500, transfers: 600 },
  { day: "Sun", deposits: 1500, withdrawals: 750, transfers: 500 },
];

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { key: "accounts", label: "Accounts", icon: CreditCard },
  { key: "transfer", label: "Transfer", icon: ArrowLeftRight },
  { key: "customers", label: "Customers", icon: Users },
  { key: "reports", label: "Reports", icon: BarChart3 },
];

const fmtINR = (n) =>
  "₹" + Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TX_META = {
  DEPOSIT: { icon: ArrowDownToLine, color: "var(--accent)", label: "Deposit" },
  WITHDRAW: { icon: ArrowUpFromLine, color: "var(--danger)", label: "Withdraw" },
  TRANSFER: { icon: CornerUpRight, color: "var(--mint)", label: "Transfer" },
};

function Logo({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="var(--elevated)" stroke="var(--border)" />
      <path d="M11 28V12H14.6L23.4 24.2V12H27V28H23.4L14.6 15.8V28H11Z" fill="var(--accent)" />
      <path d="M24 19 L31 11" stroke="var(--mint)" strokeWidth="2" strokeLinecap="round" />
      <path d="M31 15 L31 11 L27 11" stroke="var(--mint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function StatusDot({ ok = true }) {
  return (
    <span className="status-dot-wrap">
      <span className={"status-dot " + (ok ? "ok" : "bad")} />
      <span className={"status-pulse " + (ok ? "ok" : "bad")} />
    </span>
  );
}

function StatCard({ label, value, sub, icon: Icon }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <div className="stat-icon"><Icon size={16} /></div>
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

function CustomTooltip({ active, payload, label, mode }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="tt-label">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="tt-row">
          <span className="tt-dot" style={{ background: p.color }} />
          <span className="tt-name">{p.name}</span>
          <span className="tt-value">{fmtINR(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function NexoraDashboard() {
  const [active, setActive] = useState("dashboard");
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState("09:42:13 PM");

  const totalBalance = useMemo(() => ACCOUNTS.reduce((s, a) => s + a.balance, 0), []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      const now = new Date();
      setLastSync(now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setRefreshing(false);
    }, 900);
  };

  return (
    <div className="nx-root">
      <style>{`
        .nx-root {
          --bg: #060D16;
          --navy: #07111F;
          --navy-2: #0D1B2A;
          --surface: #111D2E;
          --elevated: #16263A;
          --accent: #19C37D;
          --mint: #8BE0BE;
          --warn: #F5B942;
          --danger: #EF6262;
          --text: #F5F7FA;
          --text-2: #9AA8B8;
          --border: #243447;

          background: var(--bg);
          color: var(--text);
          font-family: 'Inter', 'Manrope', -apple-system, sans-serif;
          min-height: 100vh;
          display: flex;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid var(--border);
        }
        .nx-root * { box-sizing: border-box; }
        .mono { font-family: 'SFMono-Regular', 'Consolas', 'Menlo', monospace; letter-spacing: 0.2px; }

        /* Sidebar */
        .sidebar {
          width: 216px;
          flex-shrink: 0;
          background: var(--navy);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          padding: 20px 14px;
        }
        .brand { display: flex; align-items: center; gap: 10px; padding: 4px 6px 22px; }
        .brand-name { font-weight: 650; font-size: 14.5px; line-height: 1.15; }
        .brand-tag { font-size: 10.5px; color: var(--text-2); margin-top: 1px; }
        .nav-list { display: flex; flex-direction: column; gap: 3px; margin-top: 6px; }
        .nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px; border-radius: 9px;
          font-size: 13.5px; color: var(--text-2); cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
          border: 1px solid transparent;
        }
        .nav-item:hover { background: rgba(255,255,255,0.03); color: var(--text); }
        .nav-item.active {
          background: rgba(25,195,125,0.10);
          color: var(--accent);
          border-color: rgba(25,195,125,0.25);
        }
        .sidebar-foot {
          margin-top: auto; padding: 12px; border-radius: 10px;
          background: var(--surface); border: 1px solid var(--border);
          font-size: 11.5px; color: var(--text-2);
        }
        .sidebar-foot .name { color: var(--text); font-size: 12.5px; font-weight: 600; }

        /* Main */
        .main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 26px; border-bottom: 1px solid var(--border);
          background: var(--navy-2);
        }
        .search-box {
          display: flex; align-items: center; gap: 8px;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 8px; padding: 7px 12px; width: 260px;
          color: var(--text-2); font-size: 12.5px;
        }
        .topbar-right { display: flex; align-items: center; gap: 14px; }
        .icon-btn {
          width: 32px; height: 32px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          background: var(--surface); border: 1px solid var(--border);
          color: var(--text-2); cursor: pointer;
        }
        .admin-chip { display: flex; align-items: center; gap: 8px; }
        .avatar {
          width: 28px; height: 28px; border-radius: 7px;
          background: linear-gradient(150deg, var(--accent), var(--mint));
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; color: #06120C;
        }

        .content { padding: 26px; overflow-y: auto; }

        /* Hero */
        .hero { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 22px; }
        .hero h1 { font-size: 21px; font-weight: 650; margin: 0 0 4px; letter-spacing: -0.2px; }
        .hero p { font-size: 13px; color: var(--text-2); margin: 0; }
        .sync-block { text-align: right; display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }
        .sync-time { font-size: 11.5px; color: var(--text-2); }
        .sync-time span { color: var(--text); }
        .status-line { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--text-2); }
        .status-dot-wrap { position: relative; width: 8px; height: 8px; display: inline-flex; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); z-index: 2; position: relative; }
        .status-dot.bad { background: var(--danger); }
        .status-pulse {
          position: absolute; inset: 0; border-radius: 50%; background: var(--accent);
          animation: pulse 2s ease-out infinite;
        }
        .status-pulse.bad { background: var(--danger); }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.55; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        .refresh-btn {
          display: flex; align-items: center; gap: 6px;
          background: var(--elevated); border: 1px solid var(--border);
          color: var(--text); font-size: 12px; font-weight: 550;
          padding: 7px 12px; border-radius: 8px; cursor: pointer;
          transition: border-color 0.15s ease;
        }
        .refresh-btn:hover { border-color: var(--accent); }
        .refresh-btn svg { transition: transform 0.6s ease; }
        .refresh-btn.spinning svg { animation: spin 0.9s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Stat cards */
        .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
        .stat-card {
          background: linear-gradient(180deg, var(--surface), var(--navy-2));
          border: 1px solid var(--border); border-radius: 12px;
          padding: 16px 16px 14px; transition: border-color 0.15s ease, transform 0.15s ease;
        }
        .stat-card:hover { border-color: #33495f; transform: translateY(-1px); }
        .stat-top { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
        .stat-icon {
          width: 26px; height: 26px; border-radius: 7px;
          background: rgba(25,195,125,0.12); color: var(--accent);
          display: flex; align-items: center; justify-content: center;
        }
        .stat-label { font-size: 11.5px; color: var(--text-2); font-weight: 550; }
        .stat-value { font-size: 23px; font-weight: 650; letter-spacing: -0.3px; }
        .stat-sub { font-size: 11px; color: var(--mint); margin-top: 4px; }

        /* Chart panels */
        .chart-grid { display: grid; grid-template-columns: 1.3fr 1fr; gap: 14px; margin-bottom: 20px; }
        .panel {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 12px; padding: 18px 18px 8px;
        }
        .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
        .panel-title { font-size: 13.5px; font-weight: 600; }
        .panel-sub { font-size: 11px; color: var(--text-2); }
        .chart-tooltip {
          background: var(--elevated); border: 1px solid var(--border);
          border-radius: 8px; padding: 8px 10px; font-size: 11.5px;
        }
        .tt-label { color: var(--text-2); margin-bottom: 4px; }
        .tt-row { display: flex; align-items: center; gap: 6px; }
        .tt-dot { width: 6px; height: 6px; border-radius: 50%; }
        .tt-name { color: var(--text-2); margin-right: 6px; }
        .tt-value { color: var(--text); font-weight: 600; margin-left: auto; }

        /* Table */
        .panel-table { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
        .table-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px 10px; }
        .see-all { font-size: 12px; color: var(--accent); display: flex; align-items: center; gap: 3px; cursor: pointer; }
        table.tx-table { width: 100%; border-collapse: collapse; }
        .tx-table th {
          text-align: left; font-size: 10.5px; color: var(--text-2); font-weight: 550;
          padding: 8px 18px; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
        }
        .tx-table td { padding: 12px 18px; font-size: 12.5px; border-bottom: 1px solid var(--border); }
        .tx-table tr:last-child td { border-bottom: none; }
        .tx-table tr:hover td { background: rgba(255,255,255,0.015); }
        .tx-type { display: flex; align-items: center; gap: 8px; }
        .tx-type-icon {
          width: 26px; height: 26px; border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.04);
        }
        .amt-pos { color: var(--accent); font-weight: 600; }
        .amt-neg { color: var(--danger); font-weight: 600; }
        .id-mono { color: var(--text-2); }
        .acct-mono { color: var(--text-2); }
        .badge {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 10.5px; padding: 3px 8px; border-radius: 20px;
          border: 1px solid;
        }
        .badge.completed { color: var(--accent); border-color: rgba(25,195,125,0.35); background: rgba(25,195,125,0.08); }
        .badge.pending { color: var(--warn); border-color: rgba(245,185,66,0.35); background: rgba(245,185,66,0.08); }
      `}</style>

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <Logo />
          <div>
            <div className="brand-name">NEXORA BANK</div>
            <div className="brand-tag">Banking, engineered for clarity.</div>
          </div>
        </div>
        <nav className="nav-list">
          {NAV.map((n) => (
            <div
              key={n.key}
              className={"nav-item" + (active === n.key ? " active" : "")}
              onClick={() => setActive(n.key)}
            >
              <n.icon size={15} />
              {n.label}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="name">Demo Administrator</div>
          Session · not for production use
        </div>
      </aside>

      {/* Main */}
      <div className="main">
        <div className="topbar">
          <div className="search-box">
            <Search size={14} />
            Search customer, account, transaction ID
          </div>
          <div className="topbar-right">
            <div className="icon-btn"><Bell size={15} /></div>
            <div className="admin-chip">
              <div className="avatar">DA</div>
            </div>
          </div>
        </div>

        <div className="content">
          {/* Hero */}
          <div className="hero">
            <div>
              <h1>Good evening, Admin</h1>
              <p>Your banking overview at a glance.</p>
            </div>
            <div className="sync-block">
              <div className="status-line">
                <StatusDot ok />
                Oracle Database Connected
              </div>
              <div className="sync-time">
                Last synchronized: <span>{lastSync}</span>
              </div>
              <button className={"refresh-btn" + (refreshing ? " spinning" : "")} onClick={handleRefresh}>
                <RefreshCw size={13} />
                {refreshing ? "Refreshing…" : "Refresh data"}
              </button>
            </div>
          </div>

          {/* Stat cards */}
          <div className="stat-grid">
            <StatCard label="Total Customers" value={CUSTOMERS.length} sub="Current database value" icon={Users} />
            <StatCard label="Total Accounts" value={ACCOUNTS.length} sub="Current database value" icon={CreditCard} />
            <StatCard label="Total Bank Balance" value={fmtINR(totalBalance)} sub="Live from Oracle" icon={Wallet} />
            <StatCard label="Total Transactions" value={TRANSACTIONS.length} sub="Live from Oracle" icon={ArrowLeftRight} />
          </div>

          {/* Charts */}
          <div className="chart-grid">
            <div className="panel">
              <div className="panel-head">
                <div>
                  <div className="panel-title">Balance Overview</div>
                  <div className="panel-sub">Aggregate balance, last 7 days</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={BALANCE_HISTORY} margin={{ top: 10, right: 6, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#19C37D" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#19C37D" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#243447" strokeDasharray="3 6" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: "#9AA8B8", fontSize: 11 }} axisLine={{ stroke: "#243447" }} tickLine={false} />
                  <YAxis tick={{ fill: "#9AA8B8", fontSize: 11 }} axisLine={false} tickLine={false} width={50}
                    tickFormatter={(v) => "₹" + (v / 1000) + "k"} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="balance" name="Balance" stroke="#19C37D" strokeWidth={2} fill="url(#balGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="panel">
              <div className="panel-head">
                <div>
                  <div className="panel-title">Transaction Activity</div>
                  <div className="panel-sub">By type, last 7 days</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ACTIVITY} margin={{ top: 10, right: 6, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="#243447" strokeDasharray="3 6" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: "#9AA8B8", fontSize: 11 }} axisLine={{ stroke: "#243447" }} tickLine={false} />
                  <YAxis tick={{ fill: "#9AA8B8", fontSize: 11 }} axisLine={false} tickLine={false} width={50}
                    tickFormatter={(v) => "₹" + (v / 1000) + "k"} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: "#9AA8B8" }} iconSize={8} iconType="circle" />
                  <Bar dataKey="deposits" name="Deposits" fill="#19C37D" radius={[3, 3, 0, 0]} maxBarSize={14} />
                  <Bar dataKey="withdrawals" name="Withdrawals" fill="#EF6262" radius={[3, 3, 0, 0]} maxBarSize={14} />
                  <Bar dataKey="transfers" name="Transfers" fill="#8BE0BE" radius={[3, 3, 0, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent transactions */}
          <div className="panel-table">
            <div className="table-head">
              <div className="panel-title">Recent Transactions</div>
              <div className="see-all">View all <ChevronRight size={13} /></div>
            </div>
            <table className="tx-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Transaction ID</th>
                  <th>Customer</th>
                  <th>Account</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {TRANSACTIONS.map((t) => {
                  const meta = TX_META[t.type];
                  const Icon = meta.icon;
                  return (
                    <tr key={t.id}>
                      <td>
                        <div className="tx-type">
                          <div className="tx-type-icon">
                            <Icon size={13} color={meta.color} />
                          </div>
                          {meta.label}
                        </div>
                      </td>
                      <td className="mono id-mono">#{t.id}</td>
                      <td>{t.customer}</td>
                      <td className="mono acct-mono">•••• {t.acct}</td>
                      <td className={t.amount >= 0 ? "amt-pos" : "amt-neg"}>
                        {t.amount >= 0 ? "+" : "−"}{fmtINR(t.amount)}
                      </td>
                      <td style={{ color: "var(--text-2)" }}>{t.date}</td>
                      <td>
                        <span className={"badge " + (t.status === "Completed" ? "completed" : "pending")}>
                          <CheckCircle2 size={10} />
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
