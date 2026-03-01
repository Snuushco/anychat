export interface SuggestedPrompt {
  icon: string
  text: string
  category: string
}

export const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  { icon: "✍️", text: "Schrijf een professionele email", category: "writing" },
  { icon: "🔍", text: "Onderzoek [onderwerp] en maak een samenvatting", category: "research" },
  { icon: "💡", text: "Brainstorm ideeën voor...", category: "creative" },
  { icon: "📊", text: "Analyseer deze data en geef inzichten", category: "analysis" },
  { icon: "💻", text: "Help me met een code probleem", category: "code" },
  { icon: "📅", text: "Plan mijn week efficiënt", category: "planning" },
]
