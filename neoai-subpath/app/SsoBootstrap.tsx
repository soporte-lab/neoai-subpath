'use client';
import { useEffect } from 'react';

export default function SsoBootstrap() {
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const sso = p.get('sso');
    if (sso) {
      localStorage.setItem('neoai_sso', sso);
      const u = new URL(window.location.href);
      u.searchParams.delete('sso');
      window.history.replaceState(null, '', u.toString());
    }
  }, []);
  return null;
}
