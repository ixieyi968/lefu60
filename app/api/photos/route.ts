import { uploadPhoto } from "@/lib/supabase-client";

function textValue(value: FormDataEntryValue | null, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const caption = textValue(formData.get("caption")).trim() || "新上传的珍贵史料";
  const uploaderName = textValue(formData.get("uploaderName")).trim() || "一位同门";
  const files = formData
    .getAll("photos")
    .filter((file): file is File => file instanceof File && file.type.startsWith("image/"));

  if (!files.length) {
    return Response.redirect(new URL("/?photos=error#photos-status", request.url), 303);
  }

  try {
    await Promise.all(files.map((file) => uploadPhoto(file, caption, uploaderName)));
    return Response.redirect(new URL("/?photos=success#photos-status", request.url), 303);
  } catch (error) {
    console.warn("Photo route failed", error);
    return Response.redirect(new URL("/?photos=error#photos-status", request.url), 303);
  }
}
