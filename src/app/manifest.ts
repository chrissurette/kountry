import type { MetadataRoute } from "next";

// TODO before real-device install testing: replace icon.svg with real PNG
// icons (192x192, 512x512, and a 180x180 apple-touch-icon) — iOS Safari does
// not honor SVG for "Add to Home Screen", only Chrome/Android does.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MyMenuAgent",
    short_name: "MyMenuAgent",
    description: "Photograph your handwritten menu, publish an on-brand digital menu instantly.",
    // The staff tool lives under /admin; scoping the PWA there keeps the
    // installed app inside the tool and out of the public marketing site.
    start_url: "/admin",
    scope: "/admin",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#171717",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
