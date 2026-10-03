// scripts/monitor.js
const axios = require('axios');
const logger = require('../utils/logger');

const MONITOR_URL = process.env.BACKEND_URL || 'https://api.torrenttwist.com';

async function monitorPayments() {
  try {
    // Vérifier les paiements en attente depuis plus de 30 minutes
    const response = await axios.get(`${MONITOR_URL}/api/admin/payments/stuck`);
    
    if (response.data.length > 0) {
      logger.warn(`⚠️ ${response.data.length} paiements bloqués détectés`);
      // Envoyer une notification
    }
    
  } catch (error) {
    logger.error('❌ Erreur monitoring:', error);
  }
}

// Exécuter toutes les 5 minutes
setInterval(monitorPayments, 5 * 60 * 1000);