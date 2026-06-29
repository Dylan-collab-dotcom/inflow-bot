require('dotenv').config();
const axios = require('axios');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Service de tracking actif 🚀');
});

// === Fonction de dispatch des alertes PPV ===
async function envoyerAlertePpv(nomModele, nomSub, montant, nomMedia, achete, nomChatter, estUneConversion = false) {
    const webhookUrl = achete 
        ? process.env.DISCORD_WEBHOOK_ACHETE 
        : process.env.DISCORD_WEBHOOK_EXPIRE;

    if (!webhookUrl) {
        console.error(`Erreur : L'URL du webhook pour (Acheté: ${achete}) est introuvable dans le fichier .env`);
        return;
    }

    let emoji = achete ? '💰' : '⏳';
    let statutTitre = achete ? 'PPV ACHETÉ' : 'PPV NON ACHETÉ (Expiré/Ignoré)';
    let embedColor = achete ? 0x00FF00 : 0xFF3300;

    // Si c'est une conversion (un ancien PPV non acheté qui vient d'être payé)
    if (estUneConversion) {
        emoji = '🔥';
        statutTitre = 'CONVERSION RÉUSSIE (Vente tardive)';
        embedColor = 0x0088FF; // En bleu pour bien le remarquer
    }

    const embedFields = [
        { name: '👤 Créateur / Modèle', value: nomModele, inline: true },
        { name: '🎬 Média / PPV', value: nomMedia, inline: true },
        { name: '💵 Prix', value: `$${montant}`, inline: true },
        { name: '💬 Chatter en poste', value: nomChatter, inline: true }
    ];

    if (achete || estUneConversion) {
        embedFields.unshift({ name: '👤 Abonné (Sub)', value: nomSub, inline: true });
    }

    const messagePayload = {
        content: `${emoji} **Mouvement sur un média PPV**`,
        embeds: [
            {
                title: `${emoji} ${statutTitre}`,
                color: embedColor,
                fields: embedFields,
                timestamp: new Date().toISOString()
            }
        ]
    };

    try {
        await axios.post(webhookUrl, messagePayload);
        console.log(`Alerte PPV envoyée avec succès pour ${nomModele} (Acheté: ${achete}, Conversion: ${estUneConversion}) !`);
    } catch (error) {
        console.error('Erreur lors de l\'envoi du webhook Discord :', error.message);
    }
}

app.post('/webhook-ppv', async (req, res) => {
    const { modele, sub, montant, media, estAchete, chatter, conversion } = req.body;
    await envoyerAlertePpv(modele, sub, montant, media, estAchete, chatter, conversion);
    res.status(200).send('Webhook bien reçu et traité.');
});

app.listen(port, () => {
    console.log(`Serveur en écoute sur le port ${port}`);
});

// === SIMULATION DE SCÉNARIO ===
setTimeout(() => {
    // 1. Le chatter "Thomas" propose un média à 20$ sur le compte de "Chloe" (le sub ne l'achète pas immédiatement)
    envoyerAlertePpv('Chloe', 'JohnDoe99', 20, 'Video_exclu.mp4', false, 'Thomas');

    setTimeout(() => {
        // 2. 3 heures plus tard... Le sub craque et achète le PPV ! 
        // On envoie l'alerte dans le salon "Acheté" en précisant que c'est une "conversion" (true)
        envoyerAlertePpv('Chloe', 'JohnDoe99', 20, 'Video_exclu.mp4', true, 'Thomas', true);
    }, 4000);

}, 2000);