# Studio Vidéo Ciné

Application web de génération de vidéos par IA. Le serveur Node (sans dépendance) garde la clé API secrète,
appelle l'API Gemini (modèles **Veo**), télécharge le MP4 et le garde dans la bibliothèque. L'interface
(`public/`) fonctionne sur tablette, téléphone et ordinateur.

## Ce qui fonctionne (phase 1)
- Texte → vidéo et image → vidéo, avec le modèle Veo choisi parmi ceux que votre clé peut utiliser.
- Ratios, résolutions et durées limités à ce que le modèle accepte (les autres sont grisés ou adaptés).
- Coût affiché avant génération, confirmation obligatoire, vérifiée aussi côté serveur.
- Lecture dans l'appli, téléchargement MP4, bibliothèque de projets.
- Bibliothèque de 39 styles (dessin et animation, ambiances cinéma, genres) + styles personnels : ce sont des consignes ajoutées à votre description, pas un rendu garanti.
- « Vidéo prête » n'apparaît que si le navigateur a réellement décodé le fichier.

## Pas encore là
Séries (saisons/épisodes), personnages cohérents, voix séparées, montage multipiste, recadrage du MP4 pour
les ratios non natifs, 1440p/4K.

## Installation
Prérequis : Node 18+, une clé API Gemini d'un projet Google **avec facturation activée** (Veo est payant).

    GEMINI_API_KEY=... APP_TOKEN=un-code-secret npm start

Ouvrez `http://localhost:3000`, saisissez le code `APP_TOKEN`. Sans `APP_TOKEN`, un code aléatoire est
affiché au démarrage. Sans `GEMINI_API_KEY`, l'appli affiche « moteur non connecté » et refuse de générer.

Variables : `PORT`, `DATA_DIR` (vidéos + `jobs.json`), `MODEL_PRICES` (JSON `{"id-du-modèle": dollars_par_seconde}`).

## Hébergement pour la tablette
Le serveur doit tourner quelque part d'accessible : un service Node (Render, Railway, Fly…) avec les variables
`GEMINI_API_KEY` et `APP_TOKEN`, commande de démarrage `npm start`. Sur un hébergement à disque éphémère, les
vidéos disparaissent au redémarrage : téléchargez-les ou utilisez un disque persistant (`DATA_DIR`).

## À vérifier (non testé avec l'API réelle)
Cette version a été écrite sans accès à la documentation en ligne ni clé API. Les noms de paramètres, les
capacités et les tarifs par modèle (`server/server.js`, tableau `CAPS`) viennent de mémoire. Le serveur liste
les modèles Veo réellement accessibles avec votre clé, et renvoie tel quel tout message d'erreur de l'API.
Les tests (`test/mock-veo.js`) utilisent un faux moteur : ils valident le code du serveur, pas la qualité ni
le comportement du vrai moteur.

## Déploiement en un clic sur Render
`render.yaml` décrit le service (écrit de mémoire, non testé). Ouvrez
`https://render.com/deploy?repo=https://github.com/omariraqipro-hue/Wow/tree/claude/animated-video-generator-8w28eu`,
collez votre `GEMINI_API_KEY` quand Render la demande ; `APP_TOKEN` est généré, lisez-le dans l'onglet Environment.
Render doit pouvoir lire le dépôt (public, ou compte GitHub connecté). Le plan gratuit s'endort et efface les vidéos au redémarrage.
