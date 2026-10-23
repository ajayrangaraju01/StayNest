        {activeTab === "complaints" && (
          <>
            <div className="form-section">
              <div className="form-section-title">Raise Complaint</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Hostel</label>
                  <input className="form-input" value={selectedHostel?.name || ""} disabled />
                </div>
                <div className="form-group">
                  <label className="form-label">Guest</label>
                  <select className="form-select" value={complaintForm.studentId} onChange={(event) => setComplaintForm({ ...complaintForm, studentId: event.target.value })}>
                    <option value="">Select guest</option>
                    {approvedStudents.map((student) => <option key={student.booking_id} value={student.student_id}>{student.student_name}</option>)}
                  </select>
                </div>
                <div className="form-group full">
                  <label className="form-label">Reason</label>
                  <textarea className="form-textarea" value={complaintForm.reason} onChange={(event) => setComplaintForm({ ...complaintForm, reason: event.target.value })} />
                </div>
                <div className="form-group full">
                  <label className="form-label">Evidence URL</label>
                  <input className="form-input" value={complaintForm.evidenceUrl} onChange={(event) => setComplaintForm({ ...complaintForm, evidenceUrl: event.target.value })} />
                </div>
              </div>
              <button className="submit-btn" onClick={handleCreateComplaint} style={{ marginTop: 12 }}>Submit Complaint</button>
            </div>

            <div className="form-section">
              <div className="form-section-title">Complaint History</div>
              {complaints.length === 0 && <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>No complaints filed yet.</p>}
              {complaints.map((complaint) => (
                <div key={complaint.id} style={{ border: "1px solid var(--cream-dark)", borderRadius: 10, padding: 14, marginBottom: 10, background: "white" }}>
                  <div style={{ fontWeight: 700 }}>{complaint.student_name}</div>
                  <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                    {complaint.hostel_name} | {complaint.student_phone || "No phone"}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 13 }}>{complaint.reason}</div>
                  <div style={{ marginTop: 8, fontSize: 12 }}>Status: <strong>{complaint.status}</strong></div>
                  {complaint.admin_decision && <div style={{ marginTop: 6, fontSize: 13 }}>Admin Note: {complaint.admin_decision}</div>}
                </div>
              ))}
            </div>
          </>
        )}

