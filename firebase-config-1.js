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
  sendPasswordResetEmail
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
window.sendPasswordResetEmail = (email) => sendPasswordResetEmail(auth, email);

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

// Cette fonction met à jour automatiquement le bouton "COMPTE"
// selon que l'utilisateur est connecté ou non.
// Elle s'exécute sur TOUTES les pages qui incluent ce script.
onAuthStateChanged(auth, (user) => {
  const menu = document.getElementById('accountMenu');
  if (!menu) return; // la page n'a pas de menu compte, on ignore

  if (user) {
    menu.innerHTML = `
      <span class="account-email">${user.email}</span>
      <a href="/profil.html">Mon profil</a>
      <a href="#" id="logoutLink">Déconnexion</a>
    `;
    document.getElementById('logoutLink').addEventListener('click', async (e) => {
      e.preventDefault();
      await signOutUser();
      window.location.href = "/";
    });
  } else {
    menu.innerHTML = `
      <a href="/connexion.html">Connexion</a>
      <a href="/inscription.html">Inscription</a>
    `;
  }
});
