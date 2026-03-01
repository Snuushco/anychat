export interface AgentExample {
  icon: string
  text: string
  prompt: string
}

export interface AgentConfig {
  id: string
  icon: string
  name: string
  description: string
  systemPrompt: string
  category: string
  examples: AgentExample[]
  requiredCapabilities?: string[]
  gradient?: string
}

export const AGENTS: AgentConfig[] = [
  {
    id: "email-assistant",
    icon: "📧",
    name: "Email Assistant",
    description: "Writes and replies to emails in your style",
    category: "productivity",
    gradient: "from-amber-500/20 to-orange-600/10",
    systemPrompt: "You are a professional email assistant. You help with writing, replying to, and improving emails. You write in a professional yet friendly tone, unless the user indicates otherwise. Match the language of the user's request.",
    examples: [
      { icon: "🤒", text: "Write a sick day email", prompt: "Write a professional sick day email for my employer. I'm not feeling well and can't come in today." },
      { icon: "😤", text: "Reply to a complaint", prompt: "Help me write a professional reply to a customer complaint." },
      { icon: "📅", text: "Meeting invitation", prompt: "Write an invitation for a team meeting next Tuesday at 2 PM." },
      { icon: "🙏", text: "Write a thank you email", prompt: "Write a thank you email after a job interview." },
    ],
  },
  {
    id: "planner",
    icon: "📋",
    name: "Planner",
    description: "Plans your day, week, and projects",
    category: "productivity",
    gradient: "from-blue-500/20 to-cyan-600/10",
    systemPrompt: "You are a smart planner and productivity coach. You help with planning days, weeks, and projects. You set priorities, create realistic schedules, and help with time management. Use concrete time blocks and action items.",
    examples: [
      { icon: "📅", text: "Plan my work week", prompt: "Help me plan my work week. I work Monday through Friday, 9 to 5." },
      { icon: "📚", text: "Create a study schedule", prompt: "Create a study schedule for me. I have 3 subjects and 2 weeks until my exams." },
      { icon: "🌅", text: "Plan tomorrow", prompt: "Help me create a productive daily plan for tomorrow." },
      { icon: "🎯", text: "Set priorities", prompt: "I have too many tasks. Help me prioritize and focus." },
    ],
  },
  {
    id: "researcher",
    icon: "🔬",
    name: "Researcher",
    description: "Searches the web and creates summaries",
    category: "research",
    gradient: "from-emerald-500/20 to-green-600/10",
    systemPrompt: "You are a thorough researcher. You analyze topics in depth, provide structured summaries with sources, and present information clearly and objectively. Always provide multiple perspectives.",
    examples: [
      { icon: "📱", text: "Compare iPhone vs Samsung", prompt: "Compare the latest iPhone with the latest Samsung. Which is better and why?" },
      { icon: "📄", text: "Summarize an article", prompt: "Create a clear summary of the following article: [paste your article here]" },
      { icon: "🏆", text: "What's the best...", prompt: "What's the best laptop for students in 2025? Give a top 3 with pros and cons." },
      { icon: "🤔", text: "Explain something", prompt: "Explain in simple terms how artificial intelligence works." },
    ],
  },
  {
    id: "business-coach",
    icon: "💼",
    name: "Business Coach",
    description: "Strategic advice and sparring partner",
    category: "business",
    gradient: "from-violet-500/20 to-purple-600/10",
    systemPrompt: "You are an experienced business coach and strategic advisor. You help with business plans, strategy, growth, and entrepreneurial challenges. You ask sharp questions, give honest advice, and think through opportunities and risks.",
    examples: [
      { icon: "📝", text: "Write a business plan", prompt: "Help me write a business plan for my new venture." },
      { icon: "💰", text: "Pricing strategy", prompt: "Help me determine the right price for my product or service." },
      { icon: "📈", text: "Growth strategy", prompt: "My business has stalled. What strategies can I use to grow again?" },
      { icon: "⚖️", text: "SWOT analysis", prompt: "Create a SWOT analysis for my business." },
    ],
  },
  {
    id: "social-media",
    icon: "📱",
    name: "Social Media",
    description: "Content creation and planning",
    category: "marketing",
    gradient: "from-pink-500/20 to-rose-600/10",
    systemPrompt: "You are a social media expert. You help create engaging content for LinkedIn, Instagram, Twitter/X, and other platforms. You know best practices per platform, write catchy copy, and help with content strategies.",
    examples: [
      { icon: "💼", text: "Write a LinkedIn post", prompt: "Write a professional LinkedIn post about my expertise." },
      { icon: "📸", text: "Create an Instagram caption", prompt: "Create a catchy Instagram caption for my photo." },
      { icon: "📊", text: "Content strategy", prompt: "Create a content strategy for my social media for the coming month." },
      { icon: "🎯", text: "Define target audience", prompt: "Help me define my ideal target audience for social media marketing." },
    ],
  },
  {
    id: "health-coach",
    icon: "🏋️",
    name: "Health Coach",
    description: "Nutrition, fitness, and wellbeing",
    category: "health",
    gradient: "from-green-500/20 to-lime-600/10",
    systemPrompt: "You are a health & wellness coach. You give advice on nutrition, exercise, sleep, and mental wellbeing. You motivate and provide practical, evidence-based tips. No medical advice — refer to professionals for serious issues.",
    examples: [
      { icon: "🥗", text: "Create a weekly meal plan", prompt: "Create a healthy weekly meal plan for me. I don't eat meat." },
      { icon: "🏃", text: "Create a workout plan", prompt: "Create a beginner workout plan for 3 days per week." },
      { icon: "😴", text: "Sleep better", prompt: "I'm sleeping poorly. Give me tips to improve my sleep." },
      { icon: "🧘", text: "Reduce stress", prompt: "I'm very stressed. Give me practical tips to relax." },
    ],
  },
  {
    id: "tutor",
    icon: "🎓",
    name: "Tutor",
    description: "Explains complex topics in simple terms",
    category: "education",
    gradient: "from-indigo-500/20 to-blue-600/10",
    systemPrompt: "You are a patient and enthusiastic tutor. You explain complex topics in a simple, understandable way. Use examples, analogies, and step-by-step explanations. Adapt your level to the user.",
    examples: [
      { icon: "🧮", text: "Explain math", prompt: "Explain step by step how fractions work." },
      { icon: "🌍", text: "Summarize history", prompt: "Give a concise summary of World War II." },
      { icon: "🔬", text: "Understand science", prompt: "Explain in simple terms how photosynthesis works." },
      { icon: "📖", text: "Practice a language", prompt: "Help me improve my Spanish. Give me practice sentences." },
    ],
  },
  {
    id: "custom",
    icon: "⚙️",
    name: "Custom",
    description: "Create your own agent",
    category: "custom",
    gradient: "from-gray-500/20 to-slate-600/10",
    systemPrompt: "",
    examples: [
      { icon: "✨", text: "Give custom instructions", prompt: "I want you to act as a..." },
      { icon: "🎭", text: "Start a roleplay", prompt: "Pretend you're an interviewer and ask me questions about my experience." },
      { icon: "📝", text: "Free chat", prompt: "Hey! I just want to brainstorm." },
    ],
  },
]

export function getAgentById(id: string): AgentConfig | undefined {
  return AGENTS.find(a => a.id === id)
}
