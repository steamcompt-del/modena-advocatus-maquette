/* =========================================================
   MODENA Advocatus — données des domaines d'intervention
   Contenu repris et adapté. Utilisé par domaines.html & domaine.html
   ========================================================= */
window.MODENA_DOMAINS = [
  {
    id: "droit-du-dommage-corporel", icon: "i-pulse", tag: "Dommage corporel", category: "specialisation",
    title: "Droit du dommage corporel",
    short: "Accompagnement des victimes pour l'indemnisation intégrale de leurs préjudices.",
    intro: "Le droit du dommage corporel vise à obtenir une juste indemnisation pour les victimes ayant subi des préjudices physiques ou psychologiques. Spécialité reconnue par le Conseil National des Barreaux, notre cabinet accompagne les victimes à chaque étape, face aux assureurs comme aux experts.",
    quand: [
      "Vous avez été victime d'un accident de la route",
      "Vous avez subi une erreur médicale ou un accident hospitalier",
      "Vous êtes victime d'une agression physique",
      "Un accident du travail vous a causé des séquelles",
      "Vous souhaitez contester une offre d'indemnisation insuffisante"
    ],
    services: [
      "Évaluation complète de l'ensemble de vos préjudices",
      "Assistance lors des expertises médicales",
      "Négociation avec les compagnies d'assurance",
      "Constitution du dossier d'indemnisation",
      "Représentation devant les tribunaux si nécessaire"
    ],
    documents: [
      "Certificat médical initial", "Comptes-rendus hospitaliers", "Arrêts de travail",
      "Justificatifs de frais engagés", "Procès-verbal de police ou gendarmerie"
    ],
    faq: [
      { q: "Quel est le délai pour demander une indemnisation ?", a: "Le délai de prescription varie selon le type d'accident : 10 ans pour les accidents de la route, 10 ans à compter de la consolidation pour les accidents médicaux." },
      { q: "Dois-je accepter l'offre de l'assurance ?", a: "Non. Les premières offres des assurances sont souvent insuffisantes. Nous analysons votre dossier pour évaluer si l'offre correspond réellement à vos préjudices." },
      { q: "Comment se déroule l'expertise médicale ?", a: "L'expertise est réalisée par un médecin expert. Nous vous préparons à cette étape cruciale et pouvons vous accompagner avec un médecin-conseil." }
    ]
  },
  {
    id: "droit-des-etrangers-et-de-la-nationalite", icon: "i-globe", tag: "Étrangers & nationalité", category: "specialisation",
    title: "Droit des étrangers et de la nationalité",
    short: "Titres de séjour, naturalisation, recours et accompagnement des démarches.",
    intro: "Le droit des étrangers est un domaine complexe en constante évolution. Spécialité reconnue par le Conseil National des Barreaux, notre cabinet vous accompagne dans toutes vos démarches administratives et contentieuses, avec rigueur et réactivité.",
    quand: [
      "Vous souhaitez obtenir ou renouveler un titre de séjour",
      "Votre demande de titre de séjour a été refusée",
      "Vous faites l'objet d'une obligation de quitter le territoire (OQTF)",
      "Vous souhaitez acquérir la nationalité française",
      "Vous préparez une demande de regroupement familial"
    ],
    services: [
      "Constitution et suivi des dossiers de demande de titre",
      "Recours contre les refus de séjour et les OQTF",
      "Accompagnement des demandes de naturalisation",
      "Défense devant le tribunal administratif",
      "Conseils sur les stratégies de régularisation"
    ],
    documents: [
      "Passeport en cours de validité", "Justificatifs de domicile récents", "Preuves de ressources financières",
      "Attestations de liens familiaux en France", "Documents relatifs à votre situation professionnelle"
    ],
    faq: [
      { q: "Quel est le délai pour contester un refus de titre ?", a: "Généralement 2 mois pour un recours contentieux devant le tribunal administratif, parfois 48 heures en cas de rétention." },
      { q: "Puis-je travailler pendant ma demande de titre ?", a: "Cela dépend du type de récépissé délivré : certains autorisent le travail, d'autres non." },
      { q: "Comment prouver mon intégration pour la naturalisation ?", a: "Par la maîtrise du français (niveau B1), la connaissance des valeurs de la République et une insertion professionnelle stable." }
    ]
  },
  {
    id: "droit-du-travail", icon: "i-briefcase", tag: "Travail", category: "autre",
    title: "Droit du travail",
    short: "Rupture du contrat, harcèlement, discrimination et contentieux prud'homal.",
    intro: "Le droit du travail protège les salariés face à leur employeur. Licenciement abusif, harcèlement, discrimination : notre cabinet vous conseille et vous défend devant le Conseil de Prud'hommes.",
    quand: [
      "Vous contestez votre licenciement", "Vous subissez du harcèlement au travail",
      "Vos heures supplémentaires ne sont pas payées", "Vous êtes victime de discrimination",
      "Vous négociez une rupture conventionnelle"
    ],
    services: [
      "Analyse de votre contrat et de votre situation", "Négociation avec l'employeur",
      "Rédaction de courriers et mises en demeure", "Saisine du Conseil de Prud'hommes", "Représentation en audience"
    ],
    documents: ["Contrat de travail", "Bulletins de salaire", "Courriers et emails échangés", "Lettre de licenciement le cas échéant", "Attestations de témoins"]
  },
  {
    id: "droit-immobilier", icon: "i-home", tag: "Immobilier", category: "autre",
    title: "Droit immobilier",
    short: "Vices cachés, malfaçons, sinistres et contentieux de la construction.",
    intro: "Le droit immobilier couvre les litiges liés à la vente, la construction et la propriété. Vices cachés, malfaçons, dégâts des eaux : nous vous accompagnons pour faire valoir vos droits.",
    quand: [
      "Vous avez découvert des vices cachés après l'achat", "Vous subissez des malfaçons de construction",
      "Vous êtes en conflit avec le syndic", "Vous avez un dégât des eaux ou des infiltrations",
      "Vous contestez la responsabilité du constructeur"
    ],
    services: ["Mise en cause du vendeur ou du constructeur", "Demande d'expertise judiciaire", "Action en garantie décennale", "Litiges de voisinage", "Dégâts des eaux et responsabilités"],
    documents: ["Acte de vente ou contrat de construction", "Diagnostics immobiliers", "Devis et factures de travaux", "Photos des désordres", "Correspondances avec les parties"]
  },
  {
    id: "droit-automobile", icon: "i-car", tag: "Automobile", category: "autre",
    title: "Droit automobile",
    short: "Vices cachés, faux kilométrages, expertises et escroqueries à l'achat.",
    intro: "Le droit automobile couvre les litiges liés à l'achat, la vente et l'usage des véhicules. Faux kilométrages, véhicules gravement endommagés, escroqueries : nous défendons vos intérêts.",
    quand: [
      "Vous avez acheté un véhicule avec un faux kilométrage", "Le véhicule présente des vices cachés",
      "Vous êtes victime d'une escroquerie à l'achat", "Votre véhicule est déclaré irréparable",
      "Vous contestez une expertise automobile"
    ],
    services: ["Analyse du dossier et conseil sur la stratégie", "Mise en demeure du vendeur", "Demande d'expertise judiciaire", "Négociation amiable", "Procédure pour annulation de vente ou indemnisation"],
    documents: ["Contrat de vente du véhicule", "Carte grise et certificat de situation", "Factures de réparations", "Rapport d'expertise le cas échéant", "Échanges avec le vendeur"]
  },
  {
    id: "droit-de-la-copropriete", icon: "i-building", tag: "Copropriété", category: "autre",
    title: "Droit de la copropriété",
    short: "Assemblées générales, syndic, charges et litiges entre copropriétaires.",
    intro: "Le droit de la copropriété régit les relations entre copropriétaires et avec le syndic. Nous vous assistons pour faire respecter vos droits.",
    quand: [
      "Vous contestez une décision d'assemblée générale", "Vous avez un litige avec le syndic",
      "Des travaux sont réalisés sans autorisation", "Vous subissez des troubles de voisinage", "Les charges sont mal réparties"
    ],
    services: ["Contestation des décisions d'AG", "Mise en cause du syndic", "Recouvrement de charges impayées", "Litiges entre copropriétaires", "Troubles de voisinage"],
    documents: ["Règlement de copropriété", "Procès-verbaux d'assemblée générale", "Relevés de charges", "Correspondances avec le syndic", "Photos des désordres"]
  },
  {
    id: "droit-locatif", icon: "i-key", tag: "Locatif", category: "autre",
    title: "Droit locatif",
    short: "Baux, impayés, congés, dépôt de garantie et expulsions.",
    intro: "Le droit locatif régit les relations entre bailleurs et locataires. Impayés, congés, état des lieux : nous défendons vos intérêts, propriétaire comme locataire.",
    quand: [
      "Votre locataire ne paie plus son loyer", "Vous contestez votre congé locataire",
      "L'état des lieux est contesté", "Le dépôt de garantie n'est pas restitué", "Le logement présente des désordres"
    ],
    services: ["Recouvrement des loyers impayés", "Procédure d'expulsion", "Contestation de congé", "Litige sur le dépôt de garantie", "Mise aux normes du logement"],
    documents: ["Contrat de bail", "État des lieux d'entrée et de sortie", "Quittances et relevé des loyers", "Correspondances avec l'autre partie", "Photos du logement"]
  },
  {
    id: "droit-de-la-consommation", icon: "i-cart", tag: "Consommation", category: "autre",
    title: "Droit de la consommation",
    short: "Pratiques trompeuses, clauses abusives, rétractation et litiges e-commerce.",
    intro: "Le droit de la consommation protège les particuliers dans leurs relations avec les professionnels. Nous intervenons pour faire valoir vos droits.",
    quand: [
      "Vous êtes victime d'une pratique commerciale trompeuse", "Un professionnel ne respecte pas ses engagements",
      "Vous souhaitez exercer votre droit de rétractation", "Vous avez un litige avec un e-commerçant", "Vous contestez des clauses abusives"
    ],
    services: ["Analyse de vos contrats et conditions générales", "Mise en demeure du professionnel", "Signalement à la DGCCRF si nécessaire", "Médiation de la consommation", "Procédure judiciaire"],
    documents: ["Contrat ou bon de commande", "Factures et preuves de paiement", "Échanges avec le professionnel", "Photos ou preuves du problème", "Conditions générales de vente"]
  },
  {
    id: "droit-du-voyage-et-du-transport", icon: "i-plane", tag: "Voyage & transport", category: "autre",
    title: "Droit du voyage et du transport",
    short: "Vols retardés ou annulés, bagages perdus et litiges avec les voyagistes.",
    intro: "Le droit du voyage et du transport protège les passagers et voyageurs. Retards, annulations, bagages perdus : nous faisons valoir vos droits.",
    quand: [
      "Votre vol a été annulé ou retardé", "Vos bagages ont été perdus ou endommagés",
      "Vous avez un litige avec un voyagiste", "Votre croisière ou séjour n'était pas conforme", "Vous avez subi un préjudice lors d'un transport"
    ],
    services: ["Demande d'indemnisation auprès des compagnies", "Réclamation pour bagages perdus", "Litige avec les voyagistes", "Indemnisation en cas de surbooking", "Action en responsabilité"],
    documents: ["Billets et confirmations de réservation", "Carte d'embarquement", "Correspondances avec la compagnie", "Preuves du préjudice", "Factures des frais engagés"]
  },
  {
    id: "droit-de-la-fonction-publique", icon: "i-landmark", tag: "Fonction publique", category: "autre",
    title: "Droit de la fonction publique",
    short: "Sanctions disciplinaires, harcèlement et litiges avec l'administration.",
    intro: "Le droit de la fonction publique régit les relations entre les agents et leur administration. Nous défendons les fonctionnaires et agents contractuels.",
    quand: [
      "Vous contestez une sanction disciplinaire", "Vous êtes victime de harcèlement dans l'administration",
      "Votre contrat n'est pas renouvelé", "Vous contestez une mutation ou un refus de promotion", "Vous êtes en litige avec votre employeur public"
    ],
    services: ["Défense devant le conseil de discipline", "Recours contre les sanctions", "Contentieux de la notation et de l'avancement", "Harcèlement moral dans la fonction publique", "Contentieux de la protection fonctionnelle"],
    documents: ["Arrêtés et décisions administratives", "Bulletins de paie", "Correspondances avec l'administration", "Évaluations professionnelles", "Attestations de collègues"]
  },
  {
    id: "droit-de-lhomme-et-libertes-fondamentales", icon: "i-scales", tag: "Droits de l'Homme", category: "autre",
    title: "Droits de l'Homme et libertés fondamentales",
    short: "Discriminations, libertés publiques, CEDH et QPC.",
    intro: "Les droits de l'Homme et libertés fondamentales sont au cœur de notre pratique. Nous défendons vos droits devant les juridictions nationales et européennes.",
    quand: [
      "Vous estimez que vos droits fondamentaux sont violés", "Vous êtes victime de discrimination",
      "Vous souhaitez saisir la CEDH", "Vous contestez une mesure privative de liberté", "Vous défendez la liberté d'expression ou de religion"
    ],
    services: ["Analyse de la violation alléguée", "Recours devant les juridictions administratives", "Saisine de la Cour européenne des droits de l'Homme", "Question prioritaire de constitutionnalité", "Défense des libertés publiques"],
    documents: ["Décision contestée", "Preuves de la violation", "Parcours juridictionnel complet", "Documents attestant du préjudice", "Correspondances avec les autorités"]
  },
  {
    id: "responsabilite-de-letat", icon: "i-shield", tag: "Responsabilité de l'État", category: "autre",
    title: "Responsabilité de l'État",
    short: "Déni de justice, délais anormaux, faute lourde et DALO.",
    intro: "L'État peut être tenu responsable de ses fautes. Délais anormaux, déni de justice, faute lourde : nous engageons les recours appropriés.",
    quand: [
      "Vous avez subi un déni de justice", "La procédure judiciaire a duré anormalement longtemps",
      "L'administration a commis une faute lourde", "Vous êtes victime du DALO non exécuté", "Vous subissez un préjudice du fait de l'État"
    ],
    services: ["Recours indemnitaire contre l'État", "Délais anormaux de procédure", "Faute lourde du service public de la justice", "DALO : recours et indemnisation", "Responsabilité sans faute"],
    documents: ["Décisions de justice", "Historique complet de la procédure", "Preuves du préjudice subi", "Courriers aux administrations", "Tout document pertinent"]
  },
  {
    id: "droit-penal-des-victimes", icon: "i-gavel", tag: "Pénal (victimes)", category: "autre",
    title: "Droit pénal des victimes",
    short: "Agressions, violences, constitution de partie civile et CIVI.",
    intro: "Le droit pénal des victimes permet d'obtenir justice et réparation. Agressions, violences, infractions : nous vous accompagnons tout au long de la procédure pénale.",
    quand: [
      "Vous avez été victime d'une agression", "Vous subissez des violences conjugales",
      "Vous êtes victime de harcèlement", "Vous avez subi un vol avec violence", "L'auteur n'est pas identifié ou insolvable"
    ],
    services: ["Constitution de partie civile", "Accompagnement lors du procès", "Demande d'indemnisation", "Saisine de la CIVI", "Suivi et orientation vers les associations"],
    documents: ["Dépôt de plainte", "Certificats médicaux et ITT", "Photos des blessures", "Témoignages", "Justificatifs des préjudices"]
  },
  {
    id: "droit-de-lhebergement", icon: "i-home", tag: "Hébergement", category: "autre",
    title: "Droit de l'hébergement",
    short: "Hébergement d'urgence, recours contre les refus, familles à la rue.",
    intro: "Le droit à l'hébergement d'urgence est un droit fondamental. Nous accompagnons les personnes en situation de précarité dans leurs recours pour obtenir un hébergement.",
    quand: [
      "Vous n'avez pas de solution d'hébergement", "Le 115 ne répond pas ou ne propose rien",
      "Vous êtes menacé d'expulsion de votre hébergement", "Vous souhaitez contester une décision de refus", "Vous êtes une famille avec enfants à la rue"
    ],
    services: ["Référé-liberté devant le tribunal administratif", "Recours contre les refus d'hébergement", "Accompagnement des familles avec enfants", "Suivi des procédures d'urgence", "Orientation vers les associations partenaires"],
    documents: ["Justificatifs d'identité", "Attestations de refus du 115", "Certificats médicaux le cas échéant", "Preuves de la situation familiale", "Tout document attestant de la vulnérabilité"]
  }
];

/* La certification est indiquée une fois, dans le titre de la section. */
window.MODENA_renderSpec = function (d, index) {
  var number = String((typeof index === 'number' ? index : 0) + 1).padStart(2, '0');
  var intro = d.intro.replace('Spécialité reconnue par le Conseil National des Barreaux, notre cabinet', 'Notre cabinet');
  return '<article class="spec">' +
    '<div class="spec__label" aria-hidden="true">' + number + '</div>' +
    '<div class="spec__body">' +
      '<h3>' + d.title + '</h3>' +
      '<p>' + intro + '</p>' +
      '<a class="arrow-link" href="' + d.id + '.html">Consulter ce domaine &rarr;</a>' +
    '</div>' +
  '</article>';
};

/* Rendu : entrée de l'index numéroté (domaines complémentaires).
   La numérotation est gérée en CSS (counter). */
window.MODENA_renderDomainItem = function (d) {
  return '<li><a href="' + d.id + '.html">' +
    '<span class="di-title">' + d.title + '</span>' +
    '<span class="di-desc">' + d.short + '</span>' +
  '</a></li>';
};
