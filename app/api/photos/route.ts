import { uploadPhoto } from "@/lib/supabase-client";

function textValue(value: FormDataEntryValue | null, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export async function POST(request: Request) {
  const wantsJson = request.headers.get("accept")?.includes("application/json") ?? false;
  const formData = await request.formData();
  const caption = textValue(formData.get("caption")).trim() || "新上传的珍贵史料";
  const uploaderName = textValue(formData.get("uploaderName")).trim() || "一位同门";
  const files = formData
    .getAll("photos")
    .filter((file): file is File => file instanceof File && file.type.startsWith("image/"));

  if (!files.length) {
    if (wantsJson) {
      return Response.json({ error: "请选择要上传的照片。" }, { status: 400 });
    }
    return Response.redirect(new URL("/?photos=error#photos-status", request.url), 303);
  }

  try {
    const photos = await Promise.all(files.map((file) => uploadPhoto(file, caption, uploaderName)));
    if (wantsJson) {
      return Response.json({ photos });
    }
    return Response.redirect(new URL("/?photos=success#photos-status", request.url), 303);
  } catch (error) {
    console.warn("Photo route failed", error);
    if (wantsJson) {
      return Response.json({ error: "照片存储服务暂时无法连接，请稍后重试。" }, { status: 502 });
    }
    return Response.redirect(new URL("/?photos=error#photos-status", request.url), 303);
  }
}
