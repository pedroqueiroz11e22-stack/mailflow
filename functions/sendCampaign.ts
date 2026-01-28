import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6'
import nodemailer from 'npm:nodemailer@6.9.0'

/**
 * Endpoint para disparar campanhas.
 * Esta versão valida uma API key interna em vez de depender de sessão de usuário.
 * Usa `base44.asServiceRole` para acessar as entidades.
 */
Deno.serve(async (req) => {
  // ✅ Validação via API key
  const apiKeyHeader = req.headers.get('x-api-key')
  const expectedApiKey = Deno.env.get('INTERNAL_API_KEY')
  if (!apiKeyHeader || apiKeyHeader !== expectedApiKey) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // cria cliente com role de serviço
  const base44 = createClientFromRequest(req).asServiceRole

  try {
    // recebe corpo { campaign_id, contacts }
    const { campaign_id, contacts } = await req.json()
    if (!campaign_id || !contacts || !Array.isArray(contacts)) {
      return Response.json(
        {
          error: 'Missing required fields: campaign_id and contacts array',
        },
        { status: 400 },
      )
    }

    // obtém campanha via service role
    const campaign = await base44.entities.Campaign.get(campaign_id)
    if (!campaign) {
      return Response.json({ error: 'Campaign not found' }, { status: 404 })
    }

    /**
     * Recupera configurações SMTP. Primeiro verifica a entidade Settings,
     * depois utiliza variáveis de ambiente como fallback.
     */
    const settingsList = await base44.entities.Settings.list()
    const settings = settingsList.length > 0 ? settingsList[0] : {}
    const smtpHost = settings.smtp_host || Deno.env.get('SMTP_HOST')
    const smtpPort = parseInt(
      settings.smtp_port || Deno.env.get('SMTP_PORT') || '0',
    )
    const smtpUser = settings.smtp_user || Deno.env.get('SMTP_USER')
    const smtpPassword = settings.smtp_password || Deno.env.get('SMTP_PASSWORD')

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
      return Response.json(
        {
          error: 'SMTP credentials not configured',
          missing: {
            host: !smtpHost,
            port: !smtpPort,
            user: !smtpUser,
            password: !smtpPassword,
          },
        },
        { status: 500 },
      )
    }

    // cria transportador SMTP
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPassword },
      connectionTimeout: 30_000,
      greetingTimeout: 30_000,
    })

    // verifica se conexão SMTP está ok
    try {
      await transporter.verify()
    } catch (verifyError) {
      return Response.json(
        {
          error: 'SMTP authentication failed',
          details: verifyError.message,
          provider: 'SMTP',
          action: 'send_campaign',
        },
        { status: 401 },
      )
    }

    // prepara conteúdo do email
    let emailContent: string = campaign.content
    try {
      const parsed = JSON.parse(campaign.content)
      if (Array.isArray(parsed)) {
        emailContent = convertBlocksToHTML(parsed)
      }
    } catch {
      // se o JSON.parse falhar, assume que o conteúdo já é HTML
    }

    // remetente e nome padrão
    const senderEmail = settings.sender_email || Deno.env.get('SMTP_USER')
    const senderName = settings.sender_name || 'Email Marketing'

    let sentCount = 0
    let failedCount = 0

    // envia email para cada contato
    for (const contact of contacts) {
      try {
        await transporter.sendMail({
          from: `${campaign.from_name || senderName} <${senderEmail}>`,
          to: contact.email,
          subject: campaign.subject,
          html: emailContent,
        })

        // registra evento "sent"
        await base44.entities.EmailEvent.create({
          campaign_id,
          contact_email: contact.email,
          event_type: 'sent',
          event_date: new Date().toISOString(),
        })

        sentCount++
      } catch (error) {
        // registra evento "bounced"
        await base44.entities.EmailEvent.create({
          campaign_id,
          contact_email: contact.email,
          event_type: 'bounced',
          event_date: new Date().toISOString(),
          metadata: { error: error.message },
        })
        failedCount++
      }
    }

    // atualiza status da campanha
    await base44.entities.Campaign.update(campaign_id, {
      status: failedCount === contacts.length ? 'failed' : 'sent',
      sent_count: sentCount,
      failed_count: failedCount,
      sent_date: new Date().toISOString(),
    })

    return Response.json({
      success: true,
      sent_count: sentCount,
      failed_count: failedCount,
      total: contacts.length,
    })
  } catch (error) {
    return Response.json(
      {
        error: error.message,
        details: error.stack,
        provider: 'SMTP',
        action: 'send_campaign',
      },
      { status: 500 },
    )
  }

  /**
   * Converte array de blocos (do construtor visual) para HTML.
   * Mantive a mesma implementação do arquivo original.
   */
  function convertBlocksToHTML(blocks: any[]): string {
    let html =
      '<div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; padding: 20px;">'
    blocks.forEach((block) => {
      const { type, content } = block
      switch (type) {
        case 'heading':
          const size =
            content.level === 'h1'
              ? '32px'
              : content.level === 'h2'
              ? '24px'
              : '20px'
          html += `<h${content.level.slice(1)} style="text-align: ${
            content.align
          }; color: ${content.color}; margin: 0 0 16px 0; font-size: ${size};">${
            content.text
          }</h${content.level.slice(1)}>`
          break
        case 'text':
          html += `<p style="text-align: ${content.align}; color: ${content.color}; margin: 0 0 16px 0; line-height: 1.6;">${content.text}</p>`
          break
        case 'button':
          html += `<div style="text-align: ${content.align}; margin: 16px 0;"><a href="${content.url}" style="display: inline-block; padding: 12px 32px; background-color: ${content.bgColor}; color: ${content.textColor}; text-decoration: none; border-radius: 8px; font-weight: 600;">${content.text}</a></div>`
          break
        case 'image':
          if (content.url) {
            html += `<div style="text-align: ${content.align}; margin: 16px 0;"><img src="${content.url}" alt="${content.alt}" style="width: ${content.width}; max-width: 100%; height: auto;" /></div>`
          }
          break
        case 'divider':
          html += `<hr style="border: none; border-top: ${content.height}px solid ${content.color}; margin: 24px 0;" />`
          break
        case 'spacer':
          html += `<div style="height: ${content.height}px;"></div>`
          break
        case 'columns':
          html += '<table style="width: 100%; margin: 16px 0;"><tr>'
          content.contents.forEach((col: string) => {
            html += `<td style="width: ${100 / content.columns}%; vertical-align: top; padding: 0 8px;">${col || ''}</td>`
          })
          html += '</tr></table>'
          break
      }
    })
    html += '</div>'
    return html
  }
})
