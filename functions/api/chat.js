export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const apiKey = context.env.GEMINI_API_KEY;
    if (!apiKey) return new Response("API key missing", { status: 500 });

    const body = await request.json();
    const userMessage = body.prompt;

    const model = 'gemma-4-26b-a4b-it';
    const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;

    const payload = {
      systemInstruction: {
        parts: [{ text: "You are Rankra AI. You should speak friendly and encourage the school students. You are the AI made to guide 12th students for career guidance." }]
      },
      contents: [
        { role: "user", parts: [{ text: userMessage }] }
      ],
      generationConfig: {
        thinkingConfig: {
          thinkingLevel: "MINIMAL"
        }
      },
      tools: [
        { googleSearch: {} }
      ]
    };

    const googleResponse = await fetch(googleUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey 
      },
      body: JSON.stringify(payload),
    });

    if (!googleResponse.ok) {
      const errorText = await googleResponse.text();
      return new Response(`Google API Error: ${errorText}`, { status: googleResponse.status });
    }

    return new Response(googleResponse.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      },
    });

  } catch (error) {
    return new Response(error.message, { status: 500 });
  }
}