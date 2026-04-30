## Add Google Gemini API Key

Store the provided API key as a Supabase Edge Function secret named `GOOGLE_GEMINI_API_KEY`. This is the secret that `generate-veo-video` reads via `Deno.env.get("GOOGLE_GEMINI_API_KEY")`.

### Steps
1. Add the secret `GOOGLE_GEMINI_API_KEY` via the secrets manager (value: the key you provided).
2. Verify the secret is registered with `fetch_secrets`.
3. Test `generate-veo-video` with a small prompt (4s, 720p, Veo 3 Fast = ~30 credits) to confirm Google accepts the key and Veo 3 is enabled on your Gemini project.

### Security warning — please act after approval
The key `AIzaSy...LaLk` was sent in plain chat. After we confirm it works:
- Go to https://aistudio.google.com/apikey
- **Delete** this key
- **Create a new one**, then tell me to update the secret

### Notes
- No code changes needed — the edge function already reads this exact secret name.
- If Veo 3 isn't enabled on your Google Cloud billing project, the test call will return a 402/403 and the function will auto-refund the user's VideoAI credits.
