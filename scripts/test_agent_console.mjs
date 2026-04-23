const endpoint = "https://insightforgesweden-resource.openai.azure.com";
const apiKey = process.env.AZURE_OPENAI_API_KEY || "TU_API_KEY_AQUI";
const apiVersion = "2024-05-01-preview";
// Usaremos el Concierge Agent que acabamos de crear
const assistantId = "asst_IVhU5JfVbNEXdwrGW753Fmgr"; 

const headers = {
  "api-key": apiKey,
  "Content-Type": "application/json"
};

const baseUrl = `${endpoint}/openai/threads?api-version=${apiVersion}`;

async function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function main() {
  console.log("🤖 Iniciando conversación con el Agente (Concierge) desde consola...");
  
  // 1. Crear Thread
  let res = await fetch(baseUrl, { method: "POST", headers });
  let data = await res.json();
  const threadId = data.id;
  console.log(`✅ Thread creado: ${threadId}`);

  // 2. Enviar mensaje
  const userMessage = "hola";
  console.log(`\n👤 Tú: ${userMessage}`);
  res = await fetch(`${endpoint}/openai/threads/${threadId}/messages?api-version=${apiVersion}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ role: "user", content: userMessage })
  });
  await res.json();

  // 3. Ejecutar Asistente
  res = await fetch(`${endpoint}/openai/threads/${threadId}/runs?api-version=${apiVersion}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ assistant_id: assistantId })
  });
  data = await res.json();
  const runId = data.id;
  console.log(`⏳ Agente analizando solicitud (Run ID: ${runId})...`);

  // 4. Polling
  while (true) {
    res = await fetch(`${endpoint}/openai/threads/${threadId}/runs/${runId}?api-version=${apiVersion}`, { headers });
    data = await res.json();
    if (data.status === "completed" || data.status === "failed") {
      break;
    }
    await sleep(1000);
  }

  if (data.status === "failed") {
    console.error("❌ El agente falló en responder:", data.last_error);
    return;
  }

  // 5. Leer respuesta
  res = await fetch(`${endpoint}/openai/threads/${threadId}/messages?api-version=${apiVersion}`, { headers });
  data = await res.json();
  
  // El primer mensaje en el array es la respuesta más reciente
  const agentResponse = data.data[0].content[0].text.value;
  console.log(`\n🤖 InsightForge AI (Concierge): ${agentResponse}`);
}

main().catch(console.error);
