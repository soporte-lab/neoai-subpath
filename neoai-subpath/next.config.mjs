/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/neoai",
  async redirects() {
    return [
      // raíz del dominio → /neoai
      { source: "/", destination: "/neoai", permanent: false },

      // opcional: si alguien entra a /en, /fr, /it o /de, llévalo a /neoai
      { source: "/:lang(en|fr|it|de)", destination: "/neoai", permanent: false },
    ];
  },
};

export default nextConfig;
