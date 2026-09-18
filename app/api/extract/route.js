import {
  normalizePinterestUrl,
  isBoardOrProfile,
  extractPinIdsFromBoard,
  extractVideoFromPin,
  mapWithConcurrency,
} from "@/lib/pinterest";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PINS_PER_BOARD = 50;
const MAX_TOTAL_PINS = 60;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const rawUrls = Array.isArray(body?.urls) ? body.urls : [];
  const normalized = rawUrls.map(normalizePinterestUrl).filter(Boolean);

  if (normalized.length === 0) {
    return Response.json(
      { error: "Paste at least one valid Pinterest pin, board, or profile URL." },
      { status: 400 }
    );
  }

  let pinUrls = [];
  const boardErrors = [];

  for (const url of normalized) {
    if (isBoardOrProfile(url)) {
      try {
        const ids = await extractPinIdsFromBoard(url);
        pinUrls.push(...ids.slice(0, MAX_PINS_PER_BOARD));
      } catch (e) {
        boardErrors.push({ pinUrl: url, videoUrl: null, title: null, error: e.message });
      }
    } else {
      pinUrls.push(url);
    }
  }

  pinUrls = Array.from(new Set(pinUrls));
  const truncated = pinUrls.length > MAX_TOTAL_PINS;
  if (truncated) pinUrls = pinUrls.slice(0, MAX_TOTAL_PINS);

  if (pinUrls.length === 0) {
    return Response.json(
      { error: "No pins could be found in what you pasted.", results: boardErrors },
      { status: 400 }
    );
  }

  const results = await mapWithConcurrency(pinUrls, 5, async (pinUrl) => {
    try {
      return await extractVideoFromPin(pinUrl);
    } catch (e) {
      return { pinUrl, videoUrl: null, title: null, error: e.message };
    }
  });

  return Response.json({
    results: [...boardErrors, ...results],
    truncated,
  });
}
