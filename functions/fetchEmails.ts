import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Imap from 'npm:imap@0.8.19';
import { simpleParser } from 'npm:mailparser@3.6.5';

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

    console.log('[IMAP] Starting connection...');
    
    const imapConfig = {
      user: Deno.env.get('SMTP_USER'),
      password: Deno.env.get('SMTP_PASSWORD'),
      host: Deno.env.get('IMAP_HOST'),
      port: parseInt(Deno.env.get('IMAP_PORT') || '993'),
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 30000,
      authTimeout: 30000
    };
    
    console.log(`[IMAP] Connecting to ${imapConfig.host}:${imapConfig.port} as ${imapConfig.user}`);

    const imap = new Imap(imapConfig);
    let newEmails = 0;

    const fetchedEmails = await new Promise((resolve, reject) => {
      const emails = [];
      const timeout = setTimeout(() => {
        console.error('[IMAP] Connection timeout (45s)');
        imap.end();
        reject(new Error('IMAP connection timeout after 45 seconds'));
      }, 45000);
      
      imap.once('ready', () => {
        console.log('[IMAP] Connected successfully');
        clearTimeout(timeout);
        imap.openBox('INBOX', false, (err, box) => {
          if (err) {
            console.error('[IMAP] Error opening inbox:', err.message);
            reject(err);
            return;
          }

          console.log(`[IMAP] Inbox opened: ${box.messages.total} messages`);

          if (box.messages.total === 0) {
            imap.end();
            resolve([]);
            return;
          }

          const fetch = imap.seq.fetch('1:*', {
            bodies: '',
            struct: true
          });

          fetch.on('message', (msg, seqno) => {
            let buffer = '';
            
            msg.on('body', (stream, info) => {
              stream.on('data', (chunk) => {
                buffer += chunk.toString('utf8');
              });
            });

            msg.once('end', async () => {
              try {
                const parsed = await simpleParser(buffer);
                
                emails.push({
                  from_email: parsed.from?.value?.[0]?.address || '',
                  from_name: parsed.from?.value?.[0]?.name || '',
                  subject: parsed.subject || '(Sem assunto)',
                  body_text: parsed.text || '',
                  body_html: parsed.html || '',
                  received_date: parsed.date?.toISOString() || new Date().toISOString(),
                  message_id: parsed.messageId || `msg_${Date.now()}_${seqno}`,
                  is_read: false
                });
              } catch (e) {
                console.error('Error parsing email:', e);
              }
            });
          });

          fetch.once('error', (err) => {
            reject(err);
          });

          fetch.once('end', () => {
            imap.end();
            resolve(emails);
          });
        });
      });

      imap.once('error', (err) => {
        console.error('[IMAP] Connection error:', err.message);
        clearTimeout(timeout);
        reject(err);
      });

      imap.once('end', () => {
        console.log('[IMAP] Connection ended');
      });

      try {
        imap.connect();
      } catch (err) {
        console.error('[IMAP] Connection failed:', err.message);
        clearTimeout(timeout);
        reject(err);
      }
    });

    console.log(`[DB] Saving ${fetchedEmails.length} emails to database...`);
    
    for (const email of fetchedEmails) {
      const existing = await base44.asServiceRole.entities.ReceivedEmail.filter({
        message_id: email.message_id
      });

      if (existing.length === 0) {
        await base44.asServiceRole.entities.ReceivedEmail.create(email);
        newEmails++;
      }
    }

    console.log(`[SUCCESS] ${newEmails} new emails imported`);

    return Response.json({
      success: true,
      total_fetched: fetchedEmails.length,
      new_emails: newEmails,
      message: `${newEmails} novos emails importados de ${fetchedEmails.length} total`
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