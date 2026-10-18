'use client';

import { useEffect } from 'react';

const ERP_AUTH_KEY = 'fito6_erp_auth';

export function HomeLanding() {
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
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/login/admin-background.png')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#04101c]/20 via-transparent to-[#02060f]/70" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="flex-1" />
        <footer className="px-6 pb-8 pt-16 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.42em] text-sky-200/80">
            Train · Manage · Empower
          </p>
          <p className="mt-3 text-sm text-sky-100/75">FITO6 Fitness Studio · Tirupur</p>
          <p className="mt-1 text-xs text-sky-200/55">Dharapuram Road · Palladam Road</p>
          <p className="mt-6 text-[10px] uppercase tracking-[0.28em] text-sky-200/40">
            Built for a stronger tomorrow
          </p>
        </footer>
      </div>
    </div>
  );
}
