# 🎯 Emotion Detection Setup Guide

This guide helps you set up the emotion detection feature in CodeBuddy.

## What's New

The study session now includes real-time emotion detection using AI:
- **Live Emotion Recognition**: Detects emotions from webcam feed during study sessions
- **Dashboard Display**: Shows emotion breakdowns (Happy, Sad, Neutral, Angry, Fear, Disgust, Surprise)
- **Focus Correlation**: Emotion data helps gauge study focus and engagement
- **Session History**: Emotions are tracked throughout the study session

## How It Works

1. When you click **"Start Study Session"**, the webcam activates
2. Every 3 seconds, a frame is captured and analyzed for emotions
3. The detected emotion and confidence level appear on the dashboard
4. Emotion data is stored for session completion review
5. All emotions with their percentages are displayed in the **"Current Emotion"** widget

## Setup Instructions

### Option 1: Using Hugging Face (Recommended)

#### Step 1: Create a Hugging Face Account
1. Go to https://huggingface.co/
2. Click "Sign Up" and create an account
3. Verify your email

#### Step 2: Generate an API Token
1. Visit https://huggingface.co/settings/tokens
2. Click "New token"
3. Give it a name: `CodeBuddy-Emotion-Detection`
4. Select "Read" access level
5. Click "Generate"
6. Copy the token (you'll need it next)

#### Step 3: Configure Your Environment
1. Open the `.env.local` file in your project root
2. Add the following line:
   ```
   NEXT_PUBLIC_HF_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
   Replace with your actual token from Step 2

3. Save the file

#### Step 4: Restart the Development Server
```bash
npm run dev
```

### Option 2: Using Mock Data (For Testing)

If you don't want to set up an API key, the app will automatically use mock emotion data for testing:
- Emotions are randomly generated
- All features work normally
- Perfect for development and testing

## Features

### Real-Time Emotion Display
```
😊 Happy: 45%
😐 Neutral: 30%
😢 Sad: 15%
😠 Angry: 5%
😨 Fear: 3%
🤢 Disgust: 1%
😲 Surprise: 1%
```

### Study Readiness Indicator
- **Happy/Surprise**: Optimal (95% ready)
- **Neutral**: Good (70% ready)
- **Other emotions**: Low focus (40% ready)

### Emotion History Tracking
- Emotions are collected every 3 seconds
- Full session history available after session ends
- Can be exported for analysis

## Emotion Model Used

**Model**: `trpakov/vit-face-expression` (Vision Transformer)
- Trained on diverse facial expressions
- Works on different lighting conditions
- Fast inference (~100ms per frame)
- Supports 7 emotion categories

## Privacy & Data

- Images are only sent to Hugging Face for analysis
- Raw face images are NOT stored
- Only emotion classifications are saved
- You can disable emotion detection anytime

## Troubleshooting

### "Camera permission was denied"
- Check browser camera permissions
- Go to browser settings → Privacy → Camera
- Ensure CodeBuddy has permission

### "Emotion detection not working"
- Verify `.env.local` has correct API key
- Check Hugging Face API token hasn't expired
- Look at browser console for errors (`F12` → Console tab)

### "Slow emotion detection"
- Check internet connection speed
- Hugging Face API might be slow during peak hours
- Reduce webcam resolution in settings

### "Face not detected"
- Ensure adequate lighting
- Position face clearly in frame
- Clear framerate camera lens

## Advanced Configuration

### Changing Emotion Model

Edit `lib/emotion-detection.ts`:
```typescript
const result = await hf.imageClassification({
  model: 'your-model-id', // Change this
  data: blobData as Blob,
})
```

Alternative models:
- `trpakov/vit-face-expression` (Default - Recommended)
- `google/vit-base-patch16-224` (General image classification)

### Adjusting Analysis Frequency

Edit `components/study/webcam-monitor.tsx`:
```typescript
// Analyze every X milliseconds
const interval = setInterval(analyzeFrame, 3000) // Change 3000 to your value
```

Lower values = more frequent analysis (uses more API calls)

## Costs

- **Hugging Face Free Tier**: 30,000 requests/month
- **10 seconds session**: ~200 API calls
- **1 hour session**: ~1,200 API calls
- Free tier covers ~25 hours of study per month

## Next Steps

1. Set up your Hugging Face token
2. Restart the dev server
3. Start a study session and test emotion detection
4. Check the dashboard for emotion stats
5. Review reports after session completes

## Support

For issues:
1. Check browser console (`F12` → Console)
2. Verify API key is correct
3. Test with mock data first
4. Check Hugging Face status page

---

**Happy studying with emotion awareness!** 🎓✨
