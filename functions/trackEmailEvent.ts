import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { campaign_id, contact_email, event_type, link_url, metadata } = await req.json();

    if (!campaign_id || !contact_email || !event_type) {
      return Response.json({ 
        error: 'Campos obrigatórios faltando' 
      }, { status: 400 });
    }

    const validEvents = ['sent', 'opened', 'clicked', 'unsubscribed', 'bounced'];
    if (!validEvents.includes(event_type)) {
      return Response.json({ 
        error: 'Tipo de evento inválido' 
      }, { status: 400 });
    }

    await base44.asServiceRole.entities.EmailEvent.create({
      campaign_id,
      contact_email,
      event_type,
      event_date: new Date().toISOString(),
      link_url: link_url || null,
      metadata: metadata || {}
    });

    return Response.json({
      success: true,
      message: 'Evento rastreado com sucesso',
    });

  } catch (error) {
    console.error('Error tracking email event:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});