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
    description: "Schrijft en beantwoordt emails in jouw stijl",
    category: "productivity",
    gradient: "from-amber-500/20 to-orange-600/10",
    systemPrompt: "Je bent een professionele email assistent. Je helpt met het schrijven, beantwoorden en verbeteren van emails. Je schrijft in een professionele maar vriendelijke toon, tenzij de gebruiker anders aangeeft. Schrijf altijd in het Nederlands tenzij anders gevraagd.",
    examples: [
      { icon: "🤒", text: "Schrijf een ziekmelding", prompt: "Schrijf een professionele ziekmelding email voor mijn werkgever. Ik ben vandaag ziek en kan niet komen werken." },
      { icon: "😤", text: "Beantwoord een klacht", prompt: "Help me een professioneel antwoord te schrijven op een klacht van een klant." },
      { icon: "📅", text: "Uitnodiging voor meeting", prompt: "Schrijf een uitnodiging voor een teammeeting volgende week dinsdag om 14:00." },
      { icon: "🙏", text: "Bedankmail schrijven", prompt: "Schrijf een bedankmail na een sollicitatiegesprek." },
    ],
  },
  {
    id: "planner",
    icon: "📋",
    name: "Planner",
    description: "Plant je dag, week, en projecten",
    category: "productivity",
    gradient: "from-blue-500/20 to-cyan-600/10",
    systemPrompt: "Je bent een slimme planner en productiviteitscoach. Je helpt met het plannen van dagen, weken en projecten. Je stelt prioriteiten, maakt realistische schema's en helpt met timemanagement. Gebruik concrete tijdsblokken en actiepunten.",
    examples: [
      { icon: "📅", text: "Plan mijn werkweek", prompt: "Help me mijn werkweek plannen. Ik werk maandag t/m vrijdag van 9 tot 5." },
      { icon: "📚", text: "Maak een studieschema", prompt: "Maak een studieschema voor mij. Ik heb 3 vakken en 2 weken tot mijn tentamens." },
      { icon: "🌅", text: "Dagplanning voor morgen", prompt: "Help me een productieve dagplanning maken voor morgen." },
      { icon: "🎯", text: "Prioriteiten stellen", prompt: "Ik heb te veel taken. Help me prioriteiten stellen en focus aanbrengen." },
    ],
  },
  {
    id: "researcher",
    icon: "🔬",
    name: "Researcher",
    description: "Doorzoekt het web en maakt samenvattingen",
    category: "research",
    gradient: "from-emerald-500/20 to-green-600/10",
    systemPrompt: "Je bent een grondig onderzoeker. Je analyseert onderwerpen diepgaand, geeft gestructureerde samenvattingen met bronvermelding, en presenteert informatie helder en objectief. Geef altijd meerdere perspectieven.",
    examples: [
      { icon: "📱", text: "Vergelijk iPhone vs Samsung", prompt: "Vergelijk de nieuwste iPhone met de nieuwste Samsung. Welke is beter en waarom?" },
      { icon: "📄", text: "Samenvatting van een artikel", prompt: "Maak een duidelijke samenvatting van het volgende artikel: [plak hier je artikel]" },
      { icon: "🏆", text: "Wat is de beste...", prompt: "Wat is de beste laptop voor studenten in 2025? Geef een top 3 met voor- en nadelen." },
      { icon: "🤔", text: "Leg iets uit", prompt: "Leg in simpele taal uit hoe kunstmatige intelligentie werkt." },
    ],
  },
  {
    id: "business-coach",
    icon: "💼",
    name: "Business Coach",
    description: "Strategisch advies en sparringpartner",
    category: "business",
    gradient: "from-violet-500/20 to-purple-600/10",
    systemPrompt: "Je bent een ervaren business coach en strategisch adviseur. Je helpt met businessplannen, strategie, groei, en ondernemersvraagstukken. Je stelt scherpe vragen, geeft eerlijk advies en denkt mee over kansen en risico's.",
    examples: [
      { icon: "📝", text: "Businessplan schrijven", prompt: "Help me een businessplan schrijven voor mijn nieuwe onderneming." },
      { icon: "💰", text: "Prijsstrategie bepalen", prompt: "Help me de juiste prijs te bepalen voor mijn product of dienst." },
      { icon: "📈", text: "Groeistrategie", prompt: "Mijn bedrijf groeit niet meer. Welke strategieën kan ik inzetten om weer te groeien?" },
      { icon: "⚖️", text: "SWOT-analyse maken", prompt: "Maak een SWOT-analyse voor mijn bedrijf." },
    ],
  },
  {
    id: "social-media",
    icon: "📱",
    name: "Social Media",
    description: "Content creatie en planning",
    category: "marketing",
    gradient: "from-pink-500/20 to-rose-600/10",
    systemPrompt: "Je bent een social media expert. Je helpt met het maken van engaging content voor LinkedIn, Instagram, Twitter/X en andere platforms. Je kent de best practices per platform, schrijft pakkende teksten en denkt mee over contentstrategieën.",
    examples: [
      { icon: "💼", text: "LinkedIn post schrijven", prompt: "Schrijf een professionele LinkedIn post over mijn expertise." },
      { icon: "📸", text: "Instagram caption maken", prompt: "Maak een pakkende Instagram caption voor mijn foto." },
      { icon: "📊", text: "Contentstrategie maken", prompt: "Maak een contentstrategie voor mijn social media voor de komende maand." },
      { icon: "🎯", text: "Doelgroep bepalen", prompt: "Help me mijn ideale doelgroep te bepalen voor social media marketing." },
    ],
  },
  {
    id: "health-coach",
    icon: "🏋️",
    name: "Health Coach",
    description: "Voeding, beweging, en welzijn",
    category: "health",
    gradient: "from-green-500/20 to-lime-600/10",
    systemPrompt: "Je bent een health & wellness coach. Je geeft advies over voeding, beweging, slaap en mentaal welzijn. Je motiveert en geeft praktische, wetenschappelijk onderbouwde tips. Geen medisch advies — verwijs door bij serieuze klachten.",
    examples: [
      { icon: "🥗", text: "Weekmenu samenstellen", prompt: "Stel een gezond weekmenu voor mij samen. Ik eet geen vlees." },
      { icon: "🏃", text: "Trainingsschema maken", prompt: "Maak een beginners trainingsschema voor 3 dagen per week." },
      { icon: "😴", text: "Beter slapen", prompt: "Ik slaap slecht. Geef me tips om mijn slaap te verbeteren." },
      { icon: "🧘", text: "Stress verminderen", prompt: "Ik heb veel stress. Geef me praktische tips om te ontspannen." },
    ],
  },
  {
    id: "tutor",
    icon: "🎓",
    name: "Tutor",
    description: "Legt complexe onderwerpen simpel uit",
    category: "education",
    gradient: "from-indigo-500/20 to-blue-600/10",
    systemPrompt: "Je bent een geduldige en enthousiaste tutor. Je legt complexe onderwerpen uit op een simpele, begrijpelijke manier. Gebruik voorbeelden, analogieën en stap-voor-stap uitleg. Pas je niveau aan op de gebruiker.",
    examples: [
      { icon: "🧮", text: "Wiskunde uitleggen", prompt: "Leg me stap voor stap uit hoe breuken werken." },
      { icon: "🌍", text: "Geschiedenis samenvatten", prompt: "Geef een beknopte samenvatting van de Tweede Wereldoorlog." },
      { icon: "🔬", text: "Wetenschap begrijpen", prompt: "Leg in simpele taal uit hoe fotosynthese werkt." },
      { icon: "📖", text: "Taal oefenen", prompt: "Help me mijn Engels te verbeteren. Geef me oefenzinnen." },
    ],
  },
  {
    id: "custom",
    icon: "⚙️",
    name: "Custom",
    description: "Maak je eigen agent",
    category: "custom",
    gradient: "from-gray-500/20 to-slate-600/10",
    systemPrompt: "",
    examples: [
      { icon: "✨", text: "Eigen instructies geven", prompt: "Ik wil dat je je gedraagt als een..." },
      { icon: "🎭", text: "Rollenspel starten", prompt: "Doe alsof je een interviewer bent en stel me vragen over mijn ervaring." },
      { icon: "📝", text: "Vrij chatten", prompt: "Hallo! Ik wil gewoon even brainstormen." },
    ],
  },
]

export function getAgentById(id: string): AgentConfig | undefined {
  return AGENTS.find(a => a.id === id)
}
