import HomeClient from "./home-client";
import {
  isSupabaseConfigured,
  listPhotoComments,
  listPhotos,
  listWallNotes,
} from "@/lib/supabase-client";

export const dynamic = "force-dynamic";

const eventDate = new Date("2026-09-26T14:00:00+08:00");

function getTimeLeft() {
  const diff = Math.max(eventDate.getTime() - Date.now(), 0);

  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1_000) % 60),
  };
}

type HomeProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const [photosResult, notesResult, commentsResult] = isSupabaseConfigured
    ? await Promise.allSettled([listPhotos(), listWallNotes(), listPhotoComments()])
    : [
        { status: "rejected", reason: new Error("Supabase is not configured.") },
        { status: "rejected", reason: new Error("Supabase is not configured.") },
        { status: "rejected", reason: new Error("Supabase is not configured.") },
      ] as const;

  const initialLoadedPhotos = photosResult.status === "fulfilled" ? photosResult.value : [];
  const initialLoadedWallNotes = notesResult.status === "fulfilled" ? notesResult.value : [];
  const initialLoadedComments = commentsResult.status === "fulfilled" ? commentsResult.value : [];
  const params = await searchParams;

  return (
    <HomeClient
      initialLoadedPhotos={initialLoadedPhotos}
      initialLoadedWallNotes={initialLoadedWallNotes}
      initialLoadedComments={initialLoadedComments}
      initialTimeLeft={getTimeLeft()}
      rsvpStatus={typeof params.rsvp === "string" ? params.rsvp : ""}
      photoStatus={typeof params.photos === "string" ? params.photos : ""}
    />
  );
}
