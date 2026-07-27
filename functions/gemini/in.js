export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const acceptHeader = request.headers.get("accept") || "";
  const formatParam = url.searchParams.get("format");

  const responseData = {
    status: "success",
    environment: "API Testing",
    message: "Welcome to Rankra Gemini API Testing Endpoint",
    product: {
      name: "Rankra",
      tagline: "Empowering Students with Precision Admission Insights",
      description: "Rankra is an independent educational data platform built to provide clear, accurate, and actionable college cutoff insights and career guidance for students in Tamil Nadu.",
      features: [
        "TNEA College Cutoff Search & Rank Analysis",
        "Interactive Course & Institution Insights",
        "AI-Powered Career Guidance",
        "Personalized Student & Educator Analytics"
      ],
      developer: "vigneswaran",
      location: "Thiruvarur, Tamil Nadu",
      website: "https://rankra.in"
    },
    testing: {
      isApiTesting: true,
      mode: "Gemini API Testing & Verification",
      timestamp: new Date().toISOString()
    }
  };

  const isJsonRequested = formatParam === "json" || (acceptHeader.includes("application/json") && !acceptHeader.includes("text/html"));

  if (isJsonRequested) {
    return new Response(JSON.stringify(responseData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache"
      }
    });
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": responseData.product.name,
    "description": responseData.product.description,
    "applicationCategory": "EducationalApplication",
    "operatingSystem": "Web",
    "url": responseData.product.website,
    "author": {
      "@type": "Person",
      "name": responseData.product.developer
    }
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rankra - Product Overview & Gemini API Testing</title>
  <meta name="description" content="${responseData.product.description}">
  <meta property="og:title" content="Rankra - Product Overview & Gemini API Testing">
  <meta property="og:description" content="${responseData.product.description}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://rankra.in/gemini/in">
  <script type="application/ld+json">
    ${JSON.stringify(jsonLd, null, 2)}
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-color: #f8fafc;
      --card-bg: #ffffff;
      --text-main: #0f172a;
      --text-muted: #475569;
      --border-color: #e2e8f0;
      --accent-color: #4f46e5;
      --accent-hover: #4338ca;
      --accent-light: #eef2ff;
      --badge-bg: #dbeafe;
      --badge-text: #1e40af;
      --test-badge-bg: #fef3c7;
      --test-badge-text: #92400e;
      --shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
      --code-bg: #1e293b;
      --code-text: #f8fafc;
    }

    [data-theme="dark"] {
      --bg-color: #0f172a;
      --card-bg: #1e293b;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --border-color: #334155;
      --accent-color: #6366f1;
      --accent-hover: #818cf8;
      --accent-light: rgba(99, 102, 241, 0.15);
      --badge-bg: rgba(99, 102, 241, 0.2);
      --badge-text: #93c5fd;
      --test-badge-bg: rgba(245, 158, 11, 0.2);
      --test-badge-text: #fcd34d;
      --shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
      --code-bg: #090d16;
      --code-text: #e2e8f0;
    }

    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) {
        --bg-color: #0f172a;
        --card-bg: #1e293b;
        --text-main: #f8fafc;
        --text-muted: #94a3b8;
        --border-color: #334155;
        --accent-color: #6366f1;
        --accent-hover: #818cf8;
        --accent-light: rgba(99, 102, 241, 0.15);
        --badge-bg: rgba(99, 102, 241, 0.2);
        --badge-text: #93c5fd;
        --test-badge-bg: rgba(245, 158, 11, 0.2);
        --test-badge-text: #fcd34d;
        --shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
        --code-bg: #090d16;
        --code-text: #e2e8f0;
      }
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--bg-color);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
    }

    .container {
      width: 100%;
      max-width: 720px;
    }

    .theme-toggle-wrapper {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 1rem;
    }

    .theme-btn {
      background: var(--card-bg);
      color: var(--text-main);
      border: 1px solid var(--border-color);
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      font-weight: 500;
      font-size: 0.875rem;
      cursor: pointer;
      box-shadow: var(--shadow);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    main.card {
      background-color: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 1rem;
      padding: 2.5rem;
      box-shadow: var(--shadow);
    }

    .badges {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-bottom: 1.5rem;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .badge-primary {
      background-color: var(--badge-bg);
      color: var(--badge-text);
    }

    .badge-testing {
      background-color: var(--test-badge-bg);
      color: var(--test-badge-text);
    }

    h1 {
      font-size: 2.25rem;
      font-weight: 800;
      color: var(--text-main);
      margin-bottom: 0.5rem;
      line-height: 1.2;
    }

    .tagline {
      font-size: 1.125rem;
      color: var(--accent-color);
      font-weight: 600;
      margin-bottom: 1.5rem;
    }

    .description {
      font-size: 1rem;
      color: var(--text-muted);
      line-height: 1.6;
      margin-bottom: 2rem;
    }

    .section-title {
      font-size: 0.875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 1rem;
    }

    .feature-list {
      list-style: none;
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.75rem;
      margin-bottom: 2rem;
    }

    @media (min-width: 640px) {
      .feature-list {
        grid-template-columns: 1fr 1fr;
      }
    }

    .feature-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background-color: var(--accent-light);
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-main);
    }

    .feature-icon {
      color: var(--accent-color);
      font-weight: 700;
    }

    .code-preview {
      background-color: var(--code-bg);
      color: var(--code-text);
      padding: 1.25rem;
      border-radius: 0.75rem;
      font-family: monospace;
      font-size: 0.85rem;
      overflow-x: auto;
      white-space: pre-wrap;
      border: 1px solid var(--border-color);
    }

    footer.footer {
      margin-top: 2rem;
      text-align: center;
      font-size: 0.875rem;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="theme-toggle-wrapper">
      <button class="theme-btn" id="themeToggle" onclick="toggleTheme()">
        <span id="themeIcon">&#9728;</span>
        <span id="themeText">Toggle Theme</span>
      </button>
    </div>
    
    <main class="card">
      <header>
        <div class="badges">
          <span class="badge badge-primary">Rankra Educational Platform</span>
          <span class="badge badge-testing">Gemini API Testing</span>
        </div>

        <h1>Rankra</h1>
        <p class="tagline">${responseData.product.tagline}</p>
      </header>

      <section>
        <p class="description">${responseData.product.description}</p>
      </section>

      <section>
        <h2 class="section-title">Core Capabilities</h2>
        <ul class="feature-list">
          ${responseData.product.features.map(f => `<li class="feature-item"><span class="feature-icon">&#10003;</span>${f}</li>`).join('')}
        </ul>
      </section>

      <section>
        <h2 class="section-title">Raw API Data Payload</h2>
        <pre class="code-preview"><code>${JSON.stringify(responseData, null, 2)}</code></pre>
      </section>
    </main>

    <footer class="footer">
      <p>Rankra Gemini API Testing Endpoint &bull; Status: Active &bull; Location: ${responseData.product.location}</p>
    </footer>
  </div>

  <script>
    function toggleTheme() {
      const html = document.documentElement;
      const currentTheme = html.getAttribute('data-theme');
      let newTheme = 'dark';
      if (currentTheme === 'dark') {
        newTheme = 'light';
      } else if (!currentTheme && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        newTheme = 'light';
      }
      html.setAttribute('data-theme', newTheme);
      updateButtonText(newTheme);
    }

    function updateButtonText(theme) {
      const icon = document.getElementById('themeIcon');
      const text = document.getElementById('themeText');
      if (theme === 'dark') {
        icon.innerHTML = '&#9790;';
        text.innerText = 'Dark Mode';
      } else {
        icon.innerHTML = '&#9728;';
        text.innerText = 'Light Mode';
      }
    }

    (function() {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      updateButtonText(isDark ? 'dark' : 'light');
    })();
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache"
    }
  });
}
