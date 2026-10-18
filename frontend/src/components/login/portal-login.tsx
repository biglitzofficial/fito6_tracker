'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Lock, User, MapPin, BarChart3, Users, Settings, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import { LOGIN_PORTALS, type LoginFeature, type LoginPortalId } from '@/lib/login-portals';
import type { User as AuthUser } from '@/types';

const REMEMBER_KEY = 'fito6_login_remember';
const PORTAL_KEY = 'fito6_login_portal';
const ERP_AUTH_KEY = 'fito6_erp_auth';

type Business = { id: string; name?: string; gymName?: string };

function matchGym(businesses: Business[], portalId: LoginPortalId) {
  const keys = LOGIN_PORTALS[portalId].match.map((k) => k.toLowerCase());
  if (!keys.length) return businesses[0] || null;
  return (
    businesses.find((b) => {
      const n = String(b.name || b.gymName || '').toLowerCase();
      return keys.some((k) => n.includes(k));
    }) ||
    businesses[0] ||
    null
  );
}

function FeatureIcon({ icon }: { icon: LoginFeature['icon'] }) {
  const cls = 'h-5 w-5 text-sky-200';
  if (icon === 'chart') return <BarChart3 className={cls} />;
  if (icon === 'users') return <Users className={cls} />;
  if (icon === 'gear') return <Settings className={cls} />;
  return <TrendingUp className={cls} />;
}

export function PortalLogin({ portalId }: { portalId: LoginPortalId }) {
  const portal = LOGIN_PORTALS[portalId];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ERP_AUTH_KEY);
      const a = raw ? JSON.parse(raw) : null;
      if (a?.token) {
        window.location.replace('/fito6-erp.html');
        return;
      }
    } catch {
      /* ignore */
    }
    try {
      const saved = JSON.parse(localStorage.getItem(REMEMBER_KEY) || 'null');
      if (saved?.email) {
        setEmail(saved.email);
        setRemember(true);
      }
    } catch {
      /* ignore */
    }
    localStorage.setItem(PORTAL_KEY, window.location.pathname || portal.path);
  }, [portal.path]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Enter email and password');
      return;
    }
    setLoading(true);
    try {
      const result = await api.post<{ token: string; user: AuthUser }>('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });
      localStorage.setItem('token', result.token);
      const businesses = (await api.get<Business[]>('/businesses')) || [];
      const isSuper = result.user.role === 'SUPERADMIN';
      const matched = isSuper ? null : matchGym(businesses, portalId);
      localStorage.setItem(
        ERP_AUTH_KEY,
        JSON.stringify({
          token: result.token,
          user: result.user,
          businesses,
          businessId: isSuper ? null : matched?.id || businesses[0]?.id || null,
        })
      );
      if (remember) localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email: email.trim().toLowerCase(), portal: portalId }));
      else localStorage.removeItem(REMEMBER_KEY);
      localStorage.setItem(PORTAL_KEY, window.location.pathname || portal.path);
      window.location.href = '/fito6-erp.html';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setLoading(false);
    }
  }

  const inputClass =
    'h-12 w-full rounded-2xl border border-sky-300/35 bg-[#071428]/55 pl-11 pr-11 text-sm text-white outline-none placeholder:text-sky-200/35 focus:border-sky-300 focus:ring-2 focus:ring-sky-400/25';

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050b18] text-white">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${portal.image}')` }} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#04101c]/10 to-[#02060f]/55" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-start px-4 pb-8 pt-[26vh]">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-[440px] rounded-[32px] border border-sky-300/40 bg-[linear-gradient(180deg,rgba(8,28,58,.55),rgba(6,18,40,.72))] px-8 pb-8 pt-7 shadow-[0_0_40px_rgba(40,150,255,.28),0_0_0_1px_rgba(90,200,255,.2),inset_0_1px_0_rgba(255,255,255,.18)] backdrop-blur-xl"
        >
          <p className="text-center text-[13px] font-semibold uppercase tracking-[0.28em] text-sky-100/90">
            {portal.panelLabel}
          </p>

          <div className="relative mb-3 mt-6">
            <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-200/80" />
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder="Username"
              className={inputClass}
            />
          </div>
          <div className="relative mb-4">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-200/80" />
            <input
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              placeholder="Password"
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sky-200/80"
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="mb-5 flex items-center justify-between text-xs text-sky-100/85">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={remember}
                onChange={(ev) => setRemember(ev.target.checked)}
                className="h-4 w-4 accent-sky-400"
              />
              Remember Me
            </label>
            <Link href="/forgot-password" className="text-sky-300 hover:underline">
              Forgot Password?
            </Link>
          </div>

          {error ? <div className="mb-3 text-center text-sm text-red-300">{error}</div> : null}

          <button
            type="submit"
            disabled={loading}
            className="login-cta h-12 w-full rounded-full text-sm font-extrabold tracking-[0.28em] text-white disabled:opacity-70"
          >
            {loading ? 'SIGNING IN…' : 'LOGIN →'}
          </button>

          <div className="mt-6 grid grid-cols-4 gap-2 border-t border-sky-300/15 pt-5">
            {portal.features.map((f) => (
              <div key={f.label} className="flex flex-col items-center gap-1.5 text-center">
                <FeatureIcon icon={f.icon} />
                <span className="text-[9px] font-semibold uppercase leading-tight tracking-wide text-sky-100/75">
                  {f.label}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-5 text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-sky-200/55">
            Built for a stronger tomorrow
          </p>
        </form>

        {portal.location ? (
          <p className="mt-6 flex max-w-md items-start gap-2 text-center text-[11px] leading-relaxed text-sky-100/70">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {portal.location}
          </p>
        ) : null}
      </div>

      <style>{`
        .login-cta {
          background: linear-gradient(90deg, #19a7ff, #0b63ff 55%, #2eb6ff);
          box-shadow: 0 10px 28px rgba(20, 110, 255, 0.5);
        }
        .login-cta:hover { filter: brightness(1.08); }
      `}</style>
    </div>
  );
}
