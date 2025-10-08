// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Toda la app bajo /neoai
  basePath: "/neoai",

  // i18n: 5 idiomas, ES por defecto SIN prefijo
  i18n: {
    locales: ["es", "en", "fr", "it", "de"],
    defaultLocale: "es",
    localeDetection: false, // así controlas tú el idioma
  },
};

export default nextConfig;
