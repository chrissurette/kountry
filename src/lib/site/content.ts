import type { Locale } from "@/lib/i18n/locale";

/**
 * In-repo marketing copy — the "hybrid" content decision (docs: the site's
 * live data like menu/hours/contact comes from Supabase; this prose lives in
 * code and changes via a redeploy, which is fine for text that changes maybe
 * once a year). PLACEHOLDER wording — swap for the owner's real copy. Nothing
 * here should hardcode the restaurant name, address, phone, or hours; those
 * always come from the profile so they stay in sync everywhere.
 *
 * Keyed by locale (en/es) as the first step of the site-wide Spanish
 * translation (see SiteNav's language toggle). Review quotes are translated
 * too, not left English — they're presented as the restaurant's own summary
 * of the review for Spanish-speaking visitors, same as the rest of the page,
 * not a claim the reviewer wrote in Spanish.
 */

interface SiteContentShape {
  heroKicker: string;
  tagline: string;
  heroBody: string;
  established: string;
  reviews: {
    rating: string;
    count: string;
    items: { name: string; quote: string }[];
  };
  highlights: { title: string; body: string }[];
  about: { lead: string; body: string[] };
  catering: { lead: string; body: string[]; offerings: string[] };
}

const en: SiteContentShape = {
  heroKicker: "Welcome to",
  tagline: "Southern comfort food, made from scratch every single day.",
  heroBody:
    "Hearty plates, homemade sides, and the kind of cooking that tastes like Sunday dinner — served fresh, served generous, served with a smile.",

  // Year the restaurant has been serving Immokalee (owner-provided).
  established: "1991",

  // Real Google reviews, shown with attribution (first name + initial). Rating
  // and count reflect the Google Business listing; update when they drift.
  reviews: {
    rating: "4.5",
    count: "1,193",
    items: [
      {
        name: "Sarah A.",
        quote:
          "This was my second time here and it does not disappoint! The building and interior are very clean and well put together.",
      },
      {
        name: "Shauna D.",
        quote:
          "What a hidden gem! We were welcomed by the owner Abraham. He was so kind and gracious and really made us feel welcome.",
      },
      {
        name: "Roy R.",
        quote: "We stopped here on a whim while taking a detour off 75. Wow! What a find! Great service and even better food.",
      },
      {
        name: "Devon T.",
        quote: "Amazing home cooked style food. Best price in town too. Wide variety to choose from.",
      },
      {
        name: "Owen T.",
        quote: "My Philly cheese steak sub was delicious! We'll be back! Thank you for the good service too!",
      },
      {
        name: "Mario M.",
        quote: "The service, atmosphere and food was very good. Strongly recommend!",
      },
    ],
  },

  highlights: [
    {
      title: "Scratch-made daily",
      body: "Our biscuits, gravies, and desserts are made in-house every morning — never frozen, never shortcuts.",
    },
    {
      title: "Generous portions",
      body: "Come hungry. Our plates are built to satisfy, with sides that could be a meal on their own.",
    },
    {
      title: "Like family",
      body: "We treat every guest the way we'd treat someone at our own kitchen table — because that's the whole point.",
    },
  ],

  about: {
    lead: "Good food, made honestly, for the neighbors we're proud to call regulars.",
    body: [
      "We've been serving Immokalee since 1991 — more than three decades of the same scratch cooking that keeps folks coming back.",
      "We're a family kitchen at heart. What started as recipes passed down around the table has grown into a place where the whole community can pull up a chair and eat well.",
      "Everything on our menu is cooked the way it ought to be — slow when it needs to be, fresh always, and seasoned by hand. The menu shifts with what's good that day, so there's always a reason to come back.",
      "Whether you're a first-timer or you've been coming for years, you're always welcome here.",
    ],
  },

  catering: {
    lead: "Let us cook for your next gathering.",
    body: [
      "From family reunions to church socials, office lunches to birthday parties, we'll bring the same scratch-made comfort food that fills our dining room — in portions built for a crowd.",
      "Tell us the date, the headcount, and what your group loves, and we'll put together a spread that leaves everyone happy and full.",
    ],
    offerings: [
      "Family-style trays (half & full pans)",
      "Boxed lunches for meetings & events",
      "Custom menus for parties & holidays",
      "Pickup or drop-off available",
    ],
  },
};

const es: SiteContentShape = {
  heroKicker: "Bienvenido a",
  tagline: "Comida sureña casera, preparada desde cero todos los días.",
  heroBody:
    "Platos abundantes, guarniciones caseras, y ese tipo de cocina que sabe a cena de domingo — servida fresca, servida en grande, servida con una sonrisa.",

  established: "1991",

  reviews: {
    rating: "4.5",
    count: "1,193",
    items: [
      {
        name: "Sarah A.",
        quote:
          "Esta fue mi segunda vez aquí y no decepciona. El edificio y el interior están muy limpios y bien cuidados.",
      },
      {
        name: "Shauna D.",
        quote:
          "¡Qué joya escondida! Nos recibió el dueño, Abraham. Fue muy amable y atento, y realmente nos hizo sentir bienvenidos.",
      },
      {
        name: "Roy R.",
        quote: "Paramos aquí por casualidad durante un desvío de la 75. ¡Vaya, qué hallazgo! Excelente servicio y comida aún mejor.",
      },
      {
        name: "Devon T.",
        quote: "Comida casera increíble. Además, el mejor precio de la ciudad. Gran variedad para elegir.",
      },
      {
        name: "Owen T.",
        quote: "¡Mi sándwich Philly cheese steak estuvo delicioso! Volveremos. ¡Gracias también por el buen servicio!",
      },
      {
        name: "Mario M.",
        quote: "El servicio, el ambiente y la comida fueron muy buenos. ¡Muy recomendado!",
      },
    ],
  },

  highlights: [
    {
      title: "Hecho desde cero cada día",
      body: "Nuestros biscuits, salsas y postres se preparan en casa cada mañana — nunca congelados, nunca atajos.",
    },
    {
      title: "Porciones generosas",
      body: "Ven con hambre. Nuestros platos están hechos para satisfacer, con guarniciones que podrían ser una comida por sí solas.",
    },
    {
      title: "Como en familia",
      body: "Tratamos a cada cliente como trataríamos a alguien en nuestra propia mesa — porque de eso se trata todo esto.",
    },
  ],

  about: {
    lead: "Buena comida, hecha con honestidad, para los vecinos que con orgullo llamamos clientes de siempre.",
    body: [
      "Hemos servido a Immokalee desde 1991 — más de tres décadas de la misma cocina hecha desde cero que hace que la gente siga regresando.",
      "Somos una cocina familiar de corazón. Lo que comenzó como recetas transmitidas alrededor de la mesa se ha convertido en un lugar donde toda la comunidad puede sentarse a comer bien.",
      "Todo en nuestro menú se cocina como debe ser — lento cuando es necesario, siempre fresco, y sazonado a mano. El menú cambia según lo que esté bueno ese día, así que siempre hay una razón para volver.",
      "Ya sea tu primera vez o llevas años viniendo, siempre eres bienvenido aquí.",
    ],
  },

  catering: {
    lead: "Deja que cocinemos para tu próxima reunión.",
    body: [
      "Desde reuniones familiares hasta eventos de la iglesia, almuerzos de oficina hasta fiestas de cumpleaños, llevaremos la misma comida casera hecha desde cero que llena nuestro comedor — en porciones pensadas para un grupo grande.",
      "Dinos la fecha, el número de invitados y lo que le gusta a tu grupo, y prepararemos un banquete que dejará a todos felices y satisfechos.",
    ],
    offerings: [
      "Bandejas estilo familiar (medias y completas)",
      "Almuerzos empacados para reuniones y eventos",
      "Menús personalizados para fiestas y días festivos",
      "Disponible para recoger o entregar",
    ],
  },
};

const content: Record<Locale, SiteContentShape> = { en, es };

export function getSiteContent(locale: Locale): SiteContentShape {
  return content[locale];
}
