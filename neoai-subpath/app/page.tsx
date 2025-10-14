/* =================== Gating (login + membresía) =================== */
function Gate({ children }: { children: React.ReactNode }) {
  const { checkingAccess, needMembership, viewPlans, retry } = useLocale();
  const [state, setState] = useState<'checking' | 'allow' | 'upgrade' | 'login' | 'error'>('checking');

  const checkSession = useCallback(async () => {
    try {
      // ✅ Usa el helper que añade Authorization: Bearer <token>
      const data = await getSession();

      if (!data?.authenticated) {
        // No hay token SSO válido almacenado
        setState('login');
        return;
      }

      // Si hay sesión pero la membresía no está activa, bloquea
      if (data?.rcp_active === false) {
        setState('upgrade');
      } else {
        setState('allow');
      }
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => { void checkSession(); }, [checkSession]);

  if (state === 'checking') {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-neutral-950 text-neutral-300">
        <span>{checkingAccess}</span>
      </div>
    );
  }

  if (state === 'login') {
    // ⚠️ No hay sesión vía SSO. El usuario debe entrar en WP y/o usar el botón que genera ?sso=
    const back = typeof window !== 'undefined' ? encodeURIComponent(window.location.href) : '';
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-neutral-950 text-neutral-100">
        <div className="max-w-md text-center px-6">
          <h2 className="text-xl mb-3">Necesitas iniciar sesión para continuar.</h2>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <a
              className="inline-block mt-2 px-4 py-2 rounded-lg border border-neutral-700 hover:bg-neutral-900"
              href={`${LOGIN_URL}?redirect_to=${back}`}
            >
              Entrar en NeoRejuvenAI
            </a>
            <button
              onClick={() => { setState('checking'); void checkSession(); }}
              className="inline-block mt-2 px-4 py-2 rounded-lg border border-neutral-700 hover:bg-neutral-900"
            >
              {retry}
            </button>
          </div>
          <p className="mt-3 text-xs opacity-70">
            Consejo: accede desde neorejuvenai.com usando el botón “NeoRejuvenAI” que abre esta app con el token SSO.
          </p>
        </div>
      </div>
    );
  }

  if (state === 'upgrade') {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-neutral-950 text-neutral-100">
        <div className="max-w-md text-center px-6">
          <h2 className="text-xl mb-3">{needMembership}</h2>
          <a
            className="inline-block mt-2 px-4 py-2 rounded-lg border border-neutral-700 hover:bg-neutral-900"
            href={MEMBERSHIP_URL}
          >
            {viewPlans}
          </a>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-neutral-950 text-neutral-100">
        <div className="text-center">
          <p className="mb-3">No se pudo verificar el acceso.</p>
          <button
            onClick={() => { setState('checking'); void checkSession(); }}
            className="px-4 py-2 rounded-lg border border-neutral-700 hover:bg-neutral-900"
          >
            {retry}
          </button>
        </div>
      </div>
    );
  }

  // state === 'allow'
  return <>{children}</>;
}
