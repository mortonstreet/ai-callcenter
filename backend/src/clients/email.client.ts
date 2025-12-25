import { transporter } from '@/lib/email'
import { DBTaskInstance, DBUser } from '@shared/db/src'
import { config } from '@/config'

export const sendEmail = async (to: string, subject: string, text: string) => {
  await transporter.sendMail({
    from: 'noreply@revcenter.ai',
    to,
    subject,
    text,
  })
}

export const sendVerificationEmail = async (to: string, url: string) => {
  await transporter.sendMail({
    from: 'RevCenter <noreply@revcenter.ai>',
    to,
    subject: 'Verify your email',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f7f7f8;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="padding: 48px 40px; text-align: center;">
                    <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 600; color: #171717; letter-spacing: -0.5px;">
                      Verify your email
                    </h1>
                    <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #666;">
                      Thanks for signing up! Click the button below to verify your email address and get started.
                    </p>
                    <table role="presentation" style="margin: 0 auto;">
                      <tr>
                        <td style="background-color: #1b191a; border-radius: 12px;">
                          <a href="${url}" 
                             style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 500; border-radius: 12px;">
                            Verify Email
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 32px 0 0 0; font-size: 14px; line-height: 1.5; color: #999;">
                      If the button doesn't work, copy and paste this link into your browser:<br>
                      <a href="${url}" style="color: #1b191a; word-break: break-all;">${url}</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 40px; background-color: #f9f9fa; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e5e5;">
                    <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #999; text-align: center;">
                      If you didn't create an account with RevCenter, you can safely ignore this email.<br>
                      This verification link will expire in 1 hour.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  })
}

export const sendResetPasswordEmail = async (to: string, url: string) => {
  await transporter.sendMail({
    from: 'RevCenter <noreply@revcenter.ai>',
    to,
    subject: 'Reset your password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f7f7f8;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="padding: 48px 40px; text-align: center;">
                    <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 600; color: #171717; letter-spacing: -0.5px;">
                      Reset your password
                    </h1>
                    <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #666;">
                      We received a request to reset your password. Click the button below to create a new password.
                    </p>
                    <table role="presentation" style="margin: 0 auto;">
                      <tr>
                        <td style="background-color: #1b191a; border-radius: 12px;">
                          <a href="${url}" 
                             style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 500; border-radius: 12px;">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 32px 0 0 0; font-size: 14px; line-height: 1.5; color: #999;">
                      If the button doesn't work, copy and paste this link into your browser:<br>
                      <a href="${url}" style="color: #1b191a; word-break: break-all;">${url}</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 40px; background-color: #f9f9fa; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e5e5;">
                    <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #999; text-align: center;">
                      If you didn't request a password reset, you can safely ignore this email.<br>
                      This reset link will expire in 1 hour.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  })
}

export const sendOrganizationInvitation = async ({
  email,
  invitedByUsername,
  invitedByEmail,
  teamName,
  inviteLink,
}: {
  email: string
  invitedByUsername: string
  invitedByEmail: string
  teamName: string
  inviteLink: string
}) => {
  await transporter.sendMail({
    from: 'RevCenter <noreply@revcenter.ai>',
    to: email,
    subject: `${invitedByUsername} invited you to join ${teamName} on RevCenter`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f7f7f8;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="padding: 48px 40px; text-align: center;">
                    <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 600; color: #171717; letter-spacing: -0.5px;">
                      You've been invited!
                    </h1>
                    <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #666;">
                      <strong>${invitedByUsername}</strong> (${invitedByEmail}) has invited you to join the <strong>${teamName}</strong> organization on RevCenter.
                    </p>
                    <table role="presentation" style="margin: 0 auto;">
                      <tr>
                        <td style="background-color: #1b191a; border-radius: 12px;">
                          <a href="${inviteLink}" 
                             style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 500; border-radius: 12px;">
                            Accept Invitation
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 32px 0 0 0; font-size: 14px; line-height: 1.5; color: #999;">
                      If the button doesn't work, copy and paste this link into your browser:<br>
                      <a href="${inviteLink}" style="color: #1b191a; word-break: break-all;">${inviteLink}</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 40px; background-color: #f9f9fa; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e5e5;">
                    <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #999; text-align: center;">
                      If you don't want to join this organization, you can safely ignore this email.<br>
                      This invitation link will expire in 7 days.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  })
}

// Send job application notification to hiring team
export const sendJobApplicationEmail = async ({
  jobId,
  jobTitle,
  firstName,
  lastName,
  email,
  phone,
  linkedin,
  coverLetter,
  resumeFileName,
  resumeBase64,
}: {
  jobId: string
  jobTitle: string
  firstName: string
  lastName: string
  email: string
  phone: string
  linkedin: string
  coverLetter: string
  resumeFileName?: string
  resumeBase64?: string
}) => {
  const attachments =
    resumeFileName && resumeBase64
      ? [
          {
            filename: resumeFileName,
            content: resumeBase64,
            encoding: 'base64' as const,
          },
        ]
      : []

  await transporter.sendMail({
    from: 'RevCenter Careers <noreply@revcenter.ai>',
    to: 'fox@revcenter.ai',
    subject: `New Job Application: ${jobTitle} - ${firstName} ${lastName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f7f7f8;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="padding: 48px 40px;">
                    <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #171717; letter-spacing: -0.5px;">
                      New Application for ${jobTitle}
                    </h1>
                    
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
                          <strong style="color: #666; display: block; font-size: 12px; text-transform: uppercase; margin-bottom: 4px;">Name</strong>
                          <span style="color: #171717; font-size: 16px;">${firstName} ${lastName}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
                          <strong style="color: #666; display: block; font-size: 12px; text-transform: uppercase; margin-bottom: 4px;">Email</strong>
                          <a href="mailto:${email}" style="color: #1b191a; font-size: 16px;">${email}</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
                          <strong style="color: #666; display: block; font-size: 12px; text-transform: uppercase; margin-bottom: 4px;">Phone</strong>
                          <span style="color: #171717; font-size: 16px;">${phone}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
                          <strong style="color: #666; display: block; font-size: 12px; text-transform: uppercase; margin-bottom: 4px;">LinkedIn</strong>
                          <a href="${linkedin}" style="color: #1b191a; font-size: 16px;" target="_blank">${linkedin}</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
                          <strong style="color: #666; display: block; font-size: 12px; text-transform: uppercase; margin-bottom: 4px;">Position</strong>
                          <span style="color: #171717; font-size: 16px;">${jobTitle}</span>
                        </td>
                      </tr>
                    </table>
                    
                    <div style="margin-bottom: 24px;">
                      <strong style="color: #666; display: block; font-size: 12px; text-transform: uppercase; margin-bottom: 8px;">Why they want to join RevCenter</strong>
                      <p style="margin: 0; color: #171717; font-size: 14px; line-height: 1.6; background-color: #f9f9fa; padding: 16px; border-radius: 8px;">
                        ${coverLetter || 'No cover letter provided'}
                      </p>
                    </div>
                    
                    ${
                      resumeFileName
                        ? `
                    <p style="margin: 0; font-size: 14px; color: #666;">
                      📎 Resume attached: <strong>${resumeFileName}</strong>
                    </p>
                    `
                        : '<p style="margin: 0; font-size: 14px; color: #999;">No resume attached</p>'
                    }
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 40px; background-color: #f9f9fa; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e5e5;">
                    <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #999; text-align: center;">
                      This application was submitted through the RevCenter careers page.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    attachments,
  })
}

// Just say you have a new task instance and give them a link to visit it
export const sendTaskInstanceToDispatcher = async (
  taskInstance: DBTaskInstance & { task: { name: string } },
  dispatcher: DBUser,
) => {
  const frontendUrl = config.frontendUrl
  const taskInstanceLink = `${frontendUrl}/dashboard/tasks/${taskInstance.id}`

  await transporter.sendMail({
    from: 'RevCenter <noreply@revcenter.ai>',
    to: dispatcher.email,
    subject: `New Lead on RevCenter: ${taskInstance.task.name}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f7f7f8;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="padding: 48px 40px; text-align: center;">
                    <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 600; color: #171717; letter-spacing: -0.5px;">
                      New Lead: ${taskInstance.task.name}
                    </h1>
                    <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #666;">
                      A new lead has been created for you.
                    </p>
                    <table role="presentation" style="margin: 0 auto;">
                      <tr>
                        <td style="background-color: #1b191a; border-radius: 12px;">
                          <a href="${taskInstanceLink}" 
                             style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 500; border-radius: 12px;">
                            View Lead
                          </a>  
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 32px 0 0 0; font-size: 14px; line-height: 1.5; color: #999;">
                      If the button doesn't work, copy and paste this link into your browser:<br>
                      <a href="${taskInstanceLink}" style="color: #1b191a; word-break: break-all;">${taskInstanceLink}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  })
}
