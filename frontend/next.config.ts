import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "krish-ss9t.onrender.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
