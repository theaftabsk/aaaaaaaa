import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { sendReplyUnified } from '../services/messagingService';
import { io } from '../index';
import { processIncomingMessage } from '../services/flowEngine';

const router = Router();

// Endpoint for Calendly to send booking events to
// Method: POST /api/webhooks/calendly
router.post('/calendly', async (req: Request, res: Response) => {
  try {
    const { event, payload } = req.body;
    
    // In Calendly, 'invitee.created' is triggered when a new booking is made
    if (event !== 'invitee.created') {
      return res.status(200).json({ message: 'Event ignored' });
    }

    const { email, name, questions_and_answers, tracking } = payload;
    
    // To identify WHICH user this booking belongs to, we would normally use the webhook signature
    // or look up the user by a tracking parameter / custom link. 
    // For this MVP, we will assume we can extract the user's email or ID from a tracking param 
    // OR just grab the first user who has a calendlyToken for demonstration purposes.
    // In production, the webhook registration would include a query param ?userId=XXX.
    
    const userId = req.query.userId as string;
    let user;

    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    } else {
      // Fallback for MVP if no userId is passed in the URL
      user = await prisma.user.findFirst({
        where: { calendlyToken: { not: null } }
      });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found for this webhook' });
    }

    // Attempt to find a phone number from Calendly Questions and Answers (e.g. "Phone Number")
    let phone = 'Unknown';
    if (questions_and_answers && Array.isArray(questions_and_answers)) {
      const phoneQuestion = questions_and_answers.find(q => 
        q.question.toLowerCase().includes('phone') || 
        q.question.toLowerCase().includes('whatsapp')
      );
      if (phoneQuestion) {
        phone = phoneQuestion.answer;
      }
    }

    // 1. Create CRM Contact (Lead)
    // Clean phone number: remove non-digits
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone && cleanPhone.length > 5) {
      // Upsert the contact
      const contact = await prisma.contact.upsert({
        where: {
          userId_phone: {
            userId: user.id,
            phone: cleanPhone
          }
        },
        update: {
          name: name,
          tags: {
            // Append Calendly tag if not exists
            push: 'Calendly Lead'
          }
        },
        create: {
          userId: user.id,
          phone: cleanPhone,
          name: name,
          tags: ['Calendly Lead']
        }
      });

      // 2. Send WhatsApp Confirmation
      // In a real app, we would parse the meeting time and link from the payload.
      // For this MVP, we'll send a static-looking dynamic message.
      const meetingLink = payload.join_url || payload.location || 'meet.google.com/auto-generated';
      const meetingTime = payload.start_time || 'soon'; // Would parse ISO date in production

      const messageText = `✅ *Meeting Confirmed!*\n\nHi ${name},\nYour appointment has been successfully scheduled.\n\n📅 *Time:* ${new Date(meetingTime).toLocaleString()}\n🔗 *Link:* ${meetingLink}\n\nThank you for booking with us!`;

      // Send via Unified Messaging Service (will use QR or API depending on user settings)
      await sendReplyUnified(
        'WHATSAPP',
        cleanPhone,
        messageText,
        user.id,
        'API'
      );
    }

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Calendly Webhook Error:', error);
    res.status(500).json({ error: 'Internal server error processing webhook' });
  }
});

// Endpoint for Shopify Webhooks
// Method: POST /api/webhooks/shopify
router.post('/shopify', async (req: Request, res: Response) => {
  try {
    const topic = req.headers['x-shopify-topic'] as string;
    const payload = req.body;
    
    // Validate we have a topic
    if (!topic) {
      return res.status(400).json({ error: 'Missing Shopify topic header' });
    }

    // MVP: For demonstration, try to find a user with a Shopify store connected.
    // In production, you'd match the x-shopify-shop-domain header to the user's store URL.
    const shopDomain = req.headers['x-shopify-shop-domain'] as string;
    
    let user;
    if (shopDomain) {
      user = await prisma.user.findFirst({
        where: { shopifyStoreUrl: { contains: shopDomain } }
      });
    } else {
      user = await prisma.user.findFirst({
        where: { shopifyAccessToken: { not: null } }
      });
    }

    if (!user) {
      return res.status(404).json({ error: 'No associated user found for this Shopify store' });
    }

    // Extract customer info from the payload (Shopify often sends customer obj inside the order/checkout)
    const customer = payload.customer;
    let phone = customer?.phone || customer?.default_address?.phone || payload.phone || payload.billing_address?.phone;
    
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      const name = customer?.first_name ? `${customer.first_name} ${customer.last_name || ''}`.trim() : 'Customer';

      // 1. Sync CRM Contact (Shopify Lead)
      if (cleanPhone.length > 5) {
        await prisma.contact.upsert({
          where: {
            userId_phone: {
              userId: user.id,
              phone: cleanPhone
            }
          },
          update: {
            name: name,
            tags: { push: 'Shopify Customer' }
          },
          create: {
            userId: user.id,
            phone: cleanPhone,
            name: name,
            tags: ['Shopify Customer']
          }
        });

        // 2. Automate WhatsApp Actions based on Topic
        let messageText = '';

        if (topic === 'orders/create') {
          const orderId = payload.name || payload.id;
          const totalPrice = payload.total_price;
          const currency = payload.currency;
          
          messageText = `✅ *Thanks for your order!*\n\nHi ${name},\nYour order ${orderId} has been confirmed.\n\n🛍️ *Amount:* ${currency} ${totalPrice}\n\nWe will notify you once it ships.`;
        } 
        else if (topic === 'checkouts/create' || topic === 'checkouts/update') {
          // Abandoned Cart logic
          const checkoutUrl = payload.abandoned_checkout_url || payload.recovery_url || 'https://your-store.com/checkout';
          messageText = `🛒 *You left items in your cart!*\n\nHi ${name},\nWe noticed you didn't complete your purchase. Complete your order now:\n\n🔗 ${checkoutUrl}\n\nNeed help? Just reply to this message!`;
        }

        if (messageText) {
          await sendReplyUnified(
            'WHATSAPP',
            cleanPhone,
            messageText,
            user.id,
            'API'
          );
        }
      }
    }

    res.status(200).json({ message: 'Shopify Webhook processed successfully' });
  } catch (error) {
    console.error('Shopify Webhook Error:', error);
    res.status(500).json({ error: 'Internal server error processing Shopify webhook' });
  }
});

// Endpoint for Web Chatbot Widget Configuration
// Method: GET /api/webhooks/widget/config
router.get('/widget/config', async (req: Request, res: Response) => {
  const widgetId = req.query.id as string;
  if (!widgetId) return res.status(400).json({ error: 'Missing widget ID' });

  try {
    const user = await prisma.user.findUnique({
      where: { widgetId },
      select: {
        chatbotName: true,
        chatbotColor: true,
        chatbotWelcome: true,
        chatbotFallback: true,
        chatbotIsActive: true,
        aiActive: true,
        aiCreditsBalance: true
      }
    });

    if (!user) return res.status(404).json({ error: 'Widget config not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch widget config' });
  }
});

// Endpoint to generate and serve the Web Chatbot Widget script dynamically
// Method: GET /api/webhooks/widget/embed.js
router.get('/widget/embed.js', async (req: Request, res: Response) => {
  const widgetId = req.query.id as string;
  if (!widgetId) return res.status(400).send('console.error("Vexo Widget: Missing Widget ID");');

  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
    (function() {
      const widgetId = "${widgetId}";
      const serverUrl = "${req.protocol}://${req.get('host')}";
      
      fetch(serverUrl + "/api/webhooks/widget/config?id=" + widgetId)
        .then(res => res.json())
        .then(config => {
          if (!config.chatbotIsActive || config.aiCreditsBalance <= 0) {
            console.log("Vexo Widget is disabled or has insufficient balance.");
            return;
          }
          initChatbotWidget(config);
        })
        .catch(err => console.error("Vexo Chatbot load error:", err));

      function initChatbotWidget(config) {
        const script = document.createElement('script');
        script.src = "https://cdn.socket.io/4.7.2/socket.io.min.js";
        script.onload = () => startChat(config);
        document.head.appendChild(script);
      }

      function startChat(config) {
        const customerId = "cust_" + Math.random().toString(36).substring(2, 9);
        const socket = io(serverUrl);
        socket.emit('widget:join', customerId);

        const container = document.createElement('div');
        container.id = "vexo-widget-container";
        container.style.position = "fixed";
        container.style.bottom = "20px";
        container.style.right = "20px";
        container.style.zIndex = "999999";
        container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

        const bubble = document.createElement('button');
        bubble.innerHTML = "💬";
        bubble.style.width = "60px";
        bubble.style.height = "60px";
        bubble.style.borderRadius = "50%";
        bubble.style.backgroundColor = config.chatbotColor;
        bubble.style.color = "white";
        bubble.style.border = "none";
        bubble.style.fontSize = "24px";
        bubble.style.cursor = "pointer";
        bubble.style.boxShadow = "0 8px 24px rgba(0,0,0,0.15)";
        bubble.style.transition = "transform 0.2s";
        bubble.onmouseenter = () => bubble.style.transform = "scale(1.05)";
        bubble.onmouseleave = () => bubble.style.transform = "scale(1)";

        const chatWindow = document.createElement('div');
        chatWindow.style.display = "none";
        chatWindow.style.flexDirection = "column";
        chatWindow.style.width = "350px";
        chatWindow.style.height = "450px";
        chatWindow.style.backgroundColor = "white";
        chatWindow.style.borderRadius = "20px";
        chatWindow.style.boxShadow = "0 12px 32px rgba(0,0,0,0.2)";
        chatWindow.style.overflow = "hidden";
        chatWindow.style.border = "1px solid #f1f5f9";
        chatWindow.style.position = "absolute";
        chatWindow.style.bottom = "80px";
        chatWindow.style.right = "0";

        const header = document.createElement('div');
        header.style.backgroundColor = config.chatbotColor;
        header.style.color = "white";
        header.style.padding = "16px";
        header.style.fontWeight = "bold";
        header.style.fontSize = "16px";
        header.innerHTML = config.chatbotName;

        const msgList = document.createElement('div');
        msgList.style.flex = "1";
        msgList.style.padding = "16px";
        msgList.style.overflowY = "auto";
        msgList.style.backgroundColor = "#f8fafc";
        msgList.style.display = "flex";
        msgList.style.flexDirection = "column";
        msgList.style.gap = "8px";

        const welcomeMsg = document.createElement('div');
        welcomeMsg.style.backgroundColor = "white";
        welcomeMsg.style.padding = "10px 14px";
        welcomeMsg.style.borderRadius = "0 14px 14px 14px";
        welcomeMsg.style.alignSelf = "flex-start";
        welcomeMsg.style.fontSize = "13px";
        welcomeMsg.style.maxWidth = "80%";
        welcomeMsg.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
        welcomeMsg.innerHTML = config.chatbotWelcome;
        msgList.appendChild(welcomeMsg);

        const inputBar = document.createElement('div');
        inputBar.style.padding = "12px";
        inputBar.style.borderTop = "1px solid #e2e8f0";
        inputBar.style.display = "flex";
        inputBar.style.gap = "8px";

        const input = document.createElement('input');
        input.type = "text";
        input.placeholder = "Type your question...";
        input.style.flex = "1";
        input.style.border = "1px solid #e2e8f0";
        input.style.borderRadius = "10px";
        input.style.padding = "8px 12px";
        input.style.fontSize = "13px";
        input.style.outline = "none";

        const sendBtn = document.createElement('button');
        sendBtn.innerHTML = "✈️";
        sendBtn.style.border = "none";
        sendBtn.style.backgroundColor = config.chatbotColor;
        sendBtn.style.color = "white";
        sendBtn.style.borderRadius = "10px";
        sendBtn.style.padding = "8px 12px";
        sendBtn.style.cursor = "pointer";

        inputBar.appendChild(input);
        inputBar.appendChild(sendBtn);

        chatWindow.appendChild(header);
        chatWindow.appendChild(msgList);
        chatWindow.appendChild(inputBar);

        container.appendChild(chatWindow);
        container.appendChild(bubble);
        document.body.appendChild(container);

        bubble.onclick = () => {
          if (chatWindow.style.display === "none") {
            chatWindow.style.display = "flex";
            bubble.innerHTML = "❌";
          } else {
            chatWindow.style.display = "none";
            bubble.innerHTML = "💬";
          }
        };

        const sendMessage = () => {
          const text = input.value.trim();
          if (!text) return;

          const userBubble = document.createElement('div');
          userBubble.style.backgroundColor = config.chatbotColor;
          userBubble.style.color = "white";
          userBubble.style.padding = "10px 14px";
          userBubble.style.borderRadius = "14px 14px 0 14px";
          userBubble.style.alignSelf = "flex-end";
          userBubble.style.fontSize = "13px";
          userBubble.style.maxWidth = "80%";
          userBubble.innerHTML = text;
          msgList.appendChild(userBubble);
          msgList.scrollTop = msgList.scrollHeight;

          socket.emit('widget:incoming_message', {
            widgetId,
            text,
            customerId
          });

          input.value = "";
        };

        sendBtn.onclick = sendMessage;
        input.onkeypress = (e) => {
          if (e.key === 'Enter') sendMessage();
        };

        socket.on('widget:message', (data) => {
          const botBubble = document.createElement('div');
          botBubble.style.backgroundColor = "white";
          botBubble.style.padding = "10px 14px";
          botBubble.style.borderRadius = "0 14px 14px 14px";
          botBubble.style.alignSelf = "flex-start";
          botBubble.style.fontSize = "13px";
          botBubble.style.maxWidth = "80%";
          botBubble.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
          botBubble.innerHTML = data.text;
          msgList.appendChild(botBubble);
          msgList.scrollTop = msgList.scrollHeight;
        });
      }
    })();
  `);
});

// Endpoint for Meta WhatsApp Cloud API Webhooks (Verification)
// Method: GET /api/webhooks/meta
router.get('/meta', (req: Request, res: Response) => {
  const verify_token = process.env.META_WEBHOOK_VERIFY_TOKEN;

  let mode = req.query['hub.mode'] as string;
  let token = req.query['hub.verify_token'] as string;
  let challenge = req.query['hub.challenge'] as string;

  if (mode && token) {
    if (mode === 'subscribe' && token === verify_token) {
      console.log('META WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

// Endpoint for Meta WhatsApp Cloud API Webhooks (Incoming Messages)
// Method: POST /api/webhooks/meta
router.post('/meta', async (req: Request, res: Response) => {
  const body = req.body;

  if (body.object === 'whatsapp_business_account') {
    res.sendStatus(200); // Always acknowledge immediately to Meta

    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.value && change.value.messages && change.value.messages[0]) {
          const message = change.value.messages[0];
          const metadata = change.value.metadata;
          const phoneNumberId = metadata.phone_number_id;

          const from = message.from; // Sender's phone number
          const text = message.text?.body; // Only handling text for MVP
          
          if (!text) continue;

          try {
            // Find user by apiPhoneNumberId
            const user = await prisma.user.findFirst({
              where: { apiPhoneNumberId: phoneNumberId }
            });

            if (user) {
              // 1. Upsert Contact
              await prisma.contact.upsert({
                where: { userId_phone: { userId: user.id, phone: from } },
                update: { updatedAt: new Date() },
                create: {
                  userId: user.id,
                  phone: from,
                  name: `WhatsApp Lead (${from.slice(-4)})`,
                  channel: 'WHATSAPP'
                }
              });

              // 2. Save incoming message
              const savedMsg = await prisma.message.create({
                data: {
                  userId: user.id,
                  sessionId: 'API', // WhatsApp Cloud API
                  from: from,
                  to: 'Bot',
                  body: text,
                  direction: 'INCOMING',
                  type: 'TEXT',
                  channel: 'WHATSAPP'
                }
              });

              // 3. Emit real-time event to Inbox
              io.to(user.id).emit('whatsapp:message', {
                id: savedMsg.id,
                from: from,
                to: 'Bot',
                body: text,
                direction: 'INCOMING',
                createdAt: savedMsg.createdAt,
                sessionId: 'API'
              });

              // 4. Run Flow Engine / Chatbot logic
              await processIncomingMessage(text, from, user.id, 'WHATSAPP', 'API');
            }
          } catch (error) {
            console.error('Meta Webhook message processing error:', error);
          }
        }
      }
    }
  } else {
    res.sendStatus(404);
  }
});

export default router;
