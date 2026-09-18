"use client";

import { useState } from "react";

function PinMark() {
  return (
    <svg className="pin-mark" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="17" cy="17" r="16" stroke="var(--brass)" strokeWidth="1.5" />
      <path d="M17 9v10M17 19l-4.5 6M17 19l4.5 6" stroke="var(--brass)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.25" fill="var(--brass)" />
    </svg>
  );
}

export default function Home() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState([]);
  const [checked, setChecked] = useState({});
  const [finding, setFinding] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  async function handleFind() {
    setError("");
    setNote("");
    const urls = input
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (urls.length === 0) {
      setError("Paste at least one Pinterest link first.");
      return;
    }

    setFinding(true);
    setResults([]);
    setChecked({});
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong finding videos.");
        setResults(data.results || []);
        return;
      }
      setResults(data.results || []);
      const initialChecked = {};
      (data.results || []).forEach((r, i) => {
        if (r.videoUrl) initialChecked[i] = true;
      });
      setChecked(initialChecked);
      if (data.truncated) {
        setNote("Only the first 60 pins were processed to keep this quick — run the rest in a second batch if needed.");
      }
    } catch (e) {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setFinding(false);
    }
  }

  async function handleDownloadZip() {
    const selected = results
      .map((r, i) => ({ ...r, i }))
      .filter((r) => r.videoUrl && checked[r.i]);

    if (selected.length === 0) {
      setError("Select at least one video with a checkmark first.");
      return;
    }

    setError("");
    setZipping(true);
    try {
      const res = await fetch("/api/zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videos: selected.map((r) => ({ url: r.videoUrl, title: r.title })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Couldn't build the zip.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "pinterest-videos.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError("Couldn't reach the server while building the zip.");
    } finally {
      setZipping(false);
    }
  }

  const foundCount = results.filter((r) => r.videoUrl).length;
  const selectedCount = results.filter((r, i) => r.videoUrl && checked[i]).length;

  return (
    <main className="wrap">
      <PinMark />
      <h1>Pull the videos off your boards.</h1>
      <p className="sub">
        Paste pin links, or a whole board or profile URL. Pin Puller finds every video it can and
        hands you back one zip file.
      </p>

      <label className="field-label" htmlFor="urls">
        Pinterest links, one per line
      </label>
      <textarea
        id="urls"
        placeholder={"https://www.pinterest.com/pin/123456789/\nhttps://www.pinterest.com/username/board-name/"}
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <p className="hint">Mix and match — individual pins, boards, and profiles all work in the same list.</p>

      <div className="actions">
        <button className="primary" onClick={handleFind} disabled={finding}>
          {finding ? "Searching…" : "Find videos"}
        </button>
        {results.length > 0 && (
          <span className="status">
            {foundCount} video{foundCount === 1 ? "" : "s"} found
          </span>
        )}
      </div>

      {error && <p className="status error" style={{ marginTop: 14 }}>{error}</p>}
      {note && <p className="hint">{note}</p>}

      {results.length > 0 && (
        <section className="manifest">
          <div className="manifest-head">
            <h2>What Pin Puller found</h2>
            <span className="count">{selectedCount} selected</span>
          </div>

          {results.map((r, i) => (
            <div className="row" key={r.pinUrl + i}>
              <input
                type="checkbox"
                disabled={!r.videoUrl}
                checked={!!checked[i]}
                onChange={(e) => setChecked((c) => ({ ...c, [i]: e.target.checked }))}
              />
              <div className="row-body">
                <div className="row-title">{r.title || r.pinUrl}</div>
                <div className="row-url">{r.pinUrl}</div>
                {r.videoUrl ? (
                  <div className="row-ok">Video ready</div>
                ) : (
                  <div className="row-error">{r.error || "No video found"}</div>
                )}
              </div>
            </div>
          ))}

          <div className="actions" style={{ marginTop: 8 }}>
            <button className="primary" onClick={handleDownloadZip} disabled={zipping || selectedCount === 0}>
              {zipping ? "Building zip…" : `Download zip (${selectedCount})`}
            </button>
          </div>
        </section>
      )}

      <p className="footer-note">
        For personal use with content you have the right to save. Pinterest's terms don't permit
        scraping, and videos usually belong to their original creators — this tool doesn't check
        that for you.
      </p>
    </main>
  );
}
