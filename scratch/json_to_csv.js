const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '..', 'output.json');
const outputPath = path.join(__dirname, '..', 'output.csv');

let rawText = fs.readFileSync(inputPath, 'utf8');
if (rawText.charCodeAt(0) === 0xFEFF) {
    rawText = rawText.slice(1);
}
let rawData = JSON.parse(rawText);

// Handle PowerShell wrapper if present
const data = rawData.value || rawData;

let csvLines = [];

data.forEach(entry => {
    const funcName = Object.keys(entry)[0];
    const resultsList = entry[funcName];

    csvLines.push(`${funcName}:`);

    resultsList.forEach((res, index) => {
        // If there are multiple queries for the same function, add a separator
        if (resultsList.length > 1) {
            csvLines.push(`Query #${index + 1}`);
        }

        if (funcName === 'getcollegelist') {
            csvLines.push("college_code,min_cutoff,max_cutoff");
            res.results.forEach(row => csvLines.push(row.join(',')));
        } 
        else if (funcName === 'getcutoff') {
            csvLines.push("college_code,branch_code,cutoff");
            res.results.forEach(row => csvLines.push(row.join(',')));
        } 
        else if (funcName === 'cab') {
            csvLines.push("branch_code,college_code");
            const branch = Object.keys(res.results)[0];
            const colleges = res.results[branch];
            colleges.forEach(coc => csvLines.push(`${branch},${coc}`));
        } 
        else if (funcName === 'bac') {
            csvLines.push("college_code,branch_code");
            const college = Object.keys(res.results)[0];
            const branches = res.results[college];
            branches.forEach(brc => csvLines.push(`${college},${brc}`));
        }
        
        csvLines.push(""); // Empty line between queries/functions
    });
});

fs.writeFileSync(outputPath, csvLines.join('\n'));
console.log(`Successfully converted to ${outputPath}`);
