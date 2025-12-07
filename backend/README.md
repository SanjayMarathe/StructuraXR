# VR Structural Playground - Backend

This is the backend proxy server for the VR Structural Playground. It handles Claude API calls to avoid CORS issues in the browser.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env` and add your DigitalOcean GradientAI API key:
   ```bash
   DIGITALOCEAN_INFERENCE_KEY=your-gradient-api-key
   GRADIENT_MODEL=llama3.3-70b-instruct
   PORT=3001
   ```
   
   **To get your GradientAI API key:**
   1. Sign up at [DigitalOcean Cloud Console](https://cloud.digitalocean.com/)
   2. Navigate to Gradient Platform → Serverless Inference
   3. Click "Create model access key"
   4. Copy the generated key to `.env`

3. **Start the server:**
   ```bash
   npm start
   ```
   
   Or for auto-reload during development:
   ```bash
   npm run dev
   ```

The server will run on `http://localhost:3001`

## API Endpoints

### POST `/api/generate-structure`
Generate 3D structure from text prompt.

**Request:**
```json
{
  "prompt": "two towers with a bridge"
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {"type": "cube", "pos": [-0.5, 0.5, -2], "size": [0.3, 1, 0.3]},
    {"type": "cube", "pos": [0.5, 0.5, -2], "size": [0.3, 1, 0.3]},
    {"type": "cube", "pos": [0, 1.1, -2], "size": [1.2, 0.1, 0.3]}
  ]
}
```

### POST `/api/analyze-structure`
Analyze existing structure for stability.

**Request:**
```json
{
  "sceneDescription": "cube at (0.00, 0.50, -2.00)\ncube at (1.00, 1.50, -2.00)"
}
```

**Response:**
```json
{
  "success": true,
  "feedback": "The structure shows good foundational support..."
}
```

## Troubleshooting

- **Port already in use:** Change `PORT` in `.env`
- **API key issues:** Verify your `ANTHROPIC_API_KEY` is valid
- **CORS errors:** Make sure the frontend is calling `http://localhost:3001`
