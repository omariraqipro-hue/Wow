// Données statiques de l'application : exercices, séances, nutrition, badges.
// Tout est adapté à un adolescent débutant, au poids du corps, sans charge.

const EXERCISES = {
  'cercles-bras': {
    name: 'Cercles de bras',
    emoji: '🔄',
    muscles: ['Épaules', 'Échauffement'],
    level: 1,
    type: 'time',
    base: 30,
    max: 45,
    anim: 'armCircles',
    summary: 'Échauffe les épaules en douceur avant chaque séance.',
    steps: [
      'Tiens-toi debout, pieds écartés à la largeur des hanches.',
      'Tends les bras, sans bloquer les coudes.',
      'Fais de grands cercles lents vers l’avant pendant la moitié du temps.',
      'Inverse le sens : cercles vers l’arrière.',
      'Respire calmement, les épaules restent loin des oreilles.'
    ],
    mistakes: [
      { id: 'vite', label: 'Je vais trop vite', fix: 'Ralentis : un cercle doit durer environ 2 secondes. Le but est d’échauffer, pas de se fatiguer.' },
      { id: 'epaules', label: 'Mes épaules montent vers les oreilles', fix: 'Abaisse les épaules et allonge le cou. Imagine que tu ranges tes omoplates dans tes poches arrière.' },
      { id: 'cambre', label: 'Je me cambre', fix: 'Serre légèrement le ventre et les fesses pour garder le dos droit.' }
    ]
  },
  'pompes-mur': {
    name: 'Pompes contre un mur',
    emoji: '🧱',
    muscles: ['Pectoraux', 'Triceps', 'Épaules'],
    level: 1,
    type: 'reps',
    base: 10,
    max: 20,
    anim: 'wallPushup',
    prop: 'wall',
    summary: 'La meilleure façon d’apprendre le mouvement de la pompe sans forcer.',
    steps: [
      'Place-toi face à un mur, à une grande longueur de bras.',
      'Pose les mains à plat sur le mur, à hauteur des épaules, un peu plus écartées que les épaules.',
      'Garde le corps bien droit de la tête aux talons, ventre gainé.',
      'Plie les coudes pour approcher la poitrine du mur (inspire). Les coudes partent vers l’arrière en diagonale, pas sur les côtés.',
      'Pousse le mur pour revenir bras tendus (expire).'
    ],
    mistakes: [
      { id: 'coudes', label: 'Mes coudes s’écartent sur les côtés', fix: 'Garde les coudes à environ 45° de ton corps, comme une flèche qui pointe vers l’arrière. C’est plus sûr pour les épaules.' },
      { id: 'hanches', label: 'Mes hanches partent en avant', fix: 'Serre les fesses et le ventre : ton corps doit rester une planche bien droite.' },
      { id: 'tete', label: 'Ma tête avance vers le mur', fix: 'Regarde le mur un peu plus bas que tes mains, le cou dans l’alignement du dos.' },
      { id: 'facile', label: 'C’est trop facile', fix: 'Recule un peu les pieds du mur. Quand 15 répétitions sont faciles, passe aux pompes inclinées.' }
    ]
  },
  'pompes-inclinees': {
    name: 'Pompes inclinées',
    emoji: '🛏️',
    muscles: ['Pectoraux', 'Triceps', 'Épaules'],
    level: 1,
    type: 'reps',
    base: 8,
    max: 15,
    anim: 'inclinePushup',
    prop: 'table',
    summary: 'Les mains sur un support stable (lit, canapé, table solide) : l’étape entre le mur et le sol.',
    steps: [
      'Choisis un support stable qui ne glisse pas (bord du lit, table lourde, marche d’escalier).',
      'Mains sur le bord, un peu plus écartées que les épaules.',
      'Recule les pieds pour former une ligne droite de la tête aux talons.',
      'Descends lentement la poitrine vers le support (2 secondes), coudes à 45°.',
      'Pousse pour remonter en expirant, sans bloquer brusquement les coudes.'
    ],
    mistakes: [
      { id: 'support', label: 'Mon support bouge', fix: 'Arrête tout de suite et choisis un support plus lourd ou collé au mur. La sécurité passe avant tout.' },
      { id: 'dos', label: 'Mon dos se creuse', fix: 'Gaine le ventre comme si on allait te chatouiller et serre les fesses.' },
      { id: 'amplitude', label: 'Je ne descends presque pas', fix: 'Fais moins de répétitions mais descends plus bas. Une bonne amplitude vaut mieux qu’un grand nombre.' }
    ]
  },
  'pompes-genoux': {
    name: 'Pompes sur les genoux',
    emoji: '💪',
    muscles: ['Pectoraux', 'Triceps', 'Épaules'],
    level: 1,
    type: 'reps',
    base: 6,
    max: 15,
    anim: 'kneePushup',
    summary: 'La pompe au sol, version adaptée : genoux posés, corps droit des genoux à la tête.',
    steps: [
      'Pose les genoux au sol (sur un tapis ou une serviette pliée).',
      'Mains au sol sous les épaules, un peu plus écartées.',
      'Avance les hanches pour aligner genoux, hanches, épaules et tête.',
      'Descends la poitrine vers le sol en inspirant, coudes à 45°.',
      'Pousse le sol pour remonter en expirant.'
    ],
    mistakes: [
      { id: 'fesses', label: 'Mes fesses restent en l’air', fix: 'Avance les hanches : il faut une ligne droite des genoux à la tête, pas un triangle.' },
      { id: 'poignets', label: 'J’ai mal aux poignets', fix: 'Écarte bien les doigts, appuie sur toute la main. Si la douleur continue, reviens aux pompes contre un mur et parles-en à un adulte.' },
      { id: 'coudes', label: 'Mes coudes s’écartent', fix: 'Rapproche un peu les coudes du corps (environ 45°).' },
      { id: 'tete', label: 'Ma tête tombe', fix: 'Regarde le sol légèrement devant tes mains, nuque longue.' }
    ]
  },
  'pompes-classiques': {
    name: 'Pompes classiques',
    emoji: '🏅',
    muscles: ['Pectoraux', 'Triceps', 'Épaules', 'Gainage'],
    level: 2,
    type: 'reps',
    base: 4,
    max: 12,
    anim: 'pushup',
    unlock: { exercise: 'pompes-genoux', reps: 12, technique: 70 },
    summary: 'Niveau 2 : se débloque quand tu maîtrises 12 pompes sur les genoux avec une bonne technique.',
    steps: [
      'Mains sous les épaules, pieds joints ou légèrement écartés.',
      'Corps droit comme une planche, ventre et fesses serrés.',
      'Descends lentement jusqu’à ce que la poitrine soit proche du sol.',
      'Remonte en poussant le sol, en expirant.',
      'Si la technique se dégrade, termine la série sur les genoux.'
    ],
    mistakes: [
      { id: 'hanches', label: 'Mes hanches tombent', fix: 'Serre davantage le ventre et les fesses, ou termine sur les genoux.' },
      { id: 'demi', label: 'Je fais des demi-pompes', fix: 'Fais moins de répétitions mais complètes. Tu progresseras plus vite.' }
    ]
  },
  'dips-sol': {
    name: 'Dips au sol',
    emoji: '🦀',
    muscles: ['Triceps', 'Épaules'],
    level: 1,
    type: 'reps',
    base: 8,
    max: 15,
    anim: 'floorDips',
    summary: 'Renforce l’arrière des bras (triceps) sans chaise ni banc.',
    steps: [
      'Assieds-toi au sol, genoux pliés, pieds à plat.',
      'Pose les mains derrière toi, doigts tournés vers tes fesses.',
      'Soulève légèrement les fesses du sol.',
      'Plie les coudes vers l’arrière pour descendre doucement (inspire).',
      'Tends les bras pour remonter (expire), sans bloquer les coudes.'
    ],
    mistakes: [
      { id: 'epaules', label: 'J’ai une gêne devant l’épaule', fix: 'Réduis l’amplitude : descends moins bas. Si la gêne reste, arrête cet exercice et parles-en à un adulte.' },
      { id: 'coudes', label: 'Mes coudes s’ouvrent', fix: 'Les coudes pointent vers l’arrière, pas vers l’extérieur.' },
      { id: 'jambes', label: 'Je pousse avec les jambes', fix: 'Les jambes stabilisent seulement : ce sont les bras qui font le travail.' }
    ]
  },
  'curl-serviette': {
    name: 'Curl isométrique à la serviette',
    emoji: '🧺',
    muscles: ['Biceps', 'Avant-bras'],
    level: 1,
    type: 'reps',
    unit: 'maintiens de 10 s',
    base: 4,
    max: 8,
    anim: 'towelCurl',
    prop: 'towel',
    summary: 'Travaille les biceps sans aucune charge : tu tires sur une serviette bloquée sous tes pieds.',
    steps: [
      'Assieds-toi au sol, genoux pliés, et passe une serviette sous tes pieds.',
      'Attrape les deux bouts, paumes vers le haut, coudes pliés à 90°.',
      'Tire la serviette vers toi avec les biceps, les pieds résistent.',
      'Tiens 10 secondes en poussant progressivement (environ 7 sur 10 d’effort, jamais au maximum).',
      'Relâche 10 secondes, puis recommence. Respire pendant tout l’effort !'
    ],
    mistakes: [
      { id: 'souffle', label: 'Je bloque ma respiration', fix: 'Compte à voix haute pendant le maintien : impossible de bloquer ta respiration en parlant.' },
      { id: 'dos', label: 'Je tire avec le dos', fix: 'Garde le dos droit et les coudes collés au corps : seuls les avant-bras tirent.' },
      { id: 'force', label: 'Je tire de toutes mes forces', fix: 'Pas besoin ! Un effort moyen et contrôlé suffit pour progresser sans risque.' }
    ]
  },
  'shoulder-taps': {
    name: 'Touchés d’épaules',
    emoji: '👋',
    muscles: ['Épaules', 'Gainage', 'Triceps'],
    level: 1,
    type: 'reps',
    unit: 'touchés',
    base: 10,
    max: 20,
    anim: 'shoulderTaps',
    summary: 'Gainage en appui sur les genoux : une main vient toucher l’épaule opposée.',
    steps: [
      'Position de pompe sur les genoux, mains sous les épaules.',
      'Gaine le ventre pour que les hanches ne bougent pas.',
      'Lève la main droite et touche l’épaule gauche, repose-la.',
      'Fais pareil avec la main gauche.',
      'Va lentement : les hanches restent immobiles.'
    ],
    mistakes: [
      { id: 'hanches', label: 'Mes hanches se balancent', fix: 'Ralentis et écarte un peu plus les genoux pour être plus stable.' },
      { id: 'vite', label: 'Je vais trop vite', fix: 'Compte « 1 – 2 » à chaque touché. La lenteur rend l’exercice plus efficace.' }
    ]
  },
  'superman': {
    name: 'Superman bras en Y',
    emoji: '🦸',
    muscles: ['Haut du dos', 'Épaules', 'Posture'],
    level: 1,
    type: 'reps',
    base: 8,
    max: 15,
    anim: 'superman',
    summary: 'Renforce le haut du dos et l’arrière des épaules : excellent pour la posture.',
    steps: [
      'Allonge-toi sur le ventre, bras tendus devant toi en forme de Y.',
      'Le front regarde le sol, le cou reste long.',
      'Décolle doucement les bras et le haut de la poitrine de quelques centimètres.',
      'Tiens 2 secondes en serrant les omoplates.',
      'Redescends lentement.'
    ],
    mistakes: [
      { id: 'cou', label: 'Je lève trop la tête', fix: 'Regarde le sol, juste devant toi. Le mouvement vient du haut du dos, pas du cou.' },
      { id: 'bas-dos', label: 'J’ai mal au bas du dos', fix: 'Monte moins haut, garde les jambes au sol. Si la douleur continue, arrête et parles-en à un adulte.' }
    ]
  },
  'planche': {
    name: 'Planche sur les avant-bras',
    emoji: '🪵',
    muscles: ['Gainage', 'Épaules'],
    level: 1,
    type: 'time',
    base: 20,
    max: 45,
    anim: 'plank',
    summary: 'Le gainage protège le dos et aide à mieux réussir les pompes. Commence sur les genoux si besoin.',
    steps: [
      'Coudes au sol sous les épaules, avant-bras parallèles.',
      'Pose les genoux (version facile) ou les pointes de pieds.',
      'Corps droit, ventre rentré, fesses serrées.',
      'Respire normalement pendant tout le maintien.',
      'Arrête dès que les hanches tombent : la qualité compte plus que la durée.'
    ],
    mistakes: [
      { id: 'hanches-hautes', label: 'Mes fesses montent', fix: 'Abaisse les hanches pour aligner épaules, hanches et genoux (ou talons).' },
      { id: 'hanches-basses', label: 'Mon ventre tombe vers le sol', fix: 'Pose les genoux et rentre le nombril. Tu pourras repasser sur les pieds plus tard.' },
      { id: 'souffle', label: 'Je bloque ma respiration', fix: 'Respire lentement par le nez. Si tu n’y arrives pas, la planche est trop longue : réduis le temps.' }
    ]
  },
  'etirements': {
    name: 'Étirements doux',
    emoji: '🧘',
    muscles: ['Triceps', 'Pectoraux', 'Retour au calme'],
    level: 1,
    type: 'time',
    base: 40,
    max: 60,
    anim: 'stretch',
    summary: 'Retour au calme : étirement des triceps et de la poitrine, sans jamais forcer.',
    steps: [
      'Lève un bras, plie le coude et pose la main dans ton dos.',
      'Avec l’autre main, appuie doucement sur le coude 10 secondes, puis change de bras.',
      'Croise les mains dans le dos et ouvre la poitrine 10 secondes.',
      'Respire profondément, l’étirement doit rester agréable.',
      'Jamais de douleur ni d’à-coups.'
    ],
    mistakes: [
      { id: 'force', label: 'Je tire fort pour aller plus loin', fix: 'Un étirement doit être doux. Relâche un peu jusqu’à une sensation agréable.' }
    ]
  }
};

// Séances types. sets = nombre de séries ; rest = repos en secondes entre les séries.
const WORKOUTS = {
  A: {
    name: 'Séance A — Poussée & bras',
    short: 'Poussée & bras',
    emoji: '💪',
    items: [
      { id: 'cercles-bras', sets: 1, rest: 15 },
      { id: 'pompes-mur', sets: 2, rest: 45 },
      { id: 'pompes-genoux', sets: 2, rest: 60 },
      { id: 'dips-sol', sets: 2, rest: 60 },
      { id: 'curl-serviette', sets: 2, rest: 45 },
      { id: 'etirements', sets: 1, rest: 0 }
    ]
  },
  B: {
    name: 'Séance B — Épaules & gainage',
    short: 'Épaules & gainage',
    emoji: '🛡️',
    items: [
      { id: 'cercles-bras', sets: 1, rest: 15 },
      { id: 'pompes-inclinees', sets: 2, rest: 60 },
      { id: 'shoulder-taps', sets: 2, rest: 45 },
      { id: 'superman', sets: 2, rest: 45 },
      { id: 'planche', sets: 2, rest: 45 },
      { id: 'etirements', sets: 1, rest: 0 }
    ]
  },
  M: {
    name: 'Récupération active — Mobilité',
    short: 'Mobilité douce',
    emoji: '🧘',
    light: true,
    items: [
      { id: 'cercles-bras', sets: 2, rest: 15 },
      { id: 'etirements', sets: 2, rest: 15 }
    ]
  }
};

// Planning hebdomadaire. Index 0 = lundi.
const WEEK_PLANS = {
  2: ['A', 'R', 'R', 'B', 'R', 'M', 'R'],
  3: ['A', 'R', 'B', 'R', 'A', 'M', 'R']
};

const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const DAY_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const REST_DAYS = 2; // séance possible au plus tôt 2 jours après la précédente (1 jour de repos entre)
const MAX_STRENGTH_PER_WEEK = 3;

const BADGES = [
  { id: 'first', code: '1', emoji: '🚀', name: 'Premier pas', desc: 'Termine ta première séance.' },
  { id: 's5', code: '5', emoji: '🔥', name: 'Lancé', desc: 'Termine 5 séances.' },
  { id: 's15', code: '15', emoji: '⚡', name: 'Motivé', desc: 'Termine 15 séances.' },
  { id: 's30', code: '30', emoji: '🏆', name: 'Pilier', desc: 'Termine 30 séances.' },
  { id: 'week2', code: '2S', emoji: '📅', name: 'Régulier', desc: '2 semaines de suite avec au moins 2 séances.' },
  { id: 'week4', code: '4S', emoji: '🗓️', name: 'Ultra régulier', desc: '4 semaines de suite avec au moins 2 séances.' },
  { id: 'learn5', code: '5E', emoji: '🎓', name: 'Élève appliqué', desc: 'Apprends 5 exercices.' },
  { id: 'learnAll', code: '11E', emoji: '🧠', name: 'Encyclopédie', desc: 'Apprends tous les exercices de niveau 1.' },
  { id: 'tech', code: '80%', emoji: '🎯', name: 'Technicien', desc: 'Atteins 80 % de technique sur un exercice.' },
  { id: 'recovery', code: 'REC', emoji: '😴', name: 'Pro de la récup', desc: 'Respecte 5 fois un vrai jour de repos entre deux séances.' },
  { id: 'water', code: 'H₂O', emoji: '💧', name: 'Bien hydraté', desc: 'Atteins ton objectif d’eau 3 jours.' },
  { id: 'goal', code: 'OBJ', emoji: '🥇', name: 'Objectif atteint', desc: 'Réalise un de tes objectifs de force.' },
  { id: 'listen', code: 'ZEN', emoji: '👂', name: 'À l’écoute', desc: 'Choisis une séance douce ou du repos quand tu es fatigué.' }
];

// Récompenses virtuelles basées uniquement sur l'effort et la régularité.
const RANKS = [
  { xp: 0, name: 'Recrue', emoji: '🌱' },
  { xp: 300, name: 'Apprenti', emoji: '🔰' },
  { xp: 800, name: 'Régulier', emoji: '⭐' },
  { xp: 1600, name: 'Athlète', emoji: '🌟' },
  { xp: 2800, name: 'Champion de la régularité', emoji: '👑' }
];

const NUTRITION = {
  meals: {
    'Petit-déjeuner': [
      { name: 'Bol énergie', emoji: '🥣', items: 'Flocons d’avoine + lait + banane + une poignée d’amandes' },
      { name: 'Tartines complètes', emoji: '🍞', items: 'Pain complet + fromage frais + un fruit + un verre de lait' },
      { name: 'Œufs & pain', emoji: '🍳', items: '2 œufs brouillés + pain complet + jus d’orange pressé' },
      { name: 'Yaourt fruité', emoji: '🍓', items: 'Yaourt nature + fruits rouges + muesli sans sucre ajouté' }
    ],
    'Déjeuner': [
      { name: 'Riz poulet légumes', emoji: '🍗', items: 'Poulet halal grillé + riz + haricots verts + un fruit' },
      { name: 'Pâtes au thon', emoji: '🍝', items: 'Pâtes complètes + thon + tomates + huile d’olive' },
      { name: 'Couscous maison', emoji: '🥘', items: 'Semoule + pois chiches + légumes + agneau ou poulet halal' },
      { name: 'Wrap complet', emoji: '🌯', items: 'Galette + dinde halal + crudités + fromage + compote' }
    ],
    'Dîner': [
      { name: 'Omelette & pommes de terre', emoji: '🥔', items: 'Omelette aux légumes + pommes de terre + salade + yaourt' },
      { name: 'Lentilles corail', emoji: '🍲', items: 'Dahl de lentilles + riz + légumes + fruit' },
      { name: 'Poisson & quinoa', emoji: '🐟', items: 'Filet de poisson + quinoa + courgettes + fromage blanc' },
      { name: 'Soupe & tartines', emoji: '🥣', items: 'Soupe de légumes + pain complet + fromage + fruit' }
    ],
    'Goûter': [
      { name: 'Goûter malin', emoji: '🍌', items: 'Banane + poignée de noix + verre de lait' },
      { name: 'Tartine maison', emoji: '🥜', items: 'Pain complet + beurre de cacahuète + pomme' },
      { name: 'Laitage & fruit', emoji: '🥛', items: 'Fromage blanc ou yaourt + fruit de saison' }
    ]
  },
  proteins: [
    { name: 'Œufs', emoji: '🥚', note: 'Faciles, pas chers, très complets.' },
    { name: 'Poulet / dinde halal', emoji: '🍗', note: 'Viandes maigres riches en protéines.' },
    { name: 'Poisson & thon', emoji: '🐟', note: 'Protéines + bonnes graisses (oméga-3).' },
    { name: 'Lentilles', emoji: '🫘', note: 'Protéines végétales + fer + fibres.' },
    { name: 'Pois chiches', emoji: '🧆', note: 'En houmous, couscous, salades.' },
    { name: 'Lait, yaourt, fromage', emoji: '🧀', note: 'Protéines + calcium pour les os en croissance.' },
    { name: 'Fromage blanc', emoji: '🥛', note: 'Parfait au goûter ou au dessert.' },
    { name: 'Amandes, noix, cacahuètes', emoji: '🥜', note: 'Une poignée en collation.' },
    { name: 'Haricots rouges', emoji: '🌶️', note: 'Super avec du riz.' },
    { name: 'Flocons d’avoine', emoji: '🌾', note: 'Céréale riche en protéines et en énergie.' }
  ],
  recipes: [
    {
      name: 'Shakshuka facile',
      emoji: '🍅',
      time: '20 min',
      ingredients: ['3 œufs', '1 boîte de tomates concassées', '1 oignon', '1 poivron', 'Cumin, paprika, sel', 'Pain complet'],
      steps: ['Fais revenir l’oignon et le poivron émincés dans un peu d’huile d’olive.', 'Ajoute les tomates et les épices, laisse mijoter 10 minutes.', 'Creuse 3 petits trous et casse un œuf dans chacun.', 'Couvre et laisse cuire 5 à 7 minutes jusqu’à ce que les blancs soient pris.', 'Sers avec du pain complet.']
    },
    {
      name: 'Poulet halal au riz et légumes',
      emoji: '🍛',
      time: '30 min',
      ingredients: ['Blanc de poulet halal', 'Riz', 'Carottes, courgettes', 'Ail, curry doux', 'Huile d’olive'],
      steps: ['Fais cuire le riz.', 'Coupe le poulet en morceaux et fais-le dorer avec l’ail et le curry.', 'Ajoute les légumes en dés et un fond d’eau, cuis 10 minutes.', 'Sers avec le riz. Demande l’aide d’un adulte pour la cuisson.']
    },
    {
      name: 'Houmous maison',
      emoji: '🧆',
      time: '10 min',
      ingredients: ['1 boîte de pois chiches égouttés', '1 c. à soupe de purée de sésame (tahini)', 'Jus d’un demi-citron', '1 petite gousse d’ail', 'Huile d’olive, sel, cumin'],
      steps: ['Mets tout dans un mixeur avec un peu d’eau.', 'Mixe jusqu’à obtenir une crème lisse.', 'Déguste avec des bâtonnets de carotte ou du pain complet.']
    },
    {
      name: 'Overnight oats banane',
      emoji: '🥣',
      time: '5 min (la veille)',
      ingredients: ['50 g de flocons d’avoine', '150 ml de lait', '1 yaourt nature', '1 banane', 'Cannelle'],
      steps: ['Mélange les flocons, le lait et le yaourt dans un pot.', 'Ajoute la banane écrasée et la cannelle.', 'Laisse au frigo toute la nuit.', 'Le matin, c’est prêt : ajoute des fruits si tu veux.']
    },
    {
      name: 'Dahl de lentilles corail',
      emoji: '🍲',
      time: '25 min',
      ingredients: ['150 g de lentilles corail', '1 oignon', '1 boîte de tomates', 'Curry doux, curcuma', 'Riz pour accompagner'],
      steps: ['Fais revenir l’oignon avec les épices.', 'Ajoute les lentilles rincées, les tomates et 2 fois leur volume d’eau.', 'Laisse cuire 15 à 20 minutes en remuant.', 'Sers avec du riz.']
    }
  ],
  hydration: [
    'Bois environ 6 à 8 verres d’eau par jour (environ 1,5 L), plus quand il fait chaud.',
    'Bois quelques gorgées avant, pendant et après ta séance.',
    'L’eau est la meilleure boisson : évite les sodas et les boissons énergisantes (trop de sucre et de caféine pour un ado).',
    'Garde une gourde avec toi au collège.',
    'Une urine claire est un bon signe d’hydratation.'
  ],
  sleep: [
    'À 14 ans, le corps a besoin de 8 à 10 heures de sommeil par nuit.',
    'C’est pendant le sommeil que les muscles se réparent et que l’hormone de croissance est libérée.',
    'Pose les écrans 30 à 60 minutes avant de dormir : la lumière bleue retarde l’endormissement.',
    'Couche-toi et lève-toi à des heures régulières, même le week-end si possible.',
    'Évite de faire ta séance juste avant de dormir : laisse au moins 1 à 2 heures.'
  ],
  rules: [
    'Mange 3 repas + 1 goûter, sans sauter le petit-déjeuner.',
    'Mets une source de protéines à chaque repas.',
    'Des féculents (riz, pâtes, pain, pommes de terre) pour l’énergie.',
    'Des fruits et légumes de toutes les couleurs.',
    'Pas besoin de compléments ni de poudre de protéines : une alimentation variée suffit à ton âge.',
    'Écoute ta faim : mange à ta faim, ni plus ni moins.'
  ]
};
