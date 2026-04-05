import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const expoPushUrl = "https://exp.host/--/api/v2/push/send";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const payload = await req.json();
  if (!Array.isArray(payload?.messages)) {
    return new Response("Invalid payload", { status: 400 });
  }

  const response = await fetch(expoPushUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload.messages)
  });

  const json = await response.json();
  return new Response(JSON.stringify(json), {
    headers: { "Content-Type": "application/json" }
  });
});
