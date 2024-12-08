// firebase.js
const firebase = require("firebase/app");
require("firebase/auth");
require("firebase/firestore");
require("firebase/storage");

const firebaseConfig = {
    apiKey: "AIzaSyCAkGTaD3O0NgAFJ892lgFFYTu57zOkGPM",
    authDomain: "babelgallery-lab.firebaseapp.com",
    databaseURL: "https://babelgallery-lab-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "babelgallery-lab",
    storageBucket: "babelgallery-lab.appspot.com",
    messagingSenderId: "311401082382",
    appId: "1:311401082382:web:d465a89bf8494fc7a3165f"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
auth.setPersistence(firebase.auth.Auth.Persistence.SESSION)
    .then(() => {
        console.log("Persistance de session configurée.");
    })
    .catch((error) => {
        console.error("Erreur de configuration de la persistance :", error);
    });
    
module.exports = { auth, db, storage };
