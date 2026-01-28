import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const now = new Date();
    
    const scheduledCampaigns = await base44.asServiceRole.entities.Campaign.filter({
      status: 'draft',
    });

    const campaignsToSend = scheduledCampaigns.filter(campaign => {
      if (!campaign.scheduled_date) return false;
      const scheduledDate = new Date(campaign.scheduled_date);
      return scheduledDate <= now;
    });

    let processed = 0;
    const results = [];

    for (const campaign of campaignsToSend) {
      try {
        const contacts = await base44.asServiceRole.entities.Contact.filter({ subscribed: true });
        
        await base44.asServiceRole.entities.Campaign.update(campaign.id, {
          status: 'sending',
          sent_count: 0,
          failed_count: 0,
        });

        const result = await base44.asServiceRole.functions.invoke('sendCampaign', {
          campaign_id: campaign.id,
          contacts: contacts.map(c => ({ email: c.email, name: c.name })),
        });

        processed++;
        results.push({
          campaign_id: campaign.id,
          title: campaign.title,
          status: 'sent',
          sent_count: result.data?.sent_count || 0,
        });
      } catch (error) {
        results.push({
          campaign_id: campaign.id,
          title: campaign.title,
          status: 'failed',
          error: error.message,
        });
      }
    }

    return Response.json({
      success: true,
      processed,
      total_scheduled: campaignsToSend.length,
      results,
    });

  } catch (error) {
    console.error('Error processing scheduled campaigns:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});