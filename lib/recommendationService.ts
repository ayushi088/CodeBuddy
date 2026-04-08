import { HfInference } from '@huggingface/inference'

/**
 * Recommendation Strategy Types
 */
export type RecommendationStrategy = 'easy' | 'practice' | 'video' | 'advanced'

/**
 * Video Result from YouTube
 */
export interface VideoResult {
  id: string
  title: string
  link: string
  thumbnail?: string
  duration?: string
}

/**
 * Resource Link
 */
export interface ResourceLink {
  type: 'notes' | 'practice' | 'articles'
  title: string
  link: string
}

/**
 * User Data for Recommendation
 */
export interface UserData {
  focusScore: number
  emotion: string
  weakTopic: string
  quizScore: number
  difficulty?: string
}

/**
 * Final Recommendation Result
 */
export interface RecommendationResult {
  strategy: RecommendationStrategy
  strategyMessage: string
  videos: VideoResult[]
  links: ResourceLink[]
  notes: string
  generatedAt: string
}

/**
 * Rule Engine: Determine strategy based on user data
 */
function determineStrategy(userData: UserData): {
  strategy: RecommendationStrategy
  message: string
} {
  const { focusScore, emotion, quizScore } = userData

  if (focusScore < 50) {
    return {
      strategy: 'easy',
      message: '📚 Focus level is low. Starting with easy-to-digest content.',
    }
  }

  if (quizScore < 40) {
    return {
      strategy: 'practice',
      message: '✏️ Quiz score needs improvement. Fetching practice questions.',
    }
  }

  if (emotion === 'bored' || emotion === 'disengaged') {
    return {
      strategy: 'video',
      message: '🎬 You seem bored. Here are engaging video tutorials.',
    }
  }

  return {
    strategy: 'advanced',
    message: '🚀 You\'re ready for advanced content. Let\'s dig deeper!',
  }
}

/**
 * YouTube Video Fetcher using YouTube Data API v3
 */
async function fetchYouTubeVideos(
  topic: string,
  maxResults: number = 3
): Promise<VideoResult[]> {
  const apiKey = process.env.YOUTUBE_API_KEY

  if (!apiKey) {
    console.warn('YouTube API key not configured, returning mock videos')
    return getMockYouTubeVideos(topic)
  }

  try {
    const searchQuery = `${topic} tutorial`
    const url = new URL('https://www.googleapis.com/youtube/v3/search')
    url.searchParams.append('key', apiKey)
    url.searchParams.append('q', searchQuery)
    url.searchParams.append('part', 'snippet')
    url.searchParams.append('maxResults', maxResults.toString())
    url.searchParams.append('type', 'video')
    url.searchParams.append('order', 'relevance')

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      console.warn('YouTube API error, returning mock videos')
      return getMockYouTubeVideos(topic)
    }

    const data = await response.json()
    return data.items
      .slice(0, maxResults)
      .map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        link: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        thumbnail: item.snippet.thumbnails?.medium?.url,
        duration: undefined, // Duration requires additional API call
      }))
  } catch (error) {
    console.error('Error fetching YouTube videos:', error)
    return getMockYouTubeVideos(topic)
  }
}

/**
 * Mock YouTube videos for development
 */
function getMockYouTubeVideos(topic: string): VideoResult[] {
  return [
    {
      id: 'video1',
      title: `Complete ${topic} Tutorial For Beginners`,
      link: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`,
      thumbnail: `https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg`,
      duration: '15:30',
    },
    {
      id: 'video2',
      title: `${topic} Explained in Simple Terms`,
      link: `https://www.youtube.com/watch?v=1234567890ab`,
      thumbnail: `https://img.youtube.com/vi/1234567890ab/mqdefault.jpg`,
      duration: '12:45',
    },
    {
      id: 'video3',
      title: `${topic} - Advanced Concepts & Tips`,
      link: `https://www.youtube.com/watch?v=abcdef123456`,
      thumbnail: `https://img.youtube.com/vi/abcdef123456/mqdefault.jpg`,
      duration: '18:20',
    },
  ]
}

/**
 * Google Resource Links Generator
 */
function generateResourceLinks(
  topic: string,
  strategy: RecommendationStrategy
): ResourceLink[] {
  const links: ResourceLink[] = []

  // Notes link
  links.push({
    type: 'notes',
    title: `${topic} Study Notes`,
    link: `https://www.google.com/search?q="${topic}+study+notes"`,
  })

  // Practice link
  links.push({
    type: 'practice',
    title: `${topic} Practice Questions`,
    link: `https://www.google.com/search?q="${topic}+practice+questions"`,
  })

  // Additional links based on strategy
  if (strategy === 'advanced') {
    links.push({
      type: 'articles',
      title: `${topic} Advanced Articles`,
      link: `https://www.google.com/search?q="${topic}+advanced+concepts"`,
    })
  }

  if (strategy === 'practice') {
    links.push({
      type: 'articles',
      title: `${topic} Quiz & Assessments`,
      link: `https://www.google.com/search?q="${topic}+quiz+test"`,
    })
  }

  return links
}

/**
 * LLM-Based Notes Generator using Hugging Face
 */
async function generateLLMNotes(
  topic: string,
  strategy: RecommendationStrategy
): Promise<string> {
  const apiKey = process.env.HUGGINGFACE_API_KEY

  if (!apiKey) {
    console.warn('Hugging Face API key not configured, returning mock notes')
    return getMockNotes(topic, strategy)
  }

  try {
    const client = new HfInference(apiKey)

    const prompt = buildPromptForNotes(topic, strategy)

    const response = await client.chatCompletion({
      model: 'mistralai/Mistral-7B-Instruct-v0.2',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    return response.choices[0]?.message?.content?.trim() || getMockNotes(topic, strategy)
  } catch (error) {
    console.error('Error generating LLM notes:', error)
    return getMockNotes(topic, strategy)
  }
}

/**
 * Build prompt for LLM note generation
 */
function buildPromptForNotes(
  topic: string,
  strategy: RecommendationStrategy
): string {
  let depthGuidance = 'beginner-friendly and structured'
  if (strategy === 'advanced') depthGuidance = 'advanced, exam-ready, and conceptually deep'
  if (strategy === 'practice') depthGuidance = 'practice-oriented with clear problem-solving steps'
  if (strategy === 'video') depthGuidance = 'engaging, visual-learning friendly, and concise'

  return `You are a senior academic tutor.

Create professional study notes for the topic: "${topic}".
The notes must be ${depthGuidance}.

Important formatting rules:
- Return plain text only.
- Do not use markdown symbols like #, ##, **, or backticks.
- Use clear section titles in ALL CAPS followed by a colon.
- Use short bullet points with "- " when needed.

Required sections:
1) TOPIC OVERVIEW: 4-6 sentences with definitions and context.
2) CORE CONCEPTS: 6-10 bullet points explaining essential ideas.
3) STEP-BY-STEP UNDERSTANDING: A numbered explanation of how to approach this topic during study.
4) COMMON MISTAKES: 3-5 practical mistakes and how to avoid them.
5) REAL-WORLD APPLICATIONS: 3 concrete applications.
6) QUICK REVISION SHEET: concise formulas/rules/checklist style notes.
7) PRACTICE QUESTIONS: 5 questions, increasing from easy to hard.
8) MODEL ANSWER OUTLINE: short answer skeleton for the hardest question.

Keep the notes accurate, actionable, and classroom-ready.`
}

/**
 * Mock notes for development
 */
function getMockNotes(topic: string, strategy: RecommendationStrategy): string {
  const strategyTip =
    strategy === 'advanced'
      ? 'Focus on derivations, edge cases, and trade-offs between methods.'
      : strategy === 'practice'
        ? 'Focus on repeated problem-solving and checking each step.'
        : strategy === 'video'
          ? 'Use visual examples and short study bursts to stay engaged.'
          : 'Start with fundamentals and build confidence with short revision cycles.'

  return `
PROFESSIONAL STUDY NOTES: ${topic}

TOPIC OVERVIEW:
${topic} is an important academic area that combines foundational theory with practical application. A strong understanding of this topic helps improve analytical thinking, problem-solving speed, and exam performance. The goal is to first master core definitions, then apply them to increasingly complex problems.

CORE CONCEPTS:
- Define the scope of ${topic} and where it is used.
- Learn the essential terminology and notation.
- Distinguish between core principles and secondary details.
- Understand how concepts connect to previously studied topics.
- Identify common patterns that appear in assignments and exams.
- Build a checklist for solving topic-related questions.
- Review one representative example after each concept.

STEP-BY-STEP UNDERSTANDING:
1. Read and summarize the main definition in your own words.
2. Break the topic into 3-5 subtopics and study them one at a time.
3. Solve a basic example for each subtopic before moving on.
4. Compare at least two approaches or methods when applicable.
5. Practice mixed questions under time limits.
6. End with a short recap and error log.

COMMON MISTAKES:
- Memorizing rules without understanding when to apply them.
- Skipping intermediate steps, which causes avoidable errors.
- Confusing similar terms or symbols.
- Not validating final answers against constraints in the question.

REAL-WORLD APPLICATIONS:
- Academic assessments and competitive exams.
- Software, engineering, or analytical workflows depending on curriculum.
- Structured decision-making where clear reasoning is required.

QUICK REVISION SHEET:
- Key idea: Understand concept before memorizing details.
- Exam strategy: Attempt direct questions first, then multi-step ones.
- Review cycle: Learn, practice, correct, and reattempt.
- Study tip: ${strategyTip}

PRACTICE QUESTIONS:
1. State the core definition of ${topic} and one key property.
2. Explain the difference between two major sub-concepts in ${topic}.
3. Solve one standard textbook-style problem on ${topic}.
4. Analyze a case where a common mistake in ${topic} leads to a wrong answer.
5. Design an efficient strategy to solve a harder ${topic} problem under exam constraints.

MODEL ANSWER OUTLINE (FOR QUESTION 5):
- Clarify inputs, constraints, and expected output.
- Select the most suitable method and justify the choice.
- Execute solution steps in logical order.
- Verify correctness with a quick check.
- Conclude with complexity, limitations, or improvement options.
`.trim()
}

/**
 * Get Final Recommendation combining all resources
 */
export async function getFinalRecommendation(
  userData: UserData
): Promise<RecommendationResult> {
  try {
    // Step 1: Determine strategy
    const { strategy, message } = determineStrategy(userData)

    // Step 2: Fetch videos (parallel)
    const videosPromise = fetchYouTubeVideos(userData.weakTopic)

    // Step 3: Generate resource links (synchronous)
    const links = generateResourceLinks(userData.weakTopic, strategy)

    // Step 4: Generate LLM notes (parallel)
    const notesPromise = generateLLMNotes(userData.weakTopic, strategy)

    // Wait for async operations
    const [videos, notes] = await Promise.all([videosPromise, notesPromise])

    return {
      strategy,
      strategyMessage: message,
      videos,
      links,
      notes,
      generatedAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error('Error in getFinalRecommendation:', error)
    throw new Error('Failed to generate recommendations')
  }
}

/**
 * Validate user data
 */
export function validateUserData(data: any): UserData {
  if (
    typeof data.focusScore !== 'number' ||
    data.focusScore < 0 ||
    data.focusScore > 100
  ) {
    throw new Error('focusScore must be a number between 0 and 100')
  }

  if (!data.emotion || typeof data.emotion !== 'string') {
    throw new Error('emotion is required')
  }

  if (!data.weakTopic || typeof data.weakTopic !== 'string') {
    throw new Error('weakTopic is required')
  }

  if (
    typeof data.quizScore !== 'number' ||
    data.quizScore < 0 ||
    data.quizScore > 100
  ) {
    throw new Error('quizScore must be a number between 0 and 100')
  }

  return {
    focusScore: data.focusScore,
    emotion: data.emotion.toLowerCase(),
    weakTopic: data.weakTopic.trim(),
    quizScore: data.quizScore,
    difficulty: data.difficulty || 'medium',
  }
}
