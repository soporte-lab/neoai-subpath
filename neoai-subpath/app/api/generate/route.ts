export async function POST(req: Request) {
  const body = await req.json();
  // TODO: validación de body.profile y llamada a OpenAI/tu backend
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET() {
  // Healthcheck útil: GET debe responder 200
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
