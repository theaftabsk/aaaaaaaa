import prisma from './lib/prisma';

async function main() {
  const flowId = 'dd481f5c-5158-4c21-8a21-14a25f7f1ca2';
  const flow = await prisma.chatbotFlow.findUnique({
    where: { id: flowId },
  });
  console.log('Flow Name:', flow?.name);
  console.log('Updated At:', flow?.updatedAt);
  console.log('Flow JSON:', JSON.stringify(flow?.flowJson, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
