const VIDEO_EXTENSIONS = /\.(?:mp4|webm|ogg|mov|m4v)$/i;
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{6,12}$/;

export function parseVideoLink(value) {
  const input = String(value || "").trim();
  if (!input) throw new Error("Enter a video link.");
  const candidate = /^[a-z][a-z\d+.-]*:/i.test(input) ? input : `https://${input}`;
  let url;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("Enter a valid video link.");
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("Use a secure HTTPS video link.");
  }

  const host = url.hostname.toLowerCase();
  let youtubeId = "";
  if (host === "youtu.be") {
    youtubeId = url.pathname.split("/").filter(Boolean)[0] || "";
  } else if (host === "youtube.com" || host === "www.youtube.com" || host === "m.youtube.com") {
    const segments = url.pathname.split("/").filter(Boolean);
    if (url.pathname === "/watch") youtubeId = url.searchParams.get("v") || "";
    else if (["embed", "shorts", "live"].includes(segments[0])) youtubeId = segments[1] || "";
  }
  if (youtubeId) {
    if (!YOUTUBE_ID.test(youtubeId)) throw new Error("That YouTube link does not contain a valid video.");
    return { mediaType: "embed", provider: "youtube", src: `https://www.youtube-nocookie.com/embed/${youtubeId}` };
  }

  let vimeoId = "";
  if (host === "vimeo.com" || host === "www.vimeo.com" || host === "player.vimeo.com") {
    const segments = url.pathname.split("/").filter(Boolean);
    vimeoId = host === "player.vimeo.com" && segments[0] === "video" ? segments[1] || "" : segments[0] || "";
  }
  if (vimeoId) {
    if (!VIMEO_ID.test(vimeoId)) throw new Error("That Vimeo link does not contain a valid video.");
    return { mediaType: "embed", provider: "vimeo", src: `https://player.vimeo.com/video/${vimeoId}` };
  }

  if (VIDEO_EXTENSIONS.test(url.pathname)) {
    return { mediaType: "embed", provider: "direct", src: url.href };
  }
  throw new Error("Supported links are YouTube, Vimeo, or direct MP4, WebM, Ogg, MOV, and M4V videos.");
}
