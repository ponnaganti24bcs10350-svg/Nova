
const RESEND_API_URL = "https://api.resend.com/emails";

export async function sendCaregiverEmail(
  caregiver: "PRIMARY" | "BACKUP",
  subject: string,
  message: string,
  recipientOverride?: string
) {
  const apiKey = process.env.RESEND_API_KEY;

  const recipient =
    recipientOverride ??
    (caregiver === "PRIMARY"
      ? process.env.PRIMARY_CAREGIVER_EMAIL
      : process.env.BACKUP_CAREGIVER_EMAIL);

  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !recipient || !fromEmail) {
    console.error(`${caregiver} email configuration is incomplete.`, {
      hasApiKey: Boolean(apiKey),
      hasRecipient: Boolean(recipient),
      hasFromEmail: Boolean(fromEmail),
    });

    return { sent: false, reason: "NOT_CONFIGURED" };
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipient],
        subject,
        text: message,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`${caregiver} email failed:`, response.status, result);
      return { sent: false, reason: "SEND_FAILED" };
    }

    console.log(`${caregiver} caregiver email accepted by Resend:`, {
      id: result.id,
      recipient,
    });

    return { sent: true, emailId: result.id };
  } catch (error) {
    console.error(
      `${caregiver} email connection error:`,
      error instanceof Error ? error.message : String(error)
    );

    return { sent: false, reason: "SEND_FAILED" };
  }
}
