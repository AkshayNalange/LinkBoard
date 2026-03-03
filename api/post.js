import { kv } from "@vercel/kv";

function checkAuth(req) {
  const authHeader = req.headers["x-admin-key"];
  return authHeader === process.env.ADMIN_PASSWORD;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-key");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (!checkAuth(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // CREATE POST
  if (req.method === "POST") {
    try {
      const { title, description, url, category, tags } = req.body;

      if (!title || !url || !category) {
        return res
          .status(400)
          .json({ error: "Title, URL, and category are required" });
      }

      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = Date.now();

      const post = {
        id,
        title: title.trim(),
        description: (description || "").trim(),
        url: url.trim(),
        category: category.trim(),
        tags: Array.isArray(tags)
          ? tags.map((t) => t.trim()).filter(Boolean)
          : [],
        createdAt: new Date().toISOString(),
        timestamp,
      };

      // Store post
      await kv.set(`post:${id}`, JSON.stringify(post));
      // Add to sorted set with timestamp as score
      await kv.zadd("posts", { score: timestamp, member: id });
      // Add category to set
      await kv.sadd("categories", category.trim());
      // Add tags to categories
      if (post.tags.length > 0) {
        await kv.sadd("categories", ...post.tags);
      }

      return res.status(201).json({ success: true, post });
    } catch (error) {
      console.error("POST error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // DELETE POST
  if (req.method === "DELETE") {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "Post ID required" });

      await kv.del(`post:${id}`);
      await kv.zrem("posts", id);

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("DELETE error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
