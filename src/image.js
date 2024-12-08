// /src/image.js
'use strict';
const api = require('../api/api');
const text = require('./text');
const { auth } = require("../firebase");

let paintingCache = {};
let unusedTextures = [];

const resizeCanvas = document.createElement('canvas');
resizeCanvas.width = resizeCanvas.height = 2048;
const ctx = resizeCanvas.getContext('2d');
ctx.mozImageSmoothingEnabled = false;
ctx.webkitImageSmoothingEnabled = false;
let aniso = false;

const emptyImage = (regl) => [
    (unusedTextures.pop() || regl.texture)([[[200, 200, 200]]]),
    _ => (unusedTextures.pop() || regl.texture)([[[0, 0, 0, 0]]]),
    1
];

async function loadImage(regl, p) {
    if (aniso === false) {
        aniso = regl.hasExtension('EXT_texture_filter_anisotropic') ? regl._gl.getParameter(
            regl._gl.getExtension('EXT_texture_filter_anisotropic').MAX_TEXTURE_MAX_ANISOTROPY_EXT
        ) : 0;
    }

    try {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        const imageLoadPromise = new Promise((resolve, reject) => {
            img.onload = () => resolve(img);
            img.onerror = (error) => {
                console.error("Erreur lors du chargement de l'image:", error);
                reject(new Error('Erreur de chargement de l\'image'));
            };
        });

        // Ajout des logs pour debug
        console.log("Tentative de chargement de l'image:", p.imageUrl);
        img.src = p.imageUrl;
        
        const image = await imageLoadPromise;
        console.log("Image chargée avec succès, dimensions:", image.width, "x", image.height);

        // Vérification des dimensions
        if (image.width === 0 || image.height === 0) {
            throw new Error('Image invalide - dimensions nulles');
        }

        // Redimensionnement avec vérification
        ctx.clearRect(0, 0, resizeCanvas.width, resizeCanvas.height);
        ctx.drawImage(image, 0, 0, resizeCanvas.width, resizeCanvas.height);

        // Création de la texture avec vérification
        const texture = (unusedTextures.pop() || regl.texture)({
            data: resizeCanvas,
            min: 'mipmap',
            mipmap: 'nice',
            aniso,
            flipY: true,
            premultiplyAlpha: true
        });

        // Vérification que la texture est bien créée
        if (!texture) {
            throw new Error('Échec de création de la texture');
        }

        console.log("Texture créée avec succès");

        return [
            texture,
            width => text.init((unusedTextures.pop() || regl.texture), p.description || '', width),
            image.width / image.height
        ];

    } catch (e) {
        console.error("Erreur détaillée lors du chargement de l'image:", {
            url: p.imageUrl,
            error: e.message,
            stack: e.stack
        });
        return emptyImage(regl);
    }
}

async function validateAndRefreshImageUrl(imageUrl, userId) {
    try {
        // Vérifie si le token Firebase est expiré
        const user = auth.currentUser;
        if (user) {
            const idToken = await user.getIdToken(true);
            
            // Extraire la base URL et les paramètres existants
            const urlObj = new URL(imageUrl);
            
            // Conserver uniquement alt=media et ajouter le nouveau token
            urlObj.searchParams.delete('token');
            urlObj.searchParams.set('alt', 'media');
            urlObj.searchParams.set('token', idToken);
            
            return urlObj.toString();
        }
        return imageUrl;
    } catch (e) {
        console.error("Erreur lors du rafraîchissement de l'URL:", e);
        return imageUrl;
    }
}

// Fonction pour vérifier si une URL est accessible
async function checkImageAccess(url) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    return new Promise((resolve, reject) => {
		img.onload = () => {
			console.log('Image chargée avec succès :', url); // Log de succès
			resolve(true);
		};
		img.onerror = () => {
			reject(new Error('Image inaccessible'));
		};
		img.src = url;
	});	
}

module.exports = {
    fetch: async (regl, cbOne, cbAll) => {
		const user = auth.currentUser;
		if (!user) {
			console.error("Aucun utilisateur connecté");
			cbAll();
			return;
		}

		try {
			console.log("Début de la récupération de la liste");
			const paintings = await api.artic.fetchList(user.uid);
			const count = paintings.length;
			console.log(`${count} peintures trouvées`);

			if (count === 0) {
				console.log("Aucune peinture à afficher");
				cbAll();
				return;
			}

			let pendingCount = count;
			let errors = [];

			for (const p of paintings) {
				try {
					// Vérification de l'existence des propriétés requises
					if (!p.id || !p.imageUrl) {
						throw new Error(`Données de peinture invalides: id=${p.id}, url=${p.imageUrl}`);
					}

					if (paintingCache[p.id]) {
						console.log(`Utilisation du cache pour ${p.id}`);
						cbOne({ ...p, tex: paintingCache[p.id].tex });
						if (--pendingCount === 0) cbAll();
						continue;
					}

					// Validation et rafraîchissement de l'URL
					const validatedUrl = await validateAndRefreshImageUrl(p.imageUrl, user.uid);
					if (!validatedUrl) {
						throw new Error(`URL invalide pour ${p.id}`);
					}

					console.log(`Chargement de l'image ${p.id} depuis ${validatedUrl}`);
					const [tex, textGen, aspect] = await loadImage(regl, { ...p, imageUrl: validatedUrl });
					
					// Vérification que la texture est valide
					if (!tex) {
						throw new Error(`Texture non créée pour ${p.id}`);
					}

					paintingCache[p.id] = { tex };
					
					// Log de succès avant callback
					console.log(`Image ${p.id} chargée avec succès`);
					
					cbOne({ ...p, tex, textGen, aspect });
				} catch (e) {
					console.error(`Erreur pour l'image ${p.id}:`, e);
					errors.push({ id: p.id, error: e.message });
				} finally {
					if (--pendingCount === 0) {
						if (errors.length > 0) {
							console.warn("Erreurs de chargement:", errors);
						}
						cbAll();
					}
				}
			}
		} catch (e) {
			console.error("Erreur globale:", e);
			cbAll();
		}
	},	
    load: (regl, p) => {
        if (p.tex || p.loading) return;
        p.loading = true;

        loadImage(regl, p).then(([tex, textGen]) => {
            p.loading = false;
            p.tex = tex;
            p.text = textGen(p.width);
        });
    },
    unload: (p) => {
        if (p.tex) {
            unusedTextures.push(p.tex);
            p.tex = undefined;
        }
        if (p.text) {
            unusedTextures.push(p.text);
            p.text = undefined;
        }
    }
};
