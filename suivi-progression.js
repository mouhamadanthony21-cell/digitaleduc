
// ============================================================
// SUIVI DE PROGRESSION - enregistre automatiquement les cours
// (vidéos) terminés et les exercices réalisés par utilisateur.
//
// Prérequis : charger "firebase-config-1.js" AVANT ce fichier.
// Le script utilise window.firebaseAuth, window.markItemComplete,
// window.getUserProgress définis par la configuration Firebase.
// ============================================================

// ------------------------------------------------------------
// Catalogue des modules du site (source de vérité unique).
// La clé correspond au nom du fichier de la page du module
// (ex : Maths.html -> "maths", BDD-SQL.html -> "bdd-sql").
// ------------------------------------------------------------
const CONTENUS = {
  maths:         { nom: "Maths",                         cours: 32,  exercices: 1 },
  digitale:      { nom: "Culture Digitale",              cours: 23,  exercices: 1 },
  bureautique:   { nom: "Bureautique",                   cours: 26,  exercices: 1 },
  infographie:   { nom: "Infographie",                   cours: 34,  exercices: 1 },
  wordpress:     { nom: "Initiation WordPress",          cours: 17,  exercices: 1 },
  algorithmique: { nom: "Algorithmique",                 cours: 21,  exercices: 1 },
  programmation: { nom: "Programmation",                 cours: 73,  exercices: 1 },
  ordinateurs:   { nom: "Architecture des Ordinateurs",  cours: 12,  exercices: 1 },
  windows:       { nom: "Administration Windows",        cours: 3,   exercices: 1 },
  linux:         { nom: "Introduction au Système Linux", cours: 111, exercices: 1 },
  si:            { nom: "Système d'Information",         cours: 2,   exercices: 1 },
  merise:        { nom: "MERISE",                        cours: 4,   exercices: 1 },
  "bdd-sql":     { nom: "Gestion de BD avec SQL",        cours: 30,  exercices: 1 },
  reseaux:       { nom: "Architecture des Réseaux",      cours: 18,  exercices: 1 },
  ccna:          { nom: "CCNA",                          cours: 90,  exercices: 1 },
  cybersecurite: { nom: "Cybersécurité",                 cours: 37,  exercices: 1 }
};

const TOTAL_COURS = Object.values(CONTENUS).reduce((s, m) => s + m.cours, 0);
const TOTAL_EXERCICES = Object.values(CONTENUS).reduce((s, m) => s + m.exercices, 0);

window.CATALOGUE_CONTENUS = CONTENUS;
window.TOTAL_COURS = TOTAL_COURS;
window.TOTAL_EXERCICES = TOTAL_EXERCICES;

// ------------------------------------------------------------
// Petites fonctions utilitaires
// ------------------------------------------------------------

// Enlève les accents, met en minuscules et retire l'extension.
function normaliser(nom) {
  return String(nom)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.html$/, "");
}

// Clé du module courant à partir du nom du fichier affiché.
function cleModuleCourante() {
  let fichier = window.location.pathname.split("/").pop();
  try { fichier = decodeURIComponent(fichier); } catch (e) { /* déjà décodé */ }
  const cle = normaliser(fichier);
  return CONTENUS[cle] ? cle : null;
}

// Affiche une petite notification non bloquante en bas à droite.
function afficherToast(message, actions = []) {
  let toast = document.getElementById("progressionToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "progressionToast";
    toast.style.cssText =
      "position:fixed;bottom:20px;right:20px;z-index:9999;background:#ffffff;color:#1c2431;" +
      "padding:14px 18px;border-radius:10px;box-shadow:0 6px 20px rgba(2,8,20,.18);" +
      "border:1px solid rgba(0,162,255,.25);" +
      "font-family:Arial,sans-serif;font-size:14px;max-width:340px;" +
      "display:flex;flex-direction:column;gap:10px;";
    document.body.appendChild(toast);
  }
  toast.innerHTML = "";
  const msg = document.createElement("span");
  msg.textContent = message;
  toast.appendChild(msg);
  actions.forEach((action) => {
    const lien = document.createElement("a");
    lien.textContent = action.texte;
    lien.href = action.href;
    lien.style.cssText =
      "color:#fff;background:#2b7de9;border-radius:6px;padding:8px 12px;" +
      "text-align:center;text-decoration:none;font-weight:bold;";
    lien.addEventListener("click", () => toast.remove());
    toast.appendChild(lien);
  });
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.remove(), 6000);
}
window.afficherToast = afficherToast;

// Enregistre un élément terminé pour l'utilisateur connecté.
async function enregistrer(id, message) {
  const user = window.firebaseAuth ? window.firebaseAuth.currentUser : null;
  if (!user) {
    afficherToast(
      "Connectez-vous pour enregistrer votre progression.",
      [
        { texte: "Se connecter", href: "connexion.html" },
        { texte: "S'inscrire", href: "inscription.html" }
      ]
    );
    return;
  }
  try {
    await window.markItemComplete(id);
    afficherToast(message);
  } catch (erreur) {
    console.error("Erreur lors de l'enregistrement :", erreur);
  }
}

// ------------------------------------------------------------
// Styles pour les boutons de suivi des cours et exercices
// ------------------------------------------------------------
if (!document.getElementById("suiviProgressionStyles")) {
  const style = document.createElement("style");
  style.id = "suiviProgressionStyles";
  style.textContent =
    ".progression-btn {" +
    "  display:block; margin:10px 0 0 0; padding:9px 16px;" +
    "  background:linear-gradient(135deg,#38bdf8,#3b82f6); color:#fff;" +
    "  border:none; border-radius:8px; cursor:pointer; font-family:Arial,sans-serif;" +
    "  font-size:13px; font-weight:bold;" +
    "  box-shadow:0 4px 12px rgba(56,189,248,.35);" +
    "}" +
    ".progression-btn:hover { filter:brightness(1.05); }" +
    ".progression-btn.fait {" +
    "  background:#16a34a; box-shadow:0 4px 12px rgba(22,163,74,.3);" +
    "}" +
    ".progression-btn:disabled { opacity:.7; cursor:default; filter:none; }" +
    ".progression-btn-wrap {" +
    "  position:relative;" +
    "  display:flex; flex-direction:column; align-items:center;" +
    "}" +
    ".progression-btn-wrap iframe, .progression-btn-wrap video {" +
    "  max-width:100%; border-radius:8px;" +
    "}" +
    ".video-fs-btn {" +
    "  position:absolute; top:6px; right:6px; z-index:6;" +
    "  width:32px; height:32px; padding:0; border-radius:50%;" +
    "  display:inline-flex; align-items:center; justify-content:center;" +
    "  background:rgba(10,15,24,.72); color:#fff;" +
    "  border:1px solid rgba(255,255,255,.28); cursor:pointer;" +
    "  box-shadow:0 2px 8px rgba(0,0,0,.45); opacity:.92;" +
    "}" +
    ".video-fs-btn:hover, .video-fs-btn:focus-visible {" +
    "  background:rgba(0,162,255,.9); opacity:1; outline:none;" +
    "}" +
    ".yt-click {" +
    "  position:relative; width:min(560px,100%); max-width:100%;" +
    "  aspect-ratio:16/9; border-radius:14px; overflow:hidden;" +
    "  border:1px solid rgba(56,189,248,.25);" +
    "  box-shadow:0 10px 30px rgba(2,8,20,.5);" +
    "  background:#0d1117; cursor:pointer;" +
    "  transition:box-shadow .3s ease, border-color .3s ease;" +
    "}" +
    ".yt-click:hover {" +
    "  border-color:rgba(0,162,255,.6);" +
    "  box-shadow:0 14px 40px rgba(0,162,255,.28);" +
    "}" +
    ".yt-click-miniature {" +
    "  position:absolute; inset:0;" +
    "  background-color:#0d1117; background-repeat:no-repeat;" +
    "  background-position:center; background-size:cover;" +
    "}" +
    ".yt-click-play {" +
    "  position:absolute; top:50%; left:50%;" +
    "  transform:translate(-50%,-50%);" +
    "  width:66px; height:46px; border-radius:12px;" +
    "  background:rgba(28,28,30,.85);" +
    "  display:flex; align-items:center; justify-content:center;" +
    "  box-shadow:0 6px 18px rgba(0,0,0,.45);" +
    "  transition:transform .15s ease, background .15s ease;" +
    "}" +
    ".yt-click:hover .yt-click-play {" +
    "  background:rgba(200,20,20,.92);" +
    "  transform:translate(-50%,-50%) scale(1.07);" +
    "}" +
    ".yt-click-play::before {" +
    "  content:''; width:0; height:0; margin-left:4px;" +
    "  border-left:20px solid #fff;" +
    "  border-top:12px solid transparent;" +
    "  border-bottom:12px solid transparent;" +
    "}" +
    "@media (max-width:991.98px) {" +
    "  .yt-click { width:100%; }" +
    "}" +
    // ---------------------------------------------------------
    // GRAND ÉCRAN : la vidéo occupe toute la fenêtre
    // ---------------------------------------------------------
    "html.plein-ecran-verrouille," +
    "html.plein-ecran-verrouille body { overflow:hidden !important; }" +
    // Sélecteurs très spécifiques + !important pour passer devant les
    // règles de dimensionnement de responsive.css et theme-techno.css.
    // La classe .video-plein-ecran est posée dans les deux cas : plein
    // écran réel du navigateur ET plein écran simulé (iOS).

    "html body .progression-btn-wrap.video-plein-ecran {" +
    "  position:fixed !important; top:0 !important; right:0 !important;" +
    "  bottom:0 !important; left:0 !important;" +
    "  width:auto !important; height:auto !important;" +
    "  min-width:0 !important; max-width:none !important;" +
    "  margin:0 !important; padding:10px !important; box-sizing:border-box !important;" +
    "  z-index:2147483000 !important; background:#000000 !important;" +
    "  display:flex !important; flex-direction:column !important;" +
    "  align-items:center !important; justify-content:center !important;" +
    "  gap:12px !important; border-radius:0 !important; flex:0 0 auto !important;" +
    "}" +
    "html body .progression-btn-wrap.video-plein-ecran > iframe," +
    "html body .progression-btn-wrap.video-plein-ecran > video," +
    "html body .progression-btn-wrap.video-plein-ecran > .yt-click {" +
    "  flex:1 1 auto !important; width:100% !important; max-width:100% !important;" +
    "  height:auto !important; max-height:100% !important; min-height:0 !important;" +
    "  aspect-ratio:auto !important; display:block !important;" +
    "  border-radius:0 !important; border:0 !important; box-shadow:none !important;" +
    "}" +
    // Les .mp4 sont letterboxés (pas de déformation) ; les iframes
    // YouTube s'adaptent d'elles-mêmes et centrent la vidéo.
    "html body .progression-btn-wrap.video-plein-ecran > video {" +
    "  object-fit:contain !important; background:#000000 !important;" +
    "}" +
    // En plein écran, le bouton de sortie est plus grand et contrasté.
    "html body .progression-btn-wrap.video-plein-ecran > .video-fs-btn {" +
    "  top:16px !important; right:16px !important;" +
    "  width:42px !important; height:42px !important; opacity:1 !important;" +
    "  background:rgba(220,38,38,.9) !important;" +
    "}";
  document.head.appendChild(style);
}

// ------------------------------------------------------------
// SUIVI DES COURS (vidéos)
// ------------------------------------------------------------
// Chaque vidéo (iframe YouTube ou <video>) reçoit un ID stable :
// "cours-<module>-<position>". Sous chaque vidéo, on insère un
// bouton "Marquer comme visionné" sur lequel l'utilisateur clique
// APRÈS avoir regardé le cours pour enregistrer sa progression.
function rafraichirBoutonsCours(liste) {
  const user = window.firebaseAuth ? window.firebaseAuth.currentUser : null;
  if (!user || !liste.length) return;
  window.getUserProgress().then((progression) => {
    liste.forEach((bouton) => {
      const id = bouton.dataset.progressionId;
      const fait = !!progression[id];
      bouton.dataset.fait = fait ? "true" : "false";
      bouton.textContent = fait ? "✓ Cours visionné" : "Marquer comme visionné";
      bouton.classList.toggle("fait", fait);
      bouton.disabled = fait;
    });
  }).catch(() => {});
}

// ------------------------------------------------------------
// GRAND ÉCRAN DES VIDÉOS
// Sur téléphone, le lecteur doit pouvoir quitter la petite colonne
// de la grille : un bouton discret est posé en haut à droite de
// chaque vidéo. Il passe successivement par :
//   1. l'API Fullscreen du navigateur, appliquée à l'enveloppe de la
//      vidéo (et non à la vidéo seule) afin de conserver à l'écran le
//      bouton de sortie et le bouton "Marquer comme visionné" ;
//   2. le lecteur plein écran natif, réservé aux fichiers <video> sur
//      iPhone / iPad ;
//   3. un plein écran simulé (vidéo affichée en position fixe sur toute
//      la fenêtre), seul recours viable pour une iframe YouTube sur
//      iOS, où l'API Fullscreen n'est pas exposée.
// La taille réelle en plein écran est gérée par les règles
// ":fullscreen" de responsive.css (quand la vidéo elle-même est en
// plein écran) et par ".video-plein-ecran" pour le mode simulé.
// ------------------------------------------------------------
const ICONE_PLEIN_ECRAN =
  '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">' +
  '<path fill="currentColor" d="M4 9V4h5v2H6v3H4zm11-5h5v5h-2V6h-3V4zM4 15h2v3h3v2H4v-5z' +
  'm14 0h2v5h-5v-2h3v-3z"/></svg>';

const ICONE_REDUIRE =
  '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">' +
  '<path fill="currentColor" d="M9 4v5H4V7h3V4h2zm6 0v2h3v2h-5V4h2zM4 15h5v5H7v-3H4v-2zm11 0h5v2h-3v3h-2v-5z"/></svg>';

const METHODES_PLEIN_ECRAN = [
  "requestFullscreen",
  "webkitRequestFullscreen",
  "mozRequestFullScreen",
  "msRequestFullscreen"
];

// Vidéo actuellement dans le lecteur plein écran natif (iOS).
let videoPleinEcranNatif = null;

// Enveloppe affichée en plein écran simulé (quand l'API Fullscreen et
// le lecteur natif sont tous deux indisponibles). Elle doit être
// mémorisée : synchroniserPleinEcran() relit l'état réel affiché et
// ne peut pas retrouver ce mode tout seul.
let enveloppePleinEcranSimule = null;

function elementPleinEcran() {
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement ||
    null
  );
}

// La vidéo (ou la vignette pas encore lancée) portée par une enveloppe.
function mediaDeLEveloppe(enveloppe) {
  return enveloppe.querySelector("iframe, video");
}

// Aligne l'état des boutons sur ce qui est réellement affiché en
// plein écran (API du navigateur, lecteur natif ou mode simulé).
function synchroniserPleinEcran() {
  const courant = elementPleinEcran();

  document.querySelectorAll(".progression-btn-wrap").forEach((enveloppe) => {
    const actif =
      enveloppe === enveloppePleinEcranSimule ||
      courant === enveloppe ||
      enveloppe.contains(videoPleinEcranNatif);
    enveloppe.classList.toggle("video-plein-ecran", actif);

    const bouton = enveloppe.querySelector(".video-fs-btn");
    if (!bouton) return;
    const libelle = actif
      ? "Quitter le grand écran"
      : "Visionner la vidéo en grand écran";
    bouton.innerHTML = actif ? ICONE_REDUIRE : ICONE_PLEIN_ECRAN;
    bouton.setAttribute("aria-label", libelle);
    bouton.setAttribute("aria-pressed", actif ? "true" : "false");
    bouton.title = actif ? "Quitter le grand écran (Échap)" : "Grand écran";
  });

  // Le défilement de la page n'est à bloquer qu'en plein écran simulé :
  // l'API Fullscreen s'en charge déjà, et le lecteur natif reste visible.
  const simule = !courant &&
    !!document.querySelector(".progression-btn-wrap.video-plein-ecran");
  document.documentElement.classList.toggle("plein-ecran-verrouille", simule);
}

// Derniers recours : lecteur natif iOS, puis plein écran simulé.
function pleinEcranDeSecours(enveloppe, media) {
  if (media && typeof media.webkitEnterFullscreen === "function") {
    try {
      media.webkitEnterFullscreen();
      return;
    } catch (erreur) { /* lecteur natif indisponible : mode simulé */ }
  }
  enveloppePleinEcranSimule = enveloppe;
  enveloppe.classList.add("video-plein-ecran");
  synchroniserPleinEcran();
}

function entrerPleinEcran(enveloppe, media) {
  // Une nouvelle demande prend le dessus sur un éventuel mode simulé.
  enveloppePleinEcranSimule = null;
  enveloppe.classList.remove("video-plein-ecran");
  for (const methode of METHODES_PLEIN_ECRAN) {
    if (typeof enveloppe[methode] !== "function") continue;
    try {
      const requete = enveloppe[methode].call(enveloppe, { navigationUI: "hide" });
      if (requete && typeof requete.catch === "function") {
        requete.catch(() => pleinEcranDeSecours(enveloppe, media));
      }
      return;
    } catch (erreur) {
      pleinEcranDeSecours(enveloppe, media);
      return;
    }
  }
  pleinEcranDeSecours(enveloppe, media);
}

function sortirPleinEcran(enveloppe) {
  const courant = elementPleinEcran();
  let sortieDemandee = false;

  if (courant) {
    // ATTENTION : exitFullscreen est une méthode de Document, pas de
    // l'élément en plein écran. C'est le document entier qui la possède.
    const doc = courant.ownerDocument || document;
    const quitter =
      doc.exitFullscreen ||
      doc.webkitExitFullscreen ||
      doc.mozCancelFullScreen ||
      doc.msExitFullscreen;
    if (typeof quitter === "function") {
      try {
        const requete = quitter.call(doc);
        sortieDemandee = true;
        if (requete && typeof requete.catch === "function") {
          // Si le navigateur refuse, on restaure l'affichage tel qu'il est.
          requete.catch(() => synchroniserPleinEcran());
        }
      } catch (erreur) { /* le navigateur gère la sortie */ }
    }
  }

  if (enveloppePleinEcranSimule === enveloppe) enveloppePleinEcranSimule = null;
  enveloppe.classList.remove("video-plein-ecran");
  // Après une vraie demande de sortie, l'événement fullscreenchange
  // remettra l'état au propre : inutile de le recalculer ici.
  if (!sortieDemandee) synchroniserPleinEcran();
}

[
  "fullscreenchange",
  "webkitfullscreenchange",
  "mozfullscreenchange",
  "MSFullscreenChange"
].forEach((evenement) =>
  document.addEventListener(evenement, synchroniserPleinEcran)
);

document.addEventListener("webkitbeginfullscreen", (evenement) => {
  videoPleinEcranNatif = evenement.target;
  synchroniserPleinEcran();
}, true);

document.addEventListener("webkitendfullscreen", () => {
  videoPleinEcranNatif = null;
  synchroniserPleinEcran();
}, true);

// Bouton de grand écran d'une vidéo, posé en haut à droite.
// Si la vidéo n'est pas encore lancée (vignette), le bouton lance
// d'abord la lecture : un seul appui donne le cours en grand écran.
function creerBoutonPleinEcran(enveloppe, lire) {
  const bouton = document.createElement("button");
  bouton.type = "button";
  bouton.className = "video-fs-btn";
  bouton.title = "Grand écran";
  bouton.setAttribute("aria-label", "Visionner la vidéo en grand écran");
  bouton.setAttribute("aria-pressed", "false");
  bouton.innerHTML = ICONE_PLEIN_ECRAN;

  bouton.addEventListener("click", (evenement) => {
    evenement.preventDefault();
    evenement.stopPropagation();

    if (enveloppe.classList.contains("video-plein-ecran") || elementPleinEcran()) {
      sortirPleinEcran(enveloppe);
      return;
    }

    if (lire && !mediaDeLEveloppe(enveloppe)) lire();
    entrerPleinEcran(enveloppe, mediaDeLEveloppe(enveloppe));
  });

  return bouton;
}

// La touche Échap quitte le plein écran simulé (celui de l'API est
// déjà pris en charge par le navigateur).
document.addEventListener("keydown", (evenement) => {
  if (evenement.key !== "Escape" && evenement.key !== "Esc") return;
  const simule = document.querySelector(".progression-btn-wrap.video-plein-ecran");
  if (!simule || elementPleinEcran()) return;
  sortirPleinEcran(simule);
});

function preparerLectureInline(iframe) {
  const src = iframe.getAttribute("src") || "";
  const correspondance = src.match(/\/embed\/([\w-]+)/);
  if (!correspondance) return null;
  const videoId = correspondance[1];

  let params = src.split("?")[1] || "";
  params = params
    .split("&")
    .filter(function (p) {
      const cle = p.split("=")[0];
      return cle && cle !== "si" && cle !== "autoplay" && cle !== "playsinline";
    })
    .join("&");

  const conteneur = document.createElement("div");
  conteneur.className = "yt-click";
  conteneur.setAttribute("role", "button");
  conteneur.setAttribute("tabindex", "0");
  conteneur.setAttribute("aria-label", "Lire la vidéo sur le site");

  const miniature = document.createElement("div");
  miniature.className = "yt-click-miniature";
  miniature.style.backgroundImage =
    "url('https://i.ytimg.com/vi/" + videoId + "/hqdefault.jpg')";

  const lecteur = document.createElement("span");
  lecteur.className = "yt-click-play";
  lecteur.setAttribute("aria-hidden", "true");

  conteneur.appendChild(miniature);
  conteneur.appendChild(lecteur);

  // Remplacer la vignette par le lecteur, une seule fois : le bouton
  // "Grand écran" appelle aussi "lire" lorsqu'il lance la lecture.
  let dejaLance = false;
  const jouer = function () {
    if (dejaLance) return;
    dejaLance = true;
    let nouvelleSrc =
      "https://www.youtube.com/embed/" + videoId + "?autoplay=1&playsinline=1";
    if (params) nouvelleSrc += "&" + params;
    nouvelleSrc += "&rel=0";

    const iframeLecture = document.createElement("iframe");
    iframeLecture.setAttribute("width", "560");
    iframeLecture.setAttribute("height", "315");
    iframeLecture.setAttribute("src", nouvelleSrc);
    iframeLecture.setAttribute("title", iframe.getAttribute("title") || "Vidéo du cours");
    iframeLecture.setAttribute("frameborder", "0");
    iframeLecture.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen");
    iframeLecture.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    iframeLecture.setAttribute("allowfullscreen", "");
    iframeLecture.allowFullscreen = true;

    conteneur.replaceWith(iframeLecture);
  };

  conteneur.addEventListener("click", jouer);
  conteneur.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      jouer();
    }
  });

  return { element: conteneur, lire: jouer };
}

const cleModule = cleModuleCourante();
let boutonsCours = [];
if (cleModule) {
  let index = 0;

  document.querySelectorAll("iframe, video").forEach((el) => {
    let element = el;
    let lire = null;
    const estYouTube = el.tagName === "IFRAME" &&
      (el.getAttribute("src") || "").indexOf("youtube.com/embed") !== -1;
    const estVideo = el.tagName === "VIDEO";
    if (!estYouTube && !estVideo) return;

    if (estYouTube) {
      const visuel = preparerLectureInline(el);
      if (visuel) {
        el.parentNode.insertBefore(visuel.element, el);
        el.parentNode.removeChild(el);
        element = visuel.element;
        lire = visuel.lire;
      }
    }

    index++;
    const id = "cours-" + cleModule + "-" + index;
    element.dataset.progressionId = id;

    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.className = "progression-btn";
    bouton.dataset.progressionId = id;
    bouton.textContent = "Marquer comme visionné";
    bouton.addEventListener("click", async () => {
      await enregistrer(id, "Cours visionné enregistré ✓");
      rafraichirBoutonsCours(boutonsCours);
    });

    // On enveloppe la vidéo ET son bouton dans un conteneur vertical,
    // afin que le bouton s'affiche SOUS la vidéo et non à côté
    // (le parent .videos aligne ses enfants en ligne).
    const enveloppe = document.createElement("div");
    enveloppe.className = "progression-btn-wrap";
    element.parentNode.insertBefore(enveloppe, element);
    enveloppe.appendChild(element);
    enveloppe.appendChild(bouton);

    // Bouton de grand écran, posé en haut à droite de la vidéo.
    // Si la vidéo n'est pas encore lancée (vignette), le bouton lance
    // d'abord la lecture : un seul appui donne le cours en grand écran.
    enveloppe.appendChild(creerBoutonPleinEcran(enveloppe, lire));

    boutonsCours.push(bouton);
  });

  // Aligne une éventuelle première fois l'état des boutons grand écran
  // (utile au retour via le cache du navigateur).
  synchroniserPleinEcran();

  if (index !== CONTENUS[cleModule].cours) {
    console.warn(
      "suivi-progression : " + CONTENUS[cleModule].cours +
      " cours attendus pour " + cleModule + ", mais " + index + " vidéo(s) détectée(s)."
    );
  }
}

// ------------------------------------------------------------
// SUIVI DES EXERCICES (page Exercices.html)
// ------------------------------------------------------------
const boutonsExercices = document.querySelectorAll(".exercise-done-btn");

function mettreAJourBoutonsExercices(progression) {
  boutonsExercices.forEach((bouton) => {
    const cle = bouton.dataset.module;
    const fait = !!(progression["exercice-" + cle]);
    bouton.dataset.fait = fait ? "true" : "false";
    bouton.textContent = fait ? "✓ Exercice terminé" : "Marquer comme fait";
    bouton.classList.toggle("fait", fait);
  });
}

function rafraichirBoutonsExercices() {
  if (!boutonsExercices.length) return;
  if (typeof window.getUserProgress !== "function") return;
  window.getUserProgress().then(mettreAJourBoutonsExercices).catch(() => {});
}

boutonsExercices.forEach((bouton) => {
  bouton.addEventListener("click", async () => {
    const cle = bouton.dataset.module;
    await enregistrer("exercice-" + cle, "Exercice enregistré ✓");
    if (window.firebaseAuth && window.firebaseAuth.currentUser) {
      const progression = await window.getUserProgress();
      mettreAJourBoutonsExercices(progression);
    }
  });
});

// ---------- Initialisation de l'affichage ----------
// On attend que la session Firebase soit restaurée (onAuthStateChanged)
// AVANT d'afficher l'état réel des boutons : sans cela, au retour sur la
// page, l'utilisateur verrait ses cours/exercices comme non terminés.
function initialiserAffichage() {
  rafraichirBoutonsCours(boutonsCours);
  rafraichirBoutonsExercices();
}

// La navigation est initialisée ICI, avant tout code dépendant de
// Firebase. Le bouton burger doit exister même si Firebase n'est pas
// chargé (CDN injoignable, hors ligne, bloqueur de pub) : sinon plus
// aucun moyen de naviguer sur mobile, puisque les liens sont alors
// regroupés derrière ce bouton. Les fonctions ci-dessous sont
// remontées par le moteur JS, l'appel peut donc précéder leur
// définition textuelle.
initialiserNavigationBurger();
initialiserBurgerNav();

if (window.firebaseAuth && typeof window.firebaseAuth.onAuthStateChanged === "function") {
  window.firebaseAuth.onAuthStateChanged(() => initialiserAffichage());
} else {
  initialiserAffichage();
}

// ------------------------------------------------------------
// Données détaillées de progression (utilisées par le profil)
// ------------------------------------------------------------
// ------------------------------------------------------------
// NAVIGATION BURGER : footer pliable + fermeture des menus
// ------------------------------------------------------------
function initialiserNavigationBurger() {
  // Le menu compte se ferme au clic en dehors
  document.addEventListener("click", (e) => {
    const dropdown = e.target.closest(".account-dropdown");
    document.querySelectorAll(".account-menu.show").forEach((menu) => {
      if (!dropdown || !dropdown.contains(menu)) menu.classList.remove("show");
    });
  });
}

// ------------------------------------------------------------
// MENU HAMBURGER DU NAVBAR (affiché uniquement sur téléphone)
// Le bouton à trois traits est injecté automatiquement à l'extrême
// droite de la barre et ouvre Accueil / Cours / Exercices.
// ------------------------------------------------------------
function initialiserBurgerNav() {
  const nav = document.querySelector("nav");
  if (!nav) return;
  if (nav.querySelector(".nav-burger")) return;

  const burger = document.createElement("button");
  burger.type = "button";
  burger.className = "nav-burger";
  burger.setAttribute("aria-label", "Ouvrir le menu de navigation");
  burger.setAttribute("aria-expanded", "false");
  burger.title = "Menu";

  for (let i = 0; i < 3; i++) burger.appendChild(document.createElement("span"));

  nav.appendChild(burger);

  const fermer = () => {
    nav.classList.remove("open");
    burger.setAttribute("aria-expanded", "false");
  };

  burger.addEventListener("click", (e) => {
    e.stopPropagation();
    const ouvert = nav.classList.toggle("open");
    burger.setAttribute("aria-expanded", ouvert ? "true" : "false");
  });

  // Ferme le menu quand on clique sur un lien de navigation
  nav.querySelectorAll("ul a").forEach((lien) => {
    lien.addEventListener("click", fermer);
  });

  // Ferme le menu au clic en dehors de la barre
  document.addEventListener("click", (e) => {
    if (!nav.contains(e.target) && nav.classList.contains("open")) fermer();
  });
}

// L'initialisation de la navigation a déjà été faite plus haut dans
// ce fichier, AVANT le code Firebase (voir commentaire associé).

window.getProgressionDetail = async () => {
  const progression = (await window.getUserProgress()) || {};
  const details = {};
  for (const [cle, info] of Object.entries(CONTENUS)) {
    let coursSuivis = 0;
    for (let i = 1; i <= info.cours; i++) {
      if (progression["cours-" + cle + "-" + i]) coursSuivis++;
    }
    details[cle] = {
      nom: info.nom,
      cours: info.cours,
      coursSuivis: coursSuivis,
      exercices: info.exercices,
      exerciceFait: !!progression["exercice-" + cle]
    };
  }
  return details;
};
