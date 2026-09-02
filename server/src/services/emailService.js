const nodemailer = require('nodemailer');

let transporter = null;
let providerType = 'none';

function getTransporter() {
  if (transporter) return transporter;

  // 1. Check Gmail App Password
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (gmailUser && gmailPass) {
    try {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass
        }
      });
      providerType = 'gmail';
      console.log(`📧 [EMAIL SERVICE] Initialized with Gmail SMTP (${gmailUser})`);
      return transporter;
    } catch (err) {
      console.error('❌ [EMAIL SERVICE] Failed to initialize Gmail transport:', err.message);
    }
  }

  // 2. Check Custom SMTP (Brevo, Resend, SendGrid, Amazon SES, etc.)
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });
      providerType = 'smtp';
      console.log(`📧 [EMAIL SERVICE] Initialized with SMTP (${smtpHost}:${smtpPort})`);
      return transporter;
    } catch (err) {
      console.error('❌ [EMAIL SERVICE] Failed to initialize custom SMTP transport:', err.message);
    }
  }

  providerType = 'local';
  return null;
}

/**
 * Base email dispatch function
 */
async function sendEmail({ to, subject, html, text }) {
  if (!to || !to.includes('@')) {
    return { success: false, error: 'Invalid recipient email address' };
  }

  const transport = getTransporter();
  const fromAddress = process.env.SMTP_FROM || process.env.GMAIL_USER || 'LocalForVocal <noreply@localforvocal.com>';

  if (transport) {
    try {
      console.log(`📧 [EMAIL GATEWAY: ${providerType}] Dispatching email to <${to}>: "${subject}"`);
      const info = await transport.sendMail({
        from: fromAddress,
        to,
        subject,
        text: text || subject,
        html
      });
      console.log(`✅ [EMAIL GATEWAY: ${providerType}] Sent message ID: ${info.messageId}`);
      return { success: true, provider: providerType, messageId: info.messageId };
    } catch (err) {
      console.error(`❌ [EMAIL GATEWAY: ${providerType}] Send failure:`, err.message);
      // Fallback to local log preview so developer can continue testing
    }
  }

  // Local Console Terminal Simulation (Zero setup, works offline)
  console.log(`\n======================================================`);
  console.log(`📧 [LOCAL EMAIL SIMULATOR - SERVER TERMINAL]`);
  console.log(`📬 Recipient : ${to}`);
  console.log(`📝 Subject   : ${subject}`);
  console.log(`📄 Snippet   : ${text ? text.slice(0, 140) : subject}...`);
  console.log(`💡 (Add GMAIL_USER & GMAIL_APP_PASSWORD to .env to deliver real emails)`);
  console.log(`======================================================\n`);

  return { success: true, provider: 'local', simulated: true };
}

/**
 * Base responsive HTML email wrapper
 */
function wrapHtmlTemplate({ title, subtitle, contentHtml, footerNote }) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 16px;">
        <tr>
          <td align="center">
            <table width="100%" style="max-width: 540px; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.3);" cellpadding="0" cellspacing="0">
              <!-- Header -->
              <tr>
                <td style="padding: 28px 32px 20px; background: linear-gradient(135deg, #059669 0%, #047857 100%);">
                  <div style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                    🌿 LocalForVocal
                  </div>
                  <div style="font-size: 13px; color: #d1fae5; margin-top: 4px; font-weight: 500;">
                    Hyperlocal Neighborhood Marketplace
                  </div>
                </td>
              </tr>
              
              <!-- Body -->
              <tr>
                <td style="padding: 32px;">
                  <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 700; color: #ffffff;">${title}</h2>
                  ${subtitle ? `<p style="margin: 0 0 20px; font-size: 14px; color: #94a3b8;">${subtitle}</p>` : ''}
                  
                  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                    ${contentHtml}
                  </div>

                  ${footerNote ? `
                    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #334155; font-size: 12px; color: #64748b;">
                      ${footerNote}
                    </div>
                  ` : ''}
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 20px 32px; background-color: #0f172a; text-align: center; border-top: 1px solid #334155;">
                  <p style="margin: 0; font-size: 12px; color: #64748b;">
                    © ${new Date().getFullYear()} LocalForVocal • Empowering Local Commerce
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * Send OTP Verification Email
 */
async function sendOtpEmail(email, otpCode, purpose = 'login', name = 'Neighbor') {
  const isRegister = purpose === 'register';
  const title = isRegister ? 'Verify your new account' : 'Your Sign-in Code';
  const subtitle = `Hello ${name}, use the verification code below to access LocalForVocal.`;
  
  const contentHtml = `
    <div style="text-align: center; margin: 24px 0;">
      <div style="display: inline-block; padding: 14px 28px; background-color: #0f172a; border: 2px dashed #10b981; border-radius: 12px; font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #34d399;">
        ${otpCode}
      </div>
      <p style="margin: 12px 0 0; font-size: 13px; color: #94a3b8;">
        This code is valid for <strong>5 minutes</strong>.
      </p>
    </div>
    <p style="font-size: 13px; color: #cbd5e1; background-color: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; padding: 10px 14px; border-radius: 4px; margin: 20px 0 0;">
      🔒 <strong>Security Tip:</strong> Never share this OTP with anyone, including staff. LocalForVocal will never ask for your code.
    </p>
  `;

  const text = `Your LocalForVocal verification code is ${otpCode}. Valid for 5 minutes. Do not share this with anyone.`;

  return sendEmail({
    to: email,
    subject: `${otpCode} is your LocalForVocal verification code`,
    html: wrapHtmlTemplate({ title, subtitle, contentHtml }),
    text
  });
}

/**
 * Send Welcome Email on successful registration
 */
async function sendWelcomeEmail(email, name, accountType = 'customer') {
  const isShopOwner = accountType === 'shop_owner';
  const title = `Welcome to LocalForVocal, ${name}! 🎉`;
  const subtitle = isShopOwner 
    ? 'Your merchant account has been registered. Get ready to receive customer leads!' 
    : 'You can now discover nearby shops, post requirements, and get direct quotes from local stores.';

  const contentHtml = `
    <p>We are delighted to welcome you to your local neighborhood commercial community.</p>
    ${isShopOwner ? `
      <div style="background-color: #0f172a; padding: 16px; border-radius: 8px; border: 1px solid #334155; margin: 16px 0;">
        <strong style="color: #34d399;">🏪 Next steps for your store:</strong>
        <ul style="margin: 8px 0 0; padding-left: 20px; color: #cbd5e1;">
          <li>Add products and photos to your store catalog.</li>
          <li>Turn on your shop's "Available Today" status.</li>
          <li>Keep an eye on the <strong>Demand Radar</strong> for nearby customer requests!</li>
        </ul>
      </div>
    ` : `
      <div style="background-color: #0f172a; padding: 16px; border-radius: 8px; border: 1px solid #334155; margin: 16px 0;">
        <strong style="color: #34d399;">🛍️ What you can do:</strong>
        <ul style="margin: 8px 0 0; padding-left: 20px; color: #cbd5e1;">
          <li>Search shops within 5km, 15km, or 30km using GPS.</li>
          <li>Post any urgent product or service demand.</li>
          <li>Chat or call shop owners directly with zero middleman fee.</li>
        </ul>
      </div>
    `}
  `;

  return sendEmail({
    to: email,
    subject: `Welcome to LocalForVocal! 🌿`,
    html: wrapHtmlTemplate({ title, subtitle, contentHtml }),
    text: `Welcome to LocalForVocal, ${name}! Start discovering local businesses or growing your shop.`
  });
}

/**
 * Send Direct Lead Alert to Merchant
 */
async function sendLeadAlertEmail(merchantEmail, shopName, requirement) {
  const title = `New Customer Inquiry for ${shopName}! 🔔`;
  const subtitle = `A customer just submitted a demand matching your shop category.`;

  const contentHtml = `
    <div style="background-color: #0f172a; padding: 18px; border-radius: 12px; border: 1px solid #334155;">
      <div style="font-size: 16px; font-weight: 700; color: #38bdf8; margin-bottom: 6px;">
        📌 "${requirement.title}"
      </div>
      <p style="margin: 0 0 12px; font-size: 13px; color: #94a3b8;">
        ${requirement.description || 'No additional details specified.'}
      </p>
      <table style="font-size: 13px; width: 100%;" cellpadding="4">
        <tr>
          <td style="color: #64748b; width: 100px;">Customer:</td>
          <td style="color: #f1f5f9; font-weight: 600;">${requirement.userName}</td>
        </tr>
        <tr>
          <td style="color: #64748b;">Urgency:</td>
          <td style="color: #f59e0b; font-weight: 600; text-transform: uppercase;">${requirement.urgency}</td>
        </tr>
        ${requirement.budget ? `
          <tr>
            <td style="color: #64748b;">Budget:</td>
            <td style="color: #22c55e; font-weight: 600;">${requirement.budget}</td>
          </tr>
        ` : ''}
        <tr>
          <td style="color: #64748b;">Phone:</td>
          <td style="color: #f1f5f9; font-family: monospace;">+91-${requirement.phone}</td>
        </tr>
      </table>
    </div>
    <p style="margin-top: 16px; font-size: 13px;">
      Log in to your <strong>Shop Dashboard</strong> to send an official quotation or WhatsApp the customer directly!
    </p>
  `;

  return sendEmail({
    to: merchantEmail,
    subject: `🔔 New Lead for ${shopName}: "${requirement.title}"`,
    html: wrapHtmlTemplate({ title, subtitle, contentHtml }),
    text: `New Lead for ${shopName}: "${requirement.title}" from ${requirement.userName}. Contact: +91-${requirement.phone}`
  });
}

/**
 * Send Quotation Response Alert to Customer
 */
async function sendQuoteAlertEmail(customerEmail, customerName, shopName, quotation) {
  const title = `Quotation Received from ${shopName}! 💬`;
  const subtitle = `Hello ${customerName}, a merchant has responded to your requirement.`;

  const contentHtml = `
    <div style="background-color: #0f172a; padding: 18px; border-radius: 12px; border: 1px solid #334155;">
      <div style="font-size: 18px; font-weight: 800; color: #22c55e; margin-bottom: 6px;">
        ₹${quotation.price}
      </div>
      <p style="margin: 0 0 12px; font-size: 13px; color: #cbd5e1;">
        "${quotation.notes || 'The shop has reviewed your demand and provided this quotation.'}"
      </p>
      <div style="font-size: 13px; color: #94a3b8;">
        Store: <strong>${shopName}</strong>
      </div>
    </div>
    <p style="margin-top: 16px; font-size: 13px;">
      View your <strong>User Profile</strong> to accept this quote or message the store directly on WhatsApp.
    </p>
  `;

  return sendEmail({
    to: customerEmail,
    subject: `💬 ${shopName} responded with a quote of ₹${quotation.price}`,
    html: wrapHtmlTemplate({ title, subtitle, contentHtml }),
    text: `${shopName} provided a quotation of ₹${quotation.price} for your requirement.`
  });
}

module.exports = {
  sendEmail,
  sendOtpEmail,
  sendWelcomeEmail,
  sendLeadAlertEmail,
  sendQuoteAlertEmail
};
