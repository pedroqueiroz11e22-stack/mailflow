import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Simulação de emails para demonstração
    // Em produção, você precisaria integrar com um serviço de email via API
    // como Gmail API, Microsoft Graph, ou usar um webhook
    
    const mockEmails = [
      {
        from_email: 'cliente@exemplo.com',
        from_name: 'Cliente Exemplo',
        subject: 'Pergunta sobre seus serviços',
        body_text: 'Olá, gostaria de saber mais sobre seus serviços de email marketing.',
        body_html: '<p>Olá, gostaria de saber mais sobre seus serviços de email marketing.</p>',
        received_date: new Date().toISOString(),
        message_id: `msg_${Date.now()}_1`,
        is_read: false
      }
    ];

    let newEmails = 0;

    for (const email of mockEmails) {
      const existing = await base44.asServiceRole.entities.ReceivedEmail.filter({
        message_id: email.message_id
      });

      if (existing.length === 0) {
        await base44.asServiceRole.entities.ReceivedEmail.create(email);
        newEmails++;
      }
    }

    return Response.json({
      success: true,
      total_fetched: mockEmails.length,
      new_emails: newEmails,
      message: newEmails > 0 ? `${newEmails} novos emails importados` : 'Nenhum novo email'
    });

  } catch (error) {
    console.error('Error fetching emails:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});