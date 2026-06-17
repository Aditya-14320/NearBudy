import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

// Initialize the Amazon SNS client
const snsClient = new SNSClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

/**
 * Send an SMS using Amazon SNS
 * @param {string} phoneNumber - Recipient phone number in E.164 format (e.g. +917000000000)
 * @param {string} message - SMS message body content
 */
export const sendSMS = async (phoneNumber, message) => {
  const command = new PublishCommand({
    PhoneNumber: phoneNumber,
    Message: message,
    MessageAttributes: {
      'AWS.SNS.SMS.SMSType': {
        DataType: 'String',
        StringValue: 'Transactional'
      }
    }
  });

  try {
    return await snsClient.send(command);
  } catch (error) {
    console.warn(`\n[DEV ONLY] AWS SNS SMS Send Failed: ${error.message}`);
    console.warn(`--------------------------------------------------`);
    console.warn(`Recipient: ${phoneNumber}`);
    console.warn(`Message: ${message}`);
    console.warn(`--------------------------------------------------\n`);
    
    return { MessageId: 'mock-dev-sms-id', isDevMock: true };
  }
};
