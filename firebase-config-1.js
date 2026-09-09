
// ============================================================
// CONFIGURATION FIREBASE
// ============================================================
// Remplacez les valeurs ci-dessous par CELLES DE VOTRE PROJET.
// Vous les trouverez dans : Firebase Console > Paramètres du projet
// > Vos applications > (icône </>) > Config
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
  updateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDIb2tR2kfMLECalrnHhafcRFw2fjVbw3o",
  authDomain: "digitaleduc-7097c.firebaseapp.com",
  projectId: "digitaleduc-7097c",
  storageBucket: "digitaleduc-7097c.firebasestorage.app",
  messagingSenderId: "789963386382",
  appId: "1:789963386382:web:3a47ed9812bdf1f05cd65f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// On rend ces fonctions accessibles à toutes les pages du site
window.firebaseAuth = auth;
window.createUserWithEmailAndPassword = (email, password) =>
  createUserWithEmailAndPassword(auth, email, password);
window.signInWithEmailAndPassword = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);
window.signOutUser = () => signOut(auth);

// Crée un compte et enregistre immédiatement le prénom + le nom affichés.
// Le menu "COMPTE" affichera alors "Prénom Nom" avec l'email juste en dessous.
// Le prénom et le nom sont aussi stockés dans Firestore (collection
// 'utilisateurs').
window.createCompteAvecProfil = async (email, password, prenom, nom) => {
  const credentials = await createUserWithEmailAndPassword(auth, email, password);
  const util = credentials.user;
  const prenomNet = String(prenom || "").trim();
  const nomNet = String(nom || "").trim();
  const nomComplet = [prenomNet, nomNet].filter(Boolean).join(" ").trim();
  await updateProfile(util, { displayName: nomComplet || null });

  // Enregistre le prénom et le nom dans Firestore, liés à l'UID.
  if (prenomNet && nomNet) {
    const ref = doc(db, "utilisateurs", util.uid);
    await setDoc(ref, {
      prenom: prenomNet,
      nom: nomNet,
      email: String(email || "").trim().toLowerCase(),
      creeLe: new Date().toISOString()
    }, { merge: true });
  }
  return credentials;
};

// Met à jour le prénom et le nom du compte actuellement connecté.
// Permet notamment de compléter les comptes créés avant l'ajout
// des champs "Prénom" et "Nom" à l'inscription.
window.updateUserProfil = async (prenom, nom) => {
  const user = auth.currentUser;
  if (!user) return false;
  const prenomNet = String(prenom || "").trim();
  const nomNet = String(nom || "").trim();
  const nomComplet = [prenomNet, nomNet].filter(Boolean).join(" ").trim();
  await updateProfile(user, { displayName: nomComplet || null });

  // Complète le document d'identité si un utilisateur plus ancien modifie
  // son profil. N'écrase pas une date de naissance déjà définie.
  try {
    const ref = doc(db, "utilisateurs", user.uid);
    const snap = await getDoc(ref);
    const donnees = { prenom: prenomNet, nom: nomNet, email: String(user.email || "").trim().toLowerCase() };
    if (snap.exists()) {
      await updateDoc(ref, donnees);
    } else {
      await setDoc(ref, { ...donnees, dateNaissance: "" }, { merge: true });
    }
  } catch (e) {
    // Silencieux : la mise à jour Firestore n'est pas bloquante pour le profil.
  }
  return true;
};

// Change le mot de passe du compte connecté sans email, après
// vérification du mot de passe actuel (réauthentification).
// Page associée : changer-mot-de-passe.html
window.changerMotDePasse = async (ancienMotDePasse, nouveauMotDePasse) => {
  const user = auth.currentUser;
  if (!user) throw { code: "auth/no-user" };
  const credential = EmailAuthProvider.credential(user.email, ancienMotDePasse);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, nouveauMotDePasse);
};

// Change directement le mot de passe quand la session est récente.
// Pour les sessions anciennes, Firebase renvoie
// "auth/requires-recent-login" : il faudra alors passer par
// changerMotDePasse (avec le mot de passe actuel) pour vérifier l'identité.
window.modifierMotDePasse = async (nouveauMotDePasse) => {
  const user = auth.currentUser;
  if (!user) throw { code: "auth/no-user" };
  await updatePassword(user, nouveauMotDePasse);
};

// ============================================================
// RÉINITIALISATION DU MOT DE PASSE PAR EMAIL
// ============================================================
// La page de réinitialisation (reinitialisation.html) doit être
// hébergée sur un domaine autorisé dans :
// Firebase Console > Authentication > Paramètres > Domaines autorisés.
// Elle reçoit le lien de l'email et permet de saisir un nouveau mot de passe.
function urlReinitialisation() {
  const origine =
    window.location.protocol.indexOf("http") === 0
      ? window.location.origin
      : "https://digitaleduc-7097c.firebaseapp.com";
  return origine + "/reinitialisation.html";
}

// NOTE : Firebase n'envoie un email de réinitialisation QUE si l'adresse
// correspond à un compte existant. Pour une adresse inconnue, il refuse
// l'envoi et renvoie l'erreur "auth/user-not-found" (règle de sécurité
// de Google, impossible à contourner depuis le code).
window.sendPasswordResetEmail = async (email) => {
  try {
    // 1er essai : lien personnalisé vers notre page reinitialisation.html
    await sendPasswordResetEmail(auth, email, {
      url: urlReinitialisation(),
      handleCodeInApp: true
    });
    console.log("[reset] Email envoyé avec le lien personnalisé vers :", email);
  } catch (erreur) {
    if (window.estErreurDomaineNonAutorise(erreur)) {
      // Le domaine n'est pas encore autorisé dans le projet : on renvoie
      // l'email avec le lien standard de Firebase pour que l'utilisateur
      // puisse réinitialiser son mot de passe et se connecter quand même.
      await sendPasswordResetEmail(auth, email);
      console.log("[reset] Email envoyé avec le lien standard Firebase :", email);
    } else {
      console.error("[reset] Erreur d'envoi :", erreur);
      throw erreur;
    }
  }
};

// Envoi d'un email de réinitialisation avec le lien STANDARD de Firebase
// (page __/auth/action hébergée par Firebase, toujours disponible :
// aucun domaine autorisé ni déploiement du site requis).
// Utilisé par la page mot-de-passe-oublie.html.
window.envoyerEmailResetStandard = (email) =>
  sendPasswordResetEmail(auth, String(email || "").trim());

// Valide le code reçu dans l'email et renvoie l'adresse concernée.
window.verifyPasswordResetCode = (oobCode) =>
  verifyPasswordResetCode(auth, oobCode);

// Enregistre le nouveau mot de passe à partir du code validé.
window.confirmPasswordReset = (oobCode, nouveauMotDePasse) =>
  confirmPasswordReset(auth, oobCode, nouveauMotDePasse);

// Détecte l'erreur "domaine non autorisé" renvoyée par Firebase quand
// le lien personnalisé de réinitialisation n'est pas dans la liste des
// domaines autorisés du projet (Firebase Console > Authentication >
// Paramètres > Domaines autorisés).
window.estErreurDomaineNonAutorise = (erreur) => {
  const code = String((erreur && erreur.code) || "");
  const message = String((erreur && erreur.message) || "").toLowerCase();
  return (
    code === "auth/unauthorized-domain" ||
    code === "auth/unauthorized-continue-uri" ||
    message.indexOf("continue url is not allowed") !== -1 ||
    message.indexOf("domain is not authorized") !== -1 ||
    message.indexOf("not allowlisted") !== -1
  );
};

// Récupère le prénom et le nom enregistrés dans Firestore pour le
// compte actuellement connecté. C'est cette donnée (saisie à
// l'inscription) qu'il faut afficher en priorité, plutôt que le
// displayName qui peut contenir un ancien pseudo.
window.getProfilUtilisateur = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    const ref = doc(db, "utilisateurs", user.uid);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
};

// ============================================================
// SUIVI DE PROGRESSION
// ============================================================
// Chaque utilisateur a un document dans la collection "progress",
// identifié par son UID. Ce document contient un objet "completed"
// qui liste les IDs des cours/exercices terminés, ex:
// { completed: { "cours-html-1": true, "exercice-css-2": true } }

// Marque un cours ou exercice comme terminé pour l'utilisateur connecté
window.markItemComplete = async (itemId) => {
  const user = auth.currentUser;
  if (!user) {
    alert("Vous devez être connecté pour enregistrer votre progression.");
    return false;
  }
  const ref = doc(db, "progress", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, { [`completed.${itemId}`]: true });
  } else {
    await setDoc(ref, { completed: { [itemId]: true } });
  }
  return true;
};

// Récupère la progression complète de l'utilisateur connecté
// Retourne un objet { "cours-html-1": true, ... } ou {} si rien n'est fait
window.getUserProgress = async () => {
  const user = auth.currentUser;
  if (!user) return {};
  const ref = doc(db, "progress", user.uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data().completed || {}) : {};
};

// Vérifie si un item précis est terminé (pratique pour afficher une coche)
window.isItemComplete = async (itemId) => {
  const progress = await window.getUserProgress();
  return !!progress[itemId];
};

// ============================================================
// MENU "COMPTE" PROFESSIONNEL
// ============================================================

// Petites fonctions pour présenter proprement l'identité
function initialesUtilisateur(user, nomCustom) {
  const premiereLigne = nomCustom || user.displayName || user.email || "";
  const mots = String(premiereLigne)
    .split(/[\s._@+-]+/)
    .filter(Boolean);
  const initiales = mots.slice(0, 2).map((mot) => mot.charAt(0).toUpperCase()).join("");
  return (initiales || "U").toUpperCase();
}

function nomAffichage(email) {
  const partieLocale = String(email || "").split("@")[0].trim();
  if (!partieLocale) return "Utilisateur";
  return partieLocale
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((mot) => mot.charAt(0).toUpperCase() + mot.slice(1))
    .join(" ");
}

// Cette fonction met à jour automatiquement le bouton "COMPTE"
// selon que l'utilisateur est connecté ou non.
// Elle s'exécute sur TOUTES les pages qui incluent ce script.
onAuthStateChanged(auth, async (user) => {
  const menu = document.getElementById('accountMenu');
  if (!menu) return; // la page n'a pas de menu compte, on ignore

  if (user) {
    // On privilégie le prénom + le nom enregistrés à l'inscription
    let nomCompte = "";
    const profil = await window.getProfilUtilisateur();
    if (profil && (profil.prenom || profil.nom)) {
      const prenom = String(profil.prenom || "").trim();
      const nom = String(profil.nom || "").trim();
      nomCompte = [prenom, nom].filter(Boolean).join(" ");
    } else {
      nomCompte = user.displayName || nomAffichage(user.email);
    }

    menu.classList.add('acct-connecte');
    menu.innerHTML = `
      <div class="acct-header">
        <div class="acct-avatar">${initialesUtilisateur(user, nomCompte)}</div>
        <div class="acct-infos">
          <div class="acct-nom">${nomCompte}</div>
          <div class="acct-email">${user.email}</div>
        </div>
      </div>
      <div class="acct-divider"></div>
      <a href="profil-1.html"><i class="fa-solid fa-user"></i> Mon profil</a>
      <a href="#" class="acct-fermeture" id="logoutLink"><i class="fa-solid fa-right-from-bracket"></i> Se déconnecter</a>
    `;
    document.getElementById('logoutLink').addEventListener('click', async (e) => {
      e.preventDefault();
      await signOutUser();
      window.location.href = "index.html";
    });
  } else {
    menu.classList.remove('acct-connecte');
    menu.innerHTML = `
      <div class="acct-boutons">
        <a href="connexion.html" class="acct-bouton acct-bouton-principal"><i class="fa-solid fa-arrow-right-to-bracket"></i> Se connecter</a>
        <a href="inscription.html" class="acct-bouton acct-bouton-secondaire"><i class="fa-solid fa-user-plus"></i> S'inscrire</a>
      </div>
      <div class="acct-divider"></div>
      <a href="profil-1.html"><i class="fa-solid fa-user"></i> Mon profil</a>
    `;
  }
});
