import { Redis } from "@upstash/redis";
const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get all post IDs sorted by score (timestamp) descending
    const postIds = await kv.zrange("posts", 0, -1, { rev: true });

    if (!postIds || postIds.length === 0) {
      return res.status(200).json({ posts: [], categories: [] });
    }

    // Fetch all posts
    const pipeline = kv.pipeline();
    for (const id of postIds) {
      pipeline.get(`post:${id}`);
    }
    const rawPosts = await pipeline.exec();

    const posts = rawPosts
      .map((p) => (typeof p === "string" ? JSON.parse(p) : p))
      .filter(Boolean);

    // Get categories
    const categories = await kv.smembers("categories");

    return res.status(200).json({ posts, categories: categories || [] });
  } catch (error) {
    console.error("GET posts error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
