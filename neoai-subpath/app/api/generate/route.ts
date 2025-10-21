// app/api/generate/route.ts
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body?.profile) {
      return new Response(JSON.stringify({ error: "Falta el perfil del usuario" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Inicializa el cliente de OpenAI con tu clave de entorno
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Prepara el prompt para tu IA
    const prompt = `
Eres un experto en suplementación. Recibirás un perfil de usuario en JSON y deberás devolver un plan
de suplementos en formato JSON que incluya:
- lista de suplementos, dosis y frecuencia,
- breve justificación (rationale),
- advertencias (warnings) si las hay.

Perfil:
${JSON.stringify(body.profile, null, 2)}

Devuelve SOLO JSON válido con la estructura:
{
  "plan": {
    "items": [ { "name": "", "dose": "", "frequency": "", "rationale": "", "warnings": [] } ],
    "summary": ""
  }
}
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const text = completion.choices[0].message?.content || "{}";
    const json = JSON.parse(text);

    return new Response(JSON.stringify(json), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error en /api/generate:", error);
    return new Response(JSON.stringify({ error: error.message || "Error interno" }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
}

// Healthcheck opcional
export async function GET() {
  return new Response(JSON.stringify({ ok: true, route: "/api/generate" }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}
