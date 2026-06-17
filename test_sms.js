import fs from 'fs';
import path from 'path';
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

// Parse .env manually
const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

const accessKeyId = env['AWS_ACCESS_KEY_ID'];
const secretAccessKey = env['AWS_SECRET_ACCESS_KEY'];
const region = env['AWS_REGION'] || 'us-east-1';

const recipient = process.argv[2];
if (!recipient) {
  console.error("Usage: node test_sms.js <phone_number_in_e164_format>");
  process.exit(1);
}

const snsClient = new SNSClient({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey
  }
});

const run = async () => {
  try {
    console.log(`Sending direct test SMS to ${recipient} using region: ${region}...`);
    console.log(`Using AWS Access Key ID: ${accessKeyId.slice(0, 8)}...`);

    const command = new PublishCommand({
      PhoneNumber: recipient,
      Message: "NearBudy: Direct SMS test message.",
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional'
        }
      }
    });

    const result = await snsClient.send(command);
    console.log("SMS sent successfully!");
    console.log("MessageId:", result.MessageId);
  } catch (error) {
    console.error("SMS Delivery Failed.");
    console.error("AWS Error Name:", error.name || error.code);
    console.error("AWS Error Message:", error.message);
  }
};

run();
