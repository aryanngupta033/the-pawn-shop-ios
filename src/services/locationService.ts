/**
 * Location Autocomplete Service
 * Free, privacy-preserving, keyless geocoding service based on OpenStreetMap & Photon.
 * Zero GPS permissions required. Fully client-side with graceful fallback.
 */

export interface LocationSuggestion {
  id: string;
  name: string;
  formatted: string;
  detail?: string;
}

export async function fetchLocationSuggestions(
  query: string,
  signal?: AbortSignal
): Promise<LocationSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  // Primary: Photon (Fast, OSM-backed, no API key, CORS enabled)
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=6`;
    const res = await fetch(url, {
      signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.features) && data.features.length > 0) {
        const seen = new Set<string>();
        const suggestions: LocationSuggestion[] = [];

        for (let i = 0; i < data.features.length; i++) {
          const p = data.features[i].properties || {};
          const primaryName = p.name || '';

          const contextParts: string[] = [];
          if (p.city && p.city !== primaryName) contextParts.push(p.city);
          else if (p.district && p.district !== primaryName && p.district !== p.city) {
            contextParts.push(p.district);
          }
          if (p.state) contextParts.push(p.state);
          if (p.country) contextParts.push(p.country);

          const fullParts = [primaryName, ...contextParts].filter(Boolean);
          const formatted = fullParts.join(', ');

          if (formatted && !seen.has(formatted.toLowerCase())) {
            seen.add(formatted.toLowerCase());
            suggestions.push({
              id: `photon-${i}-${formatted}`,
              name: primaryName || formatted,
              formatted,
              detail: contextParts.join(', '),
            });
          }
        }

        if (suggestions.length > 0) {
          return suggestions;
        }
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw err;
    }
    // Non-blocking fallback
  }

  // Fallback: OpenStreetMap Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      trimmed
    )}&format=json&addressdetails=1&limit=5`;
    const res = await fetch(url, {
      signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (res.ok) {
      const items = await res.json();
      if (Array.isArray(items)) {
        return items.map((item: any, idx: number) => {
          const addr = item.address || {};
          const primaryName =
            addr.city || addr.town || addr.village || addr.suburb || item.name || '';
          const detailParts = [addr.state, addr.country].filter(Boolean);
          return {
            id: `osm-${idx}-${item.place_id || idx}`,
            name: primaryName || item.display_name.split(',')[0],
            formatted: item.display_name,
            detail: detailParts.join(', '),
          };
        });
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw err;
    }
    // Fail silently so input remains standard text field
  }

  return [];
}
