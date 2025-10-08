/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // Sirve la app raíz bajo /neoai*
      { source: "/neoai", destination: "/" },
      { source: "/neoai/:path*", destination: "/:path*" },
    ];
  },
};

export default nextConfig;
