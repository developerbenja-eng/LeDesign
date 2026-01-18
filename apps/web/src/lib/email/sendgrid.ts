import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const FROM_EMAIL = 'noreply@ledesign.cl';
const FROM_NAME = 'LeDesign';

// Get app URL
const getAppUrl = () => {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000';
};

/**
 * Generate HTML email template for verification
 * Uses LeDesign's glassmorphism design with blue/cyan gradient
 */
function generateVerificationEmailHtml(name: string, verificationUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifica tu Email - LeDesign</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0c4a6e 100%); min-height: 100vh;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0c4a6e 100%);">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 520px; margin: 0 auto; background: rgba(30, 41, 59, 0.95); border-radius: 24px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); border: 1px solid rgba(148, 163, 184, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <div style="width: 64px; height: 64px; margin: 0 auto 16px; background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%); border-radius: 16px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 32px; color: white; font-weight: bold;">L</span>
              </div>
              <h1 style="margin: 0; color: #f1f5f9; font-size: 28px; font-weight: 700;">
                Bienvenido a LeDesign
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <p style="margin: 0 0 20px; color: #e2e8f0; font-size: 16px; line-height: 1.6;">
                Hola <strong style="color: #38bdf8;">${name || 'Ingeniero'}</strong>,
              </p>
              <p style="margin: 0 0 30px; color: #94a3b8; font-size: 16px; line-height: 1.6;">
                Gracias por registrarte en LeDesign. Por favor verifica tu correo electr&oacute;nico para comenzar a dise&ntilde;ar proyectos de ingenier&iacute;a con nuestra plataforma integral.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center; padding: 10px 0 30px;">
                    <a href="${verificationUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%); color: #fff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 12px; box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);">
                      Verificar mi Email
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 10px; color: #64748b; font-size: 14px; line-height: 1.5;">
                O copia y pega este enlace en tu navegador:
              </p>
              <p style="margin: 0 0 30px; padding: 12px; background: rgba(15, 23, 42, 0.6); border-radius: 8px; word-break: break-all; border: 1px solid rgba(148, 163, 184, 0.1);">
                <a href="${verificationUrl}" style="color: #38bdf8; text-decoration: none; font-size: 13px;">${verificationUrl}</a>
              </p>

              <p style="margin: 0; color: #64748b; font-size: 14px;">
                Este enlace expira en 24 horas. Si no creaste una cuenta, puedes ignorar este correo.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid rgba(148, 163, 184, 0.1);">
              <p style="margin: 0; color: #64748b; font-size: 13px; text-align: center;">
                LeDesign - Plataforma Integral de Ingenier&iacute;a<br>
                Dise&ntilde;a M&aacute;s R&aacute;pido. Cumple la Normativa.
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
 * Generate HTML email template for password reset
 */
function generatePasswordResetEmailHtml(name: string, resetUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablecer Contrase&ntilde;a - LeDesign</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0c4a6e 100%); min-height: 100vh;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0c4a6e 100%);">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 520px; margin: 0 auto; background: rgba(30, 41, 59, 0.95); border-radius: 24px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); border: 1px solid rgba(148, 163, 184, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <div style="width: 64px; height: 64px; margin: 0 auto 16px; background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); border-radius: 16px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 32px;">&#128274;</span>
              </div>
              <h1 style="margin: 0; color: #f1f5f9; font-size: 28px; font-weight: 700;">
                Restablecer Contrase&ntilde;a
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <p style="margin: 0 0 20px; color: #e2e8f0; font-size: 16px; line-height: 1.6;">
                Hola <strong style="color: #38bdf8;">${name || 'Ingeniero'}</strong>,
              </p>
              <p style="margin: 0 0 30px; color: #94a3b8; font-size: 16px; line-height: 1.6;">
                Recibimos una solicitud para restablecer tu contrase&ntilde;a. Haz clic en el bot&oacute;n para crear una nueva contrase&ntilde;a.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center; padding: 10px 0 30px;">
                    <a href="${resetUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); color: #fff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 12px; box-shadow: 0 4px 20px rgba(245, 158, 11, 0.4);">
                      Restablecer Contrase&ntilde;a
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 10px; color: #64748b; font-size: 14px; line-height: 1.5;">
                O copia y pega este enlace en tu navegador:
              </p>
              <p style="margin: 0 0 30px; padding: 12px; background: rgba(15, 23, 42, 0.6); border-radius: 8px; word-break: break-all; border: 1px solid rgba(148, 163, 184, 0.1);">
                <a href="${resetUrl}" style="color: #fbbf24; text-decoration: none; font-size: 13px;">${resetUrl}</a>
              </p>

              <p style="margin: 0; color: #64748b; font-size: 14px;">
                Este enlace expira en 1 hora. Si no solicitaste restablecer tu contrase&ntilde;a, puedes ignorar este correo.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid rgba(148, 163, 184, 0.1);">
              <p style="margin: 0; color: #64748b; font-size: 13px; text-align: center;">
                LeDesign - Plataforma Integral de Ingenier&iacute;a<br>
                Dise&ntilde;a M&aacute;s R&aacute;pido. Cumple la Normativa.
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
 * Generate HTML email template for welcome email
 */
function generateWelcomeEmailHtml(name: string): string {
  const appUrl = getAppUrl();
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a LeDesign</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0c4a6e 100%); min-height: 100vh;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0c4a6e 100%);">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 520px; margin: 0 auto; background: rgba(30, 41, 59, 0.95); border-radius: 24px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); border: 1px solid rgba(148, 163, 184, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <div style="width: 64px; height: 64px; margin: 0 auto 16px; background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%); border-radius: 16px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 32px; color: white; font-weight: bold;">L</span>
              </div>
              <h1 style="margin: 0; color: #f1f5f9; font-size: 28px; font-weight: 700;">
                &#127881; Bienvenido a LeDesign
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <p style="margin: 0 0 20px; color: #e2e8f0; font-size: 16px; line-height: 1.6;">
                Hola <strong style="color: #38bdf8;">${name || 'Ingeniero'}</strong>,
              </p>
              <p style="margin: 0 0 20px; color: #94a3b8; font-size: 16px; line-height: 1.6;">
                Tu cuenta ha sido verificada exitosamente. Ahora tienes acceso completo a la plataforma integral de ingenier&iacute;a m&aacute;s avanzada de Chile.
              </p>

              <!-- Features -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
                <tr>
                  <td style="padding: 12px; background: rgba(59, 130, 246, 0.1); border-radius: 8px; margin-bottom: 8px;">
                    <p style="margin: 0; color: #60a5fa; font-size: 14px; font-weight: 600;">&#128736; Estructural</p>
                    <p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">An&aacute;lisis FEA, s&iacute;smico NCh433, dise&ntilde;o acero/hormig&oacute;n</p>
                  </td>
                </tr>
                <tr><td style="height: 8px;"></td></tr>
                <tr>
                  <td style="padding: 12px; background: rgba(6, 182, 212, 0.1); border-radius: 8px;">
                    <p style="margin: 0; color: #22d3ee; font-size: 14px; font-weight: 600;">&#128167; Hidr&aacute;ulica</p>
                    <p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">Redes de agua, alcantarillado, aguas lluvias</p>
                  </td>
                </tr>
                <tr><td style="height: 8px;"></td></tr>
                <tr>
                  <td style="padding: 12px; background: rgba(139, 92, 246, 0.1); border-radius: 8px;">
                    <p style="margin: 0; color: #a78bfa; font-size: 14px; font-weight: 600;">&#128739; Pavimentos</p>
                    <p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">Dise&ntilde;o AASHTO, an&aacute;lisis CBR</p>
                  </td>
                </tr>
                <tr><td style="height: 8px;"></td></tr>
                <tr>
                  <td style="padding: 12px; background: rgba(34, 197, 94, 0.1); border-radius: 8px;">
                    <p style="margin: 0; color: #4ade80; font-size: 14px; font-weight: 600;">&#128663; Vialidad</p>
                    <p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">Trazados, peraltes, distancia de visibilidad</p>
                  </td>
                </tr>
                <tr><td style="height: 8px;"></td></tr>
                <tr>
                  <td style="padding: 12px; background: rgba(251, 191, 36, 0.1); border-radius: 8px;">
                    <p style="margin: 0; color: #fbbf24; font-size: 14px; font-weight: 600;">&#127760; Terreno</p>
                    <p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">Procesamiento DEM, detecci&oacute;n IA con sat&eacute;lite</p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center; padding: 20px 0;">
                    <a href="${appUrl}/dashboard" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%); color: #fff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 12px; box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);">
                      Ir al Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid rgba(148, 163, 184, 0.1);">
              <p style="margin: 0; color: #64748b; font-size: 13px; text-align: center;">
                LeDesign - Plataforma Integral de Ingenier&iacute;a<br>
                Dise&ntilde;a M&aacute;s R&aacute;pido. Cumple la Normativa.
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
 * Send verification email
 */
export async function sendVerificationEmail(
  email: string,
  name: string | null,
  verificationToken: string
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured, skipping email send');
    return { success: false, error: 'Servicio de email no configurado' };
  }

  const appUrl = getAppUrl();
  const verificationUrl = `${appUrl}/api/auth/verify-email?token=${verificationToken}`;

  const msg = {
    to: email,
    from: {
      email: FROM_EMAIL,
      name: FROM_NAME,
    },
    subject: 'Verifica tu cuenta de LeDesign',
    text: `
Bienvenido a LeDesign

Hola ${name || 'Ingeniero'},

Gracias por registrarte. Por favor verifica tu correo electrónico haciendo clic en el siguiente enlace:

${verificationUrl}

Este enlace expira en 24 horas. Si no creaste una cuenta, puedes ignorar este correo.

---
LeDesign - Plataforma Integral de Ingeniería
Diseña Más Rápido. Cumple la Normativa.
    `.trim(),
    html: generateVerificationEmailHtml(name || 'Ingeniero', verificationUrl),
  };

  try {
    await sgMail.send(msg);
    console.log(`Verification email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('SendGrid error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al enviar email',
    };
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  name: string | null,
  resetToken: string
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured, skipping email send');
    return { success: false, error: 'Servicio de email no configurado' };
  }

  const appUrl = getAppUrl();
  const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

  const msg = {
    to: email,
    from: {
      email: FROM_EMAIL,
      name: FROM_NAME,
    },
    subject: 'Restablecer contraseña de LeDesign',
    text: `
Restablecer Contraseña

Hola ${name || 'Ingeniero'},

Recibimos una solicitud para restablecer tu contraseña. Haz clic en el siguiente enlace para crear una nueva contraseña:

${resetUrl}

Este enlace expira en 1 hora. Si no solicitaste restablecer tu contraseña, puedes ignorar este correo.

---
LeDesign - Plataforma Integral de Ingeniería
Diseña Más Rápido. Cumple la Normativa.
    `.trim(),
    html: generatePasswordResetEmailHtml(name || 'Ingeniero', resetUrl),
  };

  try {
    await sgMail.send(msg);
    console.log(`Password reset email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('SendGrid error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al enviar email',
    };
  }
}

/**
 * Send welcome email after verification
 */
export async function sendWelcomeEmail(
  email: string,
  name: string | null
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured, skipping email send');
    return { success: false, error: 'Servicio de email no configurado' };
  }

  const msg = {
    to: email,
    from: {
      email: FROM_EMAIL,
      name: FROM_NAME,
    },
    subject: 'Bienvenido a LeDesign - Tu cuenta está lista',
    text: `
Bienvenido a LeDesign

Hola ${name || 'Ingeniero'},

Tu cuenta ha sido verificada exitosamente. Ahora tienes acceso completo a la plataforma integral de ingeniería más avanzada de Chile.

Módulos disponibles:
- Estructural: Análisis FEA, sísmico NCh433, diseño acero/hormigón
- Hidráulica: Redes de agua, alcantarillado, aguas lluvias
- Pavimentos: Diseño AASHTO, análisis CBR
- Vialidad: Trazados, peraltes, distancia de visibilidad
- Terreno: Procesamiento DEM, detección IA con satélite

Visita tu dashboard para comenzar: ${getAppUrl()}/dashboard

---
LeDesign - Plataforma Integral de Ingeniería
Diseña Más Rápido. Cumple la Normativa.
    `.trim(),
    html: generateWelcomeEmailHtml(name || 'Ingeniero'),
  };

  try {
    await sgMail.send(msg);
    console.log(`Welcome email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('SendGrid error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al enviar email',
    };
  }
}

/**
 * Send generic notification email
 */
export async function sendNotificationEmail(
  email: string,
  subject: string,
  message: string,
  ctaText?: string,
  ctaUrl?: string
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured, skipping email send');
    return { success: false, error: 'Servicio de email no configurado' };
  }

  const ctaHtml = ctaText && ctaUrl ? `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td style="text-align: center; padding: 20px 0;">
          <a href="${ctaUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%); color: #fff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 12px; box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);">
            ${ctaText}
          </a>
        </td>
      </tr>
    </table>
  ` : '';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0c4a6e 100%); min-height: 100vh;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0c4a6e 100%);">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 520px; margin: 0 auto; background: rgba(30, 41, 59, 0.95); border-radius: 24px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); border: 1px solid rgba(148, 163, 184, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <div style="width: 64px; height: 64px; margin: 0 auto 16px; background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%); border-radius: 16px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 32px; color: white; font-weight: bold;">L</span>
              </div>
              <h1 style="margin: 0; color: #f1f5f9; font-size: 24px; font-weight: 700;">
                ${subject}
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <p style="margin: 0 0 20px; color: #94a3b8; font-size: 16px; line-height: 1.6;">
                ${message.replace(/\n/g, '<br>')}
              </p>
              ${ctaHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid rgba(148, 163, 184, 0.1);">
              <p style="margin: 0; color: #64748b; font-size: 13px; text-align: center;">
                LeDesign - Plataforma Integral de Ingenier&iacute;a<br>
                Dise&ntilde;a M&aacute;s R&aacute;pido. Cumple la Normativa.
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

  const msg = {
    to: email,
    from: {
      email: FROM_EMAIL,
      name: FROM_NAME,
    },
    subject,
    text: `${subject}\n\n${message}${ctaUrl ? `\n\n${ctaText}: ${ctaUrl}` : ''}\n\n---\nLeDesign - Plataforma Integral de Ingeniería`,
    html,
  };

  try {
    await sgMail.send(msg);
    console.log(`Notification email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('SendGrid error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al enviar email',
    };
  }
}
