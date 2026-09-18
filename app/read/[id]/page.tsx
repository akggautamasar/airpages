import { ReadBookClient } from "@/components/reader/ReadBookClient";

export default function ReadBookPage({ params }: { params: { id: string } }) {
  return <ReadBookClient id={params.id} />;
}
