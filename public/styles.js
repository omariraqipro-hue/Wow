// Bibliothèque de styles. Chaque style est une consigne (en anglais, mieux comprise par les moteurs vidéo)
// ajoutée à votre description. C'est un guide pour le moteur, pas un rendu garanti.
const STYLE_LIBRARY = [
  { group: "Genres", items: [
    ["film", "Film / court-métrage", "cinematic short film, photorealistic, anamorphic lens, natural lighting"],
    ["serie", "Série originale (scène d'épisode)", "original streaming-series episode scene, cinematic, high production value"],
    ["social", "TikTok / Reels / Shorts", "dynamic social media video, fast pacing, eye-catching framing"],
    ["doc", "Documentaire", "documentary footage, natural light, handheld camera"],
    ["edu", "Éducatif", "clear educational explainer video, simple clean visuals"],
    ["trailer", "Bande-annonce", "cinematic movie trailer, dramatic lighting, epic atmosphere"],
    ["pub", "Publicité", "premium commercial advertisement, polished product shots"],
    ["clip", "Clip musical", "stylish music video, creative camera work"]
  ]},
  { group: "Dessin et animation", items: [
    ["anim2d", "Dessin animé 2D", "2D cartoon animation, hand-drawn style, vivid colors"],
    ["cartoon50", "Dessin animé années 50", "mid-century modern cartoon, flat shapes, limited palette, retro poster look"],
    ["whiteboard", "Tableau blanc explicatif", "whiteboard explainer animation, black marker drawings appearing on a white board, simple icons"],
    ["watercolor", "Aquarelle", "watercolor painting animation, soft washes of color, paper texture, visible brush strokes"],
    ["pencil", "Croquis au crayon", "pencil sketch animation, graphite lines, hand-drawn on paper, rough shading"],
    ["ink", "Encre et lavis", "sumi-e ink wash animation, black ink brush strokes, minimal composition"],
    ["papercut", "Papier découpé", "paper cut-out stop-motion, layered paper textures, soft shadows"],
    ["pixel", "Pixel art", "pixel art animation, 16-bit video game style, limited color palette"],
    ["anime", "Anime moderne", "Japanese anime style, detailed cel shading, expressive lighting"],
    ["anime80", "Anime années 80", "1980s cel anime, hand-painted backgrounds, film grain, retro color palette"],
    ["manga", "Manga noir et blanc", "black and white manga style, screen tones, bold ink lines, dynamic angles"],
    ["comics", "Bande dessinée pop-art", "pop-art comic book style, halftone dots, bold outlines, vivid primary colors"],
    ["anim3d", "Animation 3D", "3D animated film, polished CGI rendering"],
    ["lowpoly", "3D low poly", "low-poly 3D animation, flat shaded facets, minimalist colorful scene"],
    ["clay", "Pâte à modeler", "claymation stop-motion, handmade clay characters, fingerprints texture"],
    ["storybook", "Livre illustré pour enfants", "children's picture book illustration, gouache textures, warm gentle colors"],
    ["rotoscope", "Rotoscopie", "rotoscope animation, painterly traced live action, shimmering outlines"]
  ]},
  { group: "Ambiances cinéma", items: [
    ["reel", "Réaliste", "photorealistic, realistic footage, natural motion"],
    ["noir", "Film noir", "black and white film noir, hard shadows, venetian blind light, high contrast, film grain"],
    ["tealorange", "Blockbuster", "teal and orange blockbuster color grade, shallow depth of field, lens flares"],
    ["cyberpunk", "Néon cyberpunk", "cyberpunk city at night, neon signs, rain-soaked streets, magenta and cyan lighting"],
    ["vintage", "Vintage 35 mm", "vintage 35mm film look, warm faded colors, grain, soft vignette"],
    ["super8", "Super 8 souvenirs", "Super 8 home movie, light leaks, flicker, nostalgic handheld footage"],
    ["vhs", "VHS années 80", "VHS tape aesthetic, scanlines, tracking noise, 1980s camcorder look"],
    ["scifi", "Science-fiction épique", "epic science fiction, vast scale, atmospheric volumetric light, cinematic wide shots"],
    ["fantasy", "Fantasy épique", "epic fantasy, sweeping landscapes, magical lighting, painterly cinematic feel"],
    ["western", "Western", "classic western, dusty desert, golden hour, wide anamorphic frames"],
    ["horror", "Horreur atmosphérique", "atmospheric horror, low-key lighting, fog, slow unsettling camera movement"],
    ["nature", "Documentaire nature", "nature documentary, 4K wildlife cinematography, telephoto lens, golden light"],
    ["drone", "Vue de drone", "aerial drone footage, smooth sweeping flyover, wide landscape"],
    ["timelapse", "Time-lapse", "time-lapse photography, fast moving clouds and light, locked-off camera"]
  ]}
];
