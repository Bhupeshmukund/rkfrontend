import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./Auth.css";
import { api } from "../../api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!email.trim()) {
      setError("Email is required");
      setLoading(false);
      return;
    }

    try {
      await api.forgotPassword(email);
      setSuccess("If an account with that email exists, we have sent a password reset link. Please check your inbox.");
      setEmail("");
    } catch (err) {
      setError(err.message || "Failed to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h2>Forgot Password</h2>
        <p style={{ marginBottom: '20px', color: '#666', textAlign: 'center' }}>
          Enter your email address and we'll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message" style={{ background: '#d4edda', color: '#155724', padding: '12px', borderRadius: '4px', marginBottom: '15px' }}>{success}</div>}

          <label>Email:</label>
          <input 
            type="email" 
            name="email"
            placeholder="Enter your email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
            disabled={loading}
          />

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "SENDING..." : "SEND RESET LINK"}
          </button>
        </form>

        <div className="auth-links">
          <p>
            Remember your password? <Link to="/login">Login</Link>
          </p>
          <p>
            Don't have an account? <Link to="/signup">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
