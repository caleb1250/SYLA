/**
 * Turns the link an admin pastes (a normal YouTube / Vimeo / Google Drive share link)
 * into a URL that can be embedded in an <iframe>. Returns null for anything that
 * isn't an https URL.
 */
export function toEmbedUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;

  const host = url.hostname.replace(/^www\.|^m\./, "");

  // YouTube: watch?v=ID, youtu.be/ID, /shorts/ID, /live/ID, /embed/ID
  if (host === "youtube.com" || host === "youtu.be" || host === "youtube-nocookie.com") {
    let id: string | null = null;
    if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0] || null;
    else if (url.pathname === "/watch") id = url.searchParams.get("v");
    else {
      const m = url.pathname.match(/^\/(?:shorts|live|embed)\/([^/?#]+)/);
      id = m?.[1] ?? null;
    }
    if (!id || !/^[\w-]{6,}$/.test(id)) return null;
    const start = parseStartSeconds(url.searchParams.get("t") ?? url.searchParams.get("start"));
    return `https://www.youtube-nocookie.com/embed/${id}${start ? `?start=${start}` : ""}`;
  }

  // Vimeo: vimeo.com/123456789
  if (host === "vimeo.com") {
    const m = url.pathname.match(/^\/(\d+)/);
    return m ? `https://player.vimeo.com/video/${m[1]}` : null;
  }
  if (host === "player.vimeo.com") return url.toString();

  // Google Drive: /file/d/ID/view → /file/d/ID/preview
  if (host === "drive.google.com") {
    const m = url.pathname.match(/^\/file\/d\/([^/]+)/);
    return m ? `https://drive.google.com/file/d/${m[1]}/preview` : null;
  }

  return url.toString();
}

function parseStartSeconds(t: string | null): number | null {
  if (!t) return null;
  if (/^\d+$/.test(t)) return Number(t);
  const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!m) return null;
  const secs = Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
  return secs || null;
}
