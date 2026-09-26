export type RsvpPayload = {
  name: string;
  attending: "yes" | "family" | "no";
  guests: number;
  contact: string;
  message: string;
};

export type PhotoData = {
  id: string;
  src: string;
  name: string;
  caption: string;
  isPinned: boolean;
  createdAt: string;
};

export type PhotoComment = {
  id: string;
  photoId: string;
  author: string;
  body: string;
  createdAt: string;
};

type PhotoRow = {
  id: string;
  image_url: string;
  caption: string | null;
  uploader_name: string | null;
  is_pinned?: boolean;
  created_at?: string;
};

type PhotoCommentRow = {
  id: string;
  photo_id: string;
  author: string;
  body: string;
  created_at: string;
};

type RsvpRow = {
  id: string | number;
  name: string | null;
  message: string | null;
};

const defaultSupabaseUrl = "https://rsumjaaancigotgulpkc.supabase.co/rest/v1/";
const defaultSupabaseAnonKey = "sb_publishable_jyIV4HuQpyEVRzGwZKgoDg_Vg_FS6kH";

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || defaultSupabaseUrl;
const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || defaultSupabaseAnonKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

function headers(extra?: HeadersInit) {
  const requestHeaders = new Headers(extra);
  requestHeaders.set("apikey", supabaseAnonKey);
  requestHeaders.set("Authorization", `Bearer ${supabaseAnonKey}`);
  return requestHeaders;
}

async function supabaseFetch<T>(path: string, init?: RequestInit) {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");

  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: headers(init?.headers),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Supabase request failed: ${response.status}`);
  }

  if (response.status === 204) return null as T;
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (null as T);
}

async function supabaseFetchAll<T>(path: string) {
  const pageSize = 1000;
  const rows: T[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const separator = path.includes("?") ? "&" : "?";
    const page = await supabaseFetch<T[]>(`${path}${separator}limit=${pageSize}&offset=${offset}`);
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

function mapPhoto(row: PhotoRow): PhotoData {
  return {
    id: row.id,
    src: row.image_url,
    name: row.uploader_name?.trim() || "同门上传",
    caption: row.caption?.trim() || "新上传的珍贵史料",
    isPinned: row.is_pinned ?? false,
    createdAt: row.created_at ?? "",
  };
}

function mapPhotoComment(row: PhotoCommentRow): PhotoComment {
  return {
    id: row.id,
    photoId: row.photo_id,
    author: row.author.trim(),
    body: row.body.trim(),
    createdAt: row.created_at,
  };
}

export async function createRsvp(form: RsvpPayload) {
  await supabaseFetch<null>("/rest/v1/rsvps", {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({
      name: form.name.trim(),
      attending: form.attending,
      guests: form.attending === "no" ? 1 : form.guests,
      contact: form.contact.trim(),
      message: form.message.trim(),
    }),
  });
}

export async function listWallNotes() {
  const rows = await supabaseFetchAll<RsvpRow>(
    "/rest/v1/rsvps?select=id,name,message&message=not.is.null&order=created_at.desc",
  );
  return rows
    .map((row) => {
      const author = row.name?.trim() || "一位同门";
      return {
        id: `rsvp-${row.id}`,
        author,
        avatar: author.slice(0, 1).toUpperCase(),
        text: row.message?.trim() || "",
      };
    })
    .filter((note) => note.text);
}

export async function listPhotos() {
  let rows: PhotoRow[];
  try {
    rows = await supabaseFetchAll<PhotoRow>(
      "/rest/v1/photos?select=id,image_url,caption,uploader_name,is_pinned,created_at&order=created_at.asc",
    );
  } catch (error) {
    // Keep the gallery readable until the accompanying migration is applied.
    console.warn("Photo interaction fields are not available yet", error);
    rows = await supabaseFetchAll<PhotoRow>(
      "/rest/v1/photos?select=id,image_url,caption,uploader_name,created_at&order=created_at.asc",
    );
  }
  return rows.map(mapPhoto);
}

export async function listPhotoComments() {
  try {
    const rows = await supabaseFetchAll<PhotoCommentRow>(
      "/rest/v1/photo_comments?select=id,photo_id,author,body,created_at&order=created_at.asc",
    );
    return rows.map(mapPhotoComment);
  } catch (error) {
    // The comments table appears only after the migration is run.
    console.warn("Photo comments are not available yet", error);
    return [];
  }
}

async function updatePhoto(photoId: string, changes: { caption?: string; is_pinned?: boolean }) {
  const rows = await supabaseFetch<PhotoRow[]>(
    `/rest/v1/photos?id=eq.${encodeURIComponent(photoId)}&select=id,image_url,caption,uploader_name,is_pinned,created_at`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(changes),
    },
  );
  if (!rows[0]) throw new Error("Photo was not found.");
  return mapPhoto(rows[0]);
}

export function updatePhotoCaption(photoId: string, caption: string) {
  return updatePhoto(photoId, { caption: caption.trim() });
}

export function setPhotoPinned(photoId: string, isPinned: boolean) {
  return updatePhoto(photoId, { is_pinned: isPinned });
}

export async function createPhotoComment(photoId: string, author: string, body: string) {
  const rows = await supabaseFetch<PhotoCommentRow[]>("/rest/v1/photo_comments", {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ photo_id: photoId, author: author.trim(), body: body.trim() }),
  });
  if (!rows[0]) throw new Error("Comment was not saved.");
  return mapPhotoComment(rows[0]);
}

export async function uploadPhoto(file: File, caption: string, uploaderName: string) {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-90) || "photo.jpg";
  const filePath = `${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  const encodedPath = encodeURIComponent(filePath);
  const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/photos/${encodedPath}`, {
    method: "POST",
    headers: headers({
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "false",
    }),
    body: file,
  });

  if (!uploadResponse.ok) {
    const detail = await uploadResponse.text();
    throw new Error(detail || "Photo upload failed.");
  }

  const imageUrl = `${supabaseUrl}/storage/v1/object/public/photos/${encodedPath}`;
  const rows = await supabaseFetch<PhotoRow[]>("/rest/v1/photos", {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({
      image_url: imageUrl,
      caption: caption.trim() || "新上传的珍贵史料",
      uploader_name: uploaderName.trim(),
    }),
  });
  if (!rows[0]) throw new Error("Photo metadata was not saved.");
  return mapPhoto(rows[0]);
}
