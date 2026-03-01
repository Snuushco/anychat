export interface SuggestedPrompt {
  icon: string
  text: string
  category: string
}

export const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  { icon: "✍️", text: "Write a professional email", category: "writing" },
  { icon: "🔍", text: "Research [topic] and summarize", category: "research" },
  { icon: "💡", text: "Brainstorm ideas for...", category: "creative" },
  { icon: "📊", text: "Analyze this data and share insights", category: "analysis" },
  { icon: "💻", text: "Help me with a coding problem", category: "code" },
  { icon: "📅", text: "Plan my week efficiently", category: "planning" },
]
