import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "fluent — language arcade",
    short_name: "fluent",
    description: "Personal adaptive Spanish & French trainer",
    start_url: "/",
    display: "standalone",
    background_color: "#faf3e7",
    theme_color: "#faf3e7",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
