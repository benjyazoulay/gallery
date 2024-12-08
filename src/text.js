'strict mode';

const textHeight = 22;
const textCanvas = document.createElement('canvas');
const maxWidth = textCanvas.width = textCanvas.height = 1024;
const ctx = textCanvas.getContext('2d');

// Fonction pour charger la police
async function loadFont() {
    const font = new FontFace('CalSans', 'url(fonts/CalSans-SemiBold.ttf)'); // Indiquez le chemin correct vers la police
    await font.load();
    document.fonts.add(font); // Ajoutez la police au document
    ctx.font = textHeight + "px 'CalSans', sans-serif"; // Utilisez la police après qu'elle a été ajoutée
}
loadFont(); // Appelez la fonction pour charger la police

ctx.mozImageSmoothingEnabled = false;
ctx.webkitImageSmoothingEnabled = false;
ctx.textBaseline = "bottom";
ctx.fillStyle = "#aaa";

function createMultilineText(ctx, textToWrite, maxWidth, text) {
    // Scinder le texte en sections sur la base des double astérisques tout en supprimant les *
    let parsedText = textToWrite.replace(/\*\*/g, '');
    // Tronquer le texte juste avant le mot "Description"
    const descriptionIndex = parsedText.indexOf("Description");
    if (descriptionIndex !== -1) {
        parsedText = parsedText.substring(0, descriptionIndex).trim();
    }
    // Diviser le texte en sections tout en gardant "Titre : contenu"
    const sections = parsedText.split(/\s(?=\w+\s?:)/).map(section => section.trim());
    let maxLineWidth = 0;
    sections.forEach(section => {
        const testLineWidth = ctx.measureText(section).width;
        if (testLineWidth > maxWidth) {
            let currentLine = '';
            let words = section.split(' ');
            words.forEach(word => {
                const testLine = currentLine + (currentLine ? ' ' : '') + word;
                const testLineWidth = ctx.measureText(testLine).width;
                if (testLineWidth > maxWidth && currentLine) {
                    currentLine = stripPrefix(currentLine);
                    text.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            });
            if (currentLine) {
                currentLine = stripPrefix(currentLine);
                text.push(currentLine);
                const currentLineWidth = ctx.measureText(currentLine).width;
                if (currentLineWidth > maxLineWidth) {
                    maxLineWidth = currentLineWidth;
                }
            }
        } else {
            section = stripPrefix(section);
            text.push(section);
            if (testLineWidth > maxLineWidth) {
                maxLineWidth = testLineWidth;
            }
        }
    });
    return maxLineWidth;
}

function stripPrefix(line) {
    // Utilise une regex pour supprimer tout avant et y compris le premier ":"
    return line.replace(/^[^:]*:\s*/, '');
}


module.exports = {
    init(texture, textToWrite, paintingWidth=maxWidth) {
        var text = [];
        createMultilineText(ctx, textToWrite, Math.min(paintingWidth*maxWidth, maxWidth), text);

        ctx.clearRect(0, 0, textCanvas.width, textCanvas.height);
        for (var i = 0; i < text.length; i++) {
            ctx.fillText(text[i], 0, textCanvas.height - (Math.max(text.length, 3) - i) * textHeight);
        }

        return texture({
            data: textCanvas,
            min: 'mipmap',
            mipmap: 'nice',
            flipY: true
        });
    },
    draw(regl) {
        return regl({
            frag: `
            precision mediump float;
            uniform sampler2D tex;
            varying vec2 uv;
        
            void main () {
                float c = texture2D(tex, uv).r;
                gl_FragColor = vec4(0,0,0, c);
            }`,
            vert: `
            precision highp float;
            uniform mat4 proj, view, model;
            uniform float yScale;
            attribute vec2 pos;
            varying vec2 uv;
            void main () {
                uv = pos;
                vec4 mpos = model * vec4(pos, 0.001, 1);
                mpos.y *= yScale;
                gl_Position = proj * view * mpos;
            }`,
            attributes: {
                pos: [0, 0, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0]
            },
            uniforms: {
                model: regl.prop('textmodel'),
                tex: regl.prop('text')
            },
            count: 6,

            blend: {
                enable: true,
                func: {
                    srcRGB: 'src alpha',
                    srcAlpha: 'one minus src alpha',
                    dstRGB: 'one minus src alpha',
                    dstAlpha: 1
                },
                color: [0, 0, 0, 0]
            }
        });
    }
};