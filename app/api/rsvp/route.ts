import { createRsvp } from "@/lib/supabase-client";

function textValue(value: FormDataEntryValue | null, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const attending = textValue(formData.get("attending"), "yes");
  const guests = Number(textValue(formData.get("guests"), "1"));

  try {
    await createRsvp({
      name: textValue(formData.get("name")),
      attending: attending === "family" || attending === "no" ? attending : "yes",
      guests: Number.isFinite(guests) ? guests : 1,
      contact: textValue(formData.get("contact")),
      message: textValue(formData.get("message")),
    });

    return Response.redirect(new URL("/?rsvp=success#rsvp-status", request.url), 303);
  } catch (error) {
    console.warn("RSVP route failed", error);
    return Response.redirect(new URL("/?rsvp=error#rsvp-status", request.url), 303);
  }
}
