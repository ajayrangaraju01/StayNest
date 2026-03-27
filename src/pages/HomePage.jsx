import { useState } from "react";
import HostelCard from "../components/HostelCard";
import { LOCATIONS } from "../data/hostels";

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

  const filteredHostels = hostels.filter((hostel) => {
    const normalizedQuery = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      hostel.location.toLowerCase().includes(normalizedQuery) ||
      hostel.city.toLowerCase().includes(normalizedQuery) ||
      hostel.name.toLowerCase().includes(normalizedQuery);

    const matchesGender =
      genderFilter === "All" || hostel.gender === genderFilter || hostel.gender === "Co-Live";
    const matchesLocation = locationFilter === "All Locations" || hostel.location === locationFilter;

    return matchesSearch && matchesGender && matchesLocation;
  });

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
        <div className="hero-search">
          <input
            placeholder="Search by location, area or hostel name..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && onSearch(searchQuery)}
          />
          <button className="hero-search-btn" onClick={() => onSearch(searchQuery)}>
            Search Hostels
          </button>
        </div>
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
          {LOCATIONS.map((location) => (
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
