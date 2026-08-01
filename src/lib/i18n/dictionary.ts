import type { Locale } from "./locale";

/**
 * Short, reusable UI strings (nav, buttons, labels) shared across the
 * marketing site. Long-form owner-authored prose (hero, about, catering,
 * reviews) lives in src/lib/site/content.ts instead — this file is the
 * "site chrome" half of the translation, that one is the "copy" half.
 */
export interface Dictionary {
  nav: {
    home: string;
    menu: string;
    about: string;
    visit: string;
    gallery: string;
    catering: string;
    jobs: string;
    emailFaxList: string;
    callToOrder: string;
    openMenu: string;
    closeMenu: string;
    privacy: string;
    terms: string;
    staffSignIn: string;
  };
  common: {
    getDirections: string;
    viewTheMenu: string;
    callToOrderWith: (phone: string) => string;
    hoursAndContact: string;
    comeSeeUs: string;
    hours: string;
    closed: string;
    openNow: string;
    closedNow: string;
    close: string;
    partnerAd: {
      eyebrow: string;
      message: string;
      name: string;
      cta: string;
    };
    /** Body line for a page that exists in the nav but has no content yet (Jobs, Email/Fax List). Shared while they're both genuine placeholders — give a page its own copy the moment it gets real content. */
    pageComingSoon: string;
    days: Record<string, string>;
  };
  home: {
    viewTheMenu: string;
    comeSeeUs: string;
    getDirectionsArrow: string;
  };
  subscribe: {
    heading: string;
    body: string;
    emailPlaceholder: string;
    phonePlaceholder: string;
    submit: string;
    submitting: string;
    success: string;
    error: string;
    validationError: string;
    rateLimited: string;
  };
  unsubscribe: {
    heading: string;
    confirmBody: (contact: string) => string;
    confirmButton: string;
    working: string;
    doneHeading: string;
    doneBody: (contact: string) => string;
    alreadyHeading: string;
    alreadyBody: (contact: string) => string;
    invalidHeading: string;
    invalidBody: string;
    error: string;
    rateLimited: string;
    backToSite: string;
  };
  menu: {
    title: string;
    todaysSpecials: string;
    breakfast: string;
    lunchDinner: string;
    beverages: string;
    menuBeingPrepared: string;
    checkBackSoon: string;
    or: string;
    giveUsACall: string;
    cateringCta: string;
  };
  specialsPreview: {
    todaysSpecials: string;
    freshDaily: string;
    viewTodaysSpecials: string;
    viewFullMenu: string;
    seeFullMenu: string;
  };
  specialImage: {
    tapToEnlarge: string;
  };
  about: {
    ourStory: string;
    seeTheMenu: string;
    planAVisit: string;
    whatGuestsSay: string;
  };
  visit: {
    title: string;
    findUs: string;
    addressComingSoon: string;
    hoursComingSoon: string;
  };
  gallery: {
    title: string;
    lead: string;
    leadEmpty: string;
    hungrySeeMenu: string;
    photoComingSoon: string;
  };
  catering: {
    title: string;
    whatWeOffer: string;
    letsPlanIt: string;
    reachOut: string;
    callPhone: (phone: string) => string;
    emailUs: string;
  };
  emailFax: {
    nameLabel: string;
    nameHint: string;
    methodLabel: string;
    methodFax: string;
    methodEmail: string;
    methodBoth: string;
    faxLabel: string;
    emailLabel: string;
    daysLabel: string;
    daysHint: string;
    notesLabel: string;
    submit: string;
    submitting: string;
    successHeading: string;
    successBody: string;
    error: string;
    rateLimited: string;
    nameRequired: string;
    methodRequired: string;
    faxRequired: string;
    emailRequired: string;
    removalNote: string;
  };
  jobs: {
    applyHeading: string;
    /** Must say the image is a *preview* that opens the real form — it shows a checkbox and a Next button that are only a picture, so nothing may imply they work here. */
    applyBody: string;
    openApplication: string;
    /** Alt text for the screenshot, which is wrapped in the link — so it states the link's destination, not a description of the picture. */
    formImageAlt: string;
    whatToExpect: string;
    equalOpportunity: string;
    questions: string;
    callWithQuestions: (phone: string) => string;
    stopBy: (address: string) => string;
  };
  reviews: {
    eyebrow: string;
    lovedSince: (year: string) => string;
    reviewsOnGoogle: string;
    customerReviewsLabel: string;
  };
  admin: {
    nav: {
      newDailySpecial: string;
      mainMenu: string;
      history: string;
      library: string;
      sitePhotos: string;
      subscribers: string;
      emailFaxList: string;
      settings: string;
      signOut: string;
      viewPublicSite: string;
    };
    /** Admin-wide AI spend alert banner (layout.tsx) — bilingual because it renders on employee screens too. */
    aiAlert: {
      blocked: string;
      capped: string;
      warn: (spent: string, ceiling: string) => string;
    };
    login: {
      title: string;
      tagline: string;
      usernameOrEmail: string;
      password: string;
      signIn: string;
      signingIn: string;
      errorMissingFields: string;
      errorGeneric: string;
    };
    capture: {
      title: string;
      description: string;
      takeOrChoosePhoto: string;
      choosePhotoDifferent: string;
      readThisMenu: string;
      preparingPhoto: string;
      uploading: string;
      readingMenu: string;
      resumeTitle: string;
      resumeHasImage: string;
      resumeNoImage: string;
      resume: string;
      startNew: string;
      errorUploadPrep: string;
      errorGeneric: string;
    };
    review: {
      heading: string;
      description: string;
      style: string;
      translateToSpanish: string;
      reTranslateToSpanish: string;
      translating: string;
      showSpanish: string;
      spanishSaved: string;
      translatedMessage: string;
      errorTranslate: string;
      errorRender: string;
      errorPublish: string;
      errorSchedule: string;
      saveAndRender: string;
      rendering: string;
      renderedUpToDate: string;
      englishAndSpanish: string;
      editTheMenu: string;
      uncertainWarning: string;
      maybeSuggestion: (value: string) => string;
      untitled: string;
      notSet: string;
      set: string;
      itemCount: (n: number) => string;
      published: string;
      viewOnSite: string;
      noMenuData: string;
      generatedImageAlt: string;
      livePreviewAlt: string;
      livePreviewAltEs: string;
      header: {
        sectionTitle: string;
        title: string;
        titleEs: string;
        date: string;
        dateEs: string;
        subtitleNote: string;
        subtitleNoteEs: string;
        letterheadNote: string;
      };
      entrees: {
        title: string;
        itemName: string;
        price: string;
        description: string;
        addEntree: string;
        lowConfidence: string;
        nameEs: string;
        descriptionEs: string;
      };
      featured: {
        title: string;
        name: string;
        description: string;
        price: string;
        nameEs: string;
        descriptionEs: string;
        addFeatured: string;
      };
      soup: {
        title: string;
        name: string;
        nameEs: string;
        tierLabel: string;
        tierPrice: string;
        tierLabelEs: string;
        addTier: string;
        addSoup: string;
      };
      combos: {
        title: string;
        name: string;
        price: string;
        addCombo: string;
        nameEs: string;
      };
      veggie: {
        title: string;
        description: string;
        price: string;
        descriptionEs: string;
      };
      desserts: {
        title: string;
        sectionLabel: string;
        sectionLabelEs: string;
        name: string;
        price: string;
        addDessert: string;
        nameEs: string;
      };
      sides: {
        title: string;
        addSide: string;
        spanishPlaceholder: string;
      };
      additional: {
        title: string;
        summaryEmpty: string;
        help: string;
        sectionTitle: string;
        sectionTitleEs: string;
        note: string;
        noteEs: string;
        itemName: string;
        itemNameEs: string;
        itemPrice: string;
        itemDescription: string;
        itemDescriptionEs: string;
        addItem: string;
        addSection: string;
        removeSection: string;
      };
      remove: string;
      publishBar: {
        scheduledToGoLive: (date: string) => string;
        cancelSchedule: string;
        publishNow: string;
        publishing: string;
        scheduleFor: string;
        schedule: string;
        saveBeforePublish: string;
        /** Phones/tablets, where the share sheet's "Save Image" reaches the camera roll. */
        saveToCameraRoll: string;
        /** Desktop, where there is no camera roll — the same button just downloads the PNG. */
        saveImage: string;
        savingImage: string;
        saveImageError: string;
        discardAndStartOver: string;
        discardConfirmTitle: string;
        discardConfirmBody: string;
        cancelDiscard: string;
        confirmDiscard: string;
        discarding: string;
        errorDiscard: string;
      };
    };
  };
}

const dictionary: Record<Locale, Dictionary> = {
  en: {
    nav: {
      home: "Home",
      menu: "Menu",
      about: "About",
      visit: "Visit",
      gallery: "Gallery",
      catering: "Catering",
      jobs: "Jobs",
      emailFaxList: "Email/Fax List",
      callToOrder: "Call to Order",
      openMenu: "Open menu",
      closeMenu: "Close menu",
      privacy: "Privacy",
      terms: "Terms",
      staffSignIn: "Staff sign-in",
    },
    common: {
      getDirections: "Get Directions",
      viewTheMenu: "View the Menu",
      callToOrderWith: (phone: string) => `Call to Order — ${phone}`,
      hoursAndContact: "Hours & contact →",
      comeSeeUs: "Come see us",
      hours: "Hours",
      closed: "Closed",
      openNow: "Open now",
      closedNow: "Closed now",
      close: "Close",
      partnerAd: {
        eyebrow: "From our partners",
        message: "Have estate items, jewelry, gold, or silver to sell?",
        name: "Naples Estate Jewelry",
        cta: "Visit website",
      },
      pageComingSoon: "This page is coming soon — check back shortly.",
      days: {
        mon: "Monday",
        tue: "Tuesday",
        wed: "Wednesday",
        thu: "Thursday",
        fri: "Friday",
        sat: "Saturday",
        sun: "Sunday",
      } as Record<string, string>,
    },
    home: {
      viewTheMenu: "View the Menu",
      comeSeeUs: "Come see us",
      getDirectionsArrow: "Get directions →",
    },
    subscribe: {
      heading: "Stay in the loop",
      body: "Get a heads-up on daily specials, events, and news — no spam, unsubscribe any time.",
      emailPlaceholder: "Email address",
      phonePlaceholder: "Phone number (optional)",
      submit: "Sign me up",
      submitting: "Signing up…",
      success: "You're on the list — thanks!",
      error: "Something went wrong. Please try again.",
      validationError: "Enter an email or phone number.",
      rateLimited: "Too many sign-up attempts from your connection. Please try again later.",
    },
    unsubscribe: {
      heading: "Leave our email list?",
      confirmBody: (contact: string) => `We'll stop sending updates to ${contact}.`,
      confirmButton: "Yes, take me off the list",
      working: "Removing you…",
      doneHeading: "You're off the list",
      doneBody: (contact: string) => `We won't send any more updates to ${contact}. Sorry to see you go!`,
      alreadyHeading: "You're already off the list",
      alreadyBody: (contact: string) => `${contact} isn't receiving our updates.`,
      invalidHeading: "This link is no longer valid",
      invalidBody:
        "It may have already been used, or the address may have been removed. If you're still getting emails you don't want, just contact us and we'll take care of it.",
      error: "Something went wrong. Please try again, or contact us and we'll remove you.",
      rateLimited: "Too many requests right now. Please try again in a little while — or contact us and we'll remove you.",
      backToSite: "Back to our website",
    },
    menu: {
      title: "Menu",
      todaysSpecials: "Today's Specials",
      breakfast: "Breakfast",
      lunchDinner: "Lunch & Dinner",
      beverages: "Beverages",
      menuBeingPrepared: "Our menu is being prepared.",
      checkBackSoon: "Please check back soon",
      or: "or",
      giveUsACall: "give us a call",
      cateringCta: "Hosting a group? See our catering →",
    },
    specialsPreview: {
      todaysSpecials: "Today's Specials",
      freshDaily: "Fresh specials posted daily — check back soon.",
      viewTodaysSpecials: "View Today's Specials",
      viewFullMenu: "View Full Menu",
      seeFullMenu: "See the full menu →",
    },
    specialImage: {
      tapToEnlarge: "Tap to enlarge",
    },
    about: {
      ourStory: "Our Story",
      seeTheMenu: "See the Menu",
      planAVisit: "Plan a Visit",
      whatGuestsSay: "What our guests say",
    },
    visit: {
      title: "Visit Us",
      findUs: "Find us",
      addressComingSoon: "Address coming soon.",
      hoursComingSoon: "Hours coming soon — please call ahead.",
    },
    gallery: {
      title: "Gallery",
      lead: "A look at the food and the room.",
      leadEmpty: "A look at the food and the room. Photos are on their way.",
      hungrySeeMenu: "Hungry? See the menu →",
      photoComingSoon: "Photo coming soon",
    },
    catering: {
      title: "Catering",
      whatWeOffer: "What we offer",
      letsPlanIt: "Let's plan it",
      reachOut: "Reach out with your date and headcount and we'll take it from there.",
      callPhone: (phone: string) => `Call ${phone}`,
      emailUs: "Email us",
    },
    emailFax: {
      nameLabel: "Business or location name",
      nameHint: "If it's just for you, your first name is fine.",
      methodLabel: "How would you like to receive it?",
      methodFax: "Fax",
      methodEmail: "Email",
      methodBoth: "Both",
      faxLabel: "Fax number (with area code)",
      emailLabel: "Email address",
      daysLabel: "Which days would you like it?",
      daysHint: "Select all that apply — leave them all unchecked to get it every day.",
      notesLabel: "Notes or comments (optional)",
      submit: "Send my request",
      submitting: "Sending…",
      successHeading: "Got it — you're on the list!",
      successBody: "We'll start sending you the daily special. If anything changes, just call or write and we'll update it.",
      error: "Something went wrong. Please try again, or give us a call.",
      rateLimited: "Too many requests from your connection. Please try again later.",
      nameRequired: "Enter a business or first name.",
      methodRequired: "Choose fax, email, or both.",
      faxRequired: "Enter a fax number.",
      emailRequired: "Enter an email address.",
      removalNote: "Want to stop receiving it, or change your days? Just tell us — call or reply any time and we'll take care of it.",
    },
    jobs: {
      applyHeading: "Apply now",
      applyBody: "Here's the first page of the application. Tap it to open the real thing in a new tab.",
      openApplication: "Open the application →",
      formImageAlt: "Open the employee application form",
      whatToExpect: "What to expect",
      equalOpportunity: "Equal opportunity",
      questions: "Questions?",
      callWithQuestions: (phone: string) => `Call us at ${phone}`,
      stopBy: (address: string) => `You're welcome to stop by, too — we're at ${address}.`,
    },
    reviews: {
      eyebrow: "Reviews",
      lovedSince: (year: string) => `Loved in Immokalee since ${year}`,
      reviewsOnGoogle: "reviews on Google",
      customerReviewsLabel: "Customer reviews",
    },
    admin: {
      nav: {
        newDailySpecial: "New Daily Special",
        mainMenu: "Main Menu",
        history: "History",
        library: "Library",
        sitePhotos: "Site Photos",
        subscribers: "Subscribers",
        emailFaxList: "Fax/Email List",
        settings: "Settings",
        signOut: "Sign out",
        viewPublicSite: "Return to main site",
      },
      aiAlert: {
        blocked:
          "AI requests are being blocked right now — something may be stuck in a loop. Check Settings → AI Providers, and tell the owner if this isn't you.",
        capped:
          "The AI features hit today's $5 spending limit and are paused until tomorrow. Check the usage dashboard in Settings → AI Providers.",
        warn: (spent: string, ceiling: string) =>
          `Heads up: AI usage is at ${spent} of today's ${ceiling} limit — higher than a normal day. If nobody's been working with menus today, something may be quietly calling the AI.`,
      },
      login: {
        title: "MyMenuAgent",
        tagline: "Sign in to manage your restaurant's site.",
        usernameOrEmail: "Username or email",
        password: "Password",
        signIn: "Sign in",
        signingIn: "Signing in…",
        errorMissingFields: "Enter your username or email and your password.",
        errorGeneric: "That login didn't match. Check your username/email and password.",
      },
      capture: {
        title: "Photograph today's specials",
        description:
          "Take or choose a photo of your specials board. We'll read it into an editable menu you can check and correct — then publish a clean, typeset version.",
        takeOrChoosePhoto: "Take or choose a photo",
        choosePhotoDifferent: "Choose a different photo",
        readThisMenu: "Read this menu",
        preparingPhoto: "Preparing photo…",
        uploading: "Uploading…",
        readingMenu: "Reading your menu (this can take a moment)…",
        resumeTitle: "You have a special in progress.",
        resumeHasImage: "Pick up where you left off — your work is saved.",
        resumeNoImage: "You read a menu but haven't finished it yet. Pick up where you left off.",
        resume: "Resume",
        startNew: "Start a new one",
        errorUploadPrep: "Could not prepare the upload.",
        errorGeneric: "Something went wrong.",
      },
      review: {
        heading: "Review & Publish",
        description:
          "We read your photo into the menu below. Fix anything that looks off — especially highlighted items — then render and publish a clean, typeset version.",
        style: "Style",
        translateToSpanish: "Translate to Spanish",
        reTranslateToSpanish: "Re-translate to Spanish",
        translating: "Translating…",
        showSpanish: "Show Spanish",
        spanishSaved: "✓ Spanish version saved",
        translatedMessage: "Translated — review below, then Save & render.",
        errorTranslate: "Translation failed.",
        errorRender: "Failed to render.",
        errorPublish: "Failed to publish.",
        errorSchedule: "Failed to schedule.",
        saveAndRender: "Save & render polished menu",
        rendering: "Rendering…",
        renderedUpToDate: "Rendered ✓ — up to date",
        englishAndSpanish: " (English + Spanish)",
        editTheMenu: "Edit the menu",
        uncertainWarning: "Please double-check these — the photo was hard to read here:",
        maybeSuggestion: (value: string) => ` (maybe "${value}")`,
        untitled: "Untitled",
        notSet: "Not set",
        set: "Set",
        itemCount: (n: number) => `${n} item${n === 1 ? "" : "s"}`,
        published: "Published — your special is live.",
        viewOnSite: "View it on your site →",
        noMenuData: "This draft has no menu data to edit.",
        generatedImageAlt: "Generated special menu",
        livePreviewAlt: "Live preview of the rendered menu",
        livePreviewAltEs: "Live preview of the Spanish rendered menu",
        header: {
          sectionTitle: "Header",
          title: "Title",
          titleEs: "Title (Spanish)",
          date: "Date",
          dateEs: "Date (Spanish)",
          subtitleNote: "Subtitle / note",
          subtitleNoteEs: "Subtitle / note (Spanish)",
          letterheadNote:
            "Restaurant name, address, and phone are filled in automatically from your profile (Settings) — same on English and Spanish versions.",
        },
        entrees: {
          title: "Entrées",
          itemName: "Item name",
          price: "Price",
          description: "Description (optional)",
          addEntree: "+ Add entrée",
          lowConfidence: "Low confidence — verify this reading.",
          nameEs: "Dish name (Spanish)",
          descriptionEs: "Description (Spanish, optional)",
        },
        featured: {
          title: "Featured items",
          name: "Name",
          description: "Description",
          price: "Price",
          nameEs: "Name (Spanish)",
          descriptionEs: "Description (Spanish)",
          addFeatured: "+ Add featured item",
        },
        soup: {
          title: "Soups",
          name: "Soup name",
          nameEs: "Soup name (Spanish)",
          tierLabel: 'Size label (e.g. Cup, Small) — blank for one price',
          tierPrice: "Price",
          tierLabelEs: "Size label (Spanish)",
          addTier: "+ Add price / size",
          addSoup: "+ Add soup",
        },
        combos: {
          title: "Combos",
          name: "Name",
          price: "Price",
          addCombo: "+ Add combo",
          nameEs: "Name (Spanish)",
        },
        veggie: {
          title: "Veggie plate",
          description: "Description",
          price: "Price",
          descriptionEs: "Description (Spanish)",
        },
        desserts: {
          title: "Desserts",
          sectionLabel: 'Section title from the board (e.g. "Slice of Cake") — leave blank for "Desserts"',
          sectionLabelEs: "Section title (Spanish)",
          name: "Name",
          price: "Price",
          addDessert: "+ Add dessert",
          nameEs: "Name (Spanish)",
        },
        sides: {
          title: "Sides",
          addSide: "+ Add side",
          spanishPlaceholder: "Spanish",
        },
        additional: {
          title: "Other sections",
          summaryEmpty: "None",
          help: "Anything the board has that doesn't fit the sections above — Breakfast, Appetizers, Kids Menu, Drinks, etc. The AI puts unrecognized sections here automatically; you can also add your own.",
          sectionTitle: "Section title (e.g. Breakfast)",
          sectionTitleEs: "Section title (Spanish)",
          note: "Section note, optional (e.g. All served with cornbread)",
          noteEs: "Section note (Spanish)",
          itemName: "Item name",
          itemNameEs: "Item name (Spanish)",
          itemPrice: "Price",
          itemDescription: "Description (optional)",
          itemDescriptionEs: "Description (Spanish)",
          addItem: "+ Add item",
          addSection: "+ Add section",
          removeSection: "Remove section",
        },
        remove: "Remove",
        publishBar: {
          scheduledToGoLive: (date: string) => `Scheduled to go live ${date}`,
          cancelSchedule: "Cancel schedule",
          publishNow: "Approve & Publish Now",
          publishing: "Publishing…",
          scheduleFor: "Date and time to publish",
          schedule: "Schedule",
          saveBeforePublish: "Save & render your changes before publishing.",
          saveToCameraRoll: "Save to camera roll",
          saveImage: "Save image",
          savingImage: "Preparing image…",
          saveImageError: "Could not save the image. Please try again.",
          discardAndStartOver: "Discard & start over",
          discardConfirmTitle: "Discard this draft?",
          discardConfirmBody: "This permanently deletes this draft and its saved images. This cannot be undone.",
          cancelDiscard: "Keep this draft",
          confirmDiscard: "Discard & start over",
          discarding: "Discarding…",
          errorDiscard: "Could not discard this draft.",
        },
      },
    },
  },
  es: {
    nav: {
      home: "Inicio",
      menu: "Menú",
      about: "Nosotros",
      visit: "Visítanos",
      gallery: "Galería",
      catering: "Catering",
      jobs: "Empleos",
      emailFaxList: "Lista de correo/fax",
      callToOrder: "Llame para ordenar",
      openMenu: "Abrir menú",
      closeMenu: "Cerrar menú",
      privacy: "Privacidad",
      terms: "Términos",
      staffSignIn: "Acceso del personal",
    },
    common: {
      getDirections: "Cómo llegar",
      viewTheMenu: "Ver el menú",
      callToOrderWith: (phone: string) => `Llame para ordenar — ${phone}`,
      hoursAndContact: "Horario y contacto →",
      comeSeeUs: "Ven a vernos",
      hours: "Horario",
      closed: "Cerrado",
      openNow: "Abierto ahora",
      closedNow: "Cerrado ahora",
      close: "Cerrar",
      partnerAd: {
        eyebrow: "De nuestros socios",
        message: "¿Tienes artículos de herencia, joyas, oro o plata para vender?",
        name: "Naples Estate Jewelry",
        cta: "Visitar sitio web",
      },
      pageComingSoon: "Esta página estará disponible próximamente — vuelve pronto.",
      days: {
        mon: "Lunes",
        tue: "Martes",
        wed: "Miércoles",
        thu: "Jueves",
        fri: "Viernes",
        sat: "Sábado",
        sun: "Domingo",
      } as Record<string, string>,
    },
    home: {
      viewTheMenu: "Ver el menú",
      comeSeeUs: "Ven a vernos",
      getDirectionsArrow: "Cómo llegar →",
    },
    subscribe: {
      heading: "Mantente al tanto",
      body: "Entérate de los especiales del día, eventos y noticias — sin spam, cancela cuando quieras.",
      emailPlaceholder: "Correo electrónico",
      phonePlaceholder: "Número de teléfono (opcional)",
      submit: "Quiero recibir novedades",
      submitting: "Enviando…",
      success: "¡Listo! Ya estás en la lista.",
      error: "Algo salió mal. Inténtalo de nuevo.",
      validationError: "Ingresa un correo electrónico o un número de teléfono.",
      rateLimited: "Demasiados intentos desde tu conexión. Inténtalo de nuevo más tarde.",
    },
    unsubscribe: {
      heading: "¿Salir de nuestra lista de correo?",
      confirmBody: (contact: string) => `Dejaremos de enviar novedades a ${contact}.`,
      confirmButton: "Sí, quítenme de la lista",
      working: "Quitándote…",
      doneHeading: "Ya no estás en la lista",
      doneBody: (contact: string) => `No enviaremos más novedades a ${contact}. ¡Lamentamos verte partir!`,
      alreadyHeading: "Ya no estabas en la lista",
      alreadyBody: (contact: string) => `${contact} no está recibiendo nuestras novedades.`,
      invalidHeading: "Este enlace ya no es válido",
      invalidBody:
        "Puede que ya se haya usado, o que la dirección se haya eliminado. Si sigues recibiendo correos que no quieres, contáctanos y lo resolvemos.",
      error: "Algo salió mal. Inténtalo de nuevo, o contáctanos y te quitamos de la lista.",
      rateLimited: "Demasiadas solicitudes en este momento. Inténtalo de nuevo en un rato — o contáctanos y te quitamos de la lista.",
      backToSite: "Volver a nuestro sitio",
    },
    menu: {
      title: "Menú",
      todaysSpecials: "Especiales del Día",
      breakfast: "Desayuno",
      lunchDinner: "Almuerzo y Cena",
      beverages: "Bebidas",
      menuBeingPrepared: "Estamos preparando nuestro menú.",
      checkBackSoon: "Vuelve pronto",
      or: "o",
      giveUsACall: "llámanos",
      cateringCta: "¿Organizas un evento? Mira nuestro catering →",
    },
    specialsPreview: {
      todaysSpecials: "Especiales del Día",
      freshDaily: "Especiales frescos cada día — vuelve pronto.",
      viewTodaysSpecials: "Ver los Especiales de Hoy",
      viewFullMenu: "Ver el Menú Completo",
      seeFullMenu: "Ver el menú completo →",
    },
    specialImage: {
      tapToEnlarge: "Toca para ampliar",
    },
    about: {
      ourStory: "Nuestra Historia",
      seeTheMenu: "Ver el Menú",
      planAVisit: "Planea tu Visita",
      whatGuestsSay: "Lo que dicen nuestros clientes",
    },
    visit: {
      title: "Visítanos",
      findUs: "Encuéntranos",
      addressComingSoon: "Dirección próximamente.",
      hoursComingSoon: "Horario próximamente — llama con anticipación.",
    },
    gallery: {
      title: "Galería",
      lead: "Un vistazo a la comida y al lugar.",
      leadEmpty: "Un vistazo a la comida y al lugar. Las fotos llegarán pronto.",
      hungrySeeMenu: "¿Tienes hambre? Mira el menú →",
      photoComingSoon: "Foto próximamente",
    },
    catering: {
      title: "Catering",
      whatWeOffer: "Lo que ofrecemos",
      letsPlanIt: "Planeémoslo",
      reachOut: "Contáctanos con tu fecha y número de invitados, y nosotros nos encargamos del resto.",
      callPhone: (phone: string) => `Llamar ${phone}`,
      emailUs: "Envíanos un correo",
    },
    emailFax: {
      nameLabel: "Nombre del negocio o local",
      nameHint: "Si es solo para ti, basta con tu nombre.",
      methodLabel: "¿Cómo te gustaría recibirlo?",
      methodFax: "Fax",
      methodEmail: "Correo electrónico",
      methodBoth: "Ambos",
      faxLabel: "Número de fax (con código de área)",
      emailLabel: "Correo electrónico",
      daysLabel: "¿Qué días te gustaría recibirlo?",
      daysHint: "Marca todos los que quieras — si no marcas ninguno, te lo enviamos todos los días.",
      notesLabel: "Notas o comentarios (opcional)",
      submit: "Enviar mi solicitud",
      submitting: "Enviando…",
      successHeading: "¡Listo! Ya estás en la lista.",
      successBody: "Empezaremos a enviarte el especial del día. Si algo cambia, llámanos o escríbenos y lo actualizamos.",
      error: "Algo salió mal. Inténtalo de nuevo, o llámanos.",
      rateLimited: "Demasiadas solicitudes desde tu conexión. Inténtalo de nuevo más tarde.",
      nameRequired: "Ingresa el nombre del negocio o tu nombre.",
      methodRequired: "Elige fax, correo electrónico o ambos.",
      faxRequired: "Ingresa un número de fax.",
      emailRequired: "Ingresa un correo electrónico.",
      removalNote: "¿Quieres dejar de recibirlo o cambiar tus días? Solo dinos — llama o responde cuando quieras y lo resolvemos.",
    },
    jobs: {
      applyHeading: "Solicita empleo",
      applyBody: "Esta es la primera página de la solicitud. Tócala para abrir la solicitud real en una pestaña nueva.",
      openApplication: "Abrir la solicitud →",
      formImageAlt: "Abrir el formulario de solicitud de empleo",
      whatToExpect: "Qué esperar",
      equalOpportunity: "Igualdad de oportunidades",
      questions: "¿Preguntas?",
      callWithQuestions: (phone: string) => `Llámanos al ${phone}`,
      stopBy: (address: string) => `También puedes visitarnos — estamos en ${address}.`,
    },
    reviews: {
      eyebrow: "Reseñas",
      lovedSince: (year: string) => `Queridos en Immokalee desde ${year}`,
      reviewsOnGoogle: "reseñas en Google",
      customerReviewsLabel: "Reseñas de clientes",
    },
    admin: {
      nav: {
        newDailySpecial: "Nuevo especial del día",
        mainMenu: "Menú principal",
        history: "Historial",
        library: "Biblioteca",
        sitePhotos: "Fotos del sitio",
        subscribers: "Suscriptores",
        emailFaxList: "Lista de fax/correo",
        settings: "Configuración",
        signOut: "Cerrar sesión",
        viewPublicSite: "Volver al sitio principal",
      },
      aiAlert: {
        blocked:
          "Las solicitudes de IA se están bloqueando en este momento — algo puede estar atascado en un ciclo. Revisa Configuración → Proveedores de IA, y avísale al dueño si no fuiste tú.",
        capped:
          "Las funciones de IA alcanzaron el límite de gasto de $5 de hoy y están pausadas hasta mañana. Revisa el panel de uso en Configuración → Proveedores de IA.",
        warn: (spent: string, ceiling: string) =>
          `Atención: el uso de IA va en ${spent} del límite de ${ceiling} de hoy — más alto que un día normal. Si nadie ha trabajado con menús hoy, algo puede estar llamando a la IA sin que lo sepas.`,
      },
      login: {
        title: "MyMenuAgent",
        tagline: "Inicia sesión para administrar el sitio de tu restaurante.",
        usernameOrEmail: "Usuario o correo electrónico",
        password: "Contraseña",
        signIn: "Iniciar sesión",
        signingIn: "Iniciando sesión…",
        errorMissingFields: "Ingresa tu usuario o correo electrónico y tu contraseña.",
        errorGeneric: "Ese inicio de sesión no coincide. Verifica tu usuario/correo y tu contraseña.",
      },
      capture: {
        title: "Fotografía los especiales de hoy",
        description:
          "Toma o elige una foto de tu pizarra de especiales. La leeremos y crearemos un menú editable que podrás revisar y corregir — luego publica una versión limpia y bien formateada.",
        takeOrChoosePhoto: "Tomar o elegir una foto",
        choosePhotoDifferent: "Elegir otra foto",
        readThisMenu: "Leer este menú",
        preparingPhoto: "Preparando foto…",
        uploading: "Subiendo…",
        readingMenu: "Leyendo tu menú (esto puede tardar un momento)…",
        resumeTitle: "Tienes un especial en progreso.",
        resumeHasImage: "Continúa donde lo dejaste — tu trabajo está guardado.",
        resumeNoImage: "Leíste un menú pero aún no lo terminaste. Continúa donde lo dejaste.",
        resume: "Continuar",
        startNew: "Empezar uno nuevo",
        errorUploadPrep: "No se pudo preparar la subida.",
        errorGeneric: "Algo salió mal.",
      },
      review: {
        heading: "Revisar y publicar",
        description:
          "Leímos tu foto en el menú de abajo. Corrige lo que se vea mal — especialmente lo resaltado — luego renderiza y publica una versión limpia y bien formateada.",
        style: "Estilo",
        translateToSpanish: "Traducir al español",
        reTranslateToSpanish: "Volver a traducir al español",
        translating: "Traduciendo…",
        showSpanish: "Mostrar español",
        spanishSaved: "✓ Versión en español guardada",
        translatedMessage: "Traducido — revisa abajo y luego Guarda y renderiza.",
        errorTranslate: "La traducción falló.",
        errorRender: "No se pudo renderizar.",
        errorPublish: "No se pudo publicar.",
        errorSchedule: "No se pudo programar.",
        saveAndRender: "Guardar y renderizar menú",
        rendering: "Renderizando…",
        renderedUpToDate: "Renderizado ✓ — actualizado",
        englishAndSpanish: " (inglés + español)",
        editTheMenu: "Editar el menú",
        uncertainWarning: "Por favor verifica esto — la foto fue difícil de leer aquí:",
        maybeSuggestion: (value: string) => ` (tal vez "${value}")`,
        untitled: "Sin título",
        notSet: "No definido",
        set: "Definido",
        itemCount: (n: number) => `${n} artículo${n === 1 ? "" : "s"}`,
        published: "Publicado — tu especial ya está en línea.",
        viewOnSite: "Verlo en tu sitio →",
        noMenuData: "Este borrador no tiene datos de menú para editar.",
        generatedImageAlt: "Menú especial generado",
        livePreviewAlt: "Vista previa en vivo del menú renderizado",
        livePreviewAltEs: "Vista previa en vivo del menú renderizado en español",
        header: {
          sectionTitle: "Encabezado",
          title: "Título",
          titleEs: "Título (en español)",
          date: "Fecha",
          dateEs: "Fecha (en español)",
          subtitleNote: "Subtítulo / nota",
          subtitleNoteEs: "Subtítulo / nota (en español)",
          letterheadNote:
            "El nombre, la dirección y el teléfono del restaurante se completan automáticamente desde tu perfil (Configuración) — iguales en la versión en inglés y en español.",
        },
        entrees: {
          title: "Platos principales",
          itemName: "Nombre del platillo",
          price: "Precio",
          description: "Descripción (opcional)",
          addEntree: "+ Agregar plato principal",
          lowConfidence: "Confianza baja — verifica esta lectura.",
          nameEs: "Nombre del platillo (en español)",
          descriptionEs: "Descripción (en español, opcional)",
        },
        featured: {
          title: "Platillos destacados",
          name: "Nombre",
          description: "Descripción",
          price: "Precio",
          nameEs: "Nombre (en español)",
          descriptionEs: "Descripción (en español)",
          addFeatured: "+ Agregar platillo destacado",
        },
        soup: {
          title: "Sopas",
          name: "Nombre de la sopa",
          nameEs: "Nombre de la sopa (en español)",
          tierLabel: "Tamaño (ej. Taza, Chico) — en blanco para un solo precio",
          tierPrice: "Precio",
          tierLabelEs: "Tamaño (en español)",
          addTier: "+ Agregar precio / tamaño",
          addSoup: "+ Agregar sopa",
        },
        combos: {
          title: "Combos",
          name: "Nombre",
          price: "Precio",
          addCombo: "+ Agregar combo",
          nameEs: "Nombre (en español)",
        },
        veggie: {
          title: "Plato vegetariano",
          description: "Descripción",
          price: "Precio",
          descriptionEs: "Descripción (en español)",
        },
        desserts: {
          title: "Postres",
          sectionLabel: 'Título de la sección según la pizarra (ej. "Slice of Cake") — en blanco para "Desserts"',
          sectionLabelEs: "Título de la sección (en español)",
          name: "Nombre",
          price: "Precio",
          addDessert: "+ Agregar postre",
          nameEs: "Nombre (en español)",
        },
        sides: {
          title: "Acompañamientos",
          addSide: "+ Agregar acompañamiento",
          spanishPlaceholder: "Español",
        },
        additional: {
          title: "Otras secciones",
          summaryEmpty: "Ninguna",
          help: "Cualquier cosa en la pizarra que no encaje en las secciones de arriba — Desayuno, Aperitivos, Menú Infantil, Bebidas, etc. La IA coloca aquí las secciones que no reconoce; también puedes agregar las tuyas.",
          sectionTitle: "Título de la sección (ej. Desayuno)",
          sectionTitleEs: "Título de la sección (en español)",
          note: "Nota de la sección, opcional (ej. Servido con pan de maíz)",
          noteEs: "Nota de la sección (en español)",
          itemName: "Nombre del platillo",
          itemNameEs: "Nombre del platillo (en español)",
          itemPrice: "Precio",
          itemDescription: "Descripción (opcional)",
          itemDescriptionEs: "Descripción (en español)",
          addItem: "+ Agregar platillo",
          addSection: "+ Agregar sección",
          removeSection: "Eliminar sección",
        },
        remove: "Eliminar",
        publishBar: {
          scheduledToGoLive: (date: string) => `Programado para publicarse ${date}`,
          cancelSchedule: "Cancelar programación",
          publishNow: "Aprobar y publicar ahora",
          publishing: "Publicando…",
          scheduleFor: "Fecha y hora de publicación",
          schedule: "Programar",
          saveBeforePublish: "Guarda y renderiza tus cambios antes de publicar.",
          saveToCameraRoll: "Guardar en el carrete",
          saveImage: "Guardar imagen",
          savingImage: "Preparando imagen…",
          saveImageError: "No se pudo guardar la imagen. Inténtalo de nuevo.",
          discardAndStartOver: "Descartar y empezar de nuevo",
          discardConfirmTitle: "¿Descartar este borrador?",
          discardConfirmBody: "Esto elimina permanentemente este borrador y sus imágenes guardadas. No se puede deshacer.",
          cancelDiscard: "Conservar este borrador",
          confirmDiscard: "Descartar y empezar de nuevo",
          discarding: "Descartando…",
          errorDiscard: "No se pudo descartar este borrador.",
        },
      },
    },
  },
};

/** Pure lookup — safe to call from client or server components alike. */
export function getDictionary(locale: Locale): Dictionary {
  return dictionary[locale];
}
