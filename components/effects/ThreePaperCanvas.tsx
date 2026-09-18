"use client";

import type { ReaderPage } from "@/lib/document";
import type { PresentationSettings } from "@/lib/effects/presentation";

export function ThreePaperCanvas({
  page,
  presentation,
}: {
  page: ReaderPage;
  presentation: PresentationSettings;
}) {
  const params = new URLSearchParams({ variant: "original" });
  params.set("page", page.id);
  return (
    <div
      className="three-paper-host"
      data-page={page.id}
      data-depth={presentation.depth}
      data-shadow={presentation.shadow}
      data-warmth={presentation.warmth}
      style={{ background: presentation.background }}
    >
      <iframe
        title={`AirPages 3D paper — ${page.label}`}
        src={`/api/effects/3d-paper?${params.toString()}`}
        sandbox="allow-scripts"
        loading="eager"
        className="three-paper-iframe"
      />
      <div className="three-paper-page-badge">{page.label}</div>
    </div>
  );
}
