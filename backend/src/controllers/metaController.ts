import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import prisma from '../lib/prisma';
import { encrypt, decrypt } from '../lib/encryption';

/**
 * Helper to fetch data from Meta Graph API
 */
async function fetchMetaAPI(path: string, token: string): Promise<any> {
  const url = `https://graph.facebook.com/v19.0/${path}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const errorData: any = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Meta API request failed.');
  }
  return response.json();
}

/**
 * Handle Meta OAuth callback (Exchange/Validate short-lived user token)
 * POST /api/whatsapp/meta/oauth/callback
 */
export async function handleMetaOauthCallback(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { accessToken } = req.body;
  if (!accessToken) {
    return res.status(400).json({ error: 'accessToken is required.' });
  }

  try {
    // If it's a sandbox token, just return it directly
    if (accessToken.startsWith('EAAG_fb_oauth_token_')) {
      return res.json({
        success: true,
        accessToken,
        message: 'Sandbox token received successfully.'
      });
    }

    // Optional: Exchange short-lived token for a long-lived one if client ID and client secret are configured
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    let finalToken = accessToken;

    if (appId && appSecret) {
      try {
        const exchangeUrl = `oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${accessToken}`;
        const exchangeData: any = await fetchMetaAPI(exchangeUrl, accessToken);
        if (exchangeData.access_token) {
          finalToken = exchangeData.access_token;
        }
      } catch (err: any) {
        console.warn('Could not exchange short-lived token, using original token:', err.message);
      }
    }

    res.json({
      success: true,
      accessToken: finalToken,
      message: 'Token processed successfully.'
    });
  } catch (error: any) {
    console.error('Meta OAuth callback error:', error);
    res.status(500).json({ error: error.message || 'OAuth callback processing failed.' });
  }
}

/**
 * Get list of WhatsApp Business Accounts (WABAs)
 * GET /api/whatsapp/meta/businesses
 */
export async function getMetaBusinesses(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const accessTokenQuery = req.query.accessToken as string;
  if (!accessTokenQuery) {
    return res.status(400).json({ error: 'accessToken query parameter is required.' });
  }

  const token = decrypt(accessTokenQuery); // Decrypt if it was encrypted, or use as is

  try {
    // Check for sandbox token
    if (token.startsWith('EAAG_fb_oauth_token_')) {
      return res.json([
        { id: '984029482014', name: 'Aftab Business Suite (Sandbox)', status: 'Verified' },
        { id: '394820491829', name: 'ITVEXO Business Account', status: 'Active' }
      ]);
    }

    // Real API fetch
    const responseData: any = await fetchMetaAPI('me/whatsapp_business_accounts?fields=id,name,status', token);
    const businesses = (responseData.data || []).map((waba: any) => ({
      id: waba.id,
      name: waba.name || `WABA (${waba.id})`,
      status: waba.status || 'Active'
    }));

    res.json(businesses);
  } catch (error: any) {
    console.error('Get WABAs error:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve WhatsApp Business Accounts from Meta.' });
  }
}

/**
 * Get list of phone numbers for a WABA ID
 * GET /api/whatsapp/meta/phones
 */
export async function getMetaPhones(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { wabaId, accessToken } = req.query;
  if (!wabaId || !accessToken) {
    return res.status(400).json({ error: 'wabaId and accessToken query parameters are required.' });
  }

  const token = decrypt(accessToken as string);

  try {
    // Check for sandbox token
    if (token.startsWith('EAAG_fb_oauth_token_')) {
      if (wabaId === '394820491829') {
        return res.json([
          { id: '10984729185', name: 'ITVEXO Official', phone: '+8801700000000', status: 'Active' }
        ]);
      }
      return res.json([
        { id: '10984729184', name: 'Vexo Assistant', phone: '+1 555-966-9534', status: 'Active' }
      ]);
    }

    // Real API fetch
    const responseData: any = await fetchMetaAPI(`${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,status`, token);
    const phones = (responseData.data || []).map((phone: any) => ({
      id: phone.id,
      name: phone.verified_name || 'Official Number',
      phone: phone.display_phone_number || phone.id,
      status: phone.status || 'Active'
    }));

    res.json(phones);
  } catch (error: any) {
    console.error('Get WABA phones error:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve phone numbers from Meta.' });
  }
}

/**
 * Verify and save WABA credentials, phone details, and token
 * POST /api/whatsapp/meta/verify
 */
export async function verifyAndSaveMetaCredentials(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { accessToken, wabaId, phoneNumberId } = req.body;
  if (!accessToken || !wabaId || !phoneNumberId) {
    return res.status(400).json({ error: 'accessToken, wabaId, and phoneNumberId are required.' });
  }

  try {
    let verifiedName = 'Official Cloud API';
    let verifiedPhone = 'Cloud API';

    // Sandbox bypass
    if (accessToken.startsWith('EAAG_fb_oauth_token_')) {
      verifiedName = wabaId === '394820491829' ? 'ITVEXO Official' : 'Vexo Assistant';
      verifiedPhone = wabaId === '394820491829' ? '+8801700000000' : '+1 555-966-9534';
    } else {
      // Real verify check
      const phoneData: any = await fetchMetaAPI(`${phoneNumberId}`, accessToken);
      verifiedName = phoneData.verified_name || phoneData.display_phone_number || 'Official Cloud API';
      verifiedPhone = phoneData.display_phone_number || 'Cloud API';
    }

    // Encrypt token
    const encryptedToken = encrypt(accessToken);

    // Save to DB (User Settings)
    await prisma.user.update({
      where: { id: userId },
      data: {
        apiAccessToken: encryptedToken,
        apiPhoneNumberId: phoneNumberId,
        apiWabaId: wabaId,
        whatsappBizName: verifiedName,
      }
    });

    res.json({
      success: true,
      message: 'WhatsApp Meta credentials verified and linked successfully!',
      bizName: verifiedName,
      phone: verifiedPhone
    });
  } catch (error: any) {
    console.error('Verify and save Meta credentials error:', error);
    res.status(500).json({ error: error.message || 'Verification or save failed.' });
  }
}

/**
 * Get list of approved WhatsApp Message Templates from Meta
 * GET /api/whatsapp/meta/templates
 */
export async function getMetaTemplates(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.apiAccessToken || !user.apiWabaId) {
      return res.status(400).json({ error: 'Meta Cloud API is not connected. Please connect your WhatsApp account first.' });
    }

    const token = decrypt(user.apiAccessToken);

    // Fetch real approved templates from Meta WABA
    const responseData: any = await fetchMetaAPI(
      `${user.apiWabaId}/message_templates?fields=id,name,status,category,language,components&limit=100`,
      token
    );

    const templates = (responseData.data || []).map((temp: any) => ({
      id: temp.id,
      name: temp.name,
      status: temp.status,
      category: temp.category,
      language: temp.language,
      components: temp.components
    }));

    res.json(templates);
  } catch (error: any) {
    console.error('Get Meta templates error:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve WhatsApp Message Templates from Meta.' });
  }
}

/**
 * Create a new WhatsApp Message Template on Meta
 * POST /api/whatsapp/meta/templates
 */
export async function createMetaTemplate(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { name, category, language, components } = req.body;
  if (!name || !category || !language || !components) {
    return res.status(400).json({ error: 'name, category, language, and components are required.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.apiAccessToken || !user.apiWabaId) {
      return res.status(400).json({ error: 'Meta Cloud API is not connected. Please connect your WhatsApp account first.' });
    }

    const token = decrypt(user.apiAccessToken);

    // Call Meta API to create template
    const url = `https://graph.facebook.com/v19.0/${user.apiWabaId}/message_templates`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        category,
        language,
        components
      })
    });

    const responseData: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(responseData.error?.message || 'Failed to create template on Meta.');
    }

    res.json({
      success: true,
      message: 'Template created successfully.',
      data: responseData
    });
  } catch (error: any) {
    console.error('Create Meta template error:', error);
    res.status(500).json({ error: error.message || 'Failed to create template on Meta.' });
  }
}

/**
 * Edit an existing WhatsApp Message Template on Meta
 * POST /api/whatsapp/meta/templates/:id
 */
export async function editMetaTemplate(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.params;
  const { components } = req.body;
  if (!id || !components) {
    return res.status(400).json({ error: 'id and components are required.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.apiAccessToken) {
      return res.status(400).json({ error: 'Meta Cloud API is not connected. Please connect your WhatsApp account first.' });
    }

    const token = decrypt(user.apiAccessToken);

    // Call Meta API to edit template (POST to the template's ID)
    const url = `https://graph.facebook.com/v19.0/${id}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        components
      })
    });

    const responseData: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(responseData.error?.message || 'Failed to edit template on Meta.');
    }

    res.json({
      success: true,
      message: 'Template edited successfully.',
      data: responseData
    });
  } catch (error: any) {
    console.error('Edit Meta template error:', error);
    res.status(500).json({ error: error.message || 'Failed to edit template on Meta.' });
  }
}

/**
 * Delete a WhatsApp Message Template from Meta by Name
 * DELETE /api/whatsapp/meta/templates/:name
 */
export async function deleteMetaTemplate(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { name } = req.params;
  if (!name) {
    return res.status(400).json({ error: 'Template name is required.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.apiAccessToken || !user.apiWabaId) {
      return res.status(400).json({ error: 'Meta Cloud API is not connected. Please connect your WhatsApp account first.' });
    }

    const token = decrypt(user.apiAccessToken);

    // Call Meta API to delete template (DELETE to {wabaId}/message_templates?name={name})
    const url = `https://graph.facebook.com/v19.0/${user.apiWabaId}/message_templates?name=${encodeURIComponent(name)}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const responseData: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(responseData.error?.message || 'Failed to delete template from Meta.');
    }

    res.json({
      success: true,
      message: 'Template deleted successfully.',
      data: responseData
    });
  } catch (error: any) {
    console.error('Delete Meta template error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete template from Meta.' });
  }
}
