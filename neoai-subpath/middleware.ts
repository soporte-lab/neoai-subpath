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

  // Normaliza /en|fr|it|de/neoai -> /neoai (mantén cookie)
  const prefixed = pathname.match(/^\/(en|fr|it|de)\/neoai(\/.*)?$/i);
  if (prefixed) {
    const lang = prefixed[1].toLowerCase();
    const dest = pathname.replace(/^\/(en|fr|it|de)/i, ""); // quita prefijo
    const url = new URL(dest + (search || ""), req.url);
    const res = NextResponse.redirect(url);
    res.cookies.set("lang", lang, { path: "/", maxAge: 60 * 60 * 24 * 365 });
    return res;
  }

  // Solo actuamos dentro de /neoai
  if (!pathname.startsWith("/neoai")) return NextResponse.next();

  // Permite forzar ?lang=xx
  const force = req.nextUrl.searchParams.get("lang");
  if (force && SUPPORTED.includes(force as any)) {
    const res = NextResponse.next();
    res.cookies.set("lang", force, { path: "/", maxAge: 60 * 60 * 24 * 365 });
    return res;
  }

  // Si ya hay cookie válida, seguir
  const cookie = req.cookies.get("lang")?.value;
  if (cookie && SUPPORTED.includes(cookie as any)) return NextResponse.next();

  // Detecta por Accept-Language y guarda cookie
  const detected = pickLang(req.headers.get("accept-language") || "");
  const res = NextResponse.next();
  res.cookies.set("lang", detected, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  return res;
}

export const config = {
  matcher: [
    "/neoai/:path*",
    "/(en|fr|it|de)/neoai/:path*",
  ],
};
