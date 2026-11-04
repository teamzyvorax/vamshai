const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/bmp"]);

function corsHeaders(origin, env) {
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map(v => v.trim()).filter(Boolean);
  const permitted = !origin || allowed.length === 0 || allowed.includes(origin) ? (origin || "*") : "null";
  return {
    "Access-Control-Allow-Origin": permitted,
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}
function json(data, status, cors) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request.headers.get("Origin"), env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...cors, "Access-Control-Max-Age": "86400" } });
    if (url.pathname === "/health" && request.method === "GET") return json({ ok: true, service: "VAMSH AI API" }, 200, cors);
    if (url.pathname !== "/api/remove-background" || request.method !== "POST") return json({ error: "Not found" }, 404, cors);
    if (cors["Access-Control-Allow-Origin"] === "null") return json({ error: "Origin not allowed" }, 403, cors);
    if (!env.CUTOUT_API_KEY) return json({ error: "AI service is not configured yet. Add CUTOUT_API_KEY to Worker secrets." }, 503, cors);

    let form;
    try { form = await request.formData(); } catch { return json({ error: "Please upload a valid image form." }, 400, cors); }
    const file = form.get("file");
    if (!file || typeof file.arrayBuffer !== "function") return json({ error: "Image file is required." }, 400, cors);
    if (!ALLOWED_TYPES.has(file.type)) return json({ error: "Unsupported image format." }, 415, cors);
    if (file.size <= 0 || file.size > MAX_BYTES) return json({ error: "Image must be between 1 byte and 15 MB." }, 413, cors);

    const preview = form.get("preview") === "true";
    const endpoint = new URL("https://www.cutout.pro/api/v1/matting");
    endpoint.searchParams.set("mattingType", "6");
    if (preview) endpoint.searchParams.set("preview", "true");

    try {
      const upstreamForm = new FormData();
      upstreamForm.append("file", file, file.name || "upload");
      const upstream = await fetch(endpoint.toString(), {
        method: "POST",
        headers: { "APIKEY": env.CUTOUT_API_KEY },
        body: upstreamForm
      });
      const contentType = upstream.headers.get("content-type") || "";
      if (!upstream.ok) {
        const details = contentType.includes("application/json") ? await upstream.json().catch(() => ({})) : null;
        return json({ error: details?.msg || details?.message || "Cutout.pro could not process this image.", upstreamStatus: upstream.status }, 502, cors);
      }
      if (contentType.includes("application/json")) {
        const details = await upstream.json().catch(() => ({}));
        return json({ error: details?.msg || "The image service returned an error." }, 502, cors);
      }
      return new Response(upstream.body, {
        status: 200,
        headers: { ...cors, "Content-Type": contentType.startsWith("image/") ? contentType : "image/png", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
      });
    } catch {
      return json({ error: "Could not reach the image processing service. Please retry." }, 502, cors);
    }
  }
};
