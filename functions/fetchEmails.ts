import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Imap from 'npm:imap@0.8.19';
import { simpleParser } from 'npm:mailparser@3.6.5';

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

    const imapConfig = {
      user: Deno.env.get('SMTP_USER'),
      password: Deno.env.get('SMTP_PASSWORD'),
      host: Deno.env.get('IMAP_HOST'),
      port: parseInt(Deno.env.get('IMAP_PORT') || '993'),
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    };

    const imap = new Imap(imapConfig);
    let newEmails = 0;

    const fetchedEmails = await new Promise((resolve, reject) => {
      const emails = [];
      const timeout = setTimeout(() => {
        reject(new Error('IMAP connection timeout'));
      }, 30000);
      
      imap.once('ready', () => {
        clearTimeout(timeout);
        imap.openBox('INBOX', false, (err, box) => {
          if (err) {
            reject(err);
            return;
          }

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
        clearTimeout(timeout);
        reject(err);
      });

      imap.connect();
    });

    for (const email of fetchedEmails) {
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
      total_fetched: fetchedEmails.length,
      new_emails: newEmails,
      message: `${newEmails} novos emails importados de ${fetchedEmails.length} total`
    });

  } catch (error) {
    console.error('Error fetching emails:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});