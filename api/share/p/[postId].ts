const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const cleanEnv = (value?: string) => value?.trim() ?? "";

const siteUrl = cleanEnv(process.env.EXPO_PUBLIC_SITE_URL || "https://beer.rawert.xyz").replace(
  /\/+$/,
  ""
);
const supabaseUrl = cleanEnv(process.env.EXPO_PUBLIC_SUPABASE_URL);
const supabaseKey =
  cleanEnv(process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ??
  cleanEnv(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) ??
  "";

const buildPublicImageUrl = (path: string) =>
  `${supabaseUrl}/storage/v1/object/public/posts/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

const buildShareHtml = ({
  title,
  description,
  imageUrl,
  canonicalUrl,
  appUrl
}: {
  title: string;
  description: string;
  imageUrl: string;
  canonicalUrl: string;
  appUrl: string;
}) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Beer Snap" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${imageUrl}" />
    <meta http-equiv="refresh" content="0; url=${appUrl}" />
    <style>
      html, body { margin: 0; background: #0b0b0b; color: #f5f2eb; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
      body { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
      main { width: min(420px, calc(100vw - 32px)); text-align: center; }
      img { width: 100%; border-radius: 24px; display: block; margin-bottom: 16px; object-fit: cover; }
      a { color: #f5c95c; text-decoration: none; }
      p { color: rgba(245, 242, 235, 0.72); line-height: 1.5; }
    </style>
    <script>
      window.location.replace(${JSON.stringify(appUrl)});
    </script>
  </head>
  <body>
    <main>
      <img src="${imageUrl}" alt="${escapeHtml(title)}" />
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
      <p><a href="${appUrl}">Open in Beer Snap</a></p>
    </main>
  </body>
</html>`;

const buildMissingHtml = () => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Post unavailable · Beer Snap</title>
  </head>
  <body style="margin:0;background:#0b0b0b;color:#f5f2eb;font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;">
    <main style="width:min(420px,calc(100vw - 32px));text-align:center;">
      <h1>Post unavailable</h1>
      <p style="color:rgba(245,242,235,0.72);line-height:1.5;">This Beer Snap post was removed or is no longer public.</p>
    </main>
  </body>
</html>`;

export default async function handler(
  request: { query?: { postId?: string } },
  response: {
    status: (code: number) => any;
    setHeader: (name: string, value: string) => void;
    send: (body: string) => void;
  }
) {
  const postId = request.query?.postId;

  if (!postId || !supabaseUrl || !supabaseKey) {
    response.status(404);
    response.send(buildMissingHtml());
    return;
  }

  const restUrl = new URL(`${supabaseUrl}/rest/v1/posts`);
  restUrl.searchParams.set(
    "select",
    "id,image_path,created_at,user:users!posts_user_id_fkey(handle,display_name)"
  );
  restUrl.searchParams.set("id", `eq.${postId}`);
  restUrl.searchParams.set("deleted_at", "is.null");
  restUrl.searchParams.set("visibility", "eq.public");
  restUrl.searchParams.set("moderation_status", "eq.approved");

  const result = await fetch(restUrl, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`
    }
  });

  if (!result.ok) {
    response.status(500);
    response.send(buildMissingHtml());
    return;
  }

  const rows = (await result.json()) as Array<{
    id: string;
    image_path: string;
    created_at: string;
    user?: { handle?: string; display_name?: string } | Array<{ handle?: string; display_name?: string }>;
  }>;

  const post = rows[0];
  const author = Array.isArray(post?.user) ? post?.user[0] : post?.user;

  if (!post?.image_path || !author?.handle) {
    response.status(404);
    response.send(buildMissingHtml());
    return;
  }

  const appUrl = `${siteUrl}/p/${post.id}`;
  const canonicalUrl = `${siteUrl}/share/p/${post.id}`;
  const imageUrl = buildPublicImageUrl(post.image_path);
  const title = `@${author.handle} on Beer Snap`;
  const description = `${author.display_name ?? author.handle} shared a beer photo on ${new Date(
    post.created_at
  ).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  })}.`;

  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
  response.status(200);
  response.send(
    buildShareHtml({
      title,
      description,
      imageUrl,
      canonicalUrl,
      appUrl
    })
  );
}
