export async function onRequest(context) {
    const url = new URL(context.request.url);
    const cParam = url.searchParams.get('c');
    const bParam = url.searchParams.get('b');
    const coParam = url.searchParams.get('co');
    const sParam = url.searchParams.get('s') || 'rank';
    
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="color-scheme" content="light dark">
<title>MCP College Cutoff | Rankra</title>
<style>
:root { color-scheme: light dark; }
body { font-family: system-ui, sans-serif; background: Canvas; color: CanvasText; }
</style>
</head>
<body>
<main>
`;

    if (!cParam || !coParam) {
        html += `<section><p>Error: Missing required parameters 'c' (college code) and 'co' (community).</p></section>`;
    } else {
        const cCodes = cParam ? cParam.split(',') : [];
        const bCodes = bParam ? bParam.split(',') : [];
        const communities = coParam ? coParam.toUpperCase().split(',') : [];
        
        try {
            const predResp = await context.env.ASSETS.fetch(new URL('/assets/db/tnea/cutoff/pred2026.json', context.request.url));
            if (!predResp.ok) throw new Error('Failed to load pred2026.json');
            const predData = await predResp.json();
            
            const rows = [];
            for (const item of predData) {
                const pCocStr = String(item.coc);
                if ((cCodes.length > 0 && !cCodes.includes(pCocStr)) || 
                    (bCodes.length > 0 && !bCodes.includes(item.brc))) {
                    continue;
                }
                
                for (const co of communities) {
                    const rank = item[`${co.toLowerCase()}_cr`];
                    
                    if (rank !== undefined && rank !== null) {
                        rows.push({
                            coc: item.coc,
                            brc: item.brc,
                            brn: item.brn,
                            rank: rank,
                            cocIdx: cCodes.indexOf(pCocStr),
                            brcIdx: bCodes.indexOf(item.brc)
                        });
                    }
                }
            }

            if (sParam === 'coc') {
                rows.sort((a, b) => Number(a.coc) - Number(b.coc));
            } else if (sParam === 'rank') {
                rows.sort((a, b) => {
                    const rA = a.rank ? Number(a.rank) : Infinity;
                    const rB = b.rank ? Number(b.rank) : Infinity;
                    return rA - rB;
                });
            } else if (sParam === 'inbr') {
                rows.sort((a, b) => (a.brcIdx === -1 ? 99999 : a.brcIdx) - (b.brcIdx === -1 ? 99999 : b.brcIdx));
            } else if (sParam === 'inco') {
                rows.sort((a, b) => (a.cocIdx === -1 ? 99999 : a.cocIdx) - (b.cocIdx === -1 ? 99999 : b.cocIdx));
            } else {
                rows.sort((a, b) => {
                    const rA = a.rank ? Number(a.rank) : Infinity;
                    const rB = b.rank ? Number(b.rank) : Infinity;
                    return rA - rB;
                });
            }

            html += `<section><table><thead><tr><th>college code</th><th>branch code</th><th>branch name</th><th>2026 community rank</th></tr></thead><tbody>`;
            for (const r of rows) {
                html += `<tr><td>${r.coc}</td><td>${r.brc}</td><td>${r.brn}</td><td>${r.rank}</td></tr>`;
            }
            html += `</tbody></table>`;
            if (rows.length === 0) {
                html += `<p>No records matched your criteria.</p>`;
            }
            html += `</section>`;
        } catch (e) {
            html += `<section><p>Error loading data: ${e.message}</p></section>`;
        }
    }

    html += `</main></body></html>`;
    return new Response(html, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
}
