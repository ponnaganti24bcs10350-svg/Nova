
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const from = process.env.TWILIO_WHATSAPP_FROM;

export async function sendWhatsApp(
  to: string | undefined,
  message: string
) {
  if (!accountSid || !authToken || !from || !to) {
    console.error("WhatsApp configuration is incomplete.");

    return {
      sent: false,
      reason: "NOT_CONFIGURED"
    };
  }

  try {
    const form = new URLSearchParams();
    form.set("From", from);
    form.set("To", to);
    form.set("Body", message);

    const credentials = Buffer.from(
      `${accountSid}:${authToken}`
    ).toString("base64");
        console.log("Outgoing Twilio fields:", [...form.keys()]);

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: form.toString()
      }
    );

    const data = await response.json() as {
      sid?: string;
      status?: string;
      message?: string;
      code?: number;
      more_info?: string;
    };

    if (!response.ok) {
      console.error("Twilio REST API rejected WhatsApp message:", {
        httpStatus: response.status,
        code: data.code,
        message: data.message,
        moreInfo: data.more_info
      });

      return {
        sent: false,
        reason: `TWILIO_${data.code ?? response.status}`,
        details: data.message
      };
    }

    console.log("Twilio accepted WhatsApp message:", {
      sid: data.sid,
      status: data.status
    });

    return {
      sent: true,
      messageSid: data.sid,
      status: data.status
    };
  } catch (error) {
    const details =
      error instanceof Error ? error.message : String(error);

    console.error("WhatsApp request failed:", details);

    return {
      sent: false,
      reason: "REQUEST_FAILED",
      details
    };
  }
}
