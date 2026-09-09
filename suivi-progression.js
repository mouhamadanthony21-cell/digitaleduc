
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
    "  display:flex; flex-direction:column; align-items:center;" +
    "}" +
    ".progression-btn-wrap iframe, .progression-btn-wrap video {" +
    "  max-width:100%; border-radius:8px;" +
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

const cleModule = cleModuleCourante();
let boutonsCours = [];
if (cleModule) {
  let index = 0;

  document.querySelectorAll("iframe, video").forEach((element) => {
    const estYouTube = element.tagName === "IFRAME" &&
      (element.getAttribute("src") || "").indexOf("youtube.com/embed") !== -1;
    const estVideo = element.tagName === "VIDEO";
    if (!estYouTube && !estVideo) return;

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
    boutonsCours.push(bouton);
  });

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

if (window.firebaseAuth) {
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

  // Chaque titre de colonne du footer devient un burger pliable
  document.querySelectorAll("footer h3").forEach((titre) => {
    if (titre.classList.contains("titre-footer")) return;
    if (titre.querySelector(".burger-icone")) return;

    const icone = document.createElement("span");
    icone.className = "burger-icone";
    titre.prepend(icone);

    titre.setAttribute("role", "button");
    titre.style.cursor = "pointer";
    titre.addEventListener("click", () => {
      titre.classList.toggle("open");
      const ul = titre.parentElement.querySelector("ul");
      if (ul) ul.classList.toggle("open");
      if (titre.parentElement.classList.contains("colonne4")) {
        const logos = titre.parentElement.querySelector(".les-logos");
        if (logos) logos.classList.toggle("open");
      }
    });
  });
}

initialiserNavigationBurger();

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
