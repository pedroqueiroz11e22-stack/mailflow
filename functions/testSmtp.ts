import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import nodemailer from 'npm:nodemailer@6.9.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { smtp_host, smtp_port, smtp_user, smtp_password, smtp_secure } = await req.json();

    if (!smtp_host || !smtp_port || !smtp_user || !smtp_password) {
      return Response.json({ 
        error: 'Todos os campos SMTP são obrigatórios' 
      }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: smtp_host,
      port: parseInt(smtp_port),
      secure: smtp_secure,
      auth: {
        user: smtp_user,
        pass: smtp_password,
      },
    });

    await transporter.verify();

    await transporter.sendMail({
      from: `${user.full_name || 'Teste'} <${smtp_user}>`,
      to: user.email,
      subject: 'Teste de Configuração SMTP',
      html: '<p>Suas configurações SMTP estão funcionando corretamente! ✅</p>',
    });

    return Response.json({
      success: true,
      message: 'Configuração SMTP válida! Email de teste enviado.',
    });

  } catch (error) {
    console.error('SMTP test error:', error);
    return Response.json({ 
      success: false,
      error: `Falha na configuração SMTP: ${error.message}` 
    }, { status: 400 });
  }
});