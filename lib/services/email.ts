// lib/services/email.ts
import nodemailer from 'nodemailer';

export async function sendInvoiceEmail(
  to: string,
  data: {
    orderNumber: string;
    totalAmount: number;
    invoiceUrl?: string;
    productTitle: string;
    downloadUrl?: string;
  }
) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmation de commande</title>
        <style>
          body { font-family: Arial, sans-serif; background: #f8fafc; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
          .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
          .header h1 { color: #1a56db; font-size: 28px; margin: 0; }
          .header p { color: #64748b; margin: 5px 0 0; }
          .content { padding: 30px 0; }
          .success-icon { text-align: center; font-size: 48px; margin-bottom: 20px; }
          .order-details { background: #f1f5f9; padding: 20px; border-radius: 12px; margin: 20px 0; }
          .order-details p { margin: 8px 0; color: #1e293b; }
          .order-details strong { color: #0f172a; }
          .total { font-size: 24px; color: #1a56db; font-weight: bold; text-align: center; padding: 10px; background: #dbeafe; border-radius: 8px; }
          .button { display: inline-block; padding: 12px 24px; background: #1a56db; color: white; text-decoration: none; border-radius: 8px; margin: 5px; }
          .button-download { background: #059669; }
          .footer { text-align: center; padding-top: 20px; border-top: 2px solid #e2e8f0; color: #94a3b8; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 TorrentTwist</h1>
            <p>Confirmation de commande</p>
          </div>
          <div class="content">
            <div class="success-icon">✅</div>
            <h2 style="text-align: center; color: #0f172a;">Paiement confirmé !</h2>
            <p style="text-align: center; color: #475569;">
              Votre commande <strong>#${data.orderNumber}</strong> a été validée avec succès.
            </p>

            <div class="order-details">
              <p><strong>Commande :</strong> #${data.orderNumber}</p>
              <p><strong>Produit :</strong> ${data.productTitle}</p>
              <p><strong>Date :</strong> ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>

            <div class="total">
              Total : ${data.totalAmount.toLocaleString()} FCFA
            </div>

            <div style="text-align: center; margin: 30px 0;">
              ${data.downloadUrl ? `<a href="${data.downloadUrl}" class="button button-download">📥 Télécharger le produit</a>` : ''}
              ${data.invoiceUrl ? `<a href="${data.invoiceUrl}" class="button">📄 Voir la facture</a>` : ''}
            </div>
          </div>
          <div class="footer">
            <p>TorrentTwist - Tous droits réservés</p>
            <p>Cet email a été généré automatiquement, merci de ne pas y répondre.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@torrenttwist.com',
      to: to,
      subject: `Confirmation de commande #${data.orderNumber} - TorrentTwist`,
      html: html
    });

    console.log(`✅ Email de confirmation envoyé à ${to}`);

  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
    // Ne pas bloquer le processus
  }
}