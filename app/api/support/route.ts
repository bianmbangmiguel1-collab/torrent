// app/api/support/route.ts
import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// Types
// ============================================================
interface SupportRequest {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  phone?: string;
}

// ============================================================
// POST : Envoyer un message de support vers WhatsApp
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SupportRequest
    const { name, email, subject, message, phone } = body

    // Validation
    if (!name || !email || !message) {
      return NextResponse.json({ 
        success: false, 
        error: 'Tous les champs sont requis' 
      }, { status: 400 })
    }

    // 🔥 Numéros WhatsApp pour le support
    const whatsappNumbers = [
      '+237675832091',
      '+22960067966'
    ]

    // 🔥 Construire le message WhatsApp
    const whatsappMessage = `🔔 *NOUVEAU MESSAGE DE SUPPORT* 🔔

👤 *Nom:* ${name}
📧 *Email:* ${email}
📱 *Téléphone:* ${phone || 'Non renseigné'}
📝 *Sujet:* ${subject || 'Support général'}

💬 *Message:*
${message}

---
📅 ${new Date().toLocaleString('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}
🌐 *TorrentTwist Support*`

    // 🔥 Encoder le message pour URL
    const encodedMessage = encodeURIComponent(whatsappMessage)

    // 🔥 Créer les liens WhatsApp pour chaque numéro
    const whatsappLinks = whatsappNumbers.map(num => {
      const cleanNumber = num.replace(/[^0-9]/g, '')
      return `https://wa.me/${cleanNumber}?text=${encodedMessage}`
    })

    // 🔥 Simuler l'envoi (les liens seront ouverts dans le navigateur)
    // Dans la vraie vie, on pourrait utiliser un webhook ou une API WhatsApp Business

    return NextResponse.json({
      success: true,
      message: 'Message envoyé avec succès !',
      whatsappLinks,
      whatsappMessage
    })
    
  } catch (error) {
    console.error('❌ Erreur POST /api/support:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Erreur lors de l\'envoi du message' 
    }, { status: 500 })
  }
}