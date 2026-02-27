export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { description } = req.body;
  if (!description || typeof description !== "string" || description.trim().length < 5) {
    return res.status(400).json({ error: "Description too short." });
  }
  if (description.length > 1000) {
    return res.status(400).json({ error: "Description too long." });
  }

  const sys = `You are a coffee profile generator. Parse the user's freeform coffee description into JSON. Return ONLY valid JSON, no markdown, no backticks, no preamble.
{"name":"Mi cafecitoDNA","flavors":["tag1","tag2","tag3"],"intensity":"Light / Medium / Medium-strong / Strong","intensityNote":"short note","sweetness":"None / Hint / Half sweet / Moderate / Sweet","sweetnessNote":"short note","milk":"None / Dairy / Oat milk / Almond milk / etc","temperature":"Hot / Iced / Either","temperatureNote":"optional note or empty string","dealbreakers":["hate1","hate2"],"drinks":[{"name":"Drink","emoji":"☕","why":"One line."},{"name":"Drink","emoji":"🍫","why":"One line."},{"name":"Drink","emoji":"🧊","why":"One line."}]}
Pick fitting emojis. Keep notes concise. 3 real orderable drinks.`;

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: sys,
      messages: [{ role: "user", content: description.trim() }],
    }),
  });

  const data = await upstream.json();
  if (data.error) return res.status(502).json({ error: data.error.message });

  const txt = data.content.map(i => i.type === "text" ? i.text : "").filter(Boolean).join("\n");
  try {
    const profile = JSON.parse(txt.replace(/```json|```/g, "").trim());
    return res.status(200).json(profile);
  } catch {
    return res.status(502).json({ error: "Could not parse AI response." });
  }
}
