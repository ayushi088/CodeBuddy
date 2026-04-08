# 🚀 Recommendation System Setup Guide

## Quick Start (5 minutes)

### Step 1: Add Environment Variables
```bash
# 1. Open .env.local
# 2. Add these lines:

YOUTUBE_API_KEY=your_key_here
HUGGINGFACE_API_KEY=your_key_here
```

### Step 2: Get API Keys

#### YouTube API Key
- Go to https://console.cloud.google.com/
- Create a new project (or select existing)
- Search for "YouTube Data API v3"
- Click Enable
- Go to Credentials → Create API Key
- Copy and paste in `.env.local`

#### Hugging Face Token
- Go to https://huggingface.co/settings/tokens
- Click "New token"
- Name: "StudyBuddy Recommendation"
- Select "Read" permission
- Copy and paste in `.env.local`

### Step 3: Import and Use

```tsx
import Recommendation from '@/components/recommendation'

export default function Page() {
  return (
    <Recommendation
      focusScore={65}
      emotion="focused"
      weakTopic="Physics"
      quizScore={45}
    />
  )
}
```

Done! 🎉

---

## Integration Examples

### With Study Session
```tsx
import Recommendation from '@/components/recommendation'
import { useStudySession } from '@/hooks/use-study-session'

export default function StudyPage() {
  const { metrics, currentTopic, quiz } = useStudySession()

  return (
    <div>
      <StudySessionComponent />
      <Recommendation
        focusScore={metrics.focusScore}
        emotion={metrics.emotion}
        weakTopic={currentTopic}
        quizScore={quiz.lastScore}
      />
    </div>
  )
}
```

### With Dashboard
```tsx
import Recommendation from '@/components/recommendation'
import { getDashboardMetrics } from '@/lib/db'

export default function DashboardPage() {
  const { focusScore, currentEmotion, weakestTopic, latestQuizScore } =
    await getDashboardMetrics()

  return (
    <Recommendation
      focusScore={focusScore}
      emotion={currentEmotion}
      weakTopic={weakestTopic}
      quizScore={latestQuizScore}
    />
  )
}
```

### Using the Hook
```tsx
'use client'

import { useRecommendation } from '@/hooks/use-recommendation'
import { Button } from '@/components/ui/button'

export default function QuickRecommendation() {
  const { loading, recommendations, fetchRecommendations } = useRecommendation()

  const handleGetRecommendations = async () => {
    await fetchRecommendations({
      focusScore: 45,
      emotion: 'bored',
      weakTopic: 'Calculus',
      quizScore: 35,
    })
  }

  return (
    <div>
      <Button onClick={handleGetRecommendations} disabled={loading}>
        {loading ? '📚 Generating...' : '🎯 Get Help'}
      </Button>

      {recommendations && (
        <div className="mt-4">
          <h3>{recommendations.strategyMessage}</h3>
          <div className="space-y-2">
            {recommendations.videos.map((v) => (
              <a
                key={v.id}
                href={v.link}
                target="_blank"
                className="block text-blue-600 hover:underline"
              >
                🎬 {v.title}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## Testing Locally

### Without API Keys (Mock Mode)
The system automatically falls back to mock data if API keys aren't set. Perfect for development!

1. No need to set environment variables initially
2. Create component: `<Recommendation ... />`
3. Click "Get Recommendations"
4. Mock data will be returned instantly

### With API Keys (Real Data)
Once you add API keys, the system uses real data:

- Real YouTube videos
- Real practice resources
- LLM-generated notes (takes 2-5 seconds)

### Test Different Scenarios

Visit `/recommendation` page to test pre-built scenarios:

- **Struggling Focus**: Low focus (35%), needs easy content
- **Failed Quiz**: Low quiz score (25%), needs practice
- **Bored Learner**: Bored emotion, needs videos
- **Advanced Learner**: High performance (85%), advanced content

---

## Integrating with Existing Features

### Step 1: Get User Metrics

```typescript
// From your study session
const sessionMetrics = {
  focusScore: 65,
  emotion: 'focused',
  currentTopic: 'Physics',
  quizScore: 42,
}
```

### Step 2: Pass to Component

```tsx
<Recommendation
  focusScore={sessionMetrics.focusScore}
  emotion={sessionMetrics.emotion}
  weakTopic={sessionMetrics.currentTopic}
  quizScore={sessionMetrics.quizScore}
/>
```

### Step 3: Get Recommendations

User clicks button → recommendations generated → displayed in tabs

---

## Adding to Study Session Page

### File: `app/(app)/study/page.tsx`

```tsx
'use client'

import { useState } from 'react'
import StudySessionComponent from '@/components/study/study-session-content'
import Recommendation from '@/components/recommendation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function StudyPage() {
  const [sessionMetrics, setSessionMetrics] = useState({
    focusScore: 75,
    emotion: 'focused',
    topic: 'Physics',
    quizScore: 65,
  })

  return (
    <Tabs defaultValue="session">
      <TabsList>
        <TabsTrigger value="session">Study Session</TabsTrigger>
        <TabsTrigger value="recommendations">📚 Recommendations</TabsTrigger>
      </TabsList>

      <TabsContent value="session">
        <StudySessionComponent
          onMetricsUpdate={setSessionMetrics}
        />
      </TabsContent>

      <TabsContent value="recommendations">
        <Recommendation
          focusScore={sessionMetrics.focusScore}
          emotion={sessionMetrics.emotion}
          weakTopic={sessionMetrics.topic}
          quizScore={sessionMetrics.quizScore}
        />
      </TabsContent>
    </Tabs>
  )
}
```

---

## Adding to Dashboard

### File: `components/dashboard/recommendations-widget.tsx`

```tsx
import Recommendation from '@/components/recommendation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function RecommendationsWidget({ userMetrics }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>📚 Study Recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        <Recommendation
          focusScore={userMetrics.focusScore}
          emotion={userMetrics.emotion}
          weakTopic={userMetrics.needsHelpWith}
          quizScore={userMetrics.recentQuizScore}
        />
      </CardContent>
    </Card>
  )
}
```

---

## Handling Errors

### Network Issues
```tsx
import Recommendation from '@/components/recommendation'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function SafeRecommendation(props) {
  return (
    <div>
      <Recommendation {...props} />
      <Alert>
        <AlertDescription>
          If recommendations fail to load, the system will show you mock data
          to get you started immediately.
        </AlertDescription>
      </Alert>
    </div>
  )
}
```

### API Key Missing
The system behaves gracefully:

- **YouTube Key Missing**: Mock videos shown
- **Hugging Face Key Missing**: Mock notes shown
- Both missing: Instant mock data returned

No errors thrown! 🎯

---

## Performance Tips

1. **Use Caching** - Results cached for 5 minutes
   - Same topic = instant second load

2. **Debounce Requests** - Don't fetch on every input change

3. **Lazy Load** - Only show recommendations when needed

4. **Optimize Images** - YouTube thumbnails are small anyway

5. **Pre-fetch** - Generate recommendations in background

---

## Monitoring & Analytics

### Track User Engagement

```tsx
import { trackRecommendationEngagement } from '@/lib/recommendationUtils'

export function RecommendationsTracker() {
  const handleVideoClick = (videoId) => {
    trackRecommendationEngagement(videoId, 'click', {
      source: 'recommendation-component',
      videoTitle: 'Physics Tutorial',
    })
  }

  return (
    // ...
  )
}
```

### Log Metrics

```typescript
// In your analytics service
logEvent('recommendation_generated', {
  strategy: 'video',
  focusScore: 45,
  emotion: 'bored',
  timestamp: new Date(),
})
```

---

## Troubleshooting

### Q: "API key not configured" message appears
**A:** 
1. Add `YOUTUBE_API_KEY` to `.env.local`
2. Restart dev server
3. Mock data will show until key is added

### Q: Recommendations take too long (5+ seconds)
**A:** 
1. Hugging Face inference takes time (2-5s is normal)
2. Use mock data for faster testing
3. Cache will help on repeated queries

### Q: Video links don't work
**A:** 
1. Check YouTube API quota
2. Verify YOUTUBE_API_KEY is valid
3. Mock videos will show as fallback

### Q: LLM notes don't generate
**A:** 
1. Check HUGGINGFACE_API_KEY in `.env.local`
2. Verify token isn't expired
3. Mock notes will show as fallback

### Q: How to disable API calls for development?
**A:** Just don't set environment variables. Mock data will always show.

---

## Production Deployment

### Before Going Live

1. ✅ Add rate limiting to API
2. ✅ Require authentication
3. ✅ Store recommendations in database
4. ✅ Use Redis for caching
5. ✅ Monitor API usage
6. ✅ Set up error logging
7. ✅ Add request throttling

### Example Rate Limiting

```typescript
// app/api/recommendation/route.ts
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const ip = request.ip || 'unknown'
  const limited = await rateLimit(ip, 10, 60000) // 10 requests per minute

  if (limited) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    )
  }

  // ... rest of handler
}
```

---

## Next Steps

1. ✅ Set up API keys
2. ✅ Visit `/recommendation` page to test
3. ✅ Integrate with your existing pages
4. ✅ Customize styling if needed
5. ✅ Deploy to production

Happy studying! 🎓
