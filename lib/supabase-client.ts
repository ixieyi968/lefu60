import type { Rsvp } from "@/app/page";

export type RemotePhoto = {
  id: string;
  src: string;
  name: string;
  caption: string;
};

export type RemoteWallNote = {
  id: string;
  author: string;
  avatar: string;
  text: string;
};

type PhotoRow = {
  id: string | number;
  image_url: string;
  caption: string | null;
  uploader_name: string | null;
};

type RsvpRow = {
  id: string | number;
  name: string | null;
  message: string | null;
};

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseUrl = rawSupabaseUrl
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/$/, "");
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

function headers(extra?: HeadersInit) {
  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
    ...extra,
  };
}

async function supabaseFetch<T>(path: string, init?: RequestInit) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: headers(init?.headers),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Supabase request failed: ${response.status}`);
  }

  if (response.status === 204) return null as T;
  return (await response.json()) as T;
}

export async function createRsvp(form: Rsvp) {
  return supabaseFetch<RsvpRow[]>("/rest/v1/rsvps", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      name: form.name.trim(),
      attending: form.attending,
      guests: form.guests,
      contact: form.contact.trim(),
      message: form.message.trim(),
    }),
  });
}

export async function listWallNotes() {
  const rows = await supabaseFetch<RsvpRow[]>(
    "/rest/v1/rsvps?select=id,name,message&message=not.is.null&message=neq.&order=created_at.desc&limit=12",
  );

  return rows.map((row) => {
    const author = row.name?.trim() || "一位同门";
    return {
      id: `rsvp-${row.id}`,
      author,
      avatar: author.slice(0, 1).toUpperCase(),
      text: row.message?.trim() || "",
    };
  });
}

export async function listPhotos() {
  const rows = await supabaseFetch<PhotoRow[]>(
    "/rest/v1/photos?select=id,image_url,caption,uploader_name&order=created_at.desc&limit=24",
  );

  return rows.map((row) => ({
    id: `remote-photo-${row.id}`,
    src: row.image_url,
    name: row.uploader_name?.trim() || "同门上传",
    caption: row.caption?.trim() || "新上传的珍贵史料",
  }));
}

export async function uploadPhoto(file: File, caption: string, uploaderName: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-90) || "photo.jpg";
  const filePath = `${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  const encodedPath = encodeURIComponent(filePath);

  const uploadResponse = await fetch(
    `${supabaseUrl}/storage/v1/object/photos/${encodedPath}`,
    {
      method: "POST",
      headers: headers({
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "false",
      }),
      body: file,
    },
  );

  if (!uploadResponse.ok) {
    const detail = await uploadResponse.text();
    throw new Error(detail || "Photo upload failed.");
  }

  const imageUrl = `${supabaseUrl}/storage/v1/object/public/photos/${encodedPath}`;

  const rows = await supabaseFetch<PhotoRow[]>("/rest/v1/photos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      image_url: imageUrl,
      caption,
      uploader_name: uploaderName,
    }),
  });

  const saved = rows[0];
  return {
    id: `remote-photo-${saved.id}`,
    src: saved.image_url,
    name: saved.uploader_name?.trim() || "同门上传",
    caption: saved.caption?.trim() || "新上传的珍贵史料",
  };
}
