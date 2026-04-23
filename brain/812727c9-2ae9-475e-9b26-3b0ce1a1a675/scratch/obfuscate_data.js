const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const dataDir = 'c:/Users/t8962/Downloads/rankra/assets/db/tnea/cutoff';
const years = ['2020', '2021', '2022', '2023', '2024','2025'];
const key = Buffer.from('rankravicky1611');

years.forEach(year => {
    const inputPath = path.join(dataDir, `tnea_c_${year}.json`);
    const reversedYear = year.split('').reverse().join('');
    const outputPath = path.join(dataDir, `${reversedYear}.gzip`);

    if (fs.existsSync(inputPath)) {
        console.log(`Processing ${year}...`);
        const data = fs.readFileSync(inputPath);
        
        // 1. Gzip
        const compressed = zlib.gzipSync(data);
        
        // 2. Encrypt (XOR)
        const encrypted = Buffer.alloc(compressed.length);
        for (let i = 0; i < compressed.length; i++) {
            encrypted[i] = compressed[i] ^ key[i % key.length];
        }
        
        fs.writeFileSync(outputPath, encrypted);
        console.log(`Created ${outputPath}`);
        
        // 3. Delete original
        fs.unlinkSync(inputPath);
        console.log(`Deleted ${inputPath}`);
    } else {
        console.log(`File not found: ${inputPath}`);
    }
});

console.log('Done!');
