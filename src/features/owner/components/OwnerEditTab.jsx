        {activeTab === "edit" && (
          <div className="form-section">
            <div className="form-section-title">Edit Hostel / PG Details</div>
            {hostels.length === 0 && (
              <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>
                No hostels available.
              </p>
            )}
            {hostels.length > 0 && editForm && (
              <>
                {isCompactMobile && (
                  <div className="mobile-edit-nav">
                    {[
                      ["basic", "Basics"],
                      ["map", "Map"],
                      ["media", "Photos"],
                      ["pricing", "Pricing"],
                      ["inventory", "Beds"],
                      ["floors", "Floors"],
                      ["summary", "Summary"],
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        className={`mobile-edit-nav-chip${editMobileSection === key ? " active" : ""}`}
                        onClick={() => setEditMobileSection(key)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="edit-hostel-summary">
                  <div className="edit-hostel-summary-card">
                    <span className="edit-hostel-summary-label">Total Floors</span>
                    <strong>{editForm.totalFloors || 0}</strong>
                  </div>
                  <div className="edit-hostel-summary-card">
                    <span className="edit-hostel-summary-label">Total Rooms</span>
                    <strong>{calculatedTotalRooms || 0}</strong>
                  </div>
                  <div className="edit-hostel-summary-card">
                    <span className="edit-hostel-summary-label">Total Beds</span>
                    <strong>{calculatedTotalBeds || 0}</strong>
                  </div>
                  <div className="edit-hostel-summary-card">
                    <span className="edit-hostel-summary-label">Location</span>
                    <strong>{editForm.area || "Not set"}</strong>
                  </div>
                </div>

                <div className={`form-section mobile-edit-block${isCompactMobile && editMobileSection !== "basic" ? " mobile-edit-block-hidden" : ""}`} style={{ marginTop: 16 }}>
                  <div className="form-section-title">Basic Details</div>
                  <p className="edit-hostel-help">Keep this section simple: name, contact, type, and address basics.</p>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Hostel Name</label>
                    <input
                      className="form-input"
                      value={editForm.name}
                      onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hostel Type</label>
                    <select
                      className="form-select"
                      value={editForm.gender}
                      onChange={(event) => setEditForm({ ...editForm, gender: event.target.value })}
                    >
                      <option>Boys</option>
                      <option>Girls</option>
                      <option>Co-Live</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Number</label>
                    <input
                      className="form-input"
                      value={editForm.contact_number}
                      onChange={(event) => setEditForm({ ...editForm, contact_number: event.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input
                      className="form-input"
                      value={editForm.city}
                      onChange={(event) => setEditForm({ ...editForm, city: event.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Area / Location</label>
                    <input
                      className="form-input"
                      value={editForm.area}
                      onChange={(event) => setEditForm({ ...editForm, area: event.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pincode</label>
                    <input
                      className="form-input"
                      value={editForm.pincode}
                      onChange={(event) => setEditForm({ ...editForm, pincode: event.target.value })}
                    />
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Address</label>
                    <input
                      className="form-input"
                      value={editForm.address}
                      onChange={(event) => setEditForm({ ...editForm, address: event.target.value })}
                    />
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-textarea"
                      value={editForm.description}
                      onChange={(event) => setEditForm({ ...editForm, description: event.target.value })}
                    />
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Rules / Other Details</label>
                    <textarea
                      className="form-textarea"
                      value={editForm.rules}
                      onChange={(event) => setEditForm({ ...editForm, rules: event.target.value })}
                    />
                  </div>
                </div>
                </div>

                <div className={`form-section mobile-edit-block${isCompactMobile && editMobileSection !== "map" ? " mobile-edit-block-hidden" : ""}`} style={{ marginTop: 16 }}>
                  <div className="form-section-title">Map Location</div>
                  <p className="edit-hostel-help">Best option: use current location or pick the exact hostel pin on map.</p>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Latitude</label>
                    <input className="form-input" value={editForm.geoLat || ""} disabled />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Longitude</label>
                    <input className="form-input" value={editForm.geoLng || ""} disabled />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Map Location</label>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button className="nav-btn" type="button" onClick={handleLocateEditedHostel} disabled={mapLocateBusy}>
                        {mapLocateBusy ? "Locating..." : "Quick Fill by Address"}
                      </button>
                      <button className="nav-btn" type="button" onClick={handleUseCurrentHostelLocation} disabled={currentMapLocateBusy}>
                        {currentMapLocateBusy ? "Fetching..." : "Use Current Location"}
                      </button>
                      <button className="nav-btn" type="button" onClick={() => setShowMapPicker(true)}>
                        Pick Exact Pin on Map
                      </button>
                    </div>
                  </div>
                  {(editForm.geoLat || editForm.geoLng) && (
                    <div className="form-group full">
                      <div className="auth-info" style={{ marginTop: 0 }}>
                        Map location saved for this hostel.
                        {" "}
                        <a
                          href={`https://www.google.com/maps?q=${editForm.geoLat},${editForm.geoLng}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "var(--terra)", fontWeight: 700 }}
                        >
                          Open in Google Maps
                        </a>
                      </div>
                    </div>
                  )}
                </div>
                </div>

                <div className={`form-section mobile-edit-block${isCompactMobile && editMobileSection !== "media" ? " mobile-edit-block-hidden" : ""}`} style={{ marginTop: 16 }}>
                  <div className="form-section-title">Amenities & Photos</div>
                  <p className="edit-hostel-help">Choose common amenities and keep a clean, photo-rich listing.</p>
                  <div className="form-grid">
                  <div className="form-group full">
                    <label className="form-label">Amenities</label>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: 10,
                        padding: 14,
                        border: "1.5px solid var(--cream-dark)",
                        borderRadius: 10,
                        background: "var(--cream)",
                      }}
                    >
                      {amenityOptions.map((amenity) => {
                        const checked = editForm.selectedAmenities?.includes(amenity);
                        return (
                          <label
                            key={amenity}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              fontSize: 14,
                              color: "var(--espresso)",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) =>
                                setEditForm({
                                  ...editForm,
                                  selectedAmenities: event.target.checked
                                    ? [...(editForm.selectedAmenities || []), amenity]
                                    : (editForm.selectedAmenities || []).filter((item) => item !== amenity),
                                })}
                            />
                            <span>{amenity}</span>
                          </label>
                        );
                      })}
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <label className="form-label">Other Amenities</label>
                      <input
                        className="form-input"
                        value={editForm.customAmenitiesText}
                        onChange={(event) => setEditForm({ ...editForm, customAmenitiesText: event.target.value })}
                        placeholder="Add other amenities separated by commas"
                      />
                    </div>
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Hostel/PG Photos</label>
                    <label className="photo-upload-shell">
                      <input
                        className="photo-upload-input"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleEditPhotoFiles}
                      />
                      <div className="photo-upload-copy">
                        <div className="photo-upload-title">Add hostel photos</div>
                        <div className="photo-upload-subtitle">
                          Tap to choose multiple images for your listing gallery.
                        </div>
                      </div>
                      <span className="photo-upload-cta">
                        {editForm.newPhotoFiles?.length ? "Add More" : "Choose Photos"}
                      </span>
                    </label>
                    <div className="photo-upload-stats">
                      <span>Existing: {editForm.existingPhotos?.length || 0}</span>
                      <span>New: {editForm.newPhotoFiles?.length || 0}</span>
                    </div>
                    {hasPhotos && (
                      <div
                        style={{
                          marginTop: 12,
                          border: "1px solid var(--cream-dark)",
                          borderRadius: 12,
                          overflow: "hidden",
                          background: "white",
                        }}
                      >
                        <div style={{ position: "relative" }}>
                          <img
                            src={activePhoto}
                            alt={`Hostel photo ${photoIndex + 1}`}
                            style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }}
                          />
                          {mergedPhotosPreview.length > 1 && (
                            <>
                              <button
                                type="button"
                                className="nav-btn"
                                onClick={() =>
                                  setPhotoIndex((prev) =>
                                    prev === 0 ? mergedPhotosPreview.length - 1 : prev - 1)}
                                style={{
                                  position: "absolute",
                                  left: 10,
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                }}
                              >
                                Prev
                              </button>
                              <button
                                type="button"
                                className="nav-btn"
                                onClick={() =>
                                  setPhotoIndex((prev) =>
                                    prev === mergedPhotosPreview.length - 1 ? 0 : prev + 1)}
                                style={{
                                  position: "absolute",
                                  right: 10,
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                }}
                              >
                                Next
                              </button>
                            </>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 6, padding: "8px 12px", flexWrap: "wrap" }}>
                          {mergedPhotosPreview.map((photo, index) => (
                            <div
                              key={`${photo}-${index}`}
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 8,
                                border: index === photoIndex ? "2px solid var(--terra)" : "1px solid var(--cream-dark)",
                                overflow: "hidden",
                                background: "white",
                                cursor: "pointer",
                                position: "relative",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => setPhotoIndex(index)}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  border: "none",
                                  padding: 0,
                                  background: "transparent",
                                  cursor: "pointer",
                                }}
                              >
                                <img
                                  src={photo}
                                  alt={`Thumb ${index + 1}`}
                                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                />
                              </button>
                              <button
                                type="button"
                                className="photo-remove"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  const isExisting = index < (editForm.existingPhotos?.length || 0);
                                  if (isExisting) {
                                    handleRemoveExistingPhoto(photo);
                                  } else {
                                    handleRemoveNewPhoto(photo);
                                  }
                                }}
                                aria-label={`Remove photo ${index + 1}`}
                              >
                                x
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                </div>

                <details className={`edit-collapsible mobile-edit-block${isCompactMobile && editMobileSection !== "pricing" ? " mobile-edit-block-hidden" : ""}`}>
                  <summary className="edit-collapsible-summary">
                    <div>
                      <strong>Pricing by Share Type</strong>
                      <span>
                        Monthly fee, day-wise price, advance, and deposit
                        <em className="edit-collapsible-chip">{shareTypeConfig.length} share types</em>
                      </span>
                    </div>
                  </summary>
                  <div className="edit-collapsible-body">
                    <p className="edit-hostel-help">
                      Update monthly fee, day-wise price, booking advance, and security deposit for each share type.
                    </p>
                    <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                      {shareTypeConfig.map((item) => {
                        const room = editForm.rooms.find((entry) => entry.type === item.label);
                        return (
                          <div key={`share-price-${item.key}`} className="edit-compact-card">
                            <div className="form-group">
                              <label className="form-label">{item.label} Monthly Fee</label>
                              <input
                                className="form-input"
                                type="number"
                                value={room?.price ?? ""}
                                onChange={(event) => handleSharePriceChange(item.label, event.target.value)}
                                placeholder={`Enter fee for ${item.label}`}
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label">{item.label} Day-wise Price</label>
                              <input
                                className="form-input"
                                type="number"
                                value={room?.dailyPrice ?? ""}
                                onChange={(event) => handleRoomChange(room?.id, "dailyPrice", event.target.value, item.label)}
                                placeholder={`Daily price for ${item.label}`}
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label">{item.label} Booking Advance</label>
                              <input
                                className="form-input"
                                type="number"
                                value={room?.bookingAdvance ?? ""}
                                onChange={(event) => handleRoomChange(room?.id, "bookingAdvance", event.target.value, item.label)}
                                placeholder={`Advance for ${item.label}`}
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label">{item.label} Security Deposit</label>
                              <input
                                className="form-input"
                                type="number"
                                value={room?.securityDeposit ?? ""}
                                onChange={(event) => handleRoomChange(room?.id, "securityDeposit", event.target.value, item.label)}
                                placeholder={`Deposit for ${item.label}`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </details>

                <div className={`form-section mobile-edit-block${isCompactMobile && editMobileSection !== "inventory" ? " mobile-edit-block-hidden" : ""}`} style={{ marginTop: 16 }}>
                  <div className="form-section-title">Inventory & Availability</div>
                  <p className="edit-hostel-help">Only availability is editable here. Prices are managed above.</p>
                  {editForm.rooms.map((room) => (
                    <div className="form-grid" key={room.id || room.type} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                      <div className="form-group">
                        <label className="form-label">Share Type</label>
                        <input className="form-input" value={room.type} disabled />
                      </div>
                      <div className="form-group">
                        <label className="form-label">{room.type} Total Beds</label>
                        <input
                          className="form-input"
                          value={calculatedRoomTotals[room.type] ?? room.total}
                          disabled
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">{room.type} Available Beds</label>
                        <input
                          className="form-input"
                          type="number"
                          value={room.available}
                          onChange={(event) => handleRoomChange(room.id, "available", event.target.value, room.type)}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <details className={`edit-collapsible mobile-edit-block${isCompactMobile && editMobileSection !== "floors" ? " mobile-edit-block-hidden" : ""}`}>
                  <summary className="edit-collapsible-summary">
                    <div>
                      <strong>Rooms Per Floor</strong>
                      <span>
                        Expand only when you want to adjust the building layout
                        <em className="edit-collapsible-chip">{editForm.floorRoomCounts.length || 0} floors</em>
                      </span>
                    </div>
                  </summary>
                  <div className="edit-collapsible-body">
                    <p className="edit-hostel-help">Enter how many rooms of each share type exist on every floor.</p>
                    {editForm.floorRoomCounts.length === 0 && (
                      <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>
                        Enter total floors to define per-floor room counts.
                      </p>
                    )}
                    {editForm.floorRoomCounts.map((floor) => (
                      <div key={floor.floor} className="edit-floor-card">
                        <div className="edit-floor-card-header">
                          <strong>Floor {floor.floor}</strong>
                          <span>Update room counts only for this floor</span>
                        </div>
                        <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
                          {[
                            ["double", "2 Share"],
                            ["triple", "3 Share"],
                            ["four", "4 Share"],
                            ["five", "5 Share"],
                            ["six", "6 Share"],
                          ].map(([key, label]) => (
                            <div className="form-group" key={`${floor.floor}-${key}`}>
                              <label className="form-label">{label}</label>
                              <input
                                className="form-input"
                                type="number"
                                value={floor[key]}
                                onChange={(event) => handleFloorRoomChange(floor.floor, key, event.target.value)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>

                <div className={`form-section mobile-edit-block${isCompactMobile && editMobileSection !== "summary" ? " mobile-edit-block-hidden" : ""}`} style={{ marginTop: 16 }}>
                  <div className="form-section-title">Building Summary</div>
                  <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                    <div className="form-group">
                      <label className="form-label">Total Floors</label>
                      <input
                        className="form-input"
                        type="number"
                        value={editForm.totalFloors}
                        onChange={(event) => handleFloorsChange(event.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Total Rooms</label>
                      <input className="form-input" value={calculatedTotalRooms} disabled />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Total Beds</label>
                      <input className="form-input" value={calculatedTotalBeds} disabled />
                    </div>
                  </div>
                </div>

                <button className={`submit-btn${isCompactMobile ? " mobile-save-btn" : ""}`} onClick={handleSaveEdits} style={{ marginTop: 12 }}>
                  Save Changes
                </button>
              </>
            )}
          </div>
        )}

