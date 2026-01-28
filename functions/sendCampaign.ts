import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { campaign_id, contacts } = await req.json();

    if (!campaign_id || !contacts || !Array.isArray(contacts)) {
      return Response.json({ 
        error: 'Missing required fields: campaign_id and contacts array' 
      }, { status: 400 });
    }

    const campaign = await base44.entities.Campaign.get(campaign_id);
    
    if (!campaign) {
      return Response.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const settings = await base44.entities.Settings.list();
    const defaultSenderName = settings.length > 0 ? settings[0].sender_name : undefined;

    let sentCount = 0;
    let failedCount = 0;

    for (const contact of contacts) {
      try {
        await base44.integrations.Core.SendEmail({
          from_name: campaign.from_name || defaultSenderName || undefined,
          to: contact.email,
          subject: campaign.subject,
          body: campaign.content,
        });
        sentCount++;
      } catch (error) {
        console.error(`Failed to send to ${contact.email}:`, error.message);
        failedCount++;
      }
    }

    await base44.entities.Campaign.update(campaign_id, {
      status: failedCount === contacts.length ? 'failed' : 'sent',
      sent_count: sentCount,
      failed_count: failedCount,
      sent_date: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      sent_count: sentCount,
      failed_count: failedCount,
      total: contacts.length,
    });

  } catch (error) {
    console.error('Error sending campaign:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});