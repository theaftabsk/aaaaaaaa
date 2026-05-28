import prisma from '../lib/prisma';
import { sendReplyUnified } from './messagingService';

export async function executeNode(
  nodeId: string,
  flow: any,
  cleanIdentifier: string,
  userId: string,
  channel: 'WHATSAPP' | 'TELEGRAM' | 'WEB',
  sessionId?: string // 'API' for WhatsApp Cloud API; bot token for Telegram
): Promise<string | null> {
  const node = flow.nodes?.find((n: any) => n.id === nodeId);
  if (!node) return null;

  console.log(`[Flow Engine] Executing node "${node.id}" of type "${node.type}" on channel "${channel}"`);

  if (node.type === 'reply') {
    const text = node.data?.message;
    if (text) {
      await sendReplyUnified(channel, cleanIdentifier, text, userId, sessionId);
    }
  } else if (node.type === 'buttons') {
    const options = node.data?.options || [];
    const optionsText = options.map((opt: string) => `\n👉 ${opt}`).join('');
    const text = `Please choose an option:${optionsText}`;
    await sendReplyUnified(channel, cleanIdentifier, text, userId, sessionId);
    
    // Pause execution here and return the current node ID to save state
    return node.id;
  } else if (node.type === 'tag') {
    const tag = node.data?.tag;
    if (tag && channel === 'WHATSAPP') {
      await prisma.contact.update({
        where: {
          userId_phone: {
            userId,
            phone: cleanIdentifier,
          },
        },
        data: {
          tags: {
            push: tag,
          },
        },
      }).catch(err => console.error('Add tag to contact error:', err));
      console.log(`[Flow Engine] Added CRM Tag: "${tag}" to contact: ${cleanIdentifier}`);
    }
  } else if (node.type === 'agent') {
    const team = node.data?.agentTeam || 'Admin Team';
    await sendReplyUnified(channel, cleanIdentifier, `[SYSTEM] Handover initiated. You have been transferred to our ${team}.`, userId, sessionId);
    return null;
  } else if (node.type === 'aiReply') {
    const aiCostPerReply = 0.02;
    
    // Check User's Wallet Balance
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    // Check limit
    let isLimitReached = false;
    if (user) {
      if (channel === 'WHATSAPP') {
        isLimitReached = user.aiResponseCount >= user.aiResponseLimit;
      } else if (channel === 'TELEGRAM') {
        if (sessionId) {
          const bot = await prisma.telegramBot.findFirst({
            where: { userId, token: sessionId }
          });
          if (bot) {
            isLimitReached = bot.aiResponseCount >= bot.aiResponseLimit;
          } else {
            isLimitReached = user.aiResponseCountTelegram >= user.aiResponseLimitTelegram;
          }
        } else {
          isLimitReached = user.aiResponseCountTelegram >= user.aiResponseLimitTelegram;
        }
      } else if (channel === 'WEB') {
        isLimitReached = user.aiResponseCountWeb >= user.aiResponseLimitWeb;
      }
    }

    if (!user || user.aiTokensRemaining <= 0 || isLimitReached) {
      const errorMsg = isLimitReached
        ? `[System] Response blocked: AI response limit reached for this channel.`
        : `[System] The AI Assistant is currently unavailable due to insufficient AI tokens in the owner's account.`;
      await sendReplyUnified(channel, cleanIdentifier, errorMsg, userId, sessionId);
      return null;
    }

    // Acknowledge AI is processing (typing indicator equivalent)
    await sendReplyUnified(channel, cleanIdentifier, `*Vexo AI is thinking...*`, userId, sessionId);
    
    // Compile aggregated knowledge base
    const docs = await prisma.knowledgeBase.findMany({
      where: { userId }
    });
    
    let context = '';
    if (docs.length > 0) {
      context = docs.map((d: any) => `[${d.type}] ${d.title}:\n${d.content}`).join('\n\n');
    } else {
      context = user.businessBio || 'We are a helpful business assistant.';
    }

    // Pass custom instructions, personality
    const aiResult = await askAI(cleanIdentifier, context, user.aiInstructions || '', user.aiPersonality);
    const aiResponseText = aiResult.text;
    const tokensUsed = aiResult.tokensUsed;

    // Deduct credits and log usage in a transaction
    const updatePromises: any[] = [
      prisma.user.update({
        where: { id: userId },
        data: {
          aiCreditsBalance: { decrement: Number((tokensUsed / 100).toFixed(4)) },
          aiTokensRemaining: { decrement: tokensUsed },
          aiTokensUsed: { increment: tokensUsed },
          ...(channel === 'WHATSAPP' ? { aiResponseCount: { increment: 1 } } : {}),
          ...(channel === 'TELEGRAM' ? { aiResponseCountTelegram: { increment: 1 } } : {}),
          ...(channel === 'WEB' ? { aiResponseCountWeb: { increment: 1 } } : {})
        }
      }),
      prisma.aiLog.create({
        data: {
          userId,
          channel,
          prompt: 'Flow Builder AI Node Triggered',
          response: aiResponseText,
          tokensUsed: tokensUsed,
          status: 'SUCCESS'
        }
      })
    ];

    if (channel === 'TELEGRAM' && sessionId) {
      updatePromises.push(
        prisma.telegramBot.updateMany({
          where: { token: sessionId },
          data: { aiResponseCount: { increment: 1 } }
        })
      );
    }

    await prisma.$transaction(updatePromises);

    await sendReplyUnified(channel, cleanIdentifier, aiResponseText, userId, sessionId);
  } else if (node.type === 'end') {
    return null;
  }

  // Find next connected nodes via edges with NO label (automatic transition edges)
  const outgoingEdges = flow.edges?.filter((e: any) => e.source === node.id) || [];
  const autoEdge = outgoingEdges.find((e: any) => !e.label && !e.sourceHandle?.startsWith('option-'));

  if (autoEdge) {
    // Advance to next node automatically
    return executeNode(autoEdge.target, flow, cleanIdentifier, userId, channel, sessionId);
  }

  return node.id;
}

async function chargeCredits(userId: string, amount: number, channel: 'WHATSAPP' | 'TELEGRAM' | 'WEB') {
  try {
    const tokensToDeduct = Math.max(1, Math.round(amount * 100));
    const updateData: any = {
      aiCreditsBalance: { decrement: amount },
      aiTokensRemaining: { decrement: tokensToDeduct },
      aiTokensUsed: { increment: tokensToDeduct }
    };
    if (channel === 'WHATSAPP') {
      updateData.aiResponseCount = { increment: 1 };
    } else if (channel === 'TELEGRAM') {
      updateData.aiResponseCountTelegram = { increment: 1 };
    } else if (channel === 'WEB') {
      updateData.aiResponseCountWeb = { increment: 1 };
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData
    });
  } catch (err) {
    console.error('Failed to update credits:', err);
  }
}

async function askAI(prompt: string, context: string, instructions: string, personality: string): Promise<{ text: string, tokensUsed: number }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your-openai-api-key-here') {
    // Quick keyword fallback matching to make the mock AI feel highly responsive
    const bioLines = context.split('\n');
    const matchedLine = bioLines.find(line => 
      prompt.toLowerCase().split(' ').some(word => word.length > 3 && line.toLowerCase().includes(word))
    );
    const replyText = matchedLine 
      ? `🤖 [AI Assistant - ${personality}]: ${matchedLine}`
      : `🤖 [AI Assistant - ${personality}]: Thank you for asking! Based on our FAQs/Knowledge:\n\n"${context.slice(0, 180)}..."\n\n(Note: Setup your OpenAI API key in the backend to enable actual smart GPT replies).`;
    
    // Estimate tokens
    const tokensUsed = Math.ceil((prompt.length + replyText.length) / 4) + 120;
    return { text: replyText, tokensUsed };
  }

  try {
    const systemPrompt = `You are an AI assistant representing our business. 
Your tone/personality style is: ${personality}. 
Custom Instructions: ${instructions || 'Be polite, helpful and concise.'}

Use the following business knowledge base content to answer the user queries. 
Only answer based on this context. Keep answers short, helpful, and under 3 sentences:

${context}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ]
      })
    });
    const data: any = await response.json();
    const text = data.choices?.[0]?.message?.content || 'Sorry, I couldn\'t process that request at this time.';
    const tokensUsed = data.usage?.total_tokens || Math.ceil((prompt.length + text.length) / 4) + 120;
    
    return { text, tokensUsed };
  } catch (err) {
    console.error('LLM API Call failed:', err);
    return { text: 'Sorry, our AI is experiencing high latency. Please try again soon.', tokensUsed: 0 };
  }
}

export async function processIncomingMessage(
  incomingTextRaw: string,
  cleanIdentifier: string,
  userId: string,
  channel: 'WHATSAPP' | 'TELEGRAM' | 'WEB',
  sessionId?: string
) {
  try {
    const incomingText = incomingTextRaw.trim().toLowerCase();

    // 1. Fetch user data and validate balance
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    let bot = null;
    if (channel === 'TELEGRAM' && sessionId) {
      bot = await prisma.telegramBot.findFirst({
        where: { userId, token: sessionId }
      });
    }

    if (user.aiTokensRemaining <= 0) {
      console.warn(`[Bot Engine] Response blocked for user ${userId}: AI tokens exhausted.`);
      return;
    }

    // Check if Human Takeover (isBotPaused) is active for this contact
    if (channel === 'TELEGRAM') {
      const tgContact = await prisma.telegramContact.findFirst({
        where: { userId, chatId: cleanIdentifier },
      });
      if (tgContact?.isBotPaused) {
        console.log(`[Bot Engine] Telegram bot is paused for chat ${cleanIdentifier} (Human Takeover).`);
        return;
      }
    } else {
      const contact = await prisma.contact.findFirst({
        where: { userId, phone: cleanIdentifier },
      });
      if (contact?.isBotPaused) {
        console.log(`[Bot Engine] Bot is paused for WhatsApp/Web contact ${cleanIdentifier} (Human Takeover).`);
        return;
      }
    }

    // Human Takeover Trigger Keywords Check (Auto-Pause Bot)
    const takeoverKeywords = (user.aiTakeoverKeywords || 'human,support,agent')
      .split(',')
      .map((k: string) => k.trim().toLowerCase())
      .filter(Boolean);
    
    const isTakeoverRequested = takeoverKeywords.some((kw: string) => incomingText.includes(kw));
    if (isTakeoverRequested) {
      if (channel === 'TELEGRAM') {
        await prisma.telegramContact.updateMany({
          where: { userId, chatId: cleanIdentifier },
          data: { isBotPaused: true }
        });
      } else {
        await prisma.contact.updateMany({
          where: { userId, phone: cleanIdentifier },
          data: { isBotPaused: true }
        });
      }
      console.log(`[Bot Engine] Bot paused automatically for ${cleanIdentifier} on ${channel} (Takeover keyword matched).`);
      await sendReplyUnified(channel, cleanIdentifier, 'Transferring you to a live support agent. Please wait...', userId, sessionId);
      await chargeCredits(userId, 0.005, channel);
      return;
    }

    // Reset or exit flow
    if (incomingText === 'reset' || incomingText === 'exit') {
      await prisma.conversationState.deleteMany({
        where: { phone: cleanIdentifier, channel },
      });
      await sendReplyUnified(channel, cleanIdentifier, 'Conversation state has been reset. Send trigger to start.', userId, sessionId);
      await chargeCredits(userId, 0.005, channel);
      return;
    }

    // 2. Fetch active session state for this contact
    let sessionState = await prisma.conversationState.findUnique({
      where: { phone_channel: { phone: cleanIdentifier, channel } },
    });

    let activeFlows: any[] = [];
    if (channel === 'TELEGRAM') {
      if (bot && bot.chatbotFlowId) {
        const flow = await prisma.chatbotFlow.findFirst({
          where: { id: bot.chatbotFlowId, userId, isActive: true }
        });
        if (flow) activeFlows = [flow];
      }
    } else if (channel === 'WHATSAPP') {
      if (user && user.whatsappFlowId) {
        const flow = await prisma.chatbotFlow.findFirst({
          where: { id: user.whatsappFlowId, userId, isActive: true }
        });
        if (flow) activeFlows = [flow];
      } else {
        activeFlows = await prisma.chatbotFlow.findMany({
          where: {
            userId,
            isActive: true,
          },
        });
      }
    } else {
      activeFlows = await prisma.chatbotFlow.findMany({
        where: {
          userId,
          isActive: true,
        },
      });
    }

    let flowExecuted = false;

    // 3. Traversal Logic
    if (!sessionState) {
      // Find starting trigger match
      let matchedFlow = null;
      let matchedTriggerNode = null;

      for (const flow of activeFlows) {
        const json = flow.flowJson as any;
        if (json && Array.isArray(json.nodes)) {
          const triggerNode = json.nodes.find(
            (n: any) =>
              n.type === 'trigger' &&
              Array.isArray(n.data?.keywords) &&
              n.data.keywords.some((kw: string) => incomingText.includes(kw.trim().toLowerCase()))
          );
          if (triggerNode) {
            matchedFlow = flow;
            matchedTriggerNode = triggerNode;
            break;
          }
        }
      }

      if (matchedFlow && matchedTriggerNode) {
        flowExecuted = true;
        const json = matchedFlow.flowJson as any;
        const resultNodeId = await executeNode(matchedTriggerNode.id, json, cleanIdentifier, userId, channel, sessionId);

        if (resultNodeId) {
          // Set active session state
          await prisma.conversationState.upsert({
            where: { phone_channel: { phone: cleanIdentifier, channel } },
            update: {
              currentNodeId: resultNodeId,
              channel,
              updatedAt: new Date(),
            },
            create: {
              userId,
              phone: cleanIdentifier,
              currentNodeId: resultNodeId,
              channel,
            },
          });
        }
        await chargeCredits(userId, 0.005, channel);
      }
    } else {
      // Customer has an active session state
      let currentFlow = null;
      let currentNode = null;

      for (const flow of activeFlows) {
        const json = flow.flowJson as any;
        if (json && Array.isArray(json.nodes)) {
          const node = json.nodes.find((n: any) => n.id === sessionState!.currentNodeId);
          if (node) {
            currentFlow = flow;
            currentNode = node;
            break;
          }
        }
      }

      if (currentFlow && currentNode) {
        const json = currentFlow.flowJson as any;
        const outgoingEdges = json.edges?.filter((e: any) => e.source === currentNode.id) || [];

        // Match incoming input to transition edges
        let matchedEdge = null;

        // If sitting on a Buttons node, match by option index or text contents
        if (currentNode.type === 'buttons') {
          const options = currentNode.data?.options || [];
          const matchedOptionIndex = options.findIndex((opt: string) => {
            const cleanOpt = opt.toLowerCase();
            return cleanOpt.includes(incomingText) ||
                   (opt.match(/\d+/) && opt.match(/\d+/)![0] === incomingText);
          });

          if (matchedOptionIndex !== -1) {
            matchedEdge = outgoingEdges.find(
              (e: any) => e.sourceHandle === `option-${matchedOptionIndex}`
            );
          }
        }

        // Fallback: match by edge label directly
        if (!matchedEdge) {
          matchedEdge = outgoingEdges.find(
            (e: any) => e.label && e.label.trim().toLowerCase() === incomingText
          );
        }

        // If we matched a button option but there's no connected edge, the flow simply ends here.
        if (!matchedEdge && currentNode.type === 'buttons') {
          const options = currentNode.data?.options || [];
          const matchedOptionIndex = options.findIndex((opt: string) => {
            const cleanOpt = opt.toLowerCase();
            return cleanOpt.includes(incomingText) ||
                   (opt.match(/\d+/) && opt.match(/\d+/)![0] === incomingText);
          });
          
          if (matchedOptionIndex !== -1) {
            flowExecuted = true;
            // Clean up session state since there is no next node
            await prisma.conversationState.deleteMany({
              where: { phone: cleanIdentifier, channel },
            });
            await chargeCredits(userId, 0.005, channel);
            return;
          }
        }

        if (matchedEdge) {
          flowExecuted = true;
          const resultNodeId = await executeNode(matchedEdge.target, json, cleanIdentifier, userId, channel, sessionId);
          
          if (resultNodeId) {
            // Transition state to next node
            await prisma.conversationState.update({
              where: { phone_channel: { phone: cleanIdentifier, channel } },
              data: {
                currentNodeId: resultNodeId,
                updatedAt: new Date(),
              },
            });
          } else {
            // Flow finished, clean up session state
            await prisma.conversationState.deleteMany({
              where: { phone: cleanIdentifier, channel },
            });
          }
          await chargeCredits(userId, 0.005, channel);
          return;
        }

        // If input didn't match transition edge, check if customer typed a completely new trigger keyword
        let newMatchedFlow = null;
        let newMatchedTriggerNode = null;

        for (const flow of activeFlows) {
          const fJson = flow.flowJson as any;
          if (fJson && Array.isArray(fJson.nodes)) {
            const tNode = fJson.nodes.find(
              (n: any) =>
                n.type === 'trigger' &&
                Array.isArray(n.data?.keywords) &&
                n.data.keywords.some((kw: string) => incomingText.includes(kw.trim().toLowerCase()))
            );
            if (tNode) {
              newMatchedFlow = flow;
              newMatchedTriggerNode = tNode;
              break;
            }
          }
        }

        if (newMatchedFlow && newMatchedTriggerNode) {
          flowExecuted = true;
          const fJson = newMatchedFlow.flowJson as any;
          const resultNodeId = await executeNode(newMatchedTriggerNode.id, fJson, cleanIdentifier, userId, channel, sessionId);
          
          if (resultNodeId) {
            await prisma.conversationState.update({
              where: { phone_channel: { phone: cleanIdentifier, channel } },
              data: {
                currentNodeId: resultNodeId,
                updatedAt: new Date(),
              },
            });
          } else {
            await prisma.conversationState.deleteMany({
              where: { phone: cleanIdentifier, channel },
            });
          }
          await chargeCredits(userId, 0.005, channel);
        }
      }
    }

    // 4. Fallback Logic: Flow mismatch triggers AI FAQ or Fallback message
    if (!flowExecuted) {
      let isAiActive = false;
      let isLimitReached = false;

      if (channel === 'WHATSAPP') {
        isAiActive = user.aiActive;
        isLimitReached = user.aiResponseCount >= user.aiResponseLimit;
      } else if (channel === 'TELEGRAM') {
        if (bot) {
          isAiActive = bot.aiActive;
          isLimitReached = bot.aiResponseCount >= bot.aiResponseLimit;
        } else {
          isAiActive = user.aiActiveTelegram;
          isLimitReached = user.aiResponseCountTelegram >= user.aiResponseLimitTelegram;
        }
      } else if (channel === 'WEB') {
        isAiActive = user.aiActiveWeb;
        isLimitReached = user.aiResponseCountWeb >= user.aiResponseLimitWeb;
      }

      if (isAiActive && !isLimitReached) {
        // Compile aggregated knowledge base
        const docs = await prisma.knowledgeBase.findMany({
          where: { userId }
        });
        
        let context = '';
        if (docs.length > 0) {
          context = docs.map((d: any) => `[${d.type}] ${d.title}:\n${d.content}`).join('\n\n');
        } else {
          context = user.businessBio || 'We are a helpful business assistant.';
        }

        // Send a typing-like thinking indicator
        await sendReplyUnified(channel, cleanIdentifier, `*Vexo AI is thinking...*`, userId, sessionId);
        
        const aiResult = await askAI(incomingTextRaw, context, user.aiInstructions || '', user.aiPersonality);
        const aiReplyText = aiResult.text;
        const tokensUsed = aiResult.tokensUsed;

        await sendReplyUnified(channel, cleanIdentifier, aiReplyText, userId, sessionId);
        
        // Log AI response in AiLog
        await prisma.aiLog.create({
          data: {
            userId,
            channel,
            prompt: incomingTextRaw,
            response: aiReplyText,
            tokensUsed: tokensUsed,
            status: 'SUCCESS'
          }
        });

        // Deduct actual tokens and credit balances
        const creditDeduction = Number((tokensUsed / 100).toFixed(4));
        const updateData: any = {
          aiCreditsBalance: { decrement: creditDeduction },
          aiTokensRemaining: { decrement: tokensUsed },
          aiTokensUsed: { increment: tokensUsed }
        };
        if (channel === 'WHATSAPP') {
          updateData.aiResponseCount = { increment: 1 };
        } else if (channel === 'TELEGRAM') {
          updateData.aiResponseCountTelegram = { increment: 1 };
        } else if (channel === 'WEB') {
          updateData.aiResponseCountWeb = { increment: 1 };
        }

        const updatePromises: any[] = [
          prisma.user.update({
            where: { id: userId },
            data: updateData
          })
        ];

        if (channel === 'TELEGRAM' && sessionId) {
          updatePromises.push(
            prisma.telegramBot.updateMany({
              where: { token: sessionId },
              data: { aiResponseCount: { increment: 1 } }
            })
          );
        }

        await prisma.$transaction(updatePromises);
      } else {
        const fallbackText = isLimitReached 
          ? "AI response limit reached for this channel. Please contact support or buy more tokens."
          : (user.chatbotFallback || "Sorry, I didn't catch that. Please try another option.");
        await sendReplyUnified(channel, cleanIdentifier, fallbackText, userId, sessionId);
        
        await chargeCredits(userId, 0.005, channel); // Deduct for standard fallback message
      }
    }
  } catch (error) {
    console.error('Chatbot auto-reply error:', error);
  }
}
