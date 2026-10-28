import { Resend } from "resend";

export interface EmailDeliveryResult {
  delivered: boolean;
  provider: "resend" | "simulated-dev";
  messageId?: string;
  error?: string;
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function sendEmailRaw(params: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<EmailDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.EMAIL_FROM?.trim() || "Barking Otter <reports@barkingotter.com>";

  if (!apiKey) {
    // In local dev or preview without RESEND_API_KEY, succeed cleanly with simulated provider metadata
    return {
      delivered: true,
      provider: "simulated-dev",
      messageId: `sim_${Date.now()}`,
    };
  }

  try {
    const resend = new Resend(apiKey);
    const response = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    if (response.error) {
      return {
        delivered: false,
        provider: "resend",
        error: response.error.message || "Resend API rejected email delivery.",
      };
    }

    return {
      delivered: true,
      provider: "resend",
      messageId: response.data?.id,
    };
  } catch (err) {
    return {
      delivered: false,
      provider: "resend",
      error: (err as Error)?.message || "Failed to send email via Resend.",
    };
  }
}

export async function sendLeadConfirmationAndInternalAlert(params: {
  leadId: string;
  name: string;
  email: string;
  company?: string | null;
  websiteUrl: string;
  goalOrConcern?: string | null;
  message?: string | null;
  auditId?: string | null;
  source: string;
  notificationRecipients: string;
}): Promise<{
  prospectEmail: EmailDeliveryResult;
  internalAlert: EmailDeliveryResult;
}> {
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "https://barkingotter.com"
  ).replace(/\/$/, "");
  const reportLink = params.auditId
    ? `${appUrl}/audit/${encodeURIComponent(params.auditId)}`
    : `${appUrl}/speed-test`;

  const safeName = escapeHtml(params.name);
  const safeWebsite = escapeHtml(params.websiteUrl);
  const safeCompany = escapeHtml(params.company || "Not provided");
  const safeGoal = escapeHtml(params.goalOrConcern || "General performance optimization");
  const safeNotes = escapeHtml(params.message || "None provided");

  const prospectHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; color: #0f172a; line-height: 1.6;">
      <h2 style="color: #0f172a; margin-bottom: 8px;">Your Request Is In.</h2>
      <p>Hi ${safeName},</p>
      <p>We've received your website assessment and request for <strong>${safeWebsite}</strong>. Our performance engineering team will review the findings and follow up with practical recommendations.</p>
      <p style="margin: 24px 0;">
        <a href="${reportLink}" style="background-color: #0f172a; color: #ffffff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">View Your Performance Report</a>
      </p>
      <p style="font-size: 13px; color: #475569;">Summary of your request:<br/>
      Website: ${safeWebsite}<br/>
      Main Focus: ${safeGoal}</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #64748b;">Barking Otter — Done-For-You Website Speed &amp; Performance Optimization.<br/>You are receiving this one-time transactional confirmation because you submitted a request on barkingotter.com.</p>
    </div>
  `;

  const internalHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; color: #0f172a; line-height: 1.5;">
      <h2 style="color: #0f172a;">New Barking Otter Optimization Lead</h2>
      <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
        <tr><td style="padding: 6px 0; font-weight: 600;">Name:</td><td>${safeName}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 600;">Email:</td><td>${escapeHtml(params.email)}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 600;">Company:</td><td>${safeCompany}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 600;">Website:</td><td>${safeWebsite}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 600;">Source CTA:</td><td>${escapeHtml(params.source)}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 600;">Primary Goal:</td><td>${safeGoal}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 600;">Notes:</td><td>${safeNotes}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 600;">Audit Report:</td><td><a href="${reportLink}">${reportLink}</a></td></tr>
      </table>
    </div>
  `;

  const recipients = params.notificationRecipients
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);

  const [prospectEmail, internalAlert] = await Promise.all([
    sendEmailRaw({
      to: params.email,
      subject: `We received your Barking Otter optimization request for ${params.websiteUrl}`,
      html: prospectHtml,
    }),
    sendEmailRaw({
      to: recipients.length > 0 ? recipients : ["team@barkingotter.com"],
      subject: `[New Lead] ${params.name} — ${params.websiteUrl}`,
      html: internalHtml,
    }),
  ]);

  return { prospectEmail, internalAlert };
}

export async function sendReportLinkEmail(params: {
  recipientEmail: string;
  auditId: string;
  normalizedUrl: string;
  mobileScore: number | null;
  desktopScore: number | null;
}): Promise<EmailDeliveryResult> {
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "https://barkingotter.com"
  ).replace(/\/$/, "");
  const reportLink = `${appUrl}/audit/${encodeURIComponent(params.auditId)}`;
  const safeUrl = escapeHtml(params.normalizedUrl);

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; color: #0f172a; line-height: 1.6;">
      <h2 style="color: #0f172a;">Your Website Performance Report</h2>
      <p>Here is the link to the Barking Otter performance assessment for <strong>${safeUrl}</strong>:</p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 6px 0;"><strong>Mobile Score:</strong> ${
          params.mobileScore !== null ? `${params.mobileScore} / 100` : "Unavailable"
        }</p>
        <p style="margin: 0;"><strong>Desktop Score:</strong> ${
          params.desktopScore !== null ? `${params.desktopScore} / 100` : "Unavailable"
        }</p>
      </div>
      <p style="margin: 24px 0;">
        <a href="${reportLink}" style="background-color: #0f172a; color: #ffffff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Open Interactive Report</a>
      </p>
      <p style="font-size: 12px; color: #64748b;">This is a one-time report delivery requested on barkingotter.com. Your email address has not been subscribed to any marketing list.</p>
    </div>
  `;

  return sendEmailRaw({
    to: params.recipientEmail,
    subject: `Performance Report for ${params.normalizedUrl} — Barking Otter`,
    html,
  });
}
