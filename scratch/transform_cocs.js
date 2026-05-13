const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '..', 'public', 'assets', 'db', 'tnea', 'college', 'cocs.json');
const outputPath = path.join(__dirname, '..', 'public', 'localagent', 'cocs.txt');

if (!fs.existsSync(path.dirname(outputPath))) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
}

const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

const output = Object.entries(data).map(([key, value]) => {
    // Split by newline to separate name/code from address
    const parts = value.split('\n');
    const nameWithCode = parts[0];
    const address = parts[1] || "";

    // Remove the (CODE) part at the end of the name
    const name = nameWithCode.replace(/\s\([^)]+\)$/, '').trim();

    // Extract district from address (part before the hyphen/zip)
    const district = address.split('-')[0].trim().toLowerCase();

    return `${key}-${name} ${district}`;
}).join('\n');

fs.writeFileSync(outputPath, output);
console.log(`Successfully created ${outputPath}`);
