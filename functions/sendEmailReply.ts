import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import nodemailer from 'npm:nodemailer@6.9.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to_email, to_name, subject, body } = await req.json();

    if (!to_email || !subject || !body) {
      return Response.json({ 
        error: 'Campos obrigatórios faltando' 
      }, { status: 400 });
    }

    const settings = await base44.entities.Settings.list();
    const senderEmail = settings.length > 0 ? settings[0].sender_email : Deno.env.get('SMTP_USER');
    const senderName = settings.length > 0 && settings[0].sender_name ? settings[0].sender_name : user.full_name;

    const transporter = nodemailer.createTransport({
      host: Deno.env.get('SMTP_HOST'),
      port: parseInt(Deno.env.get('SMTP_PORT')),
      secure: true,
      auth: {
        user: Deno.env.get('SMTP_USER'),
        pass: Deno.env.get('SMTP_PASSWORD'),
      },
    });

    await transporter.sendMail({
      from: `${senderName} <${senderEmail}>`,
      to: to_name ? `${to_name} <${to_email}>` : to_email,
      subject: subject,
      html: body,
    });

    return Response.json({
      success: true,
      message: 'Email enviado com sucesso',
    });

  } catch (error) {
    console.error('Error sending email reply:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});