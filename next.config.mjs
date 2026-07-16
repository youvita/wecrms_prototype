/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit a fully static site (HTML/CSS/JS) into ./out — no Node server needed.
  output: "export",
  trailingSlash: true,            // each route becomes <route>/index.html (works on any static host)
  images: { unoptimized: true },  // no server-side image optimization in a static export
  eslint: { ignoreDuringBuilds: true },
  // Empty Turbopack config: the default `next build` uses Turbopack (Next 16), and this
  // silences the "webpack config with Turbopack" error. The webpack override below only
  // takes effect for `next build --webpack` (used by `npm run preview:static`).
  turbopack: {},
  // `--webpack` only: "auto" makes the webpack runtime resolve chunk URLs relative to the
  // executing script instead of a fixed "/_next/" — required to hydrate over file://.
  webpack: (config) => {
    config.output.publicPath = "auto";
    return config;
  },
};
export default nextConfig;
