import sgMail from "@sendgrid/mail"

// Set the API key from environment variables
sgMail.setApiKey(process.env.SENDGRID_API_KEY || "")

export async function sendEmail(
    to: string,
    subject: string,
    text: string,
    html: string
) {
    try {
        const msg = {
            to,
            from: process.env.EMAIL_FROM || "", // Your verified sender email in SendGrid
            subject,
            text,
            html,
        }

        await sgMail.send(msg)
        return {success: true}
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return {
            success: false,
            message: errorMessage
        };
    }
}
