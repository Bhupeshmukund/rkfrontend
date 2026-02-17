const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Configuration - can be overridden via command line argument
// Usage: node convert-images.js [source-directory]
// Example: node convert-images.js ../Backend/uploads/products
const DEFAULT_SOURCE_DIR = path.join(__dirname, 'public', 'images');
const SOURCE_DIR = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_SOURCE_DIR;
const OUTPUT_DIR = path.join(__dirname, 'public', 'images-optimized');
const MAX_WIDTH = 1200;
const QUALITY = 70; // WebP quality (0-100, lower = smaller file, 70 is good balance)
const EFFORT = 6; // Compression effort (0-6, higher = better compression but slower)
const MAX_TARGET_SIZE_KB = 500; // If output is larger than this, try lower quality
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`✓ Created output directory: ${OUTPUT_DIR}`);
}

// Function to get file size in a human-readable format
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

// Function to format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Function to check if file is an image we want to process
function isImageFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

// Function to get output filename (replace extension with .webp)
function getOutputFilename(filename) {
  const nameWithoutExt = path.parse(filename).name;
  return `${nameWithoutExt}.webp`;
}

// Recursive function to find all image files
function findImageFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) {
    return fileList;
  }

  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Recursively search subdirectories
      findImageFiles(filePath, fileList);
    } else if (isImageFile(file)) {
      fileList.push({
        fullPath: filePath,
        relativePath: path.relative(SOURCE_DIR, filePath),
        filename: file
      });
    }
  });

  return fileList;
}

// Function to process a single image
async function processImage(imageInfo) {
  const { fullPath, relativePath, filename } = imageInfo;
  
  try {
    // Calculate output path maintaining directory structure
    const outputRelativePath = relativePath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    const outputPath = path.join(OUTPUT_DIR, outputRelativePath);
    const outputDir = path.dirname(outputPath);
    
    // Create subdirectories if needed
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Get original file size
    const originalSize = getFileSize(fullPath);
    
    // Check if output file already exists
    // Force re-convert if file is still too large (over 500KB)
    if (fs.existsSync(outputPath)) {
      const existingSize = getFileSize(outputPath);
      const existingSizeKB = existingSize / 1024;
      const reduction = ((originalSize - existingSize) / originalSize * 100).toFixed(1);
      
      // If existing file is still too large, re-convert with lower quality
      if (existingSizeKB > MAX_TARGET_SIZE_KB) {
        console.log(`⚠  Existing file is still large (${formatFileSize(existingSize)}), re-converting with lower quality...`);
        // Continue to re-convert below
      } else {
        console.log(`⏭  Skipped (already exists): ${relativePath} (${formatFileSize(originalSize)} → ${formatFileSize(existingSize)}, ${reduction}% reduction)`);
        return { success: true, skipped: true, originalSize, newSize: existingSize };
      }
    }

    // Get image metadata to check dimensions
    const metadata = await sharp(fullPath).metadata();
    const needsResize = metadata.width > MAX_WIDTH;
    
    let pipeline = sharp(fullPath);
    
    // Always resize if image is larger than max width (this significantly reduces file size)
    if (needsResize) {
      pipeline = pipeline.resize(MAX_WIDTH, null, {
        withoutEnlargement: true,
        fit: 'inside'
      });
      console.log(`  Resizing from ${metadata.width}x${metadata.height} to max ${MAX_WIDTH}px width`);
    } else {
      console.log(`  Image is ${metadata.width}x${metadata.height} (no resize needed)`);
    }
    
    // Try with initial quality
    let currentQuality = QUALITY;
    let newSize = 0;
    let attempts = 0;
    const maxAttempts = 3;
    
    // Try to get file size under target, reducing quality if needed
    while (attempts < maxAttempts) {
      await pipeline
        .webp({ 
          quality: currentQuality,
          effort: EFFORT,
          nearLossless: false,
          smartSubsample: true
        })
        .toFile(outputPath);
      
      newSize = getFileSize(outputPath);
      const newSizeKB = newSize / 1024;
      
      // If file is still too large and we can reduce quality more, try again
      if (newSizeKB > MAX_TARGET_SIZE_KB && currentQuality > 50 && attempts < maxAttempts - 1) {
        currentQuality -= 10;
        attempts++;
        console.log(`  File still large (${formatFileSize(newSize)}), trying quality ${currentQuality}...`);
        continue;
      }
      break;
    }
    
    const reduction = originalSize > 0 ? ((originalSize - newSize) / originalSize * 100).toFixed(1) : 0;
    
    console.log(`✓ Converted: ${relativePath}`);
    console.log(`  ${formatFileSize(originalSize)} → ${formatFileSize(newSize)} (${reduction}% reduction)`);
    console.log(`  Final quality: ${currentQuality}%`);
    
    return { success: true, skipped: false, originalSize, newSize };
  } catch (error) {
    console.error(`✗ Error processing ${relativePath}:`, error.message);
    return { success: false, error: error.message, originalSize: 0, newSize: 0 };
  }
}

// Main function
async function convertImages() {
  console.log('🚀 Starting image conversion...\n');
  console.log(`Source: ${SOURCE_DIR}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Settings: Max width ${MAX_WIDTH}px, Quality ${QUALITY}%, Effort ${EFFORT}\n`);

  // Check if source directory exists
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`✗ Error: Source directory does not exist: ${SOURCE_DIR}`);
    console.log(`\n💡 Tips:`);
    console.log(`  1. Create the directory: ${SOURCE_DIR}`);
    console.log(`  2. Add your .jpg, .jpeg, or .png images to that directory`);
    console.log(`  3. Or specify a different source: node convert-images.js [path-to-images]`);
    console.log(`     Example: node convert-images.js ../Backend/uploads/products`);
    process.exit(1);
  }

  // Find all image files recursively
  console.log('🔍 Scanning for images...');
  const imageFiles = findImageFiles(SOURCE_DIR);

  if (imageFiles.length === 0) {
    console.log('ℹ  No image files found to convert.');
    console.log(`\n💡 Make sure you have .jpg, .jpeg, or .png files in: ${SOURCE_DIR}`);
    return;
  }

  console.log(`Found ${imageFiles.length} image file(s) to process.\n`);

  // Process all images
  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let totalOriginalSize = 0;
  let totalNewSize = 0;

  for (const imageInfo of imageFiles) {
    const result = await processImage(imageInfo);
    
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

  // Summary
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

// Run the conversion
convertImages().catch(error => {
  console.error('✗ Fatal error:', error);
  process.exit(1);
});
