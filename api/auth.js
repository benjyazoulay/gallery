// /api/auth.js
console.log("auth.js chargé");
const { auth } = require('../firebase');
const firebase = require("firebase/app");

const handleLogin = async () => {
    console.log("Tentative de connexion...");
    const googleProvider = new firebase.auth.GoogleAuthProvider();
    try {
        const result = await auth.signInWithPopup(googleProvider);
        console.log("Utilisateur connecté !");
        
        // Récupérer et afficher l'email de l'utilisateur
        const user = result.user;
        if (user) {
            console.log("Email de l'utilisateur:", user.email);
        }
    } catch (error) {
        console.error("Erreur de connexion:", error);
    }
};

module.exports = { handleLogin };
