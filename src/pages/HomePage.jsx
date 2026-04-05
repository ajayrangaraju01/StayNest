import { useEffect, useMemo, useRef, useState } from "react";
import HostelCard from "../components/HostelCard";
import { geocodeAddress, haversineDistanceKm, searchLocationSuggestions } from "../utils/googleMaps";

function normalizeLocationValue(value) {
  return (value || "").trim().toLowerCase();
}

export default function HomePage({
  hostels,
  onSearch,
  onHostelClick,
  onOwnerClick,
  isLoading = false,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All Locations");
  const [searchPoint, setSearchPoint] = useState(null);
  const [searchLabel, setSearchLabel] = useState("");
  const [distanceRadiusKm, setDistanceRadiusKm] = useState(15);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsBusy, setSuggestionsBusy] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const searchRef = useRef(null);
  const locationOptions = useMemo(() => {
    const dynamicLocations = hostels
      .flatMap((hostel) => [hostel.location, hostel.city])
      .map((value) => (value || "").trim())
      .filter(Boolean);
    return ["All Locations", ...Array.from(new Set(dynamicLocations))];
  }, [hostels]);
  const verifiedCount = hostels.filter((hostel) => hostel.verified).length;
  const liveLocations = new Set(hostels.map((hostel) => hostel.location).filter(Boolean)).size;
  const activeBeds = hostels.reduce(
    (sum, hostel) => sum + hostel.rooms.reduce((roomSum, room) => roomSum + Number(room.available || 0), 0),
    0,
  );
  const affordableStart = hostels.length
    ? Math.min(
      ...hostels.flatMap((hostel) => hostel.rooms.map((room) => Number(room.price || 0)).filter((price) => price > 0)),
    )
    : 0;
  const localSuggestions = useMemo(() => {
    const normalizedQuery = normalizeLocationValue(searchQuery);
    if (!normalizedQuery || normalizedQuery.length < 2) return [];

    return hostels
      .filter((hostel) => {
        const searchableText = [
          hostel.name,
          hostel.location,
          hostel.city,
          hostel.address,
          hostel.pincode,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return searchableText.includes(normalizedQuery);
      })
      .slice(0, 4)
      .map((hostel) => ({
        id: `hostel-${hostel.id}`,
        type: "hostel",
        label: hostel.name,
        secondaryText: [hostel.location, hostel.city].filter(Boolean).join(", "),
        hostel,
      }));
  }, [hostels, searchQuery]);
  const combinedSuggestions = useMemo(() => {
    const hostelIds = new Set(localSuggestions.map((item) => item.id));
    const remoteSuggestions = searchSuggestions
      .filter((item) => !hostelIds.has(`hostel-${item.id}`))
      .map((item) => ({
        id: `place-${item.id}`,
        type: "place",
        label: item.label,
        secondaryText: item.secondaryText || item.formattedAddress || "",
        suggestion: item,
      }));
    return [...localSuggestions, ...remoteSuggestions].slice(0, 7);
  }, [localSuggestions, searchSuggestions]);

  const filteredHostels = hostels.map((hostel) => {
    const exactDistanceKm = searchPoint && hostel.geoLat != null && hostel.geoLng != null
      ? haversineDistanceKm(
        searchPoint,
        { lat: hostel.geoLat, lng: hostel.geoLng },
      )
      : null;
    return {
      ...hostel,
      exactDistanceKm,
      distance: exactDistanceKm != null
        ? `${exactDistanceKm.toFixed(1)} km from ${searchLabel || "searched location"}`
        : hostel.distance,
    };
  }).filter((hostel) => {
    const normalizedQuery = normalizeLocationValue(searchQuery);
    const normalizedLocationFilter = normalizeLocationValue(locationFilter);
    const searchableText = [
      hostel.location,
      hostel.city,
      hostel.name,
      hostel.address,
      hostel.pincode,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesSearch =
      !searchQuery
      || (searchPoint
        ? (hostel.exactDistanceKm != null || searchableText.includes(normalizedQuery))
        : searchableText.includes(normalizedQuery));

    const matchesGender =
      genderFilter === "All" || hostel.gender === genderFilter || hostel.gender === "Co-Live";
    const matchesLocation =
      locationFilter === "All Locations" ||
      [
        hostel.location,
        hostel.city,
        hostel.address,
        `${hostel.location} ${hostel.city}`,
      ]
        .filter(Boolean)
        .some((value) => normalizeLocationValue(value).includes(normalizedLocationFilter));

    const matchesDistance =
      !searchPoint
      || hostel.exactDistanceKm == null
      || hostel.exactDistanceKm <= distanceRadiusKm;

    return matchesSearch && matchesGender && matchesLocation && matchesDistance;
  }).sort((a, b) => {
    if (searchPoint) {
      const aDistance = a.exactDistanceKm ?? Number.POSITIVE_INFINITY;
      const bDistance = b.exactDistanceKm ?? Number.POSITIVE_INFINITY;
      if (aDistance !== bDistance) return aDistance - bDistance;
    }
    return a.name.localeCompare(b.name);
  });

  const handleSearchClick = async () => {
    setSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
    onSearch(searchQuery);
    if (!searchQuery.trim()) {
      setSearchPoint(null);
      setSearchLabel("");
      return;
    }
    setSearchBusy(true);
    try {
      const location = await geocodeAddress(searchQuery);
      setSearchPoint({ lat: location.lat, lng: location.lng });
      setSearchLabel(location.area || location.city || searchQuery.trim());
    } catch {
      setSearchPoint(null);
      setSearchLabel("");
    } finally {
      setSearchBusy(false);
    }
  };

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchSuggestions([]);
      setSuggestionsBusy(false);
      return undefined;
    }

    let isActive = true;
    const timer = window.setTimeout(async () => {
      setSuggestionsBusy(true);
      const suggestions = await searchLocationSuggestions(searchQuery, searchPoint);
      if (!isActive) return;
      setSearchSuggestions(suggestions);
      setSuggestionsBusy(false);
    }, 220);

    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [searchQuery, searchPoint]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!searchRef.current?.contains(event.target)) {
        setSuggestionsOpen(false);
        setActiveSuggestionIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const runSearchForSuggestion = async (item) => {
    if (!item) return;

    if (item.type === "hostel") {
      const { hostel } = item;
      const nextQuery = [hostel.name, hostel.location, hostel.city].filter(Boolean).join(", ");
      setSearchQuery(nextQuery);
      setSuggestionsOpen(false);
      setActiveSuggestionIndex(-1);
      onSearch(nextQuery);

      if (hostel.geoLat != null && hostel.geoLng != null) {
        setSearchPoint({ lat: hostel.geoLat, lng: hostel.geoLng });
        setSearchLabel(hostel.location || hostel.city || hostel.name);
      } else {
        setSearchPoint(null);
        setSearchLabel(hostel.location || hostel.city || hostel.name);
      }
      return;
    }

    const place = item.suggestion;
    const nextQuery = place.formattedAddress || [place.label, place.secondaryText].filter(Boolean).join(", ");
    setSearchQuery(nextQuery);
    setSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
    onSearch(nextQuery);

    if (place.lat != null && place.lng != null) {
      setSearchPoint({ lat: place.lat, lng: place.lng });
      setSearchLabel(place.area || place.city || place.label || nextQuery);
      return;
    }

    setSearchBusy(true);
    try {
      const location = await geocodeAddress(nextQuery);
      setSearchPoint({ lat: location.lat, lng: location.lng });
      setSearchLabel(location.area || location.city || place.label || nextQuery);
    } catch {
      setSearchPoint(null);
      setSearchLabel(place.label || "");
    } finally {
      setSearchBusy(false);
    }
  };

  return (
    <div>
      <section className="hero">
        <div className="hero-badge">India&apos;s Hostel Platform</div>
        <h1 className="hero-title">
          Find Your
          <br />
          <em>Perfect Nest</em>
        </h1>
        <p className="hero-sub">
          Discover verified hostels near your college or workplace. Compare rooms, menus and prices
          in one place.
        </p>
        <div className="hero-workflow-strip">
          {[
            "Search verified hostels",
            "Compare fee breakup and amenities",
            "Send request and track approval",
          ].map((item) => (
            <span key={item} className="hero-workflow-pill">{item}</span>
          ))}
        </div>
        <div className="hero-search" ref={searchRef}>
          <input
            placeholder="Search by location, area or hostel name..."
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setSuggestionsOpen(true);
              setActiveSuggestionIndex(-1);
            }}
            onFocus={() => setSuggestionsOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" && combinedSuggestions.length > 0) {
                event.preventDefault();
                setSuggestionsOpen(true);
                setActiveSuggestionIndex((current) => Math.min(current + 1, combinedSuggestions.length - 1));
                return;
              }
              if (event.key === "ArrowUp" && combinedSuggestions.length > 0) {
                event.preventDefault();
                setActiveSuggestionIndex((current) => Math.max(current - 1, 0));
                return;
              }
              if (event.key === "Enter") {
                event.preventDefault();
                if (suggestionsOpen && activeSuggestionIndex >= 0 && combinedSuggestions[activeSuggestionIndex]) {
                  runSearchForSuggestion(combinedSuggestions[activeSuggestionIndex]);
                  return;
                }
                handleSearchClick();
              }
            }}
          />
          <button className="hero-search-btn" onClick={handleSearchClick} disabled={searchBusy}>
            {searchBusy ? "Searching..." : "Search Hostels"}
          </button>
          {suggestionsOpen && (combinedSuggestions.length > 0 || suggestionsBusy) && (
            <div className="hero-search-suggestions">
              {localSuggestions.length > 0 && (
                <div className="hero-search-group-label">Matching hostels</div>
              )}
              {combinedSuggestions.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={`hero-search-suggestion${activeSuggestionIndex === index ? " active" : ""}`}
                  onClick={() => runSearchForSuggestion(item)}
                >
                  <span className="hero-search-suggestion-title">{item.label}</span>
                  {item.secondaryText && (
                    <span className="hero-search-suggestion-meta">
                      {item.type === "hostel" ? "PG match" : "Nearby place"} - {item.secondaryText}
                    </span>
                  )}
                </button>
              ))}
              {suggestionsBusy && (
                <div className="hero-search-suggestion-loading">Loading suggestions...</div>
              )}
            </div>
          )}
        </div>
        {searchPoint && (
          <div className="card-signal-row" style={{ marginTop: 14 }}>
            <span className="card-signal">Showing nearest stays from {searchLabel}</span>
            {[5, 10, 15, 25].map((radius) => (
              <button
                key={radius}
                type="button"
                className={`filter-chip${distanceRadiusKm === radius ? " active" : ""}`}
                onClick={() => setDistanceRadiusKm(radius)}
              >
                Within {radius} km
              </button>
            ))}
          </div>
        )}
        <div className="hero-stats">
          {[
            [`${verifiedCount}+`, "Verified Hostels"],
            [`${activeBeds}+`, "Beds Open"],
            [`${liveLocations}+`, "Locations"],
            [affordableStart ? `INR ${affordableStart}` : "INR 0", "Starting Rent"],
          ].map(([number, label]) => (
            <div className="hero-stat" key={label}>
              <span className="hero-stat-num">{number}</span>
              <div className="hero-stat-label">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="section">
        <div className="section-label">Browse Hostels</div>
        <h2 className="section-title">Hostels Near You</h2>
        <div className="browse-summary-row">
          <div className="browse-summary-card">
            <strong>{filteredHostels.length}</strong>
            <span>hostels match your search</span>
          </div>
          <div className="browse-summary-card">
            <strong>{filteredHostels.filter((hostel) => hostel.verified).length}</strong>
            <span>verified options in this view</span>
          </div>
          <div className="browse-summary-card">
            <strong>
              {filteredHostels.reduce(
                (sum, hostel) => sum + hostel.rooms.reduce((roomSum, room) => roomSum + Number(room.available || 0), 0),
                0,
              )}
            </strong>
            <span>beds currently open</span>
          </div>
        </div>

        <div className="filters">
          {locationOptions.map((location) => (
            <button
              key={location}
              className={`filter-chip${locationFilter === location ? " active" : ""}`}
              onClick={() => setLocationFilter(location)}
            >
              {location}
            </button>
          ))}
          <div className="filter-gender">
            {["All", "Boys", "Girls", "Co-Live"].map((gender) => (
              <button
                key={gender}
                className={`filter-chip${genderFilter === gender ? " active" : ""}`}
                onClick={() => setGenderFilter(gender)}
              >
                {gender}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="empty-state">
            <span className="empty-icon">Loading</span>
            <div className="empty-title">Fetching hostels...</div>
            <p className="empty-sub">Please wait a moment.</p>
          </div>
        ) : filteredHostels.length > 0 ? (
          <div className="hostel-grid">
            {filteredHostels.map((hostel) => (
              <HostelCard key={hostel.id} hostel={hostel} onClick={() => onHostelClick(hostel)} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-icon">No Result</span>
            <div className="empty-title">No hostels found</div>
            <p className="empty-sub">Try a different location or adjust your filters.</p>
          </div>
        )}
      </div>

      <div style={{ background: "var(--cream-dark)", padding: "80px 0" }}>
        <div className="section" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <div className="section-label">How It Works</div>
          <h2 className="section-title">Simple. Fast. Verified.</h2>
          <div className="how-grid">
            {[
              {
                title: "Search by Location",
                desc: "Search near college or office and shortlist verified hostels with live bed availability.",
              },
              {
                title: "Compare and Choose",
                desc: "Compare room types, move-in cost, menu, amenities, and trust signals before you decide.",
              },
              {
                title: "Request to Join",
                desc: "Send a join request, track approval, and move in with complete fee clarity.",
              },
            ].map((item, index) => (
              <div className="how-card" key={item.title}>
                <div className="how-num">{index + 1}</div>
                <div className="how-title">{item.title}</div>
                <p className="how-desc">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: "80px 0 0" }}>
        <div className="cta-banner">
          <div>
            <div className="cta-title">
              Own a Hostel?
              <br />
              List it on StayNest
            </div>
            <p className="cta-sub">
              Reach guests actively searching for accommodation and manage operations from one
              dashboard.
            </p>
          </div>
          <button className="cta-btn" onClick={onOwnerClick}>
            List Your Hostel
          </button>
        </div>
      </div>
    </div>
  );
}
