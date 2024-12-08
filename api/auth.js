// /api/auth.js
console.log("auth.js chargé");
const { auth } = require('../firebase');
const firebase = require("firebase/app");

const handleLogin = async () => {
    console.log("Tentative de connexion...");
    const googleProvider = new firebase.auth.GoogleAuthProvider();
    try {
        // Redirection au lieu du popup
        await auth.signInWithRedirect(googleProvider);
        // Vous pouvez écouter l'événement de redirection pour récupérer l'état de la session
        auth.getRedirectResult().then((result) => {
            if (result.user) {
                console.log("Utilisateur connecté !");
                console.log("Email de l'utilisateur:", result.user.email);
            }
        }).catch((error) => {
            console.error("Erreur de connexion:", error);
        });
    } catch (error) {
        console.error("Erreur de connexion:", error);
    }
};

module.exports = { handleLogin };
