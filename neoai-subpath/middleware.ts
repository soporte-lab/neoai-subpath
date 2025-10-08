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

  // A) Raíz del dominio → /neoai (fija cookie por Accept-Language)
  if (pathname === "/") {
    const detected = pickLang(req.headers.get("accept-language") || "");
    const url = new URL("/neoai" + (search || ""), req.url);
    const res = NextResponse.redirect(url);
    res.cookies.set("lang", detected, { path: "/", maxAge: 60 * 60 * 24 * 365 });
    return res;
  }

  // B) /en | /fr | /it | /de → /neoai (fija cookie al prefijo)
  const rootLang = pathname.match(/^\/(en|fr|it|de)\/?$/i);
  if (rootLang) {
    const lang = rootLang[1].toLowerCase();
    const url = new URL("/neoai" + (search || ""), req.url);
    const res = NextResponse.redirect(url);
    res.cookies.set("lang", lang, { path: "/", maxAge: 60 * 60 * 24 * 365 });
    return res;
  }

  // C) Normaliza /en|fr|it|de/neoai -> /neoai (mantén cookie)
  const prefixed = pathname.match(/^\/(en|fr|it|de)\/neoai(\/.*)?$/i);
  if (prefixed) {
    const lang = prefixed[1].toLowerCase();
    const dest = pathname.replace(/^\/(en|fr|it|de)/i, ""); // quita prefijo
    const url = new URL(dest + (search || ""), req.url);
    const res = NextResponse.redirect(url);
    res.cookies.set("lang", lang, { path: "/", maxAge: 60 * 60 * 24 * 365 });
    return res;
  }

  // Solo actuamos bajo /neoai a partir de aquí
  if (!pathname.startsWith("/neoai")) return NextResponse.next();

  // D) Permite forzar ?lang=xx
  const force = req.nextUrl.searchParams.get("lang");
  if (force && SUPPORTED.includes(force as any)) {
    const res = NextResponse.next();
    res.cookies.set("lang", force, { path: "/", maxAge: 60 * 60 * 24 * 365 });
    return res;
  }

  // E) Si ya hay cookie válida, seguir
  const cookie = req.cookies.get("lang")?.value;
  if (cookie && SUPPORTED.includes(cookie as any)) return NextResponse.next();

  // F) Detecta por Accept-Language y guarda cookie
  const detected = pickLang(req.headers.get("accept-language") || "");
  const res = NextResponse.next();
  res.cookies.set("lang", detected, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  return res;
}

export const config = {
  matcher: [
    "/",                 // raíz
    "/(en|fr|it|de)",    // raíces con prefijo
    "/neoai/:path*",     // tu app
    "/(en|fr|it|de)/neoai/:path*", // compat con links antiguos
  ],
};
