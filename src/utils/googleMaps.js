let googleMapsPromise = null;
const GOOGLE_MAPS_TIMEOUT_MS = 12000;

function withTimeout(executor, message) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(message));
    }, GOOGLE_MAPS_TIMEOUT_MS);

    executor(
      (value) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function loadGoogleMapsApi() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps is only available in the browser."));
  }

  if (window.google?.maps?.Geocoder) {
    return Promise.resolve(window.google);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return Promise.reject(new Error("Google Maps API key is missing."));
  }

  googleMapsPromise = withTimeout((resolve, reject) => {
    const existingScript = document.querySelector('script[data-google-maps="true"]');
    if (existingScript) {
      if (window.google?.maps?.Geocoder) {
        resolve(window.google);
        return;
      }
      existingScript.addEventListener("load", () => resolve(window.google));
      existingScript.addEventListener("error", () => reject(new Error("Unable to load Google Maps.")));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = "true";
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error("Unable to load Google Maps."));
    document.head.appendChild(script);
  }, "Google Maps took too long to load. Please try again.");

  return googleMapsPromise;
}

async function fetchJsonWithTimeout(url, message) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), GOOGLE_MAPS_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(message);
    }
    return await response.json();
  } catch {
    throw new Error(message);
  } finally {
    window.clearTimeout(timer);
  }
}

function mapGoogleAddressPayload(place, fallbackAddress = "") {
  const location = place.geometry.location;
  const addressParts = place.address_components || [];
  const findPart = (type) => addressParts.find((part) => part.types.includes(type))?.long_name || "";
  return {
    formattedAddress: place.formatted_address || fallbackAddress,
    lat: Number(location.lat()),
    lng: Number(location.lng()),
    area: findPart("sublocality_level_1") || findPart("sublocality") || findPart("locality"),
    city: findPart("locality") || findPart("administrative_area_level_2"),
    pincode: findPart("postal_code"),
  };
}

function mapNominatimPayload(item) {
  const address = item.address || {};
  return {
    formattedAddress: item.display_name || "",
    lat: Number(item.lat),
    lng: Number(item.lon),
    area: address.suburb || address.neighbourhood || address.village || address.town || address.city || "",
    city: address.city || address.town || address.county || address.state_district || "",
    pincode: address.postcode || "",
  };
}

async function geocodeWithNominatim(address) {
  const params = new URLSearchParams({
    q: address,
    format: "jsonv2",
    addressdetails: "1",
    limit: "1",
  });
  const data = await fetchJsonWithTimeout(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    "Location lookup took too long. Please try again.",
  );
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Location could not be found.");
  }
  return mapNominatimPayload(data[0]);
}

async function reverseGeocodeWithNominatim(lat, lng) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: "jsonv2",
    addressdetails: "1",
  });
  const data = await fetchJsonWithTimeout(
    `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
    "Map lookup took too long. Please try again.",
  );
  if (!data || !data.lat || !data.lon) {
    throw new Error("Address could not be identified for this location.");
  }
  return mapNominatimPayload(data);
}

export async function geocodeAddress(address) {
  try {
    return await geocodeWithNominatim(address);
  } catch {
    const google = await loadGoogleMapsApi();
    const geocoder = new google.maps.Geocoder();
    return withTimeout((resolve, reject) => {
      geocoder.geocode({ address }, (results, status) => {
        if (status !== "OK" || !results?.length) {
          reject(new Error(status === "OVER_QUERY_LIMIT"
            ? "Google Maps quota exceeded. Please try again later."
            : "Location could not be found on Google Maps."));
          return;
        }
        resolve(mapGoogleAddressPayload(results[0], address));
      });
    }, "Location lookup took too long. Please try again.");
  }
}

export async function reverseGeocodeLatLng(lat, lng) {
  try {
    return await reverseGeocodeWithNominatim(lat, lng);
  } catch {
    const google = await loadGoogleMapsApi();
    const geocoder = new google.maps.Geocoder();
    return withTimeout((resolve, reject) => {
      geocoder.geocode({ location: { lat: Number(lat), lng: Number(lng) } }, (results, status) => {
        if (status !== "OK" || !results?.length) {
          reject(new Error(status === "OVER_QUERY_LIMIT"
            ? "Google Maps quota exceeded. Please try again later."
            : "Address could not be identified for this location."));
          return;
        }
        const payload = mapGoogleAddressPayload(results[0], "");
        resolve({
          ...payload,
          lat: Number(lat),
          lng: Number(lng),
        });
      });
    }, "Map lookup took too long. Please try again.");
  }
}

function normalizeNominatimSuggestion(item) {
  const mapped = mapNominatimPayload(item);
  return {
    id: `nominatim-${item.place_id || mapped.formattedAddress}`,
    label: mapped.area && mapped.city
      ? `${mapped.area}, ${mapped.city}`
      : mapped.formattedAddress,
    secondaryText: mapped.formattedAddress,
    lat: mapped.lat,
    lng: mapped.lng,
    area: mapped.area,
    city: mapped.city,
    pincode: mapped.pincode,
    formattedAddress: mapped.formattedAddress,
    source: "maps",
  };
}

async function searchSuggestionsWithNominatim(query) {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    limit: "5",
  });
  const data = await fetchJsonWithTimeout(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    "Suggestions took too long to load. Please try again.",
  );
  if (!Array.isArray(data)) return [];
  return data.map(normalizeNominatimSuggestion);
}

function searchSuggestionsWithGoogle(query, near) {
  return loadGoogleMapsApi().then((google) => withTimeout((resolve, reject) => {
    const service = new google.maps.places.AutocompleteService();
    const request = {
      input: query,
      componentRestrictions: { country: "in" },
      types: ["geocode"],
    };

    if (near?.lat != null && near?.lng != null) {
      request.locationBias = {
        center: { lat: Number(near.lat), lng: Number(near.lng) },
        radius: 15000,
      };
    }

    service.getPlacePredictions(request, (predictions, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
        reject(new Error("Location suggestions are not available right now."));
        return;
      }

      resolve(predictions.slice(0, 5).map((item) => ({
        id: item.place_id,
        label: item.structured_formatting?.main_text || item.description,
        secondaryText: item.structured_formatting?.secondary_text || item.description,
        formattedAddress: item.description,
        source: "maps",
      })));
    });
  }, "Suggestions took too long to load. Please try again."));
}

export async function searchLocationSuggestions(query, near = null) {
  const trimmed = (query || "").trim();
  if (!trimmed) return [];

  try {
    return await searchSuggestionsWithGoogle(trimmed, near);
  } catch {
    try {
      return await searchSuggestionsWithNominatim(trimmed);
    } catch {
      return [];
    }
  }
}

export function haversineDistanceKm(pointA, pointB) {
  if (!pointA || !pointB) return null;
  const lat1 = Number(pointA.lat);
  const lng1 = Number(pointA.lng);
  const lat2 = Number(pointB.lat);
  const lng2 = Number(pointB.lng);
  if ([lat1, lng1, lat2, lng2].some((value) => Number.isNaN(value))) {
    return null;
  }

  const toRad = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}
