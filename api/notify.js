// Vercel serverless function: POST /api/notify
// Sends an email (via Resend) and/or SMS (via Twilio) when a shipment's
// stage changes. Both are optional and independent — this function sends
// whichever channel has both (a) contact info in the request and (b) its
// API keys configured as Vercel environment variables. Missing config for
// a channel just skips that channel rather than failing the whole request.
//
// Required env vars (set in Vercel: Project Settings -> Environment Variables):
//   RESEND_API_KEY        - from resend.com, for email
//   RESEND_FROM_EMAIL     - optional, defaults to Resend's sandbox sender
//   TWILIO_ACCOUNT_SID    - from twilio.com, for SMS
//   TWILIO_AUTH_TOKEN     - from twilio.com, for SMS
//   TWILIO_FROM_NUMBER    - a Twilio phone number you own, e.g. +15551234567

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { email, phone, trackingId, stageLabel, trackingUrl } = req.body || {};

  if (!trackingId || !stageLabel) {
    res.status(400).json({ error: "trackingId and stageLabel are required" });
    return;
  }

  const results = { email: "skipped", sms: "skipped" };

  if (email && process.env.RESEND_API_KEY) {
    try {
      const from = process.env.RESEND_FROM_EMAIL || "Landmark <onboarding@resend.dev>";
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: email,
          reply_to: from,
          subject: `Shipment ${trackingId} update: ${stageLabel}`,
          text: `Your shipment ${trackingId} has been updated to: ${stageLabel}\n\nTrack your shipment: ${trackingUrl}`,
          html: `
            <div style="font-family:sans-serif;font-size:15px;color:#111;line-height:1.5;">
              <p>Your shipment <strong>${trackingId}</strong> has been updated to:</p>
              <p style="font-size:18px;font-weight:600;margin:12px 0;">${stageLabel}</p>
              <p><a href="${trackingUrl}" style="color:#E11D2E;">Track your shipment</a></p>
              <p style="color:#666;font-size:12px;margin-top:24px;">You're receiving this because a shipment addressed to you was registered with Landmark. If this wasn't expected, you can ignore this email.</p>
            </div>
          `,
        }),
      });
      results.email = resendRes.ok ? "sent" : `failed (${resendRes.status})`;
    } catch (e) {
      results.email = "failed";
    }
  }

  if (
    phone &&
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER
  ) {
    try {
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
      const body = new URLSearchParams({
        To: phone,
        From: process.env.TWILIO_FROM_NUMBER,
        Body: `Landmark: shipment ${trackingId} is now "${stageLabel}". Track: ${trackingUrl}`,
      });
      const twilioRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body,
        }
      );
      results.sms = twilioRes.ok ? "sent" : `failed (${twilioRes.status})`;
    } catch (e) {
      results.sms = "failed";
    }
  }

  res.status(200).json(results);
}
