import { supabase } from './supabase';

/**
 * Seeds initial curated vintage collectibles if database is empty.
 * Implements the canonical example: Manish's vintage watch for ₹56,000.
 */
export async function seedInitialArchiveIfEmpty(): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true });

    if (error || (count && count > 0)) {
      return false; // already has listings or table check skipped
    }

    // Insert Manish's seller profile
    const manishId = '00000000-0000-0000-0000-000000000001';
    await supabase.from('profiles').upsert({
      id: manishId,
      full_name: 'Manish Sharma',
      location: 'Bandra West, Mumbai',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    });

    // 1. Canonical Item: Manish's 1964 Vintage Watch
    const { data: listing1, error: l1Err } = await supabase
      .from('listings')
      .insert({
        seller_id: manishId,
        title: '1964 HMT Janata Mechanical Hand-Wound Watch',
        description: 'Rare 1964 production with devanagari numerals, original parashock 17 jewels mechanical movement. Retains subtle patina on champagne sunburst dial. Recently serviced by heritage horologist in Fort, Mumbai. Keeps excellent time with original steel case and restored winding crown.',
        price: 56000,
        condition: 'Excellent',
        year: 1964,
        brand: 'HMT',
        location: 'Bandra West, Mumbai',
        status: 'available',
      })
      .select()
      .single();

    if (listing1) {
      await supabase.from('listing_images').insert([
        {
          listing_id: listing1.id,
          image_url: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800',
          display_order: 0,
        },
        {
          listing_id: listing1.id,
          image_url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800',
          display_order: 1,
        },
      ]);
    }

    // 2. Vintage Leica 35mm Rangefinder
    const { data: listing2 } = await supabase
      .from('listings')
      .insert({
        seller_id: manishId,
        title: '1972 Vintage 35mm Rangefinder Film Camera',
        description: 'Precision mechanical rangefinder with clean optical glass, crisp split-image focusing, and working leaf shutter across all speeds (1s to 1/500s). Comes with original vulcanite grip and leather strap.',
        price: 84000,
        condition: 'Mint / Pristine',
        year: 1972,
        brand: 'Leica',
        location: 'South Mumbai',
        status: 'available',
      })
      .select()
      .single();

    if (listing2) {
      await supabase.from('listing_images').insert([
        {
          listing_id: listing2.id,
          image_url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800',
          display_order: 0,
        },
      ]);
    }

    // 3. Antique Maritime Brass Compass
    const { data: listing3 } = await supabase
      .from('listings')
      .insert({
        seller_id: manishId,
        title: 'Late Victorian Hand-Crafted Brass Maritime Gimbal Compass',
        description: 'Solid aged brass marine compass with gimbal mounting bracket and etched fleur-de-lis cardinal markers. Authentic patina without chemical polishing.',
        price: 32000,
        condition: 'Very Good',
        year: 1898,
        brand: 'Maritime Heritage',
        location: 'Colaba, Mumbai',
        status: 'available',
      })
      .select()
      .single();

    if (listing3) {
      await supabase.from('listing_images').insert([
        {
          listing_id: listing3.id,
          image_url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800',
          display_order: 0,
        },
      ]);
    }

    return true;
  } catch (err) {
    console.warn('Seed archive notice:', err);
    return false;
  }
}
