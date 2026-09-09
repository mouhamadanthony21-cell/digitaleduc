
// ============================================================
// Cloud Functions : réinitialisation du mot de passe
// par vérification d'identité (prénom + nom + date de naissance)
// ============================================================
// Firebase ne permet pas au SDK navigateur de changer le mot de passe
// d'un compte sans session active ni email. Ces fonctions HTTPS utilisent
// l'Admin SDK (côté serveur) et découpent le flux en 2 étapes :
//
//  1) verifierIdentite(email, prenom, nom, dateNaissance)
//     -> vérifie les 3 informations et renvoie un "token" éphémère
//        à usage unique (document Firestore avec expiration).
//
//  2) definirNouveauMotDePasse(tokenId, nouveauMotDePasse)
//     -> valide le token, puis met à jour le mot de passe (Admin SDK).
//
// Découper ainsi évite qu'un attaquant puisse changer le mot de passe
// sans d'abord prouver l'identité, et colle au formulaire "2 étapes".
//
// Plan requis : **Blaze** (pay-as-you-go). Néanmoins les Cloud Functions
// disposent d'un quota GRATUIT généreux (2 000 000 d'invocations/mois),
// donc vous ne paierez rien tant que vous restez sous ce seuil.

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

// Limites anti-bruteforce
const TENTATIVES_MAX = 5;
const BLOCAGE_MINUTES = 15;
const TOKEN_EXPIRATION_MINUTES = 10;

function normaliser(valeur) {
  return String(valeur || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function blobageMessage(verrouJusqua) {
  const verrou = new Date(verrouJusqua);
  const resteMin = Math.max(1, Math.ceil((verrou.getTime() - Date.now()) / 60000));
  return "Trop de tentatives. Réessayez dans " + resteMin + " min.";
}

function definirCORS(res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
}

function reponse(res, statut, corps) {
  definirCORS(res);
  res.status(statut).json(corps);
}

// Retourne null si pas bloqué, sinon un objet d'erreur.
async function verifierBlocage(uid) {
  const snap = await db.collection("utilisateurs").doc(uid).get();
  const donnees = snap.exists() ? snap.data() : {};
  if (donnees.verrouJusqua) {
    const verrou = new Date(donnees.verrouJusqua);
    if (verrou.getTime() > Date.now()) {
      return { bloque: true, message: blobageMessage(donnees.verrouJusqua) };
    }
  }
  return { bloque: false };
}

function gererOption(req, res) {
  if (req.method === "OPTIONS") {
    definirCORS(res);
    res.sendStatus(204);
    return true;
  }
  return false;
}

// ---------- Étape 1 : vérification d'identité ----------
exports.verifierIdentite = functions.https.onRequest(async (req, res) => {
  if (gererOption(req, res)) return;
  if (req.method !== "POST") {
    return reponse(res, 405, { code: "method-not-allowed", erreur: "Méthode non autorisée." });
  }

  const { email, prenom, nom, dateNaissance } = req.body || {};
  const emailNet = String(email || "").trim().toLowerCase();
  const prenomNet = String(prenom || "").trim();
  const nomNet = String(nom || "").trim();
  const dateNet = String(dateNaissance || "").trim();

  // Message générique pour toute "mauvaise identité" (ne révèle pas le champ faux).
  const identiteInvalide = () => reponse(res, 401, {
    code: "identity-invalid",
    erreur: "Les informations ne correspondent pas. Vérifiez votre saisie."
  });

  if (!emailNet || !prenomNet || !nomNet || !dateNet) {
    return identiteInvalide();
  }

  let utilisateur;
  try {
    utilisateur = await auth.getUserByEmail(emailNet);
  } catch (erreur) {
    if (erreur.code === "auth/user-not-found") {
      // Le client peut afficher "email non trouvé" (choix UX). Pour la
      // sécurité, beaucoup préfèrent un message générique ; ici on garde
      // un message distinct pour aider l'utilisateur légitime.
      return reponse(res, 404, {
        code: "user-not-found",
        erreur: "Aucun compte n'est associé à cette adresse email."
      });
    }
    return reponse(res, 500, { code: "internal", erreur: "Erreur serveur. Réessayez plus tard." });
  }

  const uid = utilisateur.uid;
  const visible = await verifierBlocage(uid);
  if (visible.bloque) {
    return reponse(res, 429, { code: "too-many-requests", erreur: visible.message });
  }

  const refUtilisateur = db.collection("utilisateurs").doc(uid);
  const snap = await refUtilisateur.get();
  const document = snap.exists() ? snap.data() : {};

  const prenomOk = normaliser(document.prenom) === normaliser(prenomNet);
  const nomOk = normaliser(document.nom) === normaliser(nomNet);
  const dateOk = String(document.dateNaissance || "").trim() === dateNet;

  if (!prenomOk || !nomOk || !dateOk) {
    // Échec d'identité : incrément du compteur anti-bruteforce.
    const compteur = (document.tentativesReset || 0) + 1;
    const miseAJour = { tentativesReset: compteur };
    if (compteur >= TENTATIVES_MAX) {
      const verrouJusqua = new Date(Date.now() + BLOCAGE_MINUTES * 60000).toISOString();
      miseAJour.verrouJusqua = verrouJusqua;
      miseAJour.tentativesReset = 0;
      await refUtilisateur.set(miseAJour, { merge: true });
      return reponse(res, 429, {
        code: "too-many-requests",
        erreur: "Trop de tentatives. Réessayez dans " + BLOCAGE_MINUTES + " min."
      });
    }
    await refUtilisateur.set(miseAJour, { merge: true });
    return identiteInvalide();
  }

  // Identité confirmée : création d'un token éphémère à usage unique.
  const tokenId = crypto.randomBytes(24).toString("hex");
  const maintenant = Date.now();
  await db.collection("tokens_reinitialisation").doc(tokenId).set({
    uid: uid,
    creeLe: new Date(maintenant).toISOString(),
    expireLe: new Date(maintenant + TOKEN_EXPIRATION_MINUTES * 60000).toISOString(),
    utilise: false
  });

  // On remet le compteur d'échecs à zéro.
  await refUtilisateur.set({ tentativesReset: 0, verrouJusqua: admin.firestore.FieldValue.delete() }, { merge: true });

  return reponse(res, 200, { code: "success", tokenId: tokenId });
});

// ---------- Étape 2 : définition du nouveau mot de passe ----------
exports.definirNouveauMotDePasse = functions.https.onRequest(async (req, res) => {
  if (gererOption(req, res)) return;
  if (req.method !== "POST") {
    return reponse(res, 405, { code: "method-not-allowed", erreur: "Méthode non autorisée." });
  }

  const { tokenId, nouveauMotDePasse } = req.body || {};
  const mdp = String(nouveauMotDePasse || "");

  if (!tokenId) {
    return reponse(res, 401, {
      code: "token-invalid",
      erreur: "Session expirée. Veuillez recommencer."
    });
  }
  if (mdp.length < 6) {
    return reponse(res, 400, {
      code: "weak-password",
      erreur: "Le mot de passe doit contenir au moins 6 caractères."
    });
  }

  const refToken = db.collection("tokens_reinitialisation").doc(String(tokenId));
  const snapToken = await refToken.get();
  if (!snapToken.exists) {
    return reponse(res, 401, {
      code: "token-invalid",
      erreur: "Session expirée. Veuillez recommencer."
    });
  }

  const token = snapToken.data();
  if (token.utilise) {
    return reponse(res, 401, {
      code: "token-used",
      erreur: "Ce lien a déjà été utilisé. Veuillez recommencer."
    });
  }
  if (new Date(token.expireLe).getTime() < Date.now()) {
    return reponse(res, 401, {
      code: "token-expired",
      erreur: "La session a expiré. Veuillez recommencer la vérification."
    });
  }

  try {
    await auth.updateUser(token.uid, { password: mdp });
  } catch (erreur) {
    return reponse(res, 500, { code: "internal", erreur: "Erreur lors de la mise à jour. Réessayez." });
  }

  // Token consommé : on le marque puis on le supprime.
  await refToken.set({ utilise: true }, { merge: true });
  await refToken.delete().catch(() => {});

  return reponse(res, 200, {
    code: "success",
    message: "Votre mot de passe a été réinitialisé avec succès."
  });
});
