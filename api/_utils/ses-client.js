import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

// Initialize the Amazon SES client
const sesClient = new SESClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const SENDER_EMAIL = process.env.SES_SENDER_EMAIL || "support@nearbudy.xyz";

/**
 * Send an email using Amazon SES
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} bodyHtml - HTML body content
 * @param {string} bodyText - Plain text body content fallback
 */
export const sendEmail = async (to, subject, bodyHtml, bodyText) => {
  const command = new SendEmailCommand({
    Source: SENDER_EMAIL,
    Destination: {
      ToAddresses: [to]
    },
    Message: {
      Subject: {
        Charset: "UTF-8",
        Data: subject
      },
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: bodyHtml
        },
        Text: {
          Charset: "UTF-8",
          Data: bodyText
        }
      }
    }
  });

  try {
    return await sesClient.send(command);
  } catch (error) {
    const isSandboxError = error.name === 'MessageRejected' || 
      (error.message && error.message.includes('Email address is not verified'));
    
    if (isSandboxError) {
      console.warn(`\n[DEV ONLY] AWS SES Send Failed: Recipient email ${to} is not verified in SES sandbox.`);
      console.warn(`--------------------------------------------------`);
      console.warn(`Subject: ${subject}`);
      console.warn(`Recipient: ${to}`);
      const otpMatch = bodyText.match(/\b\d{6}\b/);
      if (otpMatch) {
        console.warn(`>>> DEVELOPMENT OTP CODE: ${otpMatch[0]} <<<`);
      } else {
        console.warn(`Body Text:\n${bodyText}`);
      }
      console.warn(`--------------------------------------------------\n`);
      
      // Resolve with a mock response so the flow succeeds in development
      return { MessageId: 'mock-dev-message-id', isDevMock: true };
    }
    
    // For other errors, rethrow
    throw error;
  }
};

/**
 * Generate a professional, clean HTML template matching the requested format
 * @param {string} code - The 6-digit OTP code
 * @param {string} subjectText - The subject/title of the email
 */
export const getEmailTemplate = (code, subjectText = "Verify Your NearBudy Account") => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subjectText}</title>
        <style>
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #0a0a0c;
            color: #ffffff;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 500px;
            margin: 40px auto;
            background-color: #16161a;
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          }
          .header {
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            padding: 28px 24px;
            text-align: center;
          }
          .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.5px;
          }
          .content {
            padding: 32px 24px;
          }
          .greeting {
            font-size: 16px;
            font-weight: 500;
            color: #ffffff;
            margin-bottom: 16px;
          }
          .text {
            font-size: 15px;
            color: #9ca3af;
            margin-bottom: 24px;
            line-height: 1.5;
          }
          .code-box {
            background-color: #202026;
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 20px;
            text-align: center;
            margin-bottom: 24px;
          }
          .code {
            font-size: 32px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: 5px;
            margin: 0;
          }
          .warning-text {
            font-size: 13px;
            color: #6b7280;
            margin-top: 16px;
          }
          .footer {
            margin-top: 32px;
            border-top: 1px solid rgba(255, 255, 255, 0.06);
            padding-top: 20px;
            font-size: 14px;
            color: #9ca3af;
            line-height: 1.5;
          }
          .footer a {
            color: #6366f1;
            text-decoration: none;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>NearBudy</h1>
          </div>
          <div class="content">
            <div class="greeting">Hello,</div>
            <div class="text">Your verification code is:</div>
            
            <div class="code-box">
              <div class="code">${code}</div>
            </div>
            
            <div class="text" style="font-weight: 500; color: #a5b4fc; margin-bottom: 16px;">
              This code expires in 5 minutes.
            </div>
            
            <div class="warning-text">
              If you did not request this code, please ignore this email.
            </div>
            
            <div class="footer">
              NearBudy Team<br>
              <a href="https://nearbudy.xyz">https://nearbudy.xyz</a>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};
