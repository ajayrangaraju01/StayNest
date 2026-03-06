import { useState } from "react";
import HostelCard from "../components/HostelCard";
import { HOSTELS, LOCATIONS } from "../data/hostels";

export default function HomePage({ onSearch, onHostelClick, onOwnerClick }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All Locations");

  const filteredHostels = HOSTELS.filter((hostel) => {
    const normalizedQuery = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      hostel.location.toLowerCase().includes(normalizedQuery) ||
      hostel.city.toLowerCase().includes(normalizedQuery) ||
      hostel.name.toLowerCase().includes(normalizedQuery);
    const matchesGender =
      genderFilter === "All" || hostel.gender === genderFilter || hostel.gender === "Co-ed";
    const matchesLocation = locationFilter === "All Locations" || hostel.location === locationFilter;

    return matchesSearch && matchesGender && matchesLocation;
  });

  return (
    <div>
      <section className="hero">
        <div className="hero-badge">🏠 India&apos;s Hostel Platform</div>
        <h1 className="hero-title">
          Find Your
          <br />
          <em>Perfect Nest</em>
        </h1>
        <p className="hero-sub">
          Discover verified hostels near your college or workplace. Compare rooms, menus & prices
          {" "}
          all in one place.
        </p>
        <div className="hero-search">
          <span style={{ fontSize: 20 }}>🔍</span>
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
            ["500+", "Verified Hostels"],
            ["12K+", "Happy Students"],
            ["48", "Locations"],
            ["4.6★", "Avg Rating"],
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
            {["All", "Boys", "Girls", "Co-ed"].map((gender) => (
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

        {filteredHostels.length > 0 ? (
          <div className="hostel-grid">
            {filteredHostels.map((hostel) => (
              <HostelCard key={hostel.id} hostel={hostel} onClick={() => onHostelClick(hostel)} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-icon">🔍</span>
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
                icon: "🔍",
                title: "Search by Location",
                desc: "Enter your college or workplace area and browse all available hostels nearby with real photos and details.",
              },
              {
                icon: "🏠",
                title: "Compare & Choose",
                desc: "Compare room types, daily menus, amenities, and prices. Read reviews from existing residents before deciding.",
              },
              {
                icon: "✅",
                title: "Book Instantly",
                desc: "Reserve your room with just a few clicks. Get confirmation and move in hassle-free.",
              },
            ].map((item, index) => (
              <div className="how-card" key={item.title}>
                <div className="how-num">{index + 1}</div>
                <div className="how-icon">{item.icon}</div>
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
              Reach thousands of students looking for accommodation. Manage your hostel, rooms, and
              daily menu
              {" "}
              all from one dashboard.
            </p>
          </div>
          <button className="cta-btn" onClick={onOwnerClick}>
            List Your Hostel →
          </button>
        </div>
      </div>
    </div>
  );
}
