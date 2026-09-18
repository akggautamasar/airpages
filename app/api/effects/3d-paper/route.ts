import { NextRequest, NextResponse } from "next/server";

const SOURCE_URL = "https://threeui.com/source-code/3d-paper.json";
const ALLOWED_VARIANTS = new Set(["original", "site-of-the-year", "japanese", "certificate"]);

export async function GET(request: NextRequest) {
  const variant = request.nextUrl.searchParams.get("variant") || "original";
  if (!ALLOWED_VARIANTS.has(variant)) {
    return NextResponse.json({ error: "Invalid variant" }, { status: 400 });
  }

  try {
    const response = await fetch(SOURCE_URL, {
      next: { revalidate: 86400 },
      headers: { accept: "application/json" },
    });
    if (!response.ok) {
      return NextResponse.json({ error: "ThreeDPaper source unavailable" }, { status: 502 });
    }

    const bundle = await response.json();
    const paths: Record<string, string> = {
      original: "src/shaders/3d-paper/sources/3d-paper.html",
      "site-of-the-year": "src/shaders/3d-paper/sources/3d-paper-site-of-the-year.html",
      japanese: "src/shaders/3d-paper/sources/3d-paper-japanese.html",
      certificate: "src/shaders/3d-paper/sources/3d-paper-certificate.html",
    };
    const entry = Array.isArray(bundle.files)
      ? bundle.files.find((file: { path?: string }) => file.path === paths[variant])
      : null;

    if (!entry?.code || typeof entry.code !== "string") {
      return NextResponse.json({ error: "Requested source was not found" }, { status: 502 });
    }

    return new NextResponse(entry.code, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to load ThreeDPaper source" }, { status: 502 });
  }
}
