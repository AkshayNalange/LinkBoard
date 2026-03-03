import { Redis } from "@upstash/redis";

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    // Get all post IDs sorted by timestamp descending
    const postIds = await kv.zrange("posts", 0, -1, { rev: true });

    if (!postIds || postIds.length === 0) {
      return res.status(200).json({ posts: [], categories: [] });
    }

    // Fetch all posts and their like counts in parallel
    const pipeline = kv.pipeline();
    for (const id of postIds) {
      pipeline.get(`post:${id}`);
    }
    const likesPipeline = kv.pipeline();
    for (const id of postIds) {
      likesPipeline.get(`likes:${id}`);
    }

    const [rawPosts, rawLikes] = await Promise.all([
      pipeline.exec(),
      likesPipeline.exec(),
    ]);

    const posts = rawPosts
      .map((p, i) => {
        const post = typeof p === "string" ? JSON.parse(p) : p;
        if (!post) return null;
        post.likes = parseInt(rawLikes[i] || "0", 10);
        return post;
      })
      .filter(Boolean);

    const categories = await kv.smembers("categories");

    return res.status(200).json({ posts, categories: categories || [] });
  } catch (error) {
    console.error("GET posts error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
