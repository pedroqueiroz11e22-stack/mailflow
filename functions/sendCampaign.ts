import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import nodemailer from 'npm:nodemailer@6.9.0';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    // Check if user is authenticated
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) {
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
    
    const senderEmail = settings.length > 0 ? settings[0].sender_email : Deno.env.get('SMTP_USER');
    const senderName = settings.length > 0 && settings[0].sender_name ? settings[0].sender_name : 'Email Marketing';

    // Get settings from database (fallback to env vars if not set)
    const settingsList = await base44.asServiceRole.entities.Settings.list();
    const settings = settingsList.length > 0 ? settingsList[0] : {};

    const smtpHost = settings.smtp_host || Deno.env.get('SMTP_HOST');
    const smtpPort = settings.smtp_port || Deno.env.get('SMTP_PORT');
    const smtpUser = settings.smtp_user || Deno.env.get('SMTP_USER');
    const smtpPassword = settings.smtp_password || Deno.env.get('SMTP_PASSWORD');

    console.log(`[SMTP] Connecting to ${smtpHost}:${smtpPort} as ${smtpUser}`);

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
      console.error('[SMTP] Missing credentials - check environment variables');
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
      greetingTimeout: 30000
    });

    // Verify SMTP connection
    try {
      await transporter.verify();
      console.log('[SMTP] Connection verified successfully');
    } catch (verifyError) {
      console.error('[SMTP] Verification failed:', verifyError.message);
      return Response.json({
        error: 'SMTP authentication failed',
        details: verifyError.message,
        provider: 'SMTP',
        action: 'send_campaign'
      }, { status: 401 });
    }

    let sentCount = 0;
    let failedCount = 0;

    // Prepare email content - handle both HTML and JSON format from builder
    let emailContent = campaign.content;
    try {
      // Check if content is JSON from visual builder
      const parsed = JSON.parse(campaign.content);
      if (Array.isArray(parsed)) {
        // It's from visual builder, convert to HTML
        emailContent = convertBlocksToHTML(parsed);
      }
    } catch {
      // Content is already HTML, use as is
    }

    for (const contact of contacts) {
      try {
        console.log(`[SEND] Sending to ${contact.email}...`);
        
        await transporter.sendMail({
          from: `${campaign.from_name || senderName} <${senderEmail}>`,
          to: contact.email,
          subject: campaign.subject,
          html: emailContent,
        });

        console.log(`[SEND] Successfully sent to ${contact.email}`);

        // Track sent event
        await base44.asServiceRole.entities.EmailEvent.create({
          campaign_id: campaign_id,
          contact_email: contact.email,
          event_type: 'sent',
          event_date: new Date().toISOString(),
        });

        sentCount++;
      } catch (error) {
        console.error(`[SEND] Failed to send to ${contact.email}:`, error.message);
        
        // Track bounced event
        await base44.asServiceRole.entities.EmailEvent.create({
          campaign_id: campaign_id,
          contact_email: contact.email,
          event_type: 'bounced',
          event_date: new Date().toISOString(),
          metadata: { error: error.message }
        });
        
        failedCount++;
      }
    }

function convertBlocksToHTML(blocks) {
  let html = '<div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; padding: 20px;">';
  
  blocks.forEach(block => {
    const { type, content } = block;
    
    switch (type) {
      case 'heading':
        const size = content.level === 'h1' ? '32px' : content.level === 'h2' ? '24px' : '20px';
        html += `<h${content.level.slice(1)} style="text-align: ${content.align}; color: ${content.color}; margin: 0 0 16px 0; font-size: ${size};">${content.text}</h${content.level.slice(1)}>`;
        break;
      case 'text':
        html += `<p style="text-align: ${content.align}; color: ${content.color}; margin: 0 0 16px 0; line-height: 1.6;">${content.text}</p>`;
        break;
      case 'button':
        html += `<div style="text-align: ${content.align}; margin: 16px 0;"><a href="${content.url}" style="display: inline-block; padding: 12px 32px; background-color: ${content.bgColor}; color: ${content.textColor}; text-decoration: none; border-radius: 8px; font-weight: 600;">${content.text}</a></div>`;
        break;
      case 'image':
        if (content.url) {
          html += `<div style="text-align: ${content.align}; margin: 16px 0;"><img src="${content.url}" alt="${content.alt}" style="width: ${content.width}; max-width: 100%; height: auto;" /></div>`;
        }
        break;
      case 'divider':
        html += `<hr style="border: none; border-top: ${content.height}px solid ${content.color}; margin: 24px 0;" />`;
        break;
      case 'spacer':
        html += `<div style="height: ${content.height}px;"></div>`;
        break;
      case 'columns':
        html += '<table style="width: 100%; margin: 16px 0;"><tr>';
        content.contents.forEach(col => {
          html += `<td style="width: ${100/content.columns}%; vertical-align: top; padding: 0 8px;">${col || ''}</td>`;
        });
        html += '</tr></table>';
        break;
    }
  });
  
  html += '</div>';
  return html;
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
    console.error('[ERROR] Failed to send campaign:', error.message);
    console.error('[ERROR] Stack:', error.stack);
    
    return Response.json({ 
      error: error.message,
      details: error.stack,
      provider: 'SMTP',
      action: 'send_campaign'
    }, { status: 500 });
  }
});