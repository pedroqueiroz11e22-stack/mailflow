import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import nodemailer from 'npm:nodemailer@6.9.0';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { smtp_host, smtp_port, smtp_user, smtp_password } = await req.json();

    if (!smtp_host || !smtp_port || !smtp_user || !smtp_password) {
      return Response.json({ 
        success: false,
        message: 'Todos os campos SMTP são obrigatórios'
      }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: smtp_host,
      port: parseInt(smtp_port),
      secure: parseInt(smtp_port) === 465,
      auth: {
        user: smtp_user,
        pass: smtp_password,
      },
      connectionTimeout: 30000,
      greetingTimeout: 30000
    });

    await transporter.verify();
    
    return Response.json({
      success: true,
      message: `Conexão SMTP estabelecida com sucesso em ${smtp_host}:${smtp_port}`
    });
    
  } catch (error) {
    return Response.json({
      success: false,
      message: error.message || 'Falha ao conectar com o servidor SMTP'
    }, { status: 200 });
  }
});