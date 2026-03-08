import { config } from '../config/index.js';
import { AppError } from '../utils/errors.js';

const normalizePhoneNumber = (phone: string) => phone.replace(/[^\d]/g, '');

interface SendWhatsAppTextInput {
  phoneNumber: string;
  text: string;
}

export const sendWhatsAppTextMessage = async (input: SendWhatsAppTextInput): Promise<void> => {
  if (!config.whatsapp.enabled || !config.whatsapp.accessToken || !config.whatsapp.phoneNumberId) {
    throw new AppError(503, 'INTERNAL_ERROR', 'WhatsApp delivery is not configured');
  }

  const response = await fetch(
    `${config.whatsapp.baseUrl}/${config.whatsapp.apiVersion}/${config.whatsapp.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.whatsapp.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizePhoneNumber(input.phoneNumber),
        type: 'text',
        text: {
          preview_url: true,
          body: input.text
        }
      })
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new AppError(502, 'AWS_ERROR', 'WhatsApp delivery failed', {
      status: response.status,
      body
    });
  }
};
