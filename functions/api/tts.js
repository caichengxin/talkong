export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  if (request.method !== "GET" && request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const payload = await readInput(request);
    const text = (payload.text || "").trim();
    const lang = (payload.lang || "yue-HK").trim();

    if (!text) {
      return json({ error: "Missing text" }, 400);
    }

    if (text.length > 800) {
      return json({ error: "Text too long. Max 800 characters." }, 400);
    }

    const apiKey = env.GOOGLE_TTS_API_KEY;
    if (!apiKey) {
      return json({ error: "Missing GOOGLE_TTS_API_KEY in Cloudflare Pages environment variables." }, 500);
    }

    const cacheKey = new Request(new URL(`/api/tts?lang=${encodeURIComponent(lang)}&text=${encodeURIComponent(text)}`, request.url).toString(), { method: "GET" });
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) {
      return cached;
    }

    const voiceOptions = pickVoiceOptions(lang, text);
    let lastErrorText = "";
    let lastStatus = 500;

    for (const voice of voiceOptions) {
      const googleResponse = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: { text },
            voice: voice.name
              ? { languageCode: voice.languageCode, name: voice.name }
              : { languageCode: voice.languageCode },
            audioConfig: {
              audioEncoding: "MP3",
              speakingRate: voice.speakingRate,
              pitch: 0
            }
          })
        }
      );

      if (!googleResponse.ok) {
        lastStatus = googleResponse.status;
        lastErrorText = await googleResponse.text();
        continue;
      }

      const data = await googleResponse.json();
      if (!data.audioContent) {
        lastStatus = 500;
        lastErrorText = "No audioContent returned from Google Text-to-Speech.";
        continue;
      }

      const audioBytes = base64ToUint8Array(data.audioContent);
      const response = new Response(audioBytes, {
        status: 200,
        headers: {
          ...corsHeaders(),
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=604800",
          "X-Content-Type-Options": "nosniff"
        }
      });

      context.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    }

    return json({
      error: "Google Text-to-Speech failed",
      status: lastStatus,
      detail: lastErrorText
    }, lastStatus);
  } catch (error) {
    return json({
      error: "TTS function crashed",
      detail: String(error && error.message ? error.message : error)
    }, 500);
  }
}

async function readInput(request) {
  if (request.method === "POST") {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        return await request.json();
      } catch (error) {
        return {};
      }
    }
  }

  const url = new URL(request.url);
  return {
    text: url.searchParams.get("text") || "",
    lang: url.searchParams.get("lang") || "yue-HK"
  };
}

function pickVoiceOptions(lang, text) {
  const normalized = (lang || "").toLowerCase();

  if (
    normalized === "yue-hk" ||
    normalized === "zh-hk" ||
    normalized === "hk" ||
    normalized.includes("cantonese")
  ) {
    return [
      { languageCode: "yue-HK", name: "yue-HK-Standard-C", speakingRate: 0.85 },
      { languageCode: "yue-HK", name: "yue-HK-Standard-A", speakingRate: 0.85 },
      { languageCode: "yue-HK", speakingRate: 0.85 }
    ];
  }

  if (
    normalized === "zh-cn" ||
    normalized === "cmn-cn" ||
    normalized.includes("mandarin")
  ) {
    return [
      { languageCode: "cmn-CN", name: "cmn-CN-Standard-A", speakingRate: 0.9 },
      { languageCode: "cmn-CN", speakingRate: 0.9 }
    ];
  }

  if (normalized.startsWith("en")) {
    return [
      { languageCode: "en-US", name: "en-US-Standard-C", speakingRate: 0.95 },
      { languageCode: "en-US", speakingRate: 0.95 }
    ];
  }

  if (containsChinese(text)) {
    return [
      { languageCode: "yue-HK", name: "yue-HK-Standard-C", speakingRate: 0.85 },
      { languageCode: "yue-HK", speakingRate: 0.85 }
    ];
  }

  return [
    { languageCode: "en-US", name: "en-US-Standard-C", speakingRate: 0.95 },
    { languageCode: "en-US", speakingRate: 0.95 }
  ];
}

function containsChinese(text) {
  return /[\u3400-\u9FFF]/.test(text);
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
