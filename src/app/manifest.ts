import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Servant Youth Leadership Academy",
    short_name: "SYLA",
    description: "SYLA 러닝 플랫폼 - 커리큘럼, 출석, 소그룹, 배지",
    start_url: "/home",
    display: "standalone",
    background_color: "#f7f6f2",
    theme_color: "#0c2d55",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
