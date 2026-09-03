import nodemailer from 'nodemailer';

export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
  const host = process.env.SMTP_HOST ?? 'localhost';
  const port = Number(process.env.SMTP_PORT ?? 1025);
  const from = process.env.MAIL_FROM ?? 'no-reply@fixmyquery.dev';
  const transporter = nodemailer.createTransport({ host, port, secure: false });

  await transporter.sendMail({
    from,
    to,
    subject: 'Verify your FixMyQuery account',
    text: `Welcome to FixMyQuery!\n\nVerify your email to keep your analysis history:\n${verifyUrl}\n\nThis link expires in 24 hours.`,
    html: `
      <h2>Welcome to FixMyQuery</h2>
      <p>Verify your email to keep your analysis history:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p style="color:#888">This link expires in 24 hours.</p>`,
  });
}
