import archiver from "archiver";
import { PassThrough } from "stream";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_VIDEOS = 30;

function safeName(base, idx, used) {
  let name = (base || `pinterest_video_${idx + 1}`)
    .replace(/[^\w\-. ]+/g, "_")
    .slice(0, 60)
    .trim();
  if (!name) name = `pinterest_video_${idx + 1}`;
  if (!name.toLowerCase().endsWith(".mp4")) name += ".mp4";

  let final = name;
  let n = 1;
  while (used.has(final)) {
    final = name.replace(/\.mp4$/i, `_${n}.mp4`);
    n++;
  }
  used.add(final);
  return final;
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const videos = Array.isArray(body?.videos) ? body.videos.filter((v) => v?.url) : [];
  if (videos.length === 0) {
    return Response.json({ error: "No videos to download" }, { status: 400 });
  }
  const capped = videos.slice(0, MAX_VIDEOS);

  const archive = archiver("zip", { zlib: { level: 6 } });
  const pass = new PassThrough();
  archive.on("error", () => pass.destroy());
  archive.pipe(pass);

  const used = new Set();

  (async () => {
    for (let i = 0; i < capped.length; i++) {
      const { url, title } = capped[i];
      try {
        const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (!res.ok || !res.body) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        archive.append(buf, { name: safeName(title, i, used) });
      } catch {
        // skip this one, keep going
      }
    }
    archive.finalize();
  })();

  return new Response(pass, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="pinterest-videos.zip"',
    },
  });
}
