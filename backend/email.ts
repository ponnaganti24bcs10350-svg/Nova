
import nodemailer from "nodemailer";

const gmailUser = process.env.GMAIL_USER;
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

const transporter =
  gmailUser && gmailAppPassword
    ? nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: gmailUser,
          pass: gmailAppPassword.replace(/\s/g, ""),
        },
      })
    : null;

export async function sendCaregiverEmail(
  caregiver: "PRIMARY" | "BACKUP",
  subject: string,
  message: string,
  recipientOverride?: string
) {
  const recipient =
    recipientOverride ??
    (caregiver === "PRIMARY"
      ? process.env.PRIMARY_CAREGIVER_EMAIL
      : process.env.BACKUP_CAREGIVER_EMAIL);

  if (!transporter || !recipient) {
    console.error(
      `${caregiver} caregiver email configuration is incomplete.`
    );

    return {
      sent: false,
      reason: "NOT_CONFIGURED",
    };
  }

  try {
    const info = await transporter.sendMail({
      from: `"AEGIS Alerts" <${gmailUser}>`,
      to: recipient,
      subject,
      text: message,
    });

    console.log(`${caregiver} caregiver email sent:`, {
      messageId: info.messageId,
      recipient,
    });

    return {
      sent: true,
      emailId: info.messageId,
    };
  } catch (error) {
    const details =
      error instanceof Error ? error.message : String(error);

    console.error(`${caregiver} caregiver email failed:`, details);

    return {
      sent: false,
      reason: "SEND_FAILED",
      details,
    };
  }
}
