import HomeClient from "./home-client";
import { isSupabaseConfigured, listPhotos, listWallNotes } from "@/lib/supabase-client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [photosResult, notesResult] = isSupabaseConfigured
    ? await Promise.allSettled([listPhotos(), listWallNotes()])
    : [
        { status: "rejected", reason: new Error("Supabase is not configured.") },
        { status: "rejected", reason: new Error("Supabase is not configured.") },
      ] as const;

  const initialLoadedPhotos = photosResult.status === "fulfilled" ? photosResult.value : [];
  const initialLoadedWallNotes = notesResult.status === "fulfilled" ? notesResult.value : [];

  return (
    <HomeClient
      initialLoadedPhotos={initialLoadedPhotos}
      initialLoadedWallNotes={initialLoadedWallNotes}
    />
  );
}
