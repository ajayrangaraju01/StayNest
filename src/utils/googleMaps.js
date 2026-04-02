let googleMapsPromise = null;

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

  googleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-google-maps="true"]');
    if (existingScript) {
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
  });

  return googleMapsPromise;
}

export async function geocodeAddress(address) {
  const google = await loadGoogleMapsApi();
  const geocoder = new google.maps.Geocoder();
  return new Promise((resolve, reject) => {
    geocoder.geocode({ address }, (results, status) => {
      if (status !== "OK" || !results?.length) {
        reject(new Error("Location could not be found on Google Maps."));
        return;
      }
      const place = results[0];
      const location = place.geometry.location;
      const addressParts = place.address_components || [];
      const findPart = (type) => addressParts.find((part) => part.types.includes(type))?.long_name || "";
      resolve({
        formattedAddress: place.formatted_address || address,
        lat: Number(location.lat()),
        lng: Number(location.lng()),
        area: findPart("sublocality_level_1") || findPart("sublocality") || findPart("locality"),
        city: findPart("locality") || findPart("administrative_area_level_2"),
        pincode: findPart("postal_code"),
      });
    });
  });
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
