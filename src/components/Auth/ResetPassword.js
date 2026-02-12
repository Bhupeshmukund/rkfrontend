import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import "./Auth.css";
import { api } from "../../api";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setTokenValid(false);
      setError("Invalid reset link. No token provided.");
    }
  }, [searchParams]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    const token = searchParams.get("token");
    if (!token) {
      setError("Invalid reset token");
      return;
    }

    setLoading(true);

    try {
      await api.resetPassword(token, formData.password);
      setSuccess("Password reset successfully! Redirecting to login...");
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(err.message || "Failed to reset password. The link may be invalid or expired.");
    } finally {
      setLoading(false);
    }
  };

  if (!tokenValid) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <h2>Invalid Reset Link</h2>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p style={{ marginBottom: '20px', color: '#e74c3c' }}>{error}</p>
            <div className="auth-links">
              <p>
                <Link to="/forgot-password">Request a new reset link</Link>
              </p>
              <p>
                <Link to="/login">Go to Login</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h2>Reset Password</h2>
        <p style={{ marginBottom: '20px', color: '#666', textAlign: 'center' }}>
          Enter your new password below.
        </p>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message" style={{ background: '#d4edda', color: '#155724', padding: '12px', borderRadius: '4px', marginBottom: '15px' }}>{success}</div>}

          <label>New Password:</label>
          <input 
            type="password" 
            name="password"
            placeholder="Enter new password" 
            value={formData.password}
            onChange={handleChange}
            required 
            disabled={loading}
            minLength={6}
          />

          <label>Confirm Password:</label>
          <input 
            type="password" 
            name="confirmPassword"
            placeholder="Confirm new password" 
            value={formData.confirmPassword}
            onChange={handleChange}
            required 
            disabled={loading}
            minLength={6}
          />

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "RESETTING..." : "RESET PASSWORD"}
          </button>
        </form>

        <div className="auth-links">
          <p>
            <Link to="/login">Back to Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
