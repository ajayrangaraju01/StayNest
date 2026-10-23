        {activeTab === "menu" && (
          <>
            <div className="form-section">
              <div className="form-section-title">Plan or Override Menu</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Hostel</label>
                  <input className="form-input" value={selectedHostel?.name || ""} disabled />
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input className="form-input" type="date" value={menuForm.date} onChange={(event) => setMenuForm({ ...menuForm, date: event.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Breakfast</label>
                  <input className="form-input" value={menuForm.breakfast} onChange={(event) => setMenuForm({ ...menuForm, breakfast: event.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Lunch</label>
                  <input className="form-input" value={menuForm.lunch} onChange={(event) => setMenuForm({ ...menuForm, lunch: event.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Dinner</label>
                  <input className="form-input" value={menuForm.dinner} onChange={(event) => setMenuForm({ ...menuForm, dinner: event.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Today's Override</label>
                  <select className="form-select" value={menuForm.isOverride ? "yes" : "no"} onChange={(event) => setMenuForm({ ...menuForm, isOverride: event.target.value === "yes" })}>
                    <option value="no">Weekly Plan</option>
                    <option value="yes">Today Override</option>
                  </select>
                </div>
              </div>
              <button className="submit-btn" onClick={handleSaveMenu} style={{ marginTop: 12 }}>Save Menu</button>
            </div>

            <div className="form-section">
              <div className="form-section-title">Saved Menus</div>
              {menus.length === 0 && <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>No menus saved yet.</p>}
              {menus.map((menu) => (
                <div key={menu.id} style={{ border: "1px solid var(--cream-dark)", borderRadius: 10, padding: 14, marginBottom: 10, background: "white" }}>
                  <div style={{ fontWeight: 700 }}>{menu.hostel_name} - {formatDisplayDate(menu.date)}</div>
                  <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                    Breakfast: {menu.breakfast || "-"} | Lunch: {menu.lunch || "-"} | Dinner: {menu.dinner || "-"}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12 }}>Type: <strong>{menu.is_override ? "Today Override" : "Planned Menu"}</strong></div>
                </div>
              ))}
            </div>
          </>
        )}

