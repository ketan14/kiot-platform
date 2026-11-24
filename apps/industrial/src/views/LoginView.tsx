import React, { useState } from 'react';
import {
  Radio,
  ShieldCheck,
  Lock,
  Mail,
  User,
  Building2,
  ArrowRight,
  AlertCircle,
  KeyRound,
  Cpu,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { loginWithEmail, registerAccount } from '../api/auth';
import { useOrgStore } from '../stores/orgStore';

interface DemoAccount {
  label: string;
  role: string;
  email: string;
  name: string;
  description: string;
  badgeColor: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: 'Owner / Super Admin',
    role: 'OWNER',
    email: 'admin@apex.kiot.io',
    name: 'Rajesh Sharma',
    description: 'Full access: Multi-org switcher, team RBAC, device provisioning, commands',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
  {
    label: 'Plant Manager',
    role: 'MANAGER',
    email: 'manager@apex.kiot.io',
    name: 'Priya Nair',
    description: 'Manage devices, plant hierarchy, alerts & actuators (no team removal)',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  },
  {
    label: 'Floor Operator',
    role: 'OPERATOR',
    email: 'operator@apex.kiot.io',
    name: 'Amit Patel',
    description: 'Dispatch machine commands & acknowledge alerts (read-only fleet registry)',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  {
    label: 'Quality / Auditor',
    role: 'VIEWER',
    email: 'viewer@apex.kiot.io',
    name: 'Vikram Desai',
    description: 'Read-only live telemetry scope & historical analytics (no control actions)',
    badgeColor: 'bg-slate-700/60 text-slate-300 border-slate-600',
  },
];

export const LoginView: React.FC = () => {
  const setSession = useOrgStore((s) => s.setSession);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('admin@apex.kiot.io');
  const [password, setPassword] = useState('kiot12345');
  const [fullName, setFullName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const res = await loginWithEmail(email, password);
        setSession({
          accessToken: res.accessToken,
          expiresAt: res.expiresAt,
          user: res.user,
          activeOrganization: res.activeOrganization,
          organizations: res.organizations,
        });
      } else {
        const res = await registerAccount({
          fullName,
          email,
          password,
          organizationName: organizationName.trim() || undefined,
        });
        setSession({
          accessToken: res.accessToken,
          expiresAt: res.expiresAt,
          user: res.user,
          activeOrganization: res.activeOrganization,
          organizations: res.organizations,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async (account: DemoAccount) => {
    setMode('login');
    setEmail(account.email);
    setPassword('kiot12345');
    setError(null);
    setIsLoading(true);

    try {
      const res = await loginWithEmail(account.email, 'kiot12345');
      setSession({
        accessToken: res.accessToken,
        expiresAt: res.expiresAt,
        user: res.user,
        activeOrganization: res.activeOrganization,
        organizations: res.organizations,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Quick login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row font-sans bg-grid-pattern">
      {/* Left Brand & Architecture Showcase Panel */}
      <div className="lg:w-7/12 p-8 lg:p-14 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800/80 bg-gradient-to-br from-slate-900/90 via-slate-950 to-slate-950">
        <div>
          {/* Brand Logo */}
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Radio className="w-6 h-6 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-xl tracking-tight text-white">KIOT PLATFORM</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  INDUSTRIAL IIoT
                </span>
              </div>
              <p className="text-xs text-slate-400">Connected Intelligence for the Physical World</p>
            </div>
          </div>

          {/* Hero Copy */}
          <div className="mt-10 max-w-xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-4">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Multi-Tenant PostgreSQL RLS + JWT Session Isolation</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
              Industrial Supervisory Control & Telemetry Portal
            </h1>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">
              Sign in to monitor real-time EMQX MQTT sensor streams, inspect TimescaleDB continuous aggregates, dispatch QoS-1 actuator commands, and manage multi-site factory hierarchies with strict Role-Based Access Control (RBAC).
            </p>
          </div>

          {/* One-Click Demo Role Switcher Cards */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                <span>Instant One-Click RBAC Demo Logins (Password: kiot12345)</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DEMO_ACCOUNTS.map((acct) => (
                <button
                  key={acct.email}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleQuickDemoLogin(acct)}
                  className={`text-left p-3.5 rounded-xl border transition-all group ${
                    email === acct.email
                      ? 'bg-amber-500/10 border-amber-500/50 shadow-md'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white group-hover:text-amber-300 transition">
                      {acct.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${acct.badgeColor}`}
                    >
                      {acct.role}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-amber-400/90 mt-0.5">{acct.email}</div>
                  <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2">{acct.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Architecture Badges */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-4 text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-amber-400 shrink-0" />
            <span>EMQX 5.8 MQTT Broker</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>TimescaleDB Hypertables</span>
          </div>
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-blue-400 shrink-0" />
            <span>5-Tier RBAC Matrix</span>
          </div>
        </div>
      </div>

      {/* Right Authentication Form Panel */}
      <div className="lg:w-5/12 p-8 lg:p-14 flex items-center justify-center">
        <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-7 shadow-2xl">
          {/* Mode Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-2 rounded-lg text-xs font-bold transition ${
                mode === 'login'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`py-2 rounded-lg text-xs font-bold transition ${
                mode === 'register'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="mb-5">
            <h2 className="text-xl font-extrabold text-white">
              {mode === 'login' ? 'Sign in to your account' : 'Register operator account'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {mode === 'login'
                ? 'Enter your credentials or click a demo role card on the left.'
                : 'Create a new account or claim an invited team email address.'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g., Rohan Kulkarni"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="name@company.kiot.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={mode === 'register' ? 8 : 6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  New Organization Name{' '}
                  <span className="text-slate-500 font-normal">
                    (Optional — leave blank to join Apex Precision Demo)
                  </span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g., Tata Smart Foundry Ltd."
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              <span>
                {isLoading
                  ? 'Authenticating...'
                  : mode === 'login'
                    ? 'Sign In to Industrial Portal'
                    : 'Create Account & Launch'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
