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
  /**
   * Jobs page. `expect` and `eeo` are deliberately grounded in what the real
   * application form actually says (it is 4 pages; page 1 is an attestation
   * covering truthfulness and permission to check references/education/work
   * history; it states EEO status and offers accommodation) — do NOT add
   * claims about open roles, pay, hours, or hiring process here, none of
   * which are known. See (marketing)/jobs/page.tsx.
   */
  jobs: { lead: string; body: string[]; expect: string[]; eeo: string[] };
  /** Email/Fax List page intro — the form's own labels live in the dictionary (`emailFax`). */
  emailFax: { lead: string; body: string[] };
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

  jobs: {
    lead: "Come work with us.",
    body: [
      "The food here is made from scratch every single day, and that only works because of the people who show up to do it — in the kitchen, on the floor, and behind the counter.",
      "If that sounds like you, the application below is where to start. It comes straight to us.",
    ],
    // Every line below is grounded in the application form's own page 1.
    expect: [
      "It's four pages, and you can fill it out on your phone.",
      "The first page is a short statement to read and agree to before you begin.",
      "You'll confirm that your answers are true and complete, and give us permission to check your references, education, and work history.",
      "Sending it in doesn't guarantee a job or an interview — it's the first step.",
    ],
    eeo: [
      "We're an equal opportunity employer. Your application won't be used to limit or exclude you from consideration on any basis prohibited by local, state, or federal law.",
      "If you need a reasonable accommodation to fill out the application or to interview, tell any one of our representatives and we'll take care of it.",
    ],
  },

  emailFax: {
    lead: "Get the daily special sent to you.",
    body: [
      "Every morning we write up the day's specials. If you'd like that menu to come straight to you — by fax, by email, or both — fill this out and we'll add you to the send list.",
      "It works for businesses and individuals alike: a business name helps us label it for your break room, but a first name is all we need if it's just for you.",
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

  jobs: {
    lead: "Ven a trabajar con nosotros.",
    body: [
      "Aquí la comida se prepara desde cero todos los días, y eso solo funciona gracias a la gente que llega a hacerlo — en la cocina, en el comedor y detrás del mostrador.",
      "Si eso te describe, la solicitud de abajo es el lugar para empezar. Nos llega directamente a nosotros.",
    ],
    expect: [
      "Son cuatro páginas, y puedes llenarla desde tu teléfono.",
      "La primera página es una breve declaración que debes leer y aceptar antes de comenzar.",
      "Confirmarás que tus respuestas son verdaderas y completas, y nos darás permiso para verificar tus referencias, tu educación y tu historial laboral.",
      "Enviarla no garantiza un empleo ni una entrevista — es el primer paso.",
    ],
    eeo: [
      "Somos un empleador que ofrece igualdad de oportunidades. Tu solicitud no se usará para limitarte ni excluirte de consideración por ningún motivo prohibido por las leyes locales, estatales o federales.",
      "Si necesitas una adaptación razonable para llenar la solicitud o para la entrevista, avísale a cualquiera de nuestros representantes y lo resolvemos.",
    ],
  },

  emailFax: {
    lead: "Recibe el especial del día directamente.",
    body: [
      "Cada mañana preparamos el menú de especiales del día. Si quieres que ese menú te llegue directamente — por fax, por correo electrónico o por ambos — llena este formulario y te agregamos a la lista de envío.",
      "Funciona igual para negocios y para personas: el nombre del negocio nos ayuda a etiquetarlo para tu comedor de empleados, pero si es solo para ti basta con tu nombre.",
    ],
  },
};

const content: Record<Locale, SiteContentShape> = { en, es };

export function getSiteContent(locale: Locale): SiteContentShape {
  return content[locale];
}
