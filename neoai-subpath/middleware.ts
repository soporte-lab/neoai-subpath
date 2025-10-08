// middleware.ts (colócalo en la MISMA carpeta donde están package.json y next.config.*)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SUPPORTED = ["es", "en", "fr", "it", "de"] as const;
const DEFAULT = "es";

function pickLang(accept: string): string {
  const prefs = accept
    .split(",")
    .map(p => p.split(";")[0].trim().toLowerCase())
    .map(code => code.split("-")[0]);
  return prefs.find(l => SUPPORTED.includes(l as any)) || DEFAULT;
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // 1) Redirige /en|fr|it|de/neoai -> /neoai y fija cookie de idioma
  const m = pathname.match(/^\/(en|fr|it|de)\/neoai(\/.*)?$/i);
  if (m) {
    const lang = m[1].toLowerCase();
    const dest = pathname.replace(/^\/(en|fr|it|de)/i, ""); // quita el prefijo
    const url = new URL(dest + (search || ""), req.url);
    const res = NextResponse.redirect(url);
    res.cookies.set("lang", lang, { path: "/", maxAge: 60 * 60 * 24 * 365 });
    return res;
  }

  // Solo actuamos bajo /neoai
  if (!pathname.startsWith("/neoai")) return NextResponse.next();

  // 2) Permite forzar por query (?lang=de)
  const force = req.nextUrl.searchParams.get("lang");
  if (force && SUPPORTED.includes(force as any)) {
    const res = NextResponse.next();
    res.cookies.set("lang", force, { path: "/", maxAge: 60 * 60 * 24 * 365 });
    return res;
  }

  // 3) Si ya hay cookie válida, seguir
  const cookie = req.cookies.get("lang")?.value;
  if (cookie && SUPPORTED.includes(cookie as any)) return NextResponse.next();

  // 4) Detecta por Accept-Language y guarda cookie
  const detected = pickLang(req.headers.get("accept-language") || "");
  const res = NextResponse.next();
  res.cookies.set("lang", detected, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  return res;
}

// Asegúrate de que también interceptamos /en/neoai, /fr/neoai, etc.
export const config = {
  matcher: [
    "/neoai/:path*",
    "/en/neoai/:path*",
    "/fr/neoai/:path*",
    "/it/neoai/:path*",
    "/de/neoai/:path*",
  ],
};
