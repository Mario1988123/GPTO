// Endpoint deshabilitado: se eliminó la integración con Hugging Face porque los
// modelos gratuitos eran muy lentos y poco fiables. La próxima iteración usará
// "perspectiva manual" (el usuario dibuja ejes X/Y/Z sobre la foto y el 3D se
// deforma a esa perspectiva) en lugar de un modelo generativo.
export async function POST(): Promise<Response> {
  return new Response(
    JSON.stringify({ error: "Hiperrealismo IA retirado. Usa AR manual con perspectiva." }),
    { status: 410, headers: { "Content-Type": "application/json" } },
  );
}
