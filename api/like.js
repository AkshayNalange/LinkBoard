import { Redis } from "@upstash/redis";

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Post ID required" });

    // Atomically increment the like counter for this post
    const newCount = await kv.incr(`likes:${id}`);

    return res.status(200).json({ success: true, likes: newCount });
  } catch (error) {
    console.error("LIKE error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
