export async function onRequest(context) {
    const url = new URL(context.request.url);
    const cParam = url.searchParams.get('c');
    
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="color-scheme" content="light dark">
<title>MCP College Course | Rankra</title>
<style>
:root { color-scheme: light dark; }
body { font-family: system-ui, sans-serif; background: Canvas; color: CanvasText; }
</style>
</head>
<body>
<main>
`;
    if (!cParam) {
        html += `<section><p>Error: Missing 'c' parameter. Please provide comma-separated college codes.</p></section>`;
    } else {
        const collegeCodes = cParam.split(',');
        try {
            const predResp = await context.env.ASSETS.fetch(new URL('/assets/db/tnea/cutoff/pred2026.json', context.request.url));
            const predData = await predResp.json();
            
            const results = {};
            for (const item of predData) {
                if (collegeCodes.includes(item.coc)) {
                    if (!results[item.coc]) results[item.coc] = [];
                    results[item.coc].push(item);
                }
            }
            
            html += `<section><dl>`;
            for (const code of collegeCodes) {
                const list = results[code];
                const name = (list && list.length > 0) ? list[0].con.replace(/\n/g, ' ') : '';
                html += `<dt>available course in tnea code ${code} ${name}</dt>`;
                if (list && list.length > 0) {
                    for (const item of list) {
                        html += `<dd>${item.brc} - ${item.brn}</dd>`;
                    }
                } else {
                    html += `<dd>No courses found for this college.</dd>`;
                }
            }
            html += `</dl></section>`;
        } catch (e) {
            html += `<section><p>Error loading data.</p></section>`;
        }
    }

    html += `</main></body></html>`;
    return new Response(html, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
}