import prisma from './lib/prisma';

async function main() {
  const flowId = 'dd481f5c-5158-4c21-8a21-14a25f7f1ca2';
  console.log('Manually updating flow:', flowId);

  const testFlowJson = {
    nodes: [
      {
        id: 'node_trigger_123',
        type: 'trigger',
        position: { x: 250, y: 150 },
        data: { keywords: ['hi', 'hello'] }
      },
      {
        id: 'node_reply_456',
        type: 'reply',
        position: { x: 250, y: 350 },
        data: { message: 'Hello! Welcome to Vexo CRM' }
      }
    ],
    edges: [
      {
        id: 'reactflow__edge-node_trigger_123-node_reply_456',
        source: 'node_trigger_123',
        target: 'node_reply_456',
        type: 'smoothstep',
        animated: true
      }
    ]
  };

  const updated = await prisma.chatbotFlow.update({
    where: { id: flowId },
    data: {
      flowJson: testFlowJson,
      triggerKeywords: ['hi', 'hello']
    }
  });

  console.log('Update successful. Current flowJson:');
  console.log(JSON.stringify(updated.flowJson, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
