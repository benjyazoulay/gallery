// /api/artic.js

'strict mode';

const { auth, db } = require("../firebase"); // Assurez-vous d'importer db pour accéder à Firestore

// Fonction pour récupérer les images de l'utilisateur connecté
const fetchUserImages = async (userId) => {
    const userImages = [];
    console.log(`Tentative de récupération des images pour l'utilisateur ID: ${userId}`);

    try {
        const snapshot = await db.collection("images") // Assurez-vous que "images" est le nom de la collection
            .where("userId", "==", userId) // Filtrer par ID utilisateur
            .get();

        console.log(`Nombre d'images récupérées: ${snapshot.size}`);
        
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`Image trouvée: ID ${doc.id}, URL ${data.imageUrl}`);
            userImages.push({
                id: doc.id,
                imageUrl: data.imageUrl,
                description: data.description,
                userId: data.userId,
                createdAt: data.createdAt
            });
        });

        if (userImages.length === 0) {
            console.log("Aucune image trouvée pour cet utilisateur.");
        } else {
            console.log(`${userImages.length} image(s) récupérée(s) pour l'utilisateur.`);
        }
    } catch (error) {
        console.error("Erreur lors de la récupération des images:", error);
    }

    return userImages;
};


module.exports = {
    fetchList: async function(userId) {
        return await fetchUserImages(userId);
    },
    fetchImage: async function(obj) {
        // Si vous avez une fonction spécifique pour obtenir une seule image, vous pouvez la définir ici.
        console.warn("fetchImage n'est pas utilisé dans cette implémentation.");
        return null;
    }
};
