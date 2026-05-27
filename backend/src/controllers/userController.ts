import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import prisma from '../lib/prisma';
import { encrypt, decrypt } from '../lib/encryption';

export async function getUserSettings(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        role: true,
        apiAccessToken: true,
        apiPhoneNumberId: true,
        apiWabaId: true,
        subscriptionPlan: true,
        subscriptionEnd: true,
        aiCreditsBalance: true,
        widgetId: true,
        aiActive: true,
        aiResponseLimit: true,
        aiResponseCount: true,
        aiTokensPurchased: true,
        aiTokensUsed: true,
        aiTokensRemaining: true,
        aiActiveTelegram: true,
        aiResponseLimitTelegram: true,
        aiResponseCountTelegram: true,
        aiActiveWeb: true,
        aiResponseLimitWeb: true,
        aiResponseCountWeb: true,
        aiPersonality: true,
        aiInstructions: true,
        aiTakeoverKeywords: true,
        chatbotName: true,
        chatbotColor: true,
        chatbotWelcome: true,
        chatbotFallback: true,
        businessBio: true,
        chatbotIsActive: true,
        calendlyToken: true,
        calendlyWebhookUrl: true,
        shopifyStoreUrl: true,
        shopifyAccessToken: true,
        wordpressStoreUrl: true,
        wordpressAccessToken: true,
        whatsappBizName: true,
        whatsappBizStatus: true,
        whatsappBizAddress: true,
        whatsappBizEmail: true,
        whatsappBizWebsite: true,
        whatsappBizIndustry: true,
        whatsappReceiveCalls: true,
        whatsappShowCallIcon: true,
        whatsappCallbackPermission: true,
        whatsappHoursConfigured: true,
        whatsappBusinessHours: true,
        whatsappFlowId: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User session invalid or deleted.' });
    }

    if (user.apiAccessToken) {
      user.apiAccessToken = decrypt(user.apiAccessToken);
    }

    res.json(user);
  } catch (error) {
    console.error('Failed to get user settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
}

export async function updateUserSettings(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { 
    apiAccessToken, 
    apiPhoneNumberId, 
    apiWabaId, 
    calendlyToken, 
    calendlyWebhookUrl,
    shopifyStoreUrl,
    shopifyAccessToken,
    wordpressStoreUrl,
    wordpressAccessToken,
    aiActive,
    aiResponseLimit,
    aiResponseCount,
    aiActiveTelegram,
    aiResponseLimitTelegram,
    aiResponseCountTelegram,
    aiActiveWeb,
    aiResponseLimitWeb,
    aiResponseCountWeb,
    aiPersonality,
    aiInstructions,
    aiTakeoverKeywords,
    chatbotName,
    chatbotColor,
    chatbotWelcome,
    chatbotFallback,
    businessBio,
    chatbotIsActive,
    whatsappBizName,
    whatsappBizStatus,
    whatsappBizAddress,
    whatsappBizEmail,
    whatsappBizWebsite,
    whatsappBizIndustry,
    whatsappReceiveCalls,
    whatsappShowCallIcon,
    whatsappCallbackPermission,
    whatsappHoursConfigured,
    whatsappBusinessHours,
    whatsappFlowId
  } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        apiAccessToken: apiAccessToken !== undefined ? (apiAccessToken ? encrypt(apiAccessToken) : apiAccessToken) : undefined,
        apiPhoneNumberId,
        apiWabaId,
        calendlyToken,
        calendlyWebhookUrl,
        shopifyStoreUrl,
        shopifyAccessToken,
        wordpressStoreUrl,
        wordpressAccessToken,
        aiActive,
        aiResponseLimit,
        aiResponseCount,
        aiActiveTelegram,
        aiResponseLimitTelegram,
        aiResponseCountTelegram,
        aiActiveWeb,
        aiResponseLimitWeb,
        aiResponseCountWeb,
        aiPersonality,
        aiInstructions,
        aiTakeoverKeywords,
        chatbotName,
        chatbotColor,
        chatbotWelcome,
        chatbotFallback,
        businessBio,
        chatbotIsActive,
        whatsappBizName,
        whatsappBizStatus,
        whatsappBizAddress,
        whatsappBizEmail,
        whatsappBizWebsite,
        whatsappBizIndustry,
        whatsappReceiveCalls,
        whatsappShowCallIcon,
        whatsappCallbackPermission,
        whatsappHoursConfigured,
        whatsappBusinessHours,
        whatsappFlowId,
      },
    });

    res.json({ message: 'Settings updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Failed to update settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
}
