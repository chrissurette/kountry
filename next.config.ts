import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  // Dev-only: lets other devices on the LAN (the owner's tablet/phone) load
  // the dev server's own JS at http://<this PC's IP>:4000. Next.js 16 blocks
  // cross-origin /_next/* by default, which serves the HTML but never
  // hydrates React — buttons dead, links fine. Ignored by production builds;
  // update the IP here if this PC's DHCP lease ever changes.
  allowedDevOrigins: ["192.168.119.224"],
};

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);
