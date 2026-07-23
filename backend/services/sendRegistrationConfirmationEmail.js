import { render } from '@react-email/render';
import { Resend } from 'resend';
import { RegistrationConfirmationEmail } from '../emails/registrationConfirmationEmail.js';

const FROM_ADDRESS = 'WanderNotes <onboarding@resend.dev>';

function getFrontendUrl() {
  return (process.env.FRONTEND_URL || 'http://localhost:3001').trim().replace(/\/+$/, '');
}

function buildLoginUrl() {
  return new URL('/login', `${getFrontendUrl()}/`).toString();
}

export async function sendRegistrationConfirmationEmail({ to }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn('Skipping registration confirmation email because RESEND_API_KEY is missing.');
    return { skipped: true };
  }

  const resend = new Resend(apiKey);
  const loginUrl = buildLoginUrl();
  const html = await render(RegistrationConfirmationEmail({ loginUrl }));

  const response = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: 'Welcome to WanderNotes! - Registration successful',
    html,
  });

  if (response?.error) {
    console.error('Resend returned an error while sending the registration confirmation email:', response.error);
    throw new Error('Resend returned an error while sending the registration confirmation email.');
  }

  return response;
}

export default sendRegistrationConfirmationEmail;