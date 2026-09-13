import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
   allowedDevOrigins: ['127.0.0.1'],
   output: "export",
   trailingSlash: true,
   // Default bottom-left sits on top of the sidebar's theme toggle.
   devIndicators: { position: "bottom-right" },
};

export default nextConfig;
