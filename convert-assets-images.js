const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Configuration for src/assets image conversion
const SOURCE_DIR = path.join(__dirname, 'src', 'assets');
const OUTPUT_DIR = path.join(__dirname, 'src', 'assets');
const MAX_WIDTH = 1920; // Max width for hero images
const QUALITY = 80; // WebP quality (0-100)
const EFFORT = 6; // Compression effort (0-6)
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

// Image-specific settings
const IMAGE_SETTINGS = {
  'main-background.png': { maxWidth: 1920, quality: 75 }, // Hero background
  'main3.png': { maxWidth: 1200, quality: 85 }, // LCP image - higher quality
  'about.jpg': { maxWidth: 800, quality: 80 },
  'product-background.jpg': { maxWidth: 1920, quality: 75 },
  'payment_qr.jpg': { maxWidth: 600, quality: 85 },
  'logo.png': { maxWidth: 300, quality: 90 } // Logo needs high quality
};

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function isImageFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

function getOutputFilename(filename) {
  const nameWithoutExt = path.parse(filename).name;
  return `${nameWithoutExt}.webp`;
}

async function processImage(imagePath) {
  const filename = path.basename(imagePath);
  const outputPath = path.join(OUTPUT_DIR, getOutputFilename(filename));
  
  try {
    // Get image-specific settings or use defaults
    const settings = IMAGE_SETTINGS[filename] || { maxWidth: MAX_WIDTH, quality: QUALITY };
    
    const originalSize = getFileSize(imagePath);
    const metadata = await sharp(imagePath).metadata();
    
    // Check if already converted
    if (fs.existsSync(outputPath)) {
      const existingSize = getFileSize(outputPath);
      const reduction = ((originalSize - existingSize) / originalSize * 100).toFixed(1);
      console.log(`⏭  Skipped (already exists): ${filename} (${formatFileSize(originalSize)} → ${formatFileSize(existingSize)}, ${reduction}% reduction)`);
      return { success: true, skipped: true, originalSize, newSize: existingSize };
    }
    
    const needsResize = metadata.width > settings.maxWidth;
    let pipeline = sharp(imagePath);
    
    if (needsResize) {
      pipeline = pipeline.resize(settings.maxWidth, null, {
        withoutEnlargement: true,
        fit: 'inside'
      });
      console.log(`  Resizing from ${metadata.width}x${metadata.height} to max ${settings.maxWidth}px width`);
    }
    
    await pipeline
      .webp({ 
        quality: settings.quality,
        effort: EFFORT,
        nearLossless: false,
        smartSubsample: true
      })
      .toFile(outputPath);
    
    const newSize = getFileSize(outputPath);
    const reduction = originalSize > 0 ? ((originalSize - newSize) / originalSize * 100).toFixed(1) : 0;
    
    console.log(`✓ Converted: ${filename}`);
    console.log(`  ${formatFileSize(originalSize)} → ${formatFileSize(newSize)} (${reduction}% reduction)`);
    console.log(`  Quality: ${settings.quality}%`);
    
    return { success: true, skipped: false, originalSize, newSize };
  } catch (error) {
    console.error(`✗ Error processing ${filename}:`, error.message);
    return { success: false, error: error.message, originalSize: 0, newSize: 0 };
  }
}

async function convertAssetsImages() {
  console.log('🚀 Converting src/assets images to WebP...\n');
  console.log(`Source: ${SOURCE_DIR}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`✗ Error: Source directory does not exist: ${SOURCE_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(SOURCE_DIR);
  const imageFiles = files.filter(file => {
    const filePath = path.join(SOURCE_DIR, file);
    return fs.statSync(filePath).isFile() && isImageFile(file);
  });

  if (imageFiles.length === 0) {
    console.log('ℹ  No image files found to convert.');
    return;
  }

  console.log(`Found ${imageFiles.length} image file(s) to process.\n`);

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let totalOriginalSize = 0;
  let totalNewSize = 0;

  for (const filename of imageFiles) {
    const imagePath = path.join(SOURCE_DIR, filename);
    const result = await processImage(imagePath);
    
    totalOriginalSize += result.originalSize || 0;
    totalNewSize += result.newSize || 0;
    
    if (result.success) {
      if (result.skipped) {
        skippedCount++;
      } else {
        successCount++;
      }
    } else {
      errorCount++;
    }
  }

  const totalReduction = totalOriginalSize > 0 
    ? ((totalOriginalSize - totalNewSize) / totalOriginalSize * 100).toFixed(1) 
    : 0;

  console.log('\n' + '='.repeat(60));
  console.log('📊 Conversion Summary:');
  console.log(`  ✓ Successfully converted: ${successCount}`);
  console.log(`  ⏭  Skipped (already exists): ${skippedCount}`);
  console.log(`  ✗ Errors: ${errorCount}`);
  console.log(`  📁 Total files: ${imageFiles.length}`);
  console.log('\n📦 File Size Summary:');
  console.log(`  Original total: ${formatFileSize(totalOriginalSize)}`);
  console.log(`  Optimized total: ${formatFileSize(totalNewSize)}`);
  console.log(`  Total reduction: ${formatFileSize(totalOriginalSize - totalNewSize)} (${totalReduction}%)`);
  console.log('='.repeat(60));
  
  if (errorCount > 0) {
    console.log('\n⚠  Some files failed to convert. Check the errors above.');
    process.exit(1);
  } else {
    console.log('\n✅ All images processed successfully!');
  }
}

convertAssetsImages().catch(error => {
  console.error('✗ Fatal error:', error);
  process.exit(1);
});
