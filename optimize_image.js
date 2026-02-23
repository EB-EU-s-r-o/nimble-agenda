
const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');

const inputPath = 'C:\\Users\\42195\\Downloads\\ChatGPT Image 15. 2. 2026, 09_40_03.png';
const outputPath = 'C:\\Users\\42195\\Downloads\\papihairlogo.png';

async function optimize() {
    try {
        console.log(`Loading image: ${inputPath}`);
        const image = await Jimp.read(inputPath);

        console.log(`Original dimensions: ${image.getWidth()}x${image.getHeight()}`);

        // Resize to a max width of 600px to help hit the 40KB target
        if (image.getWidth() > 600) {
            image.resize(600, Jimp.AUTO);
            console.log(`Resized to: ${image.getWidth()}x${image.getHeight()}`);
        }

        // Write as PNG with high compression/optimization
        // Jimp's PNG filter/deflate level can be adjusted
        await image
            .quality(60) // Note: quality() is mostly for JPEG but can influence some PNG paths in Jimp
            .deflateLevel(9)
            .filterType(Jimp.PNG_FILTER_NONE)
            .writeAsync(outputPath);

        const stats = fs.statSync(outputPath);
        const fileSizeInKB = stats.size / 1024;

        console.log(`Optimization complete!`);
        console.log(`Saved to: ${outputPath}`);
        console.log(`Final size: ${fileSizeInKB.toFixed(2)} KB`);

        if (fileSizeInKB > 40) {
            console.log('Size is still above 40KB. Retrying with smaller dimensions...');
            image.resize(400, Jimp.AUTO);
            await image.deflateLevel(9).writeAsync(outputPath);
            const newStats = fs.statSync(outputPath);
            console.log(`Retry final size: ${(newStats.size / 1024).toFixed(2)} KB`);
        }

    } catch (error) {
        console.error('Error during optimization:', error);
    }
}

optimize();
