import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) {
      console.error('[AUTH] Not authenticated');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      console.error('[AUTH] User is not admin:', user?.email);
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get settings from database (fallback to env vars if not set)
    const settingsList = await base44.asServiceRole.entities.Settings.list();
    const settings = settingsList.length > 0 ? settingsList[0] : {};

    const imapHost = settings.imap_host || Deno.env.get('IMAP_HOST');
    const imapPort = settings.imap_port || Deno.env.get('IMAP_PORT');
    const imapUser = settings.smtp_user || Deno.env.get('SMTP_USER');
    const imapPassword = settings.smtp_password || Deno.env.get('SMTP_PASSWORD');

    if (!imapHost || !imapUser || !imapPassword) {
      console.log('[DEMO MODE] IMAP not configured, using demonstration emails');
    } else {
      console.log(`[IMAP] Configuration found: ${imapHost}:${imapPort}`);
    }
    
    // Modo demonstração quando IMAP não está configurado
    const mockEmails = [
      {
        from_email: 'cliente@exemplo.com',
        from_name: 'Cliente Exemplo',
        subject: 'Pergunta sobre seus serviços',
        body_text: 'Olá, gostaria de saber mais sobre seus serviços de email marketing.',
        body_html: '<p>Olá, gostaria de saber mais sobre seus serviços de email marketing.</p>',
        received_date: new Date().toISOString(),
        message_id: `msg_demo_${Date.now()}`,
        is_read: false
      }
    ];

    console.log(`[DEMO] Processing ${mockEmails.length} demonstration emails`);

    let newEmails = 0;

    console.log(`[DB] Saving ${mockEmails.length} emails to database...`);
    
    for (const email of mockEmails) {
      const existing = await base44.asServiceRole.entities.ReceivedEmail.filter({
        message_id: email.message_id
      });

      if (existing.length === 0) {
        await base44.asServiceRole.entities.ReceivedEmail.create(email);
        newEmails++;
      }
    }

    console.log(`[SUCCESS] ${newEmails} new emails imported (demo mode)`);

    return Response.json({
      success: true,
      total_fetched: mockEmails.length,
      new_emails: newEmails,
      message: `${newEmails} novos emails importados (modo demonstração)`,
      mode: 'demo'
    });

  } catch (error) {
    console.error('[ERROR] Failed to fetch emails:', error.message);
    console.error('[ERROR] Stack:', error.stack);
    
    return Response.json({ 
      success: false,
      error: error.message,
      details: error.stack,
      provider: 'IMAP',
      action: 'sync_inbox'
    }, { status: 500 });
  }
});