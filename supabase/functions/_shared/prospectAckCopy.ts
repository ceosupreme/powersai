// Shared by send-prospect-acknowledgment and the public /for/:slug proof preview.
// No imports: this file must load in both Deno and Vite.
export const ACK_CONTACT_EMAIL = "hello@supremeteammedia.com";
export const ACK_FROM = `Sean Powers <${ACK_CONTACT_EMAIL}>`;

export function ackSubject(business: string, language: "en" | "es" = "en") {
  if (language === "es") return business ? `Recibí tu mensaje sobre ${business}` : "Recibí tu mensaje";
  return business ? `Got your note about ${business}` : "Got your note";
}

export function ackEnglishBody(firstName: string, business: string, bookingUrl: string) {
  const greeting = firstName || "there";
  const opening = business ? `Thanks for reaching out about ${business}. Your note landed and I have it in front of me.` : "Thanks for reaching out. Your note landed and I have it in front of me.";
  const outside = business ? `take a look at ${business} from the outside` : "take a look at your business from the outside";
  const booking = bookingUrl ? `\nIf it is quicker to talk, grab a time here: ${bookingUrl}` : "";
  return `Hi ${greeting},\n\n${opening}\n\nHere is what happens next: I will look at what you sent, ${outside}, and reply by email within one business day with a straight recommendation. What I would build, what it costs, and what you would have to do (usually not much).\n${booking}\nIf you want a head start, run the free check on your business here: https://supremeteammedia.com/free-audit?src=ack\n\nOne more thing. This email went out the moment your form came in. That is the kind of follow-up I build for businesses like yours.\n\nSean Powers\nSupreme Team Media\n${ACK_CONTACT_EMAIL}`;
}

export function ackSpanishBody(firstName: string, business: string, bookingUrl: string) {
  const greeting = firstName || "hola";
  const opening = business ? `Gracias por escribir sobre ${business}. Tu mensaje llegó y ya lo tengo frente a mí.` : "Gracias por escribir. Tu mensaje llegó y ya lo tengo frente a mí.";
  const outside = business ? `ver ${business} desde afuera` : "ver tu negocio desde afuera";
  const booking = bookingUrl ? `\nSi es más rápido hablar, elige un horario aquí: ${bookingUrl}` : "";
  return `Hola ${greeting},\n\n${opening}\n\nEsto es lo que sigue: revisaré lo que enviaste, voy a ${outside} y te responderé por correo dentro de un día hábil con una recomendación directa. Qué construiría, cuánto cuesta y qué tendrías que hacer tú (normalmente, no mucho).\n${booking}\nSi quieres adelantarte, haz la revisión gratuita de tu negocio aquí: https://supremeteammedia.com/free-audit?src=ack\n\nUna cosa más. Este correo salió en el momento en que llegó tu formulario. Ese es el tipo de seguimiento que construyo para negocios como el tuyo.\n\nSean Powers\nSupreme Team Media\n${ACK_CONTACT_EMAIL}`;
}
