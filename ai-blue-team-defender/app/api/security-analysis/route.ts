import { streamText } from "ai"
import { groq } from "@ai-sdk/groq"
import { google } from "@ai-sdk/google"
import { mistral } from "@ai-sdk/mistral"

export const maxDuration = 30

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

const SECURITY_SYSTEM_PROMPT = `You are an expert cybersecurity analyst specializing in blue team defense operations. Your role is to:

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

If multiple AI defenders are active, coordinate your response as part of a multi-layered defense system, focusing on your specialized area while considering the broader security ecosystem.`

export async function POST(req: Request) {
  try {
    const { messages, provider = "groq", apiKeys = {} } = await req.json()

    const model = getModel(provider, apiKeys)

    const result = streamText({
      model,
      system: SECURITY_SYSTEM_PROMPT,
      messages,
      temperature: 0.3, // Lower temperature for more focused security analysis
      maxTokens: 2000,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error("Security analysis error:", error)
    return new Response("Error processing security analysis", { status: 500 })
  }
}
