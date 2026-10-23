        {activeTab === "fees" && (
          <>
            <div className="stats-row">
              {[
                { label: "Fee Collected Till Date", num: `INR ${ownerAnalytics?.fee_collected_till_date ?? ownerAnalytics?.revenue_collected ?? 0}` },
                { label: "Pending / Overdue Amount", num: `INR ${ownerAnalytics?.fee_pending_or_overdue_amount ?? ownerAnalytics?.outstanding_amount ?? 0}` },
                { label: "Monthly Collected", num: `INR ${ownerAnalytics?.monthly_collected ?? 0}` },
                { label: "Monthly Overdue", num: `INR ${ownerAnalytics?.monthly_overdue ?? 0}` },
              ].map((stat) => (
                <div className="stat-card" key={stat.label}>
                  <div className="stat-num" style={{ fontSize: 24 }}>{stat.num}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="form-section">
              <div className="form-section-title">Collections Toolkit</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="submit-btn" onClick={handleSendReminders}>
                  Send Overdue Reminders
                </button>
                <button className="nav-btn" onClick={handleExportLedgers}>
                  Export Fee Ledger CSV
                </button>
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-title">Defaulters</div>
              {sortedDefaulters.length === 0 && <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>No overdue guests right now.</p>}
              {sortedDefaulters.map((item) => (
                <div key={item.ledger_id} style={{ border: "1px solid var(--cream-dark)", borderRadius: 10, padding: 14, marginBottom: 10, background: "white" }}>
                  <div style={{ fontWeight: 700 }}>{item.student_name}</div>
                  <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                    {item.hostel_name} | Due {formatDisplayDate(item.due_date)} | {item.days_overdue} day(s) overdue
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    Outstanding: <strong>INR {item.outstanding_amount}</strong> | Status: <strong>{item.status}</strong>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: "var(--warm-gray)" }}>
                    Phone: {item.student_phone || "Not provided"}
                  </div>
                </div>
              ))}
            </div>

            <div className="form-section">
              <div className="form-section-title">Create Fee Ledger</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Hostel</label>
                  <input className="form-input" value={selectedHostel?.name || ""} disabled />
                </div>
                <div className="form-group">
                  <label className="form-label">Guest</label>
                  <select className="form-select" value={feeForm.studentId} onChange={(event) => setFeeForm({ ...feeForm, studentId: event.target.value })}>
                    <option value="">Select guest</option>
                    {approvedStudents.map((student) => <option key={student.booking_id} value={student.student_id}>{student.student_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Month</label>
                  <input className="form-input" type="date" value={feeForm.month} onChange={(event) => setFeeForm({ ...feeForm, month: event.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Amount Due</label>
                  <input className="form-input" type="number" value={feeForm.amountDue} onChange={(event) => setFeeForm({ ...feeForm, amountDue: event.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input className="form-input" type="date" value={feeForm.dueDate} onChange={(event) => setFeeForm({ ...feeForm, dueDate: event.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Late Fee</label>
                  <input className="form-input" type="number" value={feeForm.lateFee} onChange={(event) => setFeeForm({ ...feeForm, lateFee: event.target.value })} />
                </div>
              </div>
              <button className="submit-btn" onClick={handleCreateFee} style={{ marginTop: 12 }}>Create Fee</button>
            </div>

              <div className="form-section">
                <div className="form-section-title">Record Payment</div>
                {editingPaymentId && (
                  <div style={{ marginTop: 10, marginBottom: 12, fontSize: 13, color: "var(--warm-gray)", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <span>Editing payment record #{editingPaymentId}</span>
                    <button
                      className="nav-btn"
                      type="button"
                      onClick={() => {
                        setEditingPaymentId(null);
                        setPaymentForm({ ledgerId: "", amount: "", mode: "upi", referenceId: "" });
                      }}
                    >
                      Cancel Edit
                    </button>
                  </div>
                )}
                <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Ledger</label>
                  <select className="form-select" value={paymentForm.ledgerId} onChange={(event) => setPaymentForm({ ...paymentForm, ledgerId: event.target.value })}>
                    <option value="">Select ledger</option>
                    {feeLedgers.map((ledger) => <option key={ledger.id} value={ledger.id}>{ledger.student_name} - {formatDisplayDate(ledger.month)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <input className="form-input" type="number" value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Mode</label>
                  <select className="form-select" value={paymentForm.mode} onChange={(event) => setPaymentForm({ ...paymentForm, mode: event.target.value })}>
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="bank">Bank</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Reference</label>
                  <input className="form-input" value={paymentForm.referenceId} onChange={(event) => setPaymentForm({ ...paymentForm, referenceId: event.target.value })} />
                </div>
                </div>
                <button className="submit-btn" onClick={handleRecordPayment} style={{ marginTop: 12 }}>
                  {editingPaymentId ? "Update Payment" : "Record Payment"}
                </button>
              </div>

              <div className="form-section">
                <div className="form-section-title">Fee Ledger History</div>
                {feeLedgers.length === 0 && <p style={{ color: "var(--warm-gray)", fontSize: 14 }}>No fee ledgers yet.</p>}
              {feeLedgers.map((ledger) => (
                <div key={ledger.id} style={{ border: "1px solid var(--cream-dark)", borderRadius: 10, padding: 14, marginBottom: 10, background: "white" }}>
                  <div style={{ fontWeight: 700 }}>{ledger.student_name} - {ledger.hostel_name}</div>
                    <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
                      Due {formatDisplayDate(ledger.due_date)} | Amount Due INR {ledger.amount_due} | Paid INR {ledger.amount_paid}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12 }}>Status: <strong>{ledger.status}</strong></div>
                    {ledger.payments?.length > 0 && (
                      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                        {ledger.payments.map((payment) => (
                          <div
                            key={payment.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 10,
                              alignItems: "center",
                              padding: "8px 10px",
                              borderRadius: 8,
                              background: "var(--cream-soft)",
                              fontSize: 12,
                            }}
                          >
                            <div style={{ color: "var(--warm-gray)" }}>
                              INR {payment.amount} via {payment.mode} on {formatDisplayDateTime(payment.paid_at)}
                              {payment.reference_id ? ` | Ref ${payment.reference_id}` : ""}
                            </div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button className="nav-btn" type="button" onClick={() => handleEditPayment(payment, ledger)}>
                                Edit
                              </button>
                              <button className="nav-btn" type="button" onClick={() => handleDeletePayment(payment.id)}>
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
          </>
        )}

