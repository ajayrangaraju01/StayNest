import { useMemo } from "react";
import HostelCard from "../components/HostelCard";

export default function LandingPage({
  hostels = [],
  onNavigateTo,
  onOpenAuth,
  onHostelClick,
}) {
  const verifiedHostels = useMemo(() => {
    return hostels.filter((h) => h.verified || h.moderationStatus === "approved").slice(0, 3);
  }, [hostels]);

  const totalOpenBeds = useMemo(() => {
    return hostels.reduce(
      (sum, h) => sum + (h.rooms || []).reduce((rSum, r) => rSum + Number(r.available || 0), 0),
      0,
    );
  }, [hostels]);

  return (
    <div className="landing-page">
      {/* Main Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-kicker">A Direct Living Platform for India's Cities</div>
          <h1 className="landing-hero-title">
            Thoughtful Living, Managed with Clarity.
          </h1>
          <p className="landing-hero-subtitle">
            StayNest connects students and working professionals directly with verified PG and hostel owners—with zero brokerage, transparent pricing, and live room availability.
          </p>

          <div className="landing-hero-actions">
            <button
              type="button"
              className="btn-primary-landing hero-cta"
              onClick={() => onNavigateTo("home")}
            >
              Explore Verified Stays
            </button>
            <button
              type="button"
              className="btn-outline-landing hero-cta"
              onClick={() => onOpenAuth("owner")}
            >
              List Property as Owner
            </button>
          </div>

          <div className="landing-hero-footnote">
            Already a resident?{" "}
            <button
              type="button"
              className="landing-text-link"
              onClick={() => onOpenAuth("guest")}
            >
              Sign in to Tenant Portal &rarr;
            </button>
          </div>
        </div>
      </section>

      {/* Trust & Real Metrics Strip */}
      <section className="landing-strip">
        <div className="landing-strip-inner">
          <div className="strip-item">
            <span className="strip-label">Direct Connection</span>
            <span className="strip-value">Zero Brokerage</span>
            <p className="strip-desc">Rent directly from verified property proprietors with no agency commissions.</p>
          </div>
          <div className="strip-item">
            <span className="strip-label">Room Availability</span>
            <span className="strip-value">{totalOpenBeds > 0 ? `${totalOpenBeds}+ Open Beds` : "Live Bed Tracking"}</span>
            <p className="strip-desc">Real-time floor and bed availability updated directly by hostel managers.</p>
          </div>
          <div className="strip-item">
            <span className="strip-label">Nutrition & Living</span>
            <span className="strip-value">7-Day Meal Menus</span>
            <p className="strip-desc">Review actual breakfast, lunch, and dinner schedules before moving in.</p>
          </div>
          <div className="strip-item">
            <span className="strip-label">Financial Clarity</span>
            <span className="strip-value">Transparent Dues</span>
            <p className="strip-desc">Upfront security deposits, monthly rent ledgers, and zero hidden maintenance fees.</p>
          </div>
        </div>
      </section>

      {/* Role Partitioning: The Two Public Portals */}
      <section className="landing-ecosystems">
        <div className="landing-section-header">
          <div className="landing-kicker">Dedicated Operational Tiers</div>
          <h2 className="landing-section-title">Built Specially for Tenants and Property Owners</h2>
          <p className="landing-section-subtitle">
            Separate, specialized workflows ensure residents enjoy a seamless living experience while proprietors maintain full inventory control.
          </p>
        </div>

        <div className="ecosystem-grid">
          {/* Tenant Experience Panel */}
          <div className="ecosystem-card tenant-card" id="tenants">
            <div className="ecosystem-card-header">
              <span className="role-tag tenant-tag">For Residents &amp; Students</span>
              <h3 className="ecosystem-title">The Tenant Experience</h3>
              <p className="ecosystem-desc">
                Everything you need to find, evaluate, and settle into a comfortable, safe living space near your college or workplace.
              </p>
            </div>

            <ul className="ecosystem-feature-list">
              <li className="ecosystem-feature-item">
                <strong>100% Verified Listings:</strong> Every property features authentic photographs, GPS coordinates, and clear room dimensions.
              </li>
              <li className="ecosystem-feature-item">
                <strong>Weekly Meal Schedules:</strong> View full 7-day nutritional menus (Breakfast, Lunch, Dinner) updated weekly by the hostel.
              </li>
              <li className="ecosystem-feature-item">
                <strong>Room Sharing Flexibility:</strong> Compare Single, 2-Share, 3-Share, and 4-Share rooms with clear security deposit terms.
              </li>
              <li className="ecosystem-feature-item">
                <strong>Digital Booking Requests:</strong> Apply online in seconds and monitor acceptance status without brokers.
              </li>
              <li className="ecosystem-feature-item">
                <strong>Self-Service Living Portal:</strong> Submit maintenance tickets, log leave requests, and track rent receipts in one dashboard.
              </li>
            </ul>

            <div className="ecosystem-card-action">
              <button
                type="button"
                className="btn-primary-landing full-width"
                onClick={() => onOpenAuth("guest")}
              >
                Access Tenant Portal &rarr;
              </button>
            </div>
          </div>

          {/* Owner Experience Panel */}
          <div className="ecosystem-card owner-card" id="owners">
            <div className="ecosystem-card-header">
              <span className="role-tag owner-tag">For Hostel &amp; PG Proprietors</span>
              <h3 className="ecosystem-title">The Owner Operations Suite</h3>
              <p className="ecosystem-desc">
                A purpose-built management system designed for Indian hostel owners to streamline occupancy, meals, and tenant communication.
              </p>
            </div>

            <ul className="ecosystem-feature-list">
              <li className="ecosystem-feature-item">
                <strong>Zero Commission Listings:</strong> Showcase your property directly to verified applicants without paying brokerage fees.
              </li>
              <li className="ecosystem-feature-item">
                <strong>Floor-by-Floor Bed Matrix:</strong> Visually manage room allocations and monitor vacant versus occupied beds in real time.
              </li>
              <li className="ecosystem-feature-item">
                <strong>Instant Booking Approvals:</strong> Screen prospective residents, view emergency contacts, and approve applications with 1 click.
              </li>
              <li className="ecosystem-feature-item">
                <strong>Daily Meal Broadcast:</strong> Update your daily menu and notify all active residents about meal timings instantly.
              </li>
              <li className="ecosystem-feature-item">
                <strong>Maintenance &amp; Noticeboard:</strong> Receive resident maintenance requests with photo logs and broadcast important announcements.
              </li>
            </ul>

            <div className="ecosystem-card-action">
              <button
                type="button"
                className="btn-primary-landing full-width"
                onClick={() => onOpenAuth("owner")}
              >
                Access Owner Portal &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* Security & Platform Compliance Callout */}
        <div className="security-assurance-box">
          <div className="security-icon-col">
            <div className="security-badge">Protected Infrastructure</div>
          </div>
          <div className="security-text-col">
            <h4 className="security-title">Platform Integrity &amp; Strict Compliance Boundary</h4>
            <p className="security-text">
              To safeguard our community and prevent fraudulent listings, platform administration—including owner KYC audits, property safety checks, and dispute arbitration—operates within an isolated, private security boundary. Administrative controls are strictly concealed from public access to ensure total operational integrity.
            </p>
          </div>
        </div>
      </section>

      {/* Live Verified Properties Showcase */}
      {verifiedHostels.length > 0 && (
        <section className="landing-showcase">
          <div className="landing-section-header">
            <div className="landing-kicker">Live Directory</div>
            <h2 className="landing-section-title">Verified Stays Available Today</h2>
            <p className="landing-section-subtitle">
              Explore inspected properties ready for immediate occupancy across major hubs.
            </p>
          </div>

          <div className="hostels-grid landing-hostels-grid">
            {verifiedHostels.map((hostel) => (
              <HostelCard
                key={hostel.id}
                hostel={hostel}
                onClick={() => onHostelClick(hostel)}
              />
            ))}
          </div>

          <div className="landing-showcase-footer">
            <button
              type="button"
              className="btn-outline-landing"
              onClick={() => onNavigateTo("home")}
            >
              Browse All Properties in Directory &rarr;
            </button>
          </div>
        </section>
      )}

      {/* The Five StayNest Standards */}
      <section className="landing-standards" id="standards">
        <div className="landing-section-header">
          <div className="landing-kicker">Our Quality Benchmark</div>
          <h2 className="landing-section-title">The Five StayNest Living Standards</h2>
          <p className="landing-section-subtitle">
            Every property listed on StayNest must comply with mandatory quality, hygiene, and security requirements.
          </p>
        </div>

        <div className="standards-grid">
          <div className="standard-item">
            <div className="standard-num">01</div>
            <h3 className="standard-heading">24/7 Safety &amp; Security</h3>
            <p className="standard-text">
              Continuous CCTV monitoring of common areas, secure gated access, and verified warden supervision on premises.
            </p>
          </div>

          <div className="standard-item">
            <div className="standard-num">02</div>
            <h3 className="standard-heading">High-Speed Connectivity</h3>
            <p className="standard-text">
              Uncapped high-speed commercial Wi-Fi with inverter or generator power backup for uninterrupted work and study.
            </p>
          </div>

          <div className="standard-item">
            <div className="standard-num">03</div>
            <h3 className="standard-heading">Hygienic Living &amp; Water</h3>
            <p className="standard-text">
              Multi-stage commercial RO drinking water purification and scheduled daily cleaning of rooms and washrooms.
            </p>
          </div>

          <div className="standard-item">
            <div className="standard-num">04</div>
            <h3 className="standard-heading">Transparent Accounting</h3>
            <p className="standard-text">
              Standardized security deposits, digital rent ledgers, clear move-in terms, and strictly zero hidden maintenance surcharges.
            </p>
          </div>

          <div className="standard-item">
            <div className="standard-num">05</div>
            <h3 className="standard-heading">Direct Proprietor Contact</h3>
            <p className="standard-text">
              Direct access to property owners for maintenance escalation, emergency support, and immediate query resolution.
            </p>
          </div>
        </div>
      </section>

      {/* Editorial Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="footer-col-main">
            <div className="landing-brand footer-brand">
              Stay<span>Nest</span>
            </div>
            <p className="footer-tagline">
              Connecting residents with verified living spaces and empowering property proprietors across India with modern operational tools.
            </p>
            <div className="footer-contact">
              Hyderabad, Telangana &bull; support@staynest.in
            </div>
          </div>

          <div className="footer-col">
            <h4 className="footer-col-title">For Tenants</h4>
            <ul className="footer-links">
              <li>
                <button type="button" className="footer-link-btn" onClick={() => onNavigateTo("home")}>
                  Browse Stays
                </button>
              </li>
              <li>
                <button type="button" className="footer-link-btn" onClick={() => onOpenAuth("guest")}>
                  Tenant Portal Login
                </button>
              </li>
              <li>
                <a href="#standards" className="footer-link-btn">
                  Safety Standards
                </a>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-col-title">For Owners</h4>
            <ul className="footer-links">
              <li>
                <button type="button" className="footer-link-btn" onClick={() => onOpenAuth("owner")}>
                  List Your Property
                </button>
              </li>
              <li>
                <button type="button" className="footer-link-btn" onClick={() => onOpenAuth("owner")}>
                  Owner Portal Login
                </button>
              </li>
              <li>
                <a href="#owners" className="footer-link-btn">
                  Occupancy Management
                </a>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-col-title">Security &amp; Legal</h4>
            <ul className="footer-links">
              <li>
                <span className="footer-text-muted">Zero Brokerage Guarantee</span>
              </li>
              <li>
                <span className="footer-text-muted">Verified Privacy Policy</span>
              </li>
              <li>
                {/* Discrete Staff Access (Hidden Admin Entry Point) */}
                <button
                  type="button"
                  className="footer-link-btn staff-portal-link"
                  onClick={() => onOpenAuth("admin")}
                  title="Restricted Staff Portal"
                >
                  Staff Access
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <p>&copy; {new Date().getFullYear()} StayNest Technologies Private Limited. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
