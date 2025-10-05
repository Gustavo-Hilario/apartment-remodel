# Image Gallery Feature

## Overview
Products now support multiple images with an elegant gallery interface. Users can upload multiple images and select which one should be the product thumbnail.

## Features

### 📸 Image Upload
- **Drag & Drop**: Drop image files directly onto the upload zone
- **File Browse**: Click the upload zone to select files
- **URL Paste**: Add images via URL with "Add to Gallery" button
- **File Size Warning**: Displays file size and warns if >500KB

### 🖼️ Image Gallery
- **Multiple Images**: Store unlimited images per product
- **Grid Layout**: Clean, responsive grid display
- **Thumbnail Selection**: Click ❤️ to set as product thumbnail
- **Delete**: Remove images with × button
- **Visual Feedback**: Thumbnail image has red border

### ❤️ Thumbnail Selection
- First uploaded image is automatically set as thumbnail
- Click the heart (🤍) on any image to make it the thumbnail
- Active thumbnail shows ❤️ and red border
- Only one thumbnail per product

## Database Schema

```javascript
images: [{
  url: String,           // Image URL or base64 data
  isThumbnail: Boolean,  // Is this the product thumbnail?
  uploadedAt: Date       // When was this uploaded?
}]
```

### Backward Compatibility
Legacy fields are maintained for existing products:
- `imageUrl`: String (stores thumbnail URL)
- `showImage`: Boolean (whether to show thumbnail)

When editing old products, the system automatically converts single image to gallery format.

## Storage Considerations

### ⚠️ Current Implementation: Base64
**Pros:**
- Simple implementation
- No external dependencies
- Works immediately

**Cons:**
- ~33% size increase (1MB → 1.3MB)
- Increases database size
- Slower queries with large images
- Not scalable for production

### 🚀 Recommended for Production

1. **Cloud Storage (Best)**
   - AWS S3 / Google Cloud Storage / Cloudinary
   - CDN for fast delivery
   - Pay per usage (~$0.023/GB)
   - Automatic image optimization

2. **Local File Storage**
   - Save files to `/public/uploads/`
   - Store only file paths in DB
   - Free but requires backup strategy
   - No CDN unless configured

3. **Image Optimization**
   - Compress before upload (quality: 80%)
   - Resize to max 800px width
   - Convert PNG → WebP (50% smaller)
   - Use lazy loading

### Migration Path
If you want to migrate to file storage later:
1. Add upload handler to save files to disk
2. Update schema to accept both base64 and file paths
3. Run migration script to convert existing base64 to files
4. Remove base64 support

## Usage Example

```javascript
// Product with images
{
  description: "Elegant Sofa",
  images: [
    {
      url: "https://example.com/sofa1.jpg",
      isThumbnail: true,
      uploadedAt: "2025-10-04T10:30:00Z"
    },
    {
      url: "data:image/jpeg;base64,/9j/4AAQ...",
      isThumbnail: false,
      uploadedAt: "2025-10-04T10:31:00Z"
    }
  ]
}
```

## File Size Guidelines
- **Optimal**: < 200KB per image
- **Acceptable**: 200KB - 500KB
- **Warning**: 500KB - 1MB
- **Too Large**: > 1MB (should compress)

## Future Enhancements
- [ ] Image compression before upload
- [ ] Drag-to-reorder images
- [ ] Zoom/lightbox view
- [ ] Batch upload
- [ ] Image cropping tool
- [ ] Migration to cloud storage
