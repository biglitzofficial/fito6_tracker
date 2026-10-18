'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { LOGIN_PORTAL_LIST } from '@/lib/login-portals';

const ERP_AUTH_KEY = 'fito6_erp_auth';

export function PortalChooser() {
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ERP_AUTH_KEY);
      const a = raw ? JSON.parse(raw) : null;
      if (a?.token) window.location.replace('/fito6-erp.html');
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050b18] text-white">
      <div
        className="absolute inset-0 scale-110 bg-cover bg-center blur-md"
        style={{ backgroundImage: "url('/login/superadmin.jpg')" }}
      />
      <div className="absolute inset-0 bg-[#030910]/75" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1100px] flex-col justify-center px-5 py-12">
        <img src="/fito6-logo.webp" alt="FITO6" className="mx-auto mb-3 h-16 w-auto drop-shadow-[0_8px_30px_rgba(0,153,255,.45)]" />
        <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.42em] text-sky-300/80">
          Train · Manage · Empower
        </p>
        <h1 className="mb-2 text-center text-4xl font-extrabold tracking-[0.12em] text-white drop-shadow-[0_0_24px_rgba(50,160,255,.45)]">
          FITO6 LOGIN
        </h1>
        <p className="mb-10 text-center text-sm text-sky-100/70">Choose your command screen</p>

        <div className="grid gap-5 sm:grid-cols-2">
          {LOGIN_PORTAL_LIST.map((p) => (
            <Link
              key={p.id}
              href={p.path}
              className="group relative min-h-[220px] overflow-hidden rounded-[22px] border border-sky-400/25 shadow-[0_20px_50px_rgba(0,0,0,.45)] transition duration-300 hover:-translate-y-1 hover:border-sky-300/70 hover:shadow-[0_24px_60px_rgba(20,110,255,.35)]"
            >
              <img
                src={p.image}
                alt={p.title}
                className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#020814] via-[#020814]/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                {p.badge ? (
                  <span className="mb-2 inline-block rounded-full border border-sky-300/40 px-2.5 py-0.5 text-[10px] font-bold tracking-[0.18em] text-sky-100">
                    {p.badge}
                  </span>
                ) : null}
                <div className="text-xl font-extrabold tracking-[0.14em]">{p.title.toUpperCase()}</div>
                <div className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-sky-200/80">{p.kicker}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
