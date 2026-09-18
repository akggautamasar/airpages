import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const SOURCE_URL = "https://threeui.com/source-code/3d-paper.json";

const SOURCES: Record<string, { path: string; sha256: string }> = {
  original: {
    path: "src/shaders/3d-paper/sources/3d-paper.html",
    sha256: "8ec1b71c0dbcafbadf908100ae2a08045d0a1087c00a09d28245ef19366c7353",
  },
  "site-of-the-year": {
    path: "src/shaders/3d-paper/sources/3d-paper-site-of-the-year.html",
    sha256: "fdef93fa96a3927430ef35411af70568c56b9488921aead8f36be36800689b7d",
  },
  japanese: {
    path: "src/shaders/3d-paper/sources/3d-paper-japanese.html",
    sha256: "4e929b9c3feaa635c6bc45e5c556243395318d4d7feb4d6a85190768b3b9f738",
  },
  certificate: {
    path: "src/shaders/3d-paper/sources/3d-paper-certificate.html",
    sha256: "0cb83da723e1a54f1a2e1124bc26a27d608afc3ba42ec0b116807e2e2ae5fb32",
  },
};

export async function GET(request: NextRequest) {
  const variant = request.nextUrl.searchParams.get("variant") || "original";
  const source = SOURCES[variant];

  if (!source) {
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
    const entry = Array.isArray(bundle.files)
      ? bundle.files.find((file: { path?: string }) => file.path === source.path)
      : null;

    if (!entry?.code || typeof entry.code !== "string") {
      return NextResponse.json({ error: "Requested source was not found" }, { status: 502 });
    }

    const digest = createHash("sha256").update(entry.code, "utf8").digest("hex");
    if (digest !== source.sha256) {
      return NextResponse.json({ error: "ThreeDPaper source integrity check failed" }, { status: 502 });
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
