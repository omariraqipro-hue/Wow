# Wow
## AI VIDEO STUDIO

Application de création de vidéos : scénario Claude, images par scène, voix off, sous-titres mot à mot, export MP4.

### Lancer (PC, Mac ou Linux)

Prérequis : Node.js 18+ et FFmpeg (avec libass, présent dans les builds standard).

```bash
node server.js          # puis ouvrir http://localhost:3000
```

Sur la tablette Samsung (même Wi-Fi) : ouvrir `http://<IP du PC>:3000` dans Chrome ou Samsung Internet. Le serveur écoute sur tout le réseau local et n'a pas d'authentification : n'exposez pas ce port sur Internet, car vos clés API paient les générations.

### Moteurs et clés (variables d'environnement du serveur)

| Étape | Gratuit | Payant |
|---|---|---|
| Scénario | (aucun) | `ANTHROPIC_API_KEY` (hors Artifacts) |
| Images | Pollinations, sans clé, quota et disponibilité hors de notre contrôle | `OPENAI_API_KEY` (gpt-image-1) |
| Animation | Mouvement de caméra FFmpeg (zoom/travelling, pas génératif) | `FAL_KEY` + `FAL_VIDEO_MODEL` (image vers vidéo IA, adaptateur non testé sur le service réel) |
| Voix off | `edge-tts` (`pip install edge-tts`, service Microsoft non officiel) ou `espeak-ng` (hors ligne, robotique) | `OPENAI_API_KEY` |
| Musique | `MUSIC_FILE=/chemin/musique.mp3` (fichier libre de droits que vous fournissez) | (aucun) |
| Sous-titres, montage, MP4 | FFmpeg | (aucun) |

Les sous-titres sont calés sur la durée réelle de la voix de chaque scène. À l'intérieur d'une scène, le timing mot à mot est proportionnel à la longueur des mots, pas mesuré.

### Dans Claude Artifacts

Aucun serveur n'est joignable depuis un Artifact : seuls le scénario (Claude), l'aperçu storyboard avec voix du navigateur et la sauvegarde locale fonctionnent. La production MP4 exige `server.js`.

### Tests

```bash
npm test    # assemblage FFmpeg réel : MP4 H.264 + AAC, sous-titres, mouvement
```
