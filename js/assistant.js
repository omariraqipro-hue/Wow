// Assistant conversationnel local (gratuit, hors ligne, aucune donnée envoyée).
// Il reconnaît des intentions par mots-clés et applique d'abord les règles de
// sécurité pour adolescents : douleur, charges lourdes, compléments, régimes.

const Assistant = (() => {
  const norm = (s) => ' ' + s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'?!.,;:]/g, ' ') + ' ';
  const has = (t, words) => words.some((w) => t.includes(w));
  const exLink = (id) => `[[ex:${id}|Voir l’animation de « ${EXERCISES[id].name} »]]`;

  const exerciseAnswer = (id) => {
    const ex = EXERCISES[id];
    const steps = ex.steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
    const tip = ex.mistakes[0] ? `\n**Erreur fréquente :** ${ex.mistakes[0].label.toLowerCase()} → ${ex.mistakes[0].fix}` : '';
    return `**${ex.emoji} ${ex.name}** (${ex.muscles.join(', ')})\n${ex.summary}\n${steps}${tip}\n${exLink(id)}`;
  };

  // Règles évaluées dans l'ordre : la sécurité passe en premier.
  const RULES = [
    {
      test: (t) => has(t, ['douleur', 'j ai mal', 'jai mal', 'blesse', 'blessure', 'craque', 'entorse', 'tendinite', 'ca fait mal', 'me fait mal', ' mal au', ' mal a l', ' mal aux']),
      answer: () => `🛑 **Stop.** Une douleur (différente d’une simple fatigue musculaire) est un signal d’alarme.\n• Arrête l’exercice tout de suite.\n• Repose la zone et préviens un parent ou un adulte de confiance.\n• Si la douleur dure plus de 2–3 jours, gonfle, ou t’empêche de bouger normalement, va voir un médecin.\n• Ne reprends que quand tu n’as plus mal, avec une version plus facile.\nLes courbatures (muscles un peu raides 1 à 2 jours après) sont normales ; une douleur vive ou dans une articulation ne l’est pas.`
    },
    {
      test: (t) => has(t, ['steroide', 'anabolis', 'testosterone', 'hormone de croissance', 'sarm', 'clenbuterol', 'dopage', 'piqure']),
      answer: () => `🚫 Non, jamais. Les stéroïdes et produits dopants sont **dangereux** (cœur, foie, croissance stoppée, hormones déréglées) et interdits.\nTon corps produit déjà naturellement ce qu’il faut pour progresser à ton âge : entraînement régulier + bonne alimentation + sommeil = résultats durables.`
    },
    {
      test: (t) => has(t, ['whey', 'proteine en poudre', 'poudre', 'complement', 'creatine', 'booster', 'gainer', 'bcaa', 'shaker', 'pre workout', 'preworkout', 'boisson energisante', 'red bull', 'monster']),
      answer: () => `Pas besoin de compléments ni de boissons énergisantes à 14 ans 🙂\nLes autorités de santé les déconseillent aux ados. Une alimentation variée apporte toutes les protéines nécessaires :\n• œufs, poulet ou dinde halal, poisson, thon\n• lentilles, pois chiches, haricots\n• lait, yaourt, fromage blanc, fromage\n• noix, amandes, cacahuètes\nRegarde l’onglet **Nutrition** pour des idées de repas et de recettes halal.`
    },
    {
      test: (t) => has(t, ['regime', 'maigrir', 'perdre du poids', 'perdre du gras', 'secher', 'seche', 'calorie', 'jeun', 'sauter un repas', 'grossir', 'prendre du poids', 'prise de masse', 'prendre de la masse', 'kilos', 'kg en', 'combien je dois peser', 'poids ideal']),
      answer: () => `À ton âge, je ne te donne ni régime, ni objectif de poids, ni calcul de calories 💚\nTon corps est en pleine croissance : il a besoin d’énergie et ton poids va naturellement évoluer avec ta taille.\nCe qui compte :\n• 3 repas + 1 goûter, sans sauter de repas\n• une source de protéines à chaque repas\n• des féculents, des fruits et des légumes\n• manger à ta faim\nSi ton poids ou ton alimentation t’inquiète, parles-en à un parent ou à un médecin.`
    },
    {
      test: (t) => has(t, ['charge', 'haltere', 'barre', 'max', 'maximum', 'lourd', 'developpe couche', '1rm', 'poids sur', 'sac a dos rempli', 'gilet leste']),
      answer: () => `⚠️ Pas de charges maximales ni de poids lourds dans ARMUP AI.\nÀ 14 ans, les cartilages de croissance sont encore fragiles. Le poids du corps suffit largement pour devenir plus fort :\n• on augmente d’abord les **répétitions** (doucement)\n• puis on passe à une **version plus difficile** (mur → incliné → genoux → classique)\n• toujours avec une technique propre\nPlus tard, un entraînement avec charges est possible, mais encadré par un professionnel.`
    },
    {
      test: (t) => has(t, ['tous les jours', 'chaque jour', '7 jours', 'deux fois par jour', '2 fois par jour', '2h', '3h', 'deux heures', 'trois heures', 'plus vite', 'rapidement', 'en une semaine', 'en 1 semaine', 'en un mois']),
      answer: () => `S’entraîner plus n’est pas progresser plus vite 🙂\nLes muscles se renforcent **pendant le repos**, pas pendant l’effort. Pour toi :\n• 2 à 3 séances de 15–20 minutes par semaine\n• au moins 1 jour de repos entre deux séances\n• 8 à 10 h de sommeil\nLes premiers progrès (plus de répétitions, meilleure technique) arrivent souvent en 3 à 4 semaines. La régularité bat l’intensité !`
    },
    { test: (t) => has(t, ['mur']), answer: () => exerciseAnswer('pompes-mur') },
    { test: (t) => has(t, ['incline', ' lit ', 'canape', 'table']), answer: () => exerciseAnswer('pompes-inclinees') },
    { test: (t) => has(t, ['genou']), answer: () => exerciseAnswer('pompes-genoux') },
    { test: (t) => has(t, ['dips', 'triceps']), answer: () => exerciseAnswer('dips-sol') },
    { test: (t) => has(t, ['biceps', 'curl', 'serviette']), answer: () => exerciseAnswer('curl-serviette') },
    { test: (t) => has(t, ['touche d epaule', 'touches d epaule', 'shoulder tap']), answer: () => exerciseAnswer('shoulder-taps') },
    { test: (t) => has(t, ['superman', 'dos', 'posture', 'vout']), answer: () => exerciseAnswer('superman') },
    { test: (t) => has(t, ['planche', 'gainage', 'abdo']), answer: () => exerciseAnswer('planche') },
    { test: (t) => has(t, ['etire', 'etirement', 'souplesse']), answer: () => exerciseAnswer('etirements') },
    { test: (t) => has(t, ['echauff', 'cercle', 'moulinet']), answer: () => exerciseAnswer('cercles-bras') },
    {
      test: (t) => has(t, ['pompe']),
      answer: () => `Les pompes, c’est une progression en 4 étapes 💪\n1. **Contre un mur** — pour apprendre le mouvement\n2. **Inclinées** (mains sur le lit ou une table solide)\n3. **Sur les genoux**\n4. **Classiques** — débloquées quand tu fais 12 pompes sur les genoux avec une bonne technique\nPasse à l’étape suivante quand tu réussis 2 séries de 12–15 répétitions propres.\n${exLink('pompes-mur')}`
    },
    {
      test: (t) => has(t, ['epaule']),
      answer: () => `Pour les épaules, sans matériel :\n• **Cercles de bras** pour l’échauffement\n• **Touchés d’épaules** (gainage + stabilité)\n• **Superman bras en Y** (arrière des épaules, posture)\n• **Pompes inclinées**\nGarde toujours les épaules basses, loin des oreilles.\n${exLink('shoulder-taps')}`
    },
    {
      test: (t) => has(t, ['bras', 'muscler', 'force', 'plus fort']),
      answer: () => `Pour renforcer tes bras et le haut du corps :\n• **Triceps** : pompes (toutes versions), dips au sol\n• **Biceps** : curl isométrique à la serviette\n• **Épaules** : touchés d’épaules, superman, cercles de bras\n• **Gainage** : planche (aide à mieux réussir les pompes)\nSuis le programme de l’onglet **Programme** : 2 à 3 séances courtes par semaine, avec des jours de repos.`
    },
    {
      test: (t) => has(t, ['courbature']),
      answer: () => `Les courbatures sont normales au début 🙂 Elles apparaissent 24 à 48 h après l’effort et disparaissent en quelques jours.\n• Fais une **récupération active** : marche, cercles de bras, étirements doux\n• Bois de l’eau et dors bien\n• Attends qu’elles soient presque parties pour refaire une séance de renforcement\nSi c’est une douleur vive ou dans une articulation, ce n’est pas une courbature : arrête et parles-en à un adulte.`
    },
    {
      test: (t) => has(t, ['recup', 'repos', 'pause', 'jour off']),
      answer: () => `😴 **Pourquoi la récupération est essentielle**\nPendant l’effort, les fibres musculaires subissent de micro-lésions. Pendant le repos, le corps les répare et les rend un peu plus solides : c’est là que tu deviens plus fort !\n• Laisse au moins **48 h** entre deux séances qui travaillent les mêmes muscles\n• Ton corps grandit aussi : il a besoin d’énergie pour ça\n• Sans repos : fatigue, baisse de performance, risque de blessure\nLes jours de repos, tu peux marcher, faire du vélo, jouer… en douceur.`
    },
    {
      test: (t) => has(t, ['fatigue', 'creve', 'epuise', 'pas la forme', 'pas motive', 'flemme']),
      answer: () => `C’est très bien d’écouter ton corps 👂\n• **Un peu fatigué** : fais une séance allégée (moins de séries) — le coach l’adapte quand tu choisis « Un peu fatigué » avant de commencer.\n• **Très fatigué** : repos ou mobilité douce (cercles de bras, étirements).\n• Vérifie ton sommeil (8–10 h) et ton hydratation.\nSauter une séance quand on est épuisé, ce n’est pas abandonner : c’est être intelligent.`
    },
    {
      test: (t) => has(t, ['dorm', 'sommeil', 'nuit', 'coucher', 'reveil']),
      answer: () => `🌙 **Sommeil & muscles**\n• À 14 ans : **8 à 10 h** par nuit\n• C’est pendant le sommeil profond que l’hormone de croissance est libérée et que les muscles se réparent\n• Pose les écrans 30 à 60 min avant de dormir\n• Couche-toi à heure fixe\n• Évite de t’entraîner juste avant de dormir`
    },
    {
      test: (t) => has(t, [' eau ', 'boire', 'hydrat', 'soif']),
      answer: () => `💧 **Hydratation**\n• Environ 6 à 8 verres d’eau par jour (≈ 1,5 L), plus s’il fait chaud\n• Quelques gorgées avant, pendant et après la séance\n• L’eau est la meilleure boisson : évite sodas et boissons énergisantes\nTu peux suivre tes verres dans **Nutrition → Eau**.`
    },
    {
      test: (t) => has(t, ['recette', 'cuisiner', 'halal']),
      answer: () => `🍳 Quelques recettes simples et halal disponibles dans **Nutrition → Recettes** :\n• Shakshuka facile (œufs & tomates)\n• Poulet halal au riz et légumes\n• Houmous maison\n• Overnight oats banane\n• Dahl de lentilles corail\nDemande toujours l’aide d’un adulte pour la cuisson.`
    },
    {
      test: (t) => has(t, ['proteine', 'manger', 'repas', 'aliment', 'nourriture', 'petit dej', 'dejeuner', 'diner', 'gouter', 'collation', 'menu']),
      answer: () => `🥗 **Bien manger pour progresser**\n• 3 repas + 1 goûter, sans sauter le petit-déjeuner\n• Une source de **protéines** à chaque repas : œufs, poulet/dinde halal, poisson, lentilles, pois chiches, laitages, noix\n• Des féculents pour l’énergie (riz, pâtes, pain complet, pommes de terre)\n• Des fruits et légumes de toutes les couleurs\nExemple de goûter après la séance : banane + verre de lait + poignée d’amandes.`
    },
    {
      test: (t) => has(t, ['programme', 'planning', 'combien de fois', 'combien de seance', 'semaine', 'aujourd hui', 'seance du jour']),
      answer: (ctx) => `📅 ${ctx.today}\nLe programme conseillé : **2 à 3 séances de 15–20 min par semaine**, toujours avec un jour de repos entre deux séances de renforcement. Tu peux choisir 2 ou 3 séances dans l’onglet **Programme**.`
    },
    {
      test: (t) => has(t, ['progres', 'resultat', 'combien de temps', 'quand est ce', 'evoluer', 'niveau']),
      answer: (ctx) => `📈 ${ctx.progress}\nLes progrès se mesurent en **répétitions**, en **technique** et en **régularité** — pas en apparence. Le coach augmente doucement tes objectifs selon ton ressenti après chaque séance. Compte 3 à 4 semaines pour sentir une vraie différence.`
    },
    {
      test: (t) => has(t, [' age ', '14 ans', 'ado', 'croissance', 'taille', 'grandir', 'dangereux', 'risque']),
      answer: () => `Oui, le renforcement au poids du corps est **adapté et bénéfique** à 14 ans, s’il est bien fait :\n• technique avant quantité\n• pas de charges lourdes ni d’efforts maximaux\n• séances courtes, jours de repos\n• arrêt immédiat en cas de douleur\nCe type d’entraînement ne freine pas la croissance. Il renforce les os, les muscles et la posture.`
    },
    {
      test: (t) => has(t, ['motiv', 'abandonn', 'envie', 'decourag']),
      answer: () => `🔥 Quelques astuces de motivation :\n• Fixe des jours précis et note-les (onglet Programme)\n• Vise la régularité, pas la perfection\n• Regarde tes progrès dans l’onglet **Progrès** : chaque séance compte\n• Crée un objectif de force réaliste (ex. 10 pompes sur les genoux)\n• Félicite-toi après chaque séance, même courte !\nTu es déjà sur la bonne voie en posant la question 💪`
    },
    { test: (t) => has(t, ['merci', ' super ', ' cool ', ' top ']), answer: () => `Avec plaisir ! 💚 Continue comme ça, à ton rythme.` },
    { test: (t) => has(t, ['bonjour', 'salut', 'hello', 'coucou', ' yo ', 'wesh']), answer: () => `Salut ! 👋 Je suis le coach ARMUP AI. Pose-moi une question sur les exercices, l’alimentation, le sommeil ou la récupération.` }
  ];

  const FALLBACK = `Je n’ai pas bien compris 🤔 Je peux t’aider sur :\n• un exercice (ex. « comment faire les pompes contre un mur ? »)\n• l’alimentation et les protéines\n• l’hydratation et le sommeil\n• la récupération et les courbatures\n• ton programme de la semaine`;

  const SUGGESTIONS = ['Comment faire une pompe ?', 'Muscler mes biceps', 'J’ai des courbatures', 'Quoi manger après la séance ?', 'Pourquoi se reposer ?', 'Combien d’heures dormir ?', 'Ma séance du jour'];

  function reply(text, ctx) {
    const t = norm(text);
    for (const r of RULES) if (r.test(t)) return r.answer(ctx);
    return FALLBACK;
  }

  return { reply, SUGGESTIONS };
})();
