import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

function getPublicAppUrl() {
    return process.env.PUBLIC_APP_URL || 'http://localhost:3000';
}

export async function sendLicenseEmail(email: string, code: string, plan: string) {
    const subject = `Your TL Meter ${plan.toUpperCase()} License Code`;
    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h1 style="color: #0f172a; font-size: 24px;">Thanks for your purchase!</h1>
            <p style="color: #475569; line-height: 1.6;">
                Here is your license code for <strong>TL Meter ${plan.charAt(0).toUpperCase() + plan.slice(1)}</strong>.
            </p>
            <div style="background: #f8fafc; padding: 16px; border-radius: 6px; text-align: center; margin: 24px 0;">
                <code style="font-size: 20px; font-weight: bold; color: #00d4ff; letter-spacing: 1px;">${code}</code>
            </div>
            <p style="color: #475569; line-height: 1.6;">
                You can activate this code at <a href="http://localhost:3000/activate" style="color: #00d4ff; text-decoration: none;">localhost:3000/activate</a>.
            </p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 12px;">
                If you have any questions, just reply to this email.
            </p>
        </div>
    `;

    if (!resend) {
        console.log('--------------------------------------------------');
        console.log('📧 MOCK EMAIL SENDING (No RESEND_API_KEY found)');
        console.log(`To: ${email}`);
        console.log(`Subject: ${subject}`);
        console.log(`Code: ${code}`);
        console.log('--------------------------------------------------');
        return { success: true, mocked: true };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'TL Meter <onboarding@resend.dev>',
            to: [email],
            subject: subject,
            html: html,
        });

        if (error) {
            console.error('❌ Resend Error:', error);
            return { success: false, error };
        }

        console.log(`✅ Email sent via Resend: ${data?.id}`);
        return { success: true, data };
    } catch (err) {
        console.error('❌ Failed to send email:', err);
        return { success: false, error: err };
    }
}

export async function sendAccessTokenEmail(email: string, token: string, plan: string) {
    const subject = `Your TL Meter ${plan.toUpperCase()} Access Key (30 days)`;
    const activateUrl = `${getPublicAppUrl()}/activate`;
    const html = `
        <div style="font-family: sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h1 style="color: #0f172a; font-size: 24px;">Thanks for your purchase!</h1>
            <p style="color: #475569; line-height: 1.6;">
                Here is your <strong>TL Meter ${plan.charAt(0).toUpperCase() + plan.slice(1)}</strong> access key (valid for 30 days on this device/browser).
            </p>
            <div style="background: #f8fafc; padding: 16px; border-radius: 6px; text-align: center; margin: 24px 0; overflow-wrap: anywhere;">
                <code style="font-size: 14px; font-weight: 700; color: #00d4ff; letter-spacing: 0.2px;">${token}</code>
            </div>
            <p style="color: #475569; line-height: 1.6;">
                Activate it here: <a href="${activateUrl}" style="color: #00d4ff; text-decoration: none;">${activateUrl}</a>
            </p>
            <p style="color: #94a3b8; font-size: 12px; line-height: 1.5;">
                Tip: if you change browser / use incognito / clear site data, you may need to re-issue a key for that device.
            </p>
        </div>
    `;

    if (!resend) {
        console.log('--------------------------------------------------');
        console.log('📧 MOCK EMAIL SENDING (No RESEND_API_KEY found)');
        console.log(`To: ${email}`);
        console.log(`Subject: ${subject}`);
        console.log(`Token: ${token}`);
        console.log(`Activate: ${activateUrl}`);
        console.log('--------------------------------------------------');
        return { success: true, mocked: true };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'TL Meter <onboarding@resend.dev>',
            to: [email],
            subject: subject,
            html: html,
        });

        if (error) {
            console.error('❌ Resend Error:', error);
            return { success: false, error };
        }

        console.log(`✅ Email sent via Resend: ${data?.id}`);
        return { success: true, data };
    } catch (err) {
        console.error('❌ Failed to send email:', err);
        return { success: false, error: err };
    }
}
