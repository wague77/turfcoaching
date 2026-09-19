
import jsPDF from 'jspdf';

interface Section {
  title: string;
  icon: string;
  description: string;
  howToUse: string[];
  strategies: string[];
  tips: string[];
}

const sections: Section[] = [
  {
    title: "1. DONNÉES & ANALYSE",
    icon: "📊",
    description: "C'est le point de départ de toute analyse. Importez les données de course depuis le PMU ou saisissez-les manuellement.",
    howToUse: [
      "Sélectionnez la date de la course",
      "Entrez le numéro de réunion (R1, R2, etc.)",
      "Entrez le numéro de course (C1, C2, etc.)",
      "Cliquez sur 'Récupérer' pour importer automatiquement",
      "Ou saisissez manuellement les données dans la zone de texte",
      "Sélectionnez la discipline : Plat, Trot ou Obstacle",
      "Cliquez sur 'Analyser' pour lancer le calcul"
    ],
    strategies: [
      "Toujours vérifier que la discipline est correcte",
      "Entrer l'arrivée officielle après la course pour évaluer vos pronostics",
      "Utiliser l'import PMU plutôt que la saisie manuelle pour éviter les erreurs"
    ],
    tips: [
      "Les données sont sauvegardées automatiquement",
      "Vous pouvez effacer toutes les données avec le bouton en haut"
    ]
  },
  {
    title: "2. RÉSULTATS",
    icon: "🎯",
    description: "Visualisez les résultats de l'analyse avec les classements par score, cotes et musique.",
    howToUse: [
      "Consultez le TOP 8 des chevaux par différents critères",
      "Analysez l'indicateur de difficulté de la course",
      "Examinez les couplés gagnants générés automatiquement"
    ],
    strategies: [
      "Privilégiez les courses avec difficulté 'Facile'",
      "Les chevaux en tête des 3 classements (score, cotes, musique) sont les plus fiables",
      "Un cheval présent dans plusieurs TOP 8 est un candidat sérieux"
    ],
    tips: [
      "Le code couleur indique la performance : vert = excellent, rouge = à éviter",
      "Les couplés sont générés en croisant les meilleures données"
    ]
  },
  {
    title: "3. GÉNÉRATEUR",
    icon: "🔀",
    description: "Générez des combinaisons de paris (Tiercé, Quarté, Quinté, Couplé) avec des filtres avancés.",
    howToUse: [
      "Sélectionnez le type de pari souhaité",
      "Appliquez les filtres : parité, poids, somme des cotes, etc.",
      "Définissez les chevaux obligatoires et exclus",
      "Limitez le nombre de combinaisons si nécessaire",
      "Générez et consultez les combinaisons"
    ],
    strategies: [
      "Utilisez le filtre 'favoris' pour inclure au moins 1-2 favoris",
      "Le filtre 'outsiders' permet de capturer les surprises",
      "Limitez à 50-100 combinaisons pour un budget raisonnable"
    ],
    tips: [
      "L'historique des générations est conservé",
      "Combinez plusieurs filtres pour affiner les résultats"
    ]
  },
  {
    title: "4. CARRÉ MAGIQUE",
    icon: "✨",
    description: "Stratégie basée sur l'identification des chevaux 'gagnants récents' dans leur musique.",
    howToUse: [
      "Sélectionnez un cheval comme 'base' pour votre pronostic",
      "Le système identifie automatiquement les gagnants récents (1 dans la musique)",
      "Les associations optimales sont générées automatiquement",
      "Sauvegardez vos sélections pour suivi"
    ],
    strategies: [
      "Base gagnante récente + non-gagnants : pari sur la continuité",
      "Base non-gagnante + gagnants récents : pari sur le changement",
      "Les chevaux avec un '1' récent dans la musique ont une dynamique positive",
      "Privilégiez les bases avec un score élevé ET une victoire récente"
    ],
    tips: [
      "Les chevaux jaunes sont les gagnants récents",
      "Consultez l'historique pour voir vos taux de réussite",
      "Entrez l'arrivée pour évaluer chaque sélection"
    ]
  },
  {
    title: "5. RÉPARTITEUR",
    icon: "🧮",
    description: "Gérez votre bankroll et répartissez vos mises de manière optimale.",
    howToUse: [
      "Définissez votre bankroll totale",
      "Choisissez le pourcentage à miser",
      "Entrez les chevaux et leurs cotes",
      "Le système calcule la répartition optimale",
      "Enregistrez les résultats après la course"
    ],
    strategies: [
      "Ne jamais miser plus de 5% de sa bankroll sur une course",
      "En cas de série perdante, réduire les mises",
      "Suivre les statistiques pour ajuster sa stratégie",
      "Viser un ROI positif sur le long terme"
    ],
    tips: [
      "L'historique montre l'évolution de votre bankroll",
      "Le graphique permet de visualiser les tendances"
    ]
  },
  {
    title: "6. COURSES FACILES",
    icon: "⚡",
    description: "Identifiez automatiquement les courses avec un indice de difficulté favorable.",
    howToUse: [
      "Sélectionnez une date",
      "Cliquez sur 'Analyser' pour scanner toutes les courses",
      "Seules les courses 'faciles' sont affichées",
      "Consultez le TOP 4 de chaque course facile"
    ],
    strategies: [
      "Les courses faciles ont une hiérarchie claire",
      "Concentrez vos paris sur ces courses pour maximiser vos chances",
      "Le TOP 4 affiché contient généralement le gagnant"
    ],
    tips: [
      "Sauvegardez les courses intéressantes pour suivi",
      "Analysez plusieurs jours pour repérer les patterns"
    ]
  },
  {
    title: "7. TOP COURSES",
    icon: "⭐",
    description: "Découvrez les meilleures courses du jour selon notre algorithme.",
    howToUse: [
      "Les courses sont classées par indice de rentabilité",
      "Consultez les détails de chaque course",
      "Identifiez les favoris solides"
    ],
    strategies: [
      "Les TOP courses ont le meilleur rapport risque/gain",
      "Combinez avec l'analyse du Carré Magique pour affiner"
    ],
    tips: [
      "Actualisez régulièrement pour voir les nouvelles analyses"
    ]
  },
  {
    title: "8. SAUVEGARDÉES",
    icon: "🔖",
    description: "Retrouvez toutes les courses que vous avez sauvegardées.",
    howToUse: [
      "Accédez à vos courses favorites",
      "Consultez les analyses déjà effectuées",
      "Comparez les résultats avec vos pronostics"
    ],
    strategies: [
      "Sauvegardez les courses pour constituer une base de données personnelle",
      "Analysez vos succès et échecs pour progresser"
    ],
    tips: [
      "Supprimez régulièrement les anciennes entrées"
    ]
  },
  {
    title: "9. ÉVOLUTION COTES",
    icon: "⏱️",
    description: "Suivez l'évolution des cotes en temps réel avant le départ.",
    howToUse: [
      "Sélectionnez la date, réunion et course",
      "Activez le mode automatique pour un suivi continu",
      "Observez les variations de cotes dans le tableau",
      "Utilisez le graphique pour visualiser les tendances",
      "Lancez l'analyse IA pour des recommandations"
    ],
    strategies: [
      "Une cote qui baisse fortement indique un cheval 'joué'",
      "Une cote qui monte peut révéler un problème",
      "Les chevaux TOP 3 avec cote en baisse sont des bases solides",
      "Surveillez les alertes automatiques"
    ],
    tips: [
      "Exportez les données en Excel pour analyse approfondie",
      "L'historique conserve toutes les variations"
    ]
  },
  {
    title: "10. VARIATIONS",
    icon: "📉",
    description: "Générez des combinaisons basées sur les tendances de cotes (hausse/baisse).",
    howToUse: [
      "Sélectionnez un modèle de variation (équilibré, agressif, etc.)",
      "Ou personnalisez vos critères de hausse/baisse",
      "Générez les combinaisons correspondantes"
    ],
    strategies: [
      "Le modèle 'Équilibré' : 2 baisses + 1 hausse, bon compromis",
      "Le modèle 'Agressif' : plus de hausses, gains potentiels plus élevés",
      "Combinez avec l'évolution des cotes pour valider"
    ],
    tips: [
      "Les variations de dernière minute sont souvent significatives"
    ]
  },
  {
    title: "11. GRAPHIQUES",
    icon: "📈",
    description: "Visualisez les données sous forme de graphiques comparatifs.",
    howToUse: [
      "Consultez les scores comparés de tous les chevaux",
      "Analysez les courbes de performance",
      "Identifiez visuellement les meilleurs"
    ],
    strategies: [
      "Un pic de score indique un cheval en forme",
      "Comparez les scores aux cotes pour trouver de la valeur"
    ],
    tips: [
      "Les graphiques facilitent la comparaison rapide"
    ]
  },
  {
    title: "12. COMPARAISON",
    icon: "🔃",
    description: "Comparez deux chevaux ou plus en détail.",
    howToUse: [
      "Sélectionnez les chevaux à comparer",
      "Examinez les statistiques côte à côte",
      "Analysez les forces et faiblesses de chacun"
    ],
    strategies: [
      "Comparez les favoris entre eux pour trancher",
      "Utilisez pour départager deux chevaux de niveau similaire"
    ],
    tips: [
      "L'historique des comparaisons est conservé"
    ]
  },
  {
    title: "13. ANALYSE DÉTAILLÉE",
    icon: "📊",
    description: "Obtenez une analyse approfondie de chaque cheval avec filtres dynamiques.",
    howToUse: [
      "Consultez le verdict sur les 3 premiers favoris",
      "Utilisez les filtres pour affiner l'affichage",
      "Examinez chaque critère en détail"
    ],
    strategies: [
      "Le verdict synthétise les points forts de chaque favori",
      "Les filtres permettent de se concentrer sur un critère"
    ],
    tips: [
      "Combinez avec les autres onglets pour une vision complète"
    ]
  },
  {
    title: "14. HISTORIQUE 1ERS",
    icon: "🏆",
    description: "Identifiez les chevaux ayant déjà gagné dans leur historique.",
    howToUse: [
      "Consultez la liste des chevaux avec victoires passées",
      "Triés par cotes pour repérer les opportunités"
    ],
    strategies: [
      "Un cheval déjà vainqueur sait gagner",
      "Attention aux cotes trop basses (moins de valeur)",
      "Les anciens gagnants à cote élevée sont des coups intéressants"
    ],
    tips: [
      "La taille de police agrandie facilite la lecture",
      "Croisez avec le Carré Magique pour les gagnants récents"
    ]
  },
  {
    title: "15. TURF-COACHING",
    icon: "✨",
    description: "Réducteur de combinaisons intelligent Turf-Coaching. Réduisez intelligemment vos combinaisons Tiercé, Quarté et Quinté grâce à 7 modules d'analyse.",
    howToUse: [
      "Importez automatiquement les données depuis l'onglet Données & Analyse",
      "Sélectionnez le type de pari (Tiercé, Quarté, Quinté)",
      "Utilisez les modules Paniers pour filtrer par profil de combinaison",
      "Utilisez les modules Groupes pour filtrer par citations presse",
      "Appliquez le Simulator pour filtrer par popularité des paris",
      "Éliminez les Chevaux HS (hors-série) peu fiables",
      "Définissez le nombre de Favoris/Tocards souhaités",
      "Ajoutez vos pronostics personnels comme filtres",
      "Éliminez les séries de numéros consécutifs",
      "Consultez les combinaisons restantes classées par cotes"
    ],
    strategies: [
      "Commencez par les Paniers P24-P28 pour les courses classiques",
      "Les Groupes G4-G6 correspondent aux chevaux bien cités par la presse",
      "Le Simulator S55-S75 cible les combinaisons moyennement jouées (meilleur rapport)",
      "Visez moins de 50 combinaisons pour une mise raisonnable",
      "Combinez plusieurs modules pour une réduction optimale",
      "Sauvegardez vos analyses pour suivre vos performances"
    ],
    tips: [
      "L'import automatique récupère cotes, favoris et tocards de votre analyse",
      "Les chevaux sont triés par cotes pour une lecture rapide",
      "Entrez l'arrivée pour évaluer si vos combinaisons contiennent la gagnante",
      "L'historique conserve toutes vos analyses avec statistiques de réussite",
      "Utilisez les Filtres avancés (parité, somme, L1/L2) pour affiner"
    ]
  }
];

const strategies: string[] = [
  "🎯 STRATÉGIE GLOBALE : LA MÉTHODE DES 3 CONFIRMATIONS",
  "",
  "Avant de valider un pari, vérifiez que votre sélection est confirmée par au moins 3 sources différentes :",
  "• Score élevé dans l'analyse",
  "• Présence dans le TOP des courses faciles",
  "• Cotes en baisse dans l'évolution",
  "• Victoire récente (Carré Magique)",
  "• Recommandation de l'IA",
  "",
  "🏦 GESTION DE BANKROLL",
  "",
  "• Définissez un budget mensuel que vous pouvez perdre",
  "• Ne misez jamais plus de 3-5% de votre bankroll par course",
  "• Utilisez le Répartiteur pour optimiser vos mises",
  "• En cas de 3 pertes consécutives, faites une pause",
  "• Visez la régularité plutôt que les gros gains",
  "",
  "📅 ROUTINE QUOTIDIENNE RECOMMANDÉE",
  "",
  "1. Consultez les Courses Faciles et Top Courses",
  "2. Analysez 2-3 courses maximum par jour",
  "3. Utilisez l'Évolution des Cotes 30 min avant le départ",
  "4. Validez avec le Carré Magique",
  "5. Demandez l'avis de l'IA",
  "6. Utilisez le Répartiteur pour vos mises",
  "7. Notez les résultats pour progresser",
  "",
  "⚠️ ERREURS À ÉVITER",
  "",
  "• Jouer toutes les courses sans sélection",
  "• Courir après les pertes",
  "• Ignorer les indicateurs de difficulté",
  "• Miser tout sur une seule course",
  "• Ne pas suivre l'évolution des cotes",
  "",
  "💡 CONSEILS D'EXPERT",
  "",
  "• Les courses de Plat sont généralement plus lisibles",
  "• Le Quinté+ du jour concentre l'information médiatique",
  "• Les réunions parisiennes (Longchamp, Vincennes) sont mieux documentées",
  "• Méfiez-vous des favoris à moins de 2.00 (faible valeur)",
  "• Un outsider confirmé par plusieurs indicateurs vaut le risque",
];

interface GlossaryTerm {
  term: string;
  definition: string;
}

const glossary: GlossaryTerm[] = [
  { term: "Arrivée", definition: "Ordre d'arrivée officiel des chevaux à la ligne d'arrivée." },
  { term: "Base", definition: "Cheval considéré comme incontournable dans une combinaison de paris." },
  { term: "Bankroll", definition: "Capital de jeu total dont dispose le parieur." },
  { term: "Cote", definition: "Rapport estimé indiquant le gain potentiel pour 1€ misé." },
  { term: "Couplé", definition: "Pari sur 2 chevaux devant arriver dans les 2 ou 3 premiers." },
  { term: "Couplé gagnant", definition: "Les 2 chevaux doivent arriver 1er et 2ème (ordre indifférent)." },
  { term: "Couplé placé", definition: "Les 2 chevaux doivent arriver dans les 3 premiers." },
  { term: "Déferré", definition: "Cheval courant sans fers, indiqué par DP (postérieurs) ou D4 (4 pieds)." },
  { term: "Driver", definition: "Jockey spécialisé dans les courses de trot attelé." },
  { term: "Écart", definition: "Nombre de courses depuis le dernier gain d'un cheval." },
  { term: "Entraîneur", definition: "Professionnel responsable de la préparation physique du cheval." },
  { term: "Favori", definition: "Cheval ayant la cote la plus basse, considéré comme le plus probable de gagner." },
  { term: "Ferrure", definition: "Type de fers portés par le cheval (peut influencer sa performance)." },
  { term: "Handicap", definition: "Course où les chevaux portent des poids différents pour égaliser les chances." },
  { term: "Hippodrome", definition: "Terrain aménagé pour les courses hippiques." },
  { term: "Jockey", definition: "Cavalier professionnel montant les chevaux de course." },
  { term: "Longueur", definition: "Unité de mesure des écarts entre chevaux à l'arrivée (environ 2,5m)." },
  { term: "Musique", definition: "Historique des dernières performances du cheval (1=victoire, 0=non placé, etc.)." },
  { term: "Non-partant (NP)", definition: "Cheval déclaré mais qui ne prend pas le départ." },
  { term: "Obstacle", definition: "Type de course avec haies ou steeple-chase." },
  { term: "Œillères", definition: "Équipement limitant la vision latérale du cheval pour le concentrer." },
  { term: "Outsider", definition: "Cheval à cote élevée, considéré comme peu probable de gagner." },
  { term: "Placé", definition: "Cheval terminant dans les 3 premiers (ou 2 premiers selon le nombre de partants)." },
  { term: "Plat", definition: "Course de galop sans obstacles sur terrain plat." },
  { term: "PMU", definition: "Pari Mutuel Urbain : opérateur français gérant les paris hippiques." },
  { term: "Poids", definition: "Charge totale portée par le cheval (jockey + selle + éventuels surcharges)." },
  { term: "Propriétaire", definition: "Personne possédant légalement le cheval de course." },
  { term: "Quarté+", definition: "Pari sur les 4 premiers chevaux, dans l'ordre ou le désordre." },
  { term: "Quinté+", definition: "Pari phare du PMU sur les 5 premiers, avec bonus pour l'ordre exact." },
  { term: "Rapport", definition: "Gain effectif pour 1€ misé, calculé après la course." },
  { term: "Récence", definition: "Délai depuis la dernière course du cheval." },
  { term: "Réduction kilométrique", definition: "Temps moyen au kilomètre, indicateur de vitesse au trot." },
  { term: "ROI", definition: "Return On Investment : taux de retour sur les mises." },
  { term: "Simple gagnant", definition: "Pari le plus basique : le cheval doit gagner." },
  { term: "Simple placé", definition: "Pari où le cheval doit terminer dans les 3 premiers." },
  { term: "Steeple-chase", definition: "Course d'obstacle avec haies fixes et fossés." },
  { term: "Sulky", definition: "Voiturette légère tirée par le cheval en course de trot attelé." },
  { term: "Tiercé", definition: "Pari sur les 3 premiers chevaux, dans l'ordre ou le désordre." },
  { term: "Trot attelé", definition: "Course où le cheval tire un sulky avec un driver." },
  { term: "Trot monté", definition: "Course de trot où le jockey monte le cheval." },
  { term: "Turfiste", definition: "Amateur de courses hippiques et de paris." },
  { term: "Value bet", definition: "Pari dont la cote est supérieure à la probabilité réelle de gain." },
];

export function generateUserGuidePDF(): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  const addNewPageIfNeeded = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // === PAGE DE COUVERTURE ===
  doc.setFillColor(17, 24, 39); // bg-background dark
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Titre principal
  doc.setTextColor(34, 197, 94); // green-500
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text('AutoQuintePro', pageWidth / 2, 60, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text("MODE D'EMPLOI COMPLET", pageWidth / 2, 80, { align: 'center' });

  doc.setFontSize(16);
  doc.setTextColor(156, 163, 175); // gray-400
  doc.text('Guide stratégique pour gagner aux courses hippiques', pageWidth / 2, 100, { align: 'center' });

  // Version
  doc.setFontSize(12);
  doc.text('Version 8.0', pageWidth / 2, 130, { align: 'center' });

  // Décorations
  doc.setDrawColor(34, 197, 94);
  doc.setLineWidth(2);
  doc.line(margin + 20, 110, pageWidth - margin - 20, 110);

  // Sommaire
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('SOMMAIRE', pageWidth / 2, 160, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  let summaryY = 175;
  
  sections.forEach((section, index) => {
    doc.setTextColor(34, 197, 94);
    doc.text(section.icon, margin + 5, summaryY);
    doc.setTextColor(255, 255, 255);
    doc.text(section.title, margin + 15, summaryY);
    summaryY += 7;
  });

  doc.setTextColor(34, 197, 94);
  doc.text('🎯', margin + 5, summaryY + 5);
  doc.setTextColor(255, 255, 255);
  doc.text('STRATÉGIES GAGNANTES', margin + 15, summaryY + 5);

  doc.setTextColor(34, 197, 94);
  doc.text('📖', margin + 5, summaryY + 12);
  doc.setTextColor(255, 255, 255);
  doc.text('GLOSSAIRE DES TERMES TURFISTES', margin + 15, summaryY + 12);

  // === PAGES DE CONTENU ===
  sections.forEach((section) => {
    doc.addPage();
    y = margin;

    // Fond blanc pour les pages de contenu
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // En-tête de section avec fond coloré
    doc.setFillColor(34, 197, 94);
    doc.rect(0, 0, pageWidth, 25, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`${section.icon} ${section.title}`, margin, 17);

    y = 40;

    // Description
    doc.setTextColor(31, 41, 55); // gray-800
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const descLines = doc.splitTextToSize(section.description, contentWidth);
    doc.text(descLines, margin, y);
    y += descLines.length * 6 + 10;

    // Comment utiliser - Calculate actual height first
    const howToUseLineHeight = 5;
    let howToUseTotalHeight = 15; // Header + padding
    section.howToUse.forEach((step) => {
      const stepLines = doc.splitTextToSize(`• ${step}`, contentWidth - 10);
      howToUseTotalHeight += stepLines.length * howToUseLineHeight + 2;
    });
    
    // Check if we need a new page for howToUse box
    if (y + howToUseTotalHeight > pageHeight - margin) {
      doc.addPage();
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      y = margin;
    }

    doc.setFillColor(240, 253, 244); // green-50
    doc.roundedRect(margin - 5, y - 5, contentWidth + 10, howToUseTotalHeight + 5, 3, 3, 'F');

    doc.setTextColor(34, 197, 94);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('📋 COMMENT UTILISER', margin, y + 5);
    y += 12;

    doc.setTextColor(31, 41, 55);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    section.howToUse.forEach((step) => {
      const stepLines = doc.splitTextToSize(`• ${step}`, contentWidth - 10);
      doc.text(stepLines, margin + 5, y);
      y += stepLines.length * howToUseLineHeight + 2;
    });

    y += 10;

    // Stratégies - Calculate actual height first
    const stratLineHeight = 5;
    let stratTotalHeight = 15; // Header + padding
    section.strategies.forEach((strategy) => {
      const stratLines = doc.splitTextToSize(`★ ${strategy}`, contentWidth - 10);
      stratTotalHeight += stratLines.length * stratLineHeight + 2;
    });
    
    // Check if we need a new page for strategies box
    if (y + stratTotalHeight > pageHeight - margin) {
      doc.addPage();
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      y = margin;
    }

    doc.setFillColor(254, 252, 232); // yellow-50
    doc.roundedRect(margin - 5, y - 5, contentWidth + 10, stratTotalHeight + 5, 3, 3, 'F');

    doc.setTextColor(202, 138, 4); // yellow-600
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('🎯 STRATÉGIES GAGNANTES', margin, y + 5);
    y += 12;

    doc.setTextColor(31, 41, 55);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    section.strategies.forEach((strategy) => {
      const stratLines = doc.splitTextToSize(`★ ${strategy}`, contentWidth - 10);
      doc.text(stratLines, margin + 5, y);
      y += stratLines.length * stratLineHeight + 2;
    });

    y += 10;

    // Conseils - Calculate actual height first
    const tipLineHeight = 5;
    let tipsTotalHeight = 15; // Header + padding
    section.tips.forEach((tip) => {
      const tipLines = doc.splitTextToSize(`→ ${tip}`, contentWidth - 10);
      tipsTotalHeight += tipLines.length * tipLineHeight + 2;
    });
    
    // Check if we need a new page for tips box
    if (y + tipsTotalHeight > pageHeight - margin) {
      doc.addPage();
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      y = margin;
    }

    doc.setFillColor(239, 246, 255); // blue-50
    doc.roundedRect(margin - 5, y - 5, contentWidth + 10, tipsTotalHeight + 5, 3, 3, 'F');

    doc.setTextColor(37, 99, 235); // blue-600
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('💡 CONSEILS', margin, y + 5);
    y += 12;

    doc.setTextColor(31, 41, 55);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    section.tips.forEach((tip) => {
      const tipLines = doc.splitTextToSize(`→ ${tip}`, contentWidth - 10);
      doc.text(tipLines, margin + 5, y);
      y += tipLines.length * tipLineHeight + 2;
    });
  });

  // === PAGE STRATÉGIES GLOBALES ===
  doc.addPage();
  y = margin;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  doc.setFillColor(202, 138, 4); // yellow-600
  doc.rect(0, 0, pageWidth, 25, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('🎯 STRATÉGIES GLOBALES & CONSEILS D\'EXPERT', margin, 17);

  y = 40;

  doc.setTextColor(31, 41, 55);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  strategies.forEach((line) => {
    if (line.startsWith('🎯') || line.startsWith('🏦') || line.startsWith('📅') || line.startsWith('⚠️') || line.startsWith('💡')) {
      y += 5;
      addNewPageIfNeeded(15);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 197, 94);
      doc.text(line, margin, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(31, 41, 55);
    } else if (line === '') {
      y += 3;
    } else {
      const textLines = doc.splitTextToSize(line, contentWidth);
      addNewPageIfNeeded(textLines.length * 5 + 3);
      doc.text(textLines, margin, y);
      y += textLines.length * 5 + 2;
    }
  });

  // === PAGE GLOSSAIRE ===
  doc.addPage();
  y = margin;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  doc.setFillColor(37, 99, 235); // blue-600
  doc.rect(0, 0, pageWidth, 25, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('📖 GLOSSAIRE DES TERMES TURFISTES', margin, 17);

  y = 40;

  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128); // gray-500
  doc.setFont('helvetica', 'italic');
  doc.text('Vocabulaire essentiel pour comprendre les courses hippiques et les paris.', margin, y);
  y += 12;

  glossary.forEach((item, index) => {
    addNewPageIfNeeded(15);
    
    // Alternate background for readability
    if (index % 2 === 0) {
      doc.setFillColor(249, 250, 251); // gray-50
      doc.rect(margin - 5, y - 4, contentWidth + 10, 12, 'F');
    }

    // Term in bold green
    doc.setTextColor(34, 197, 94); // green-500
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(item.term, margin, y);

    // Definition in regular gray
    doc.setTextColor(55, 65, 81); // gray-700
    doc.setFont('helvetica', 'normal');
    const termWidth = doc.getTextWidth(item.term + ' : ');
    const defLines = doc.splitTextToSize(item.definition, contentWidth - termWidth - 5);
    doc.text(' : ' + defLines[0], margin + doc.getTextWidth(item.term), y);
    
    if (defLines.length > 1) {
      for (let i = 1; i < defLines.length; i++) {
        y += 5;
        addNewPageIfNeeded(10);
        doc.text(defLines[i], margin + 5, y);
      }
    }
    
    y += 8;
  });

  // === DERNIÈRE PAGE ===
  doc.addPage();
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  doc.setTextColor(34, 197, 94);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Bonne chance !', pageWidth / 2, pageHeight / 2 - 20, { align: 'center' });

  doc.setTextColor(156, 163, 175);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Que la fortune soit avec vous sur les hippodromes !', pageWidth / 2, pageHeight / 2, { align: 'center' });

  doc.setFontSize(10);
  doc.text('AutoQuintePro v8.0 — Guide généré automatiquement', pageWidth / 2, pageHeight / 2 + 30, { align: 'center' });

  // Télécharger
  doc.save('AutoQuintePro_Mode_Emploi.pdf');
}

