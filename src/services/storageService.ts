import { supabase } from '../lib/supabase';

const BUCKET_NAME = 'listing-images';

/**
 * Uploads an image file to Supabase Storage bucket 'listing-images'
 * Deterministic path format: listings/{listing_id}/{filename}
 */
export async function uploadListingImage(listingId: string, file: File): Promise<string> {
  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image size must be less than 5MB');
  }

  // Validate MIME type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Only JPEG, PNG, and WebP images are permitted');
  }

  // Clean filename and generate unique timestamp suffix
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const cleanName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
  const filePath = `listings/${listingId}/${cleanName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}
