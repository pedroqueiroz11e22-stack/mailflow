import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import nodemailer from 'npm:nodemailer@6.9.0';

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
    
    let smtpConfig;
    let senderEmail;
    let senderName = 'Email Marketing';

    if (settings.length > 0 && settings[0].smtp_host) {
      const s = settings[0];
      senderEmail = s.sender_email || s.smtp_user;
      senderName = s.sender_name || 'Email Marketing';
      
      smtpConfig = {
        host: s.smtp_host,
        port: s.smtp_port,
        secure: s.smtp_secure !== false,
        auth: {
          user: s.smtp_user,
          pass: s.smtp_password,
        },
      };
    } else {
      senderEmail = Deno.env.get('SMTP_USER');
      
      smtpConfig = {
        host: Deno.env.get('SMTP_HOST'),
        port: parseInt(Deno.env.get('SMTP_PORT')),
        secure: true,
        auth: {
          user: Deno.env.get('SMTP_USER'),
          pass: Deno.env.get('SMTP_PASSWORD'),
        },
      };
    }

    const transporter = nodemailer.createTransport(smtpConfig);

    let sentCount = 0;
    let failedCount = 0;

    for (const contact of contacts) {
      try {
        await transporter.sendMail({
          from: `${campaign.from_name || senderName} <${senderEmail}>`,
          to: contact.email,
          subject: campaign.subject,
          html: campaign.content,
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