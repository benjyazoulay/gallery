// /src/index.js
'use strict';
var useReflexion = true;
var showStats = false;

// Handle different screen ratios
const mapVal = (value, min1, max1, min2, max2) => min2 + (value - min1) * (max2 - min2) / (max1 - min1);
var fovX = () => mapVal(window.innerWidth / window.innerHeight, 16/9, 9/16, 1.7, Math.PI / 3);

if (navigator.userAgent.match(/(iPad)|(iPhone)|(iPod)|(android)|(webOS)/i)) {
	useReflexion = false;
	fovX = () => mapVal(window.innerWidth / window.innerHeight, 16/9, 9/16, 1.5, Math.PI / 3);
}
var fovY = () => 2 * Math.atan(Math.tan(fovX() * 0.5) * window.innerHeight / window.innerWidth);

const Stats = require('stats.js');
var stats = new Stats();
stats.showPanel(0);
if(showStats) {
	document.body.appendChild( stats.dom );
}

let regl, map, drawMap, placement, drawPainting, fps;

regl = require('regl')({
	extensions: [
		'OES_element_index_uint',
		'OES_standard_derivatives'
	],
	optionalExtensions: [
		'EXT_texture_filter_anisotropic'
	],
	attributes: { alpha : false }
});

map = require('./map')();
const mesh = require('./mesh');
drawMap = mesh(regl, map, useReflexion);
placement = require('./placement')(regl, map);
drawPainting = require('./painting')(regl);
fps = require('./fps')(map, fovY);

const context = regl({
	cull: {
		enable: true,
		face: 'back'
	},
	uniforms: {
		view: fps.view,
		proj: fps.proj,
		yScale: 1.0
	}
});

const reflexion = regl({
	cull: {
		enable: true,
		face: 'front'
	},
	uniforms: {
		yScale: -1.0
	}
});

// Écouteur d'état d'authentification
const { auth } = require('../firebase'); // Assurez-vous d'importer auth

auth.onAuthStateChanged(async (user) => {
	if (user) {
		console.log("Utilisateur connecté:", user.email);
	} else {
		console.log("Aucun utilisateur connecté. Veuillez vous connecter.");
	}
});

regl.frame(({ time }) => {
	stats.begin();
	fps.tick({ time });
	placement.update(fps.pos, fps.fmouse[1], fovX());
	// console.log("Peintures affichées:", placement.batch().length); // Log du nombre de peintures
	regl.clear({ color: [0, 0, 0, 1], depth: 1 });
	context(() => {
		if(useReflexion) {
			reflexion(() => {
				drawMap();
				drawPainting(placement.batch());
			});
		}
		drawMap();
		drawPainting(placement.batch());
	});
	stats.end();
});

document.addEventListener("DOMContentLoaded", () => {
    const { handleLogin } = require('../api/auth');
    console.log("handleLogin importé:", handleLogin);
    
    const loginButton = document.createElement('button');
    loginButton.style.zIndex = '1000';
    loginButton.style.position = 'absolute';
    loginButton.style.bottom = '10px'; // Placer en bas
    loginButton.style.left = '10px';   // Placer à gauche
    loginButton.style.padding = '10px'; 
    loginButton.style.borderRadius = '50%'; // Faire une capsule ronde
    loginButton.style.backgroundColor = 'rgba(255, 255, 255, 0.8)'; // Fond blanc avec transparence
    loginButton.style.cursor = 'pointer';
    loginButton.style.border = 'none'; 
    loginButton.style.pointerEvents = 'auto'; // Assurez-vous que le bouton peut recevoir des événements
    
    // Ajouter l'image comme icône
    const icon = document.createElement('img');
    icon.src = './user.svg'; // Assurez-vous que 'user.svg' est bien présent
    icon.style.width = '30px'; // Ajuster la taille de l'icône
    icon.style.height = '30px'; 
    
    loginButton.appendChild(icon);
    
    // Empêche la propagation de l'événement de clic
    loginButton.addEventListener('click', (event) => {
        console.log("Bouton de connexion cliqué");
        event.preventDefault(); // Empêche le comportement par défaut
        event.stopPropagation(); // Empêche la propagation de l'événement
        handleLogin();
    }, true); // Utiliser la phase de capture
    
    loginButton.addEventListener('touchstart', (event) => {
        console.log("Bouton de connexion touchstart");
        event.preventDefault();
        event.stopPropagation(); // Empêche la propagation de l'événement
        handleLogin();
    }, true); // Utiliser la phase de capture
    
    document.body.appendChild(loginButton);
    console.log("Ajout du bouton de connexion");
});
