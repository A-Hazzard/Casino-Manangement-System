export async function GET() {
  // Countries are now handled by a library, so this endpoint is deprecated.
  return new Response(JSON.stringify({ locations: [] }), { status: 200 });
}
