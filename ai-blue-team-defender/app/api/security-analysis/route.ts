import { generateText, streamText } from "ai"
import { groq } from "@ai-sdk/groq"
import { google } from "@ai-sdk/google"
import { mistral } from "@ai-sdk/mistral"

export const maxDuration = 60

const getModel = (provider: string, apiKeys: any) => {
  switch (provider) {
    case "groq":
      return groq("llama-3.1-70b-versatile", {
        apiKey: apiKeys.groq || process.env.GROQ_API_KEY,
      })
    case "gemini":
      return google("gemini-1.5-pro", {
        apiKey: apiKeys.gemini || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      })
    case "mistral":
      return mistral("mistral-large-latest", {
        apiKey: apiKeys.mistral || process.env.MISTRAL_API_KEY,
      })
    default:
      return groq("llama-3.1-70b-versatile", {
        apiKey: apiKeys.groq || process.env.GROQ_API_KEY,
      })
  }
}

// Multi-agent specialized system prompts
const NETWORK_GUARDIAN_PROMPT = `You are Network Guardian, an AI blue team cyberdefender specializing in deep packet inspection, network traffic analysis, and firewall defense. Focus on network-level threats, intrusion detection, anomalous traffic, and firewall policy recommendations. Be highly technical and thorough in your analysis.`;
const WEB_SHIELD_PROMPT = `You are Web Shield, an AI defender specializing in web application security, OWASP Top 10 risks, WAF configuration, and API security. Focus on web vulnerabilities, web and API attack patterns, and layered web defense. Provide actionable and technical web security advice.`;
const INCIDENT_RESPONDER_PROMPT = `You are Incident Responder, an AI blue team specialist in threat intelligence, incident response, and correlation of security events. Focus on analyzing logs, identifying Indicators of Compromise (IoCs), threat attribution, and recommending incident response steps. Be precise, actionable, and threat-aware.`;

const DEFAULT_PROVIDERS = {
  network: "groq",
  web: "gemini",
  incident: "mistral",
}

export async function POST(req: Request) {
  try {
    const {
      messages,
      provider = "groq",
      apiKeys = {},
      multi = false,
      providers = {},
    } = await req.json()

    if (!multi) {
      // Legacy single-agent behavior
      const model = getModel(provider, apiKeys)
      const result = streamText({
        model,
        system: `You are an expert cybersecurity analyst specializing in blue team defense operations. Your role is to:

1. Analyze security logs, incidents, and threats
2. Provide actionable recommendations for defense
3. Identify attack patterns and indicators of compromise (IoCs)
4. Suggest mitigation strategies and security improvements
5. Help with incident response and forensic analysis

When analyzing security issues:
- Be thorough and technical in your analysis
- Provide specific, actionable recommendations
- Include severity assessments and risk ratings
- Suggest both immediate and long-term solutions
- Consider compliance and regulatory requirements
- Focus on defensive measures and threat hunting

Always maintain a professional, security-focused perspective and prioritize the protection of assets and data.

If multiple AI defenders are active, coordinate your response as part of a multi-layered defense system, focusing on your specialized area while considering the broader security ecosystem.`,
        messages,
        temperature: 0.3, // Lower temperature for more focused security analysis
        maxTokens: 2000,
      })
      return result.toDataStreamResponse()
    }

    // Multi-agent defense (3 parallel agents)
    const mergedProviders = { ...DEFAULT_PROVIDERS, ...providers }
    const agentSpecs = [
      {
        key: "network",
        name: "Network Guardian",
        prompt: NETWORK_GUARDIAN_PROMPT,
      },
      {
        key: "web",
        name: "Web Shield",
        prompt: WEB_SHIELD_PROMPT,
      },
      {
        key: "incident",
        name: "Incident Responder",
        prompt: INCIDENT_RESPONDER_PROMPT,
      },
    ]

    // Run all three agents in parallel
    const agentResults = await Promise.all(
      agentSpecs.map(async (agent) => {
        try {
          const model = getModel(mergedProviders[agent.key], apiKeys)
          const result = await generateText({
            model,
            system: agent.prompt,
            messages,
            temperature: 0.3,
            maxTokens: 800,
          })
          if (result?.text) {
            return { name: agent.name, text: result.text }
          } else {
            return { name: agent.name, text: "_(No output, AI returned no answer.)_" }
          }
        } catch (e: any) {
          return { name: agent.name, text: `**ERROR:** ${e?.message || "Failed to get agent response."}` }
        }
      })
    )

    // Aggregate the markdown string
    const combinedMarkdown =
      agentResults
        .map(
          (r) =>
            `### ${r.name}\n${r.text.trim()}`
        )
        .join("\n\n")

    // Stream the combined result so the useChat hook works as before
    const streamResult = streamText({
      model: {
        async doGenerate(_ctx, _messages, _opts) {
          return { text: combinedMarkdown }
        },
      },
      system: "",
      messages: [],
    })

    return streamResult.toDataStreamResponse()
  } catch (error) {
    console.error("Security analysis error:", error)
    return new Response("Error processing security analysis", { status: 500 })
  }
}
