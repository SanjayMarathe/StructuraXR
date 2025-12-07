# DigitalOcean GradientAI Migration Guide

## ✅ Migration Complete!

All 4 Claude agents have been replaced with DigitalOcean GradientAI.

## 📋 Changes Made

### 1. Created `GradientAIClient.js`
- New client class that replaces Anthropic SDK
- Uses DigitalOcean GradientAI REST API
- Maintains Anthropic-compatible interface for easy migration

### 2. Updated `server.js`
- Removed `@anthropic-ai/sdk` import
- Added `GradientAIClient` import
- Replaced all 4 `anthropic.messages.create()` calls with `gradientAI.messages_create()`
- Updated response parsing to handle GradientAI format

### 3. Updated `package.json`
- Removed `@anthropic-ai/sdk` dependency

### 4. Updated `README.md`
- Changed environment variable instructions
- Added GradientAI API key setup steps

## 🔧 Setup Instructions

### 1. Get DigitalOcean GradientAI API Key

1. Sign up at [DigitalOcean Cloud Console](https://cloud.digitalocean.com/)
2. Navigate to **Gradient Platform** → **Serverless Inference**
3. Click **"Create model access key"**
4. Provide a name and create the key
5. Copy the generated API key

### 2. Update `.env` File

Replace or add these variables:

```env
# Remove old:
# ANTHROPIC_API_KEY=sk-ant-...

# Add new:
DIGITALOCEAN_INFERENCE_KEY=your-gradient-api-key-here
GRADIENT_MODEL=llama3.3-70b-instruct
PORT=3001
```

### 3. Install Dependencies

```bash
cd backend
npm install
```

Note: The `@anthropic-ai/sdk` package has been removed from dependencies.

### 4. Test the Migration

```bash
npm start
```

The server should start without errors. Test each endpoint:

- ✅ `/api/generate-structure` - Parameter selection
- ✅ `/api/analyze-structure` - Structure analysis
- ✅ `/api/analyze-vector` - 5-agent vector analysis
- ✅ `/api/generate-variants` - Multi-agent variant generation

## 🔍 API Endpoints Updated

### 1. `/api/generate-structure` (Line ~56)
- **Before:** `anthropic.messages.create()` with Claude model
- **After:** `gradientAI.messages_create()` with GradientAI model

### 2. `/api/analyze-structure` (Line ~135)
- **Before:** `anthropic.messages.create()` with Claude model
- **After:** `gradientAI.messages_create()` with GradientAI model

### 3. `/api/analyze-vector` (Line ~247)
- **Before:** `anthropic.messages.create()` with Claude model
- **After:** `gradientAI.messages_create()` with GradientAI model

### 4. `/api/generate-variants` (Line ~311)
- **Before:** `anthropic.messages.create()` with Claude model
- **After:** `gradientAI.messages_create()` with GradientAI model

## 📝 Response Format Handling

The `GradientAIClient` handles response format differences:

```javascript
// Returns in Anthropic-compatible format:
{
    content: [{ text: "..." }],
    text: "..."
}

// Usage (same as before):
const message = await gradientAI.messages_create({...});
const responseText = message.text || message.content[0].text;
```

## ⚠️ Important Notes

1. **API Endpoint:** Verify the correct GradientAI API endpoint URL
   - Current: `https://api.gradient.ai/v1`
   - May need adjustment based on DigitalOcean documentation

2. **Model Names:** GradientAI uses different model names
   - Default: `llama3.3-70b-instruct`
   - Check available models in GradientAI dashboard

3. **Rate Limits:** GradientAI may have different rate limits than Anthropic
   - Monitor API usage in DigitalOcean dashboard

4. **Response Format:** GradientAI response structure may differ
   - The client handles common variations
   - Check console logs if responses seem incorrect

5. **JSON Output:** GradientAI models may need stricter JSON instructions
   - Current prompts already emphasize JSON-only output
   - May need adjustment if JSON parsing fails

## 🐛 Troubleshooting

### Error: "GradientAI API error: 401"
- Check that `DIGITALOCEAN_INFERENCE_KEY` is set correctly
- Verify API key is valid in DigitalOcean dashboard

### Error: "GradientAI API error: 404"
- Verify the API endpoint URL is correct
- Check DigitalOcean documentation for current endpoint

### Error: "Invalid JSON response"
- GradientAI model may be adding explanatory text
- Check console logs for raw response
- May need to adjust prompts for stricter JSON output

### Error: "Model not found"
- Verify model name is correct
- Check available models in GradientAI dashboard
- Update `GRADIENT_MODEL` in `.env` if needed

## 📚 Resources

- [DigitalOcean GradientAI Documentation](https://docs.digitalocean.com/products/ai/gradient/)
- [GradientAI API Reference](https://docs.gradient.ai/)

## ✅ Verification Checklist

- [ ] API key added to `.env`
- [ ] Model name set in `.env`
- [ ] Dependencies installed (`npm install`)
- [ ] Server starts without errors
- [ ] Structure generation works
- [ ] Structure analysis works
- [ ] Vector analysis works
- [ ] Variant generation works

