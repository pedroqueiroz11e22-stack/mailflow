import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import nodemailer from 'npm:nodemailer@6.9.0';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const smtpHost = Deno.env.get('SMTP_HOST');
    const smtpPort = Deno.env.get('SMTP_PORT');
    const smtpUser = Deno.env.get('SMTP_USER');
    const smtpPassword = Deno.env.get('SMTP_PASSWORD');

    console.log(`[TEST] SMTP Host: ${smtpHost}`);
    console.log(`[TEST] SMTP Port: ${smtpPort}`);
    console.log(`[TEST] SMTP User: ${smtpUser}`);
    console.log(`[TEST] Password set: ${smtpPassword ? 'Yes' : 'No'}`);

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
      return Response.json({ 
        error: 'SMTP credentials not configured',
        missing: {
          host: !smtpHost,
          port: !smtpPort,
          user: !smtpUser,
          password: !smtpPassword
        }
      }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: parseInt(smtpPort) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      debug: true,
      logger: true
    });

    console.log('[TEST] Attempting to verify SMTP connection...');

    try {
      await transporter.verify();
      console.log('[TEST] ✅ SMTP connection verified successfully');
      
      return Response.json({
        success: true,
        message: 'SMTP connection successful',
        config: {
          host: smtpHost,
          port: smtpPort,
          user: smtpUser,
          secure: parseInt(smtpPort) === 465
        }
      });
      
    } catch (verifyError) {
      console.error('[TEST] ❌ SMTP verification failed:', verifyError.message);
      console.error('[TEST] Error code:', verifyError.code);
      
      return Response.json({
        success: false,
        error: 'SMTP authentication failed',
        message: verifyError.message,
        code: verifyError.code,
        provider: 'SMTP',
        config: {
          host: smtpHost,
          port: smtpPort,
          user: smtpUser,
          secure: parseInt(smtpPort) === 465
        }
      }, { status: 401 });
    }

  } catch (error) {
    console.error('[TEST] Unexpected error:', error.message);
    return Response.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});