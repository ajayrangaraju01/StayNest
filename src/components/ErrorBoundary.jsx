import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "40px 20px", maxWidth: "600px", margin: "40px auto", textAlign: "center", background: "white", borderRadius: "16px", boxShadow: "0 10px 30px rgba(0,0,0,0.08)", border: "1px solid #e7dfd5" }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>⚠️</div>
          <h2 style={{ fontSize: "20px", color: "#292524", marginBottom: "8px" }}>Section Encountered an Issue</h2>
          <p style={{ fontSize: "14px", color: "#78716c", marginBottom: "20px" }}>
            {this.state.error?.message || "Something went wrong while loading this section."}
          </p>
          <button
            type="button"
            style={{ padding: "10px 24px", background: "#c1440e", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            Reload Section
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
