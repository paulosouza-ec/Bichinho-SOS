// emailService.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendResetCodeEmail = async (to, code) => {
  const mailOptions = {
    from: `"Bichinho SOS" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: 'Seu Código de Redefinição de Senha',
    html: `
      <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
        <h2>Redefinição de Senha</h2>
        <p>Olá,</p>
        <p>Você solicitou a redefinição da sua senha no app Bichinho SOS.</p>
        <p>Use o código abaixo para criar uma nova senha:</p>
        <div style="background-color: #f0f0f0; margin: 20px auto; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 5px; width: fit-content;">
          ${code}
        </div>
        <p>Este código expira em 10 minutos.</p>
        <p>Se você não solicitou isso, por favor, ignore este e-mail.</p>
        <br>
        <p>Atenciosamente,</p>
        <p>Equipe Bichinho SOS</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('E-mail de redefinição enviado para:', to);
  } catch (error) {
    console.error('Erro ao enviar e-mail de redefinição:', error);
    throw new Error('Não foi possível enviar o e-mail de redefinição.');
  }
};

module.exports = { sendResetCodeEmail };