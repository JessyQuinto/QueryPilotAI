const endpoint = "https://insightforgesweden-resource.openai.azure.com";
const apiKey = process.env.AZURE_OPENAI_API_KEY || "TU_API_KEY_AQUI";
const apiVersion = "2024-05-01-preview";
const deploymentName = "gpt-4o-agents";

const headers = {
  "api-key": apiKey,
  "Content-Type": "application/json"
};

const assistantsUrl = `${endpoint}/openai/assistants?api-version=${apiVersion}`;

async function createAssistant(name, instructions) {
  const payload = {
    name: name,
    instructions: instructions,
    model: deploymentName
  };

  const response = await fetch(assistantsUrl, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Error creating ${name}:`, error);
    return null;
  }

  const data = await response.json();
  console.log(`✅ ${name} created! ID: ${data.id}`);
  return data.id;
}

async function main() {
  console.log("Creando asistentes en Azure OpenAI...");

  // 1. Concierge Agent
  const conciergeInstructions = `Eres el Agente Concierge de InsightForge.
Tu trabajo es clasificar los mensajes del usuario. Si es un saludo o pregunta genérica conversacional, responde amablemente. Si es una pregunta de análisis de datos, tendencias o fraude, indícale brevemente que delegarás la consulta al equipo analítico y clasifica su intención como 'analytical'.`;
  
  // 2. SQL Planner Agent
  const sqlPlannerInstructions = `Eres el Agente SQL Planner experto en Fraude Financiero.
Se te proporcionará el esquema de la base de datos y la pregunta del usuario.
Tu trabajo es generar una consulta SQL en dialecto T-SQL precisa, limpia y altamente optimizada que solo realice lectura (SELECT). 
Si la pregunta es ambigua, solicita aclaraciones (needs_clarification). Si pide datos que no están en el esquema, responde 'unsupported'.`;

  // 3. Result Interpreter Agent
  const interpreterInstructions = `Eres el Agente Executive Interpreter experto en Riesgo y Fraude.
Recibes una pregunta original de negocio, una consulta SQL, y el resultado crudo en formato JSON de la ejecución de esa consulta.
Tu trabajo es analizar los datos devueltos y escribir un resumen ejecutivo en formato Markdown interpretando las tendencias y alertando sobre posibles riesgos que notes en los números. Redacta de forma profesional y orientada a directores de riesgo.`;

  await createAssistant("InsightForge Concierge", conciergeInstructions);
  await createAssistant("InsightForge SQL Planner", sqlPlannerInstructions);
  await createAssistant("InsightForge Result Interpreter", interpreterInstructions);
  
  console.log("Todos los asistentes fueron aprovisionados exitosamente.");
}

main().catch(console.error);
