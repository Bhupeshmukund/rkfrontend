import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Auth.css";
import { api } from "../../api";

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

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

    setLoading(true);

    try {
      const response = await api.signup(
        formData.name,
        formData.email,
        formData.password
      );

      // If verification is required, show message instead of redirecting
      if (response.requiresVerification) {
        setVerificationSent(true);
        setResendCooldown(60); // Start 60 second cooldown
        return;
      }

      // Store token/user info in localStorage
      if (response.token) {
        localStorage.setItem("authToken", response.token);
      }
      if (response.user) {
        localStorage.setItem("user", JSON.stringify(response.user));
      }

      // Dispatch auth change event
      window.dispatchEvent(new CustomEvent('authChanged'));
      
      // Redirect to homepage
      navigate("/");
    } catch (err) {
      setError(err.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;

    setLoading(true);
    setError("");

    try {
      await api.resendVerification(formData.email);
      setResendCooldown(60); // Start 60 second cooldown
      setError(""); // Clear any errors
    } catch (err) {
      if (err.cooldown) {
        setResendCooldown(err.cooldown);
      }
      setError(err.message || "Failed to resend verification email.");
    } finally {
      setLoading(false);
    }
  };

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendCooldown]);

  if (verificationSent) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <h2>Verify Your Email</h2>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p style={{ marginBottom: '20px', color: '#00ACEE', fontSize: '18px' }}>
              ✓ Verification email sent!
            </p>
            <p style={{ marginBottom: '20px' }}>
              We've sent a verification link to <strong>{formData.email}</strong>
            </p>
            <p style={{ marginBottom: '30px', color: '#666' }}>
              Please check your inbox and click the verification link to activate your account.
            </p>
            {error && <div className="error-message" style={{ marginBottom: '20px' }}>{error}</div>}
            <button 
              type="button" 
              className="auth-btn" 
              onClick={handleResendVerification}
              disabled={loading || resendCooldown > 0}
              style={{ marginBottom: '20px' }}
            >
              {loading 
                ? "Sending..." 
                : resendCooldown > 0 
                  ? `Resend in ${resendCooldown}s` 
                  : "Resend Verification Email"}
            </button>
            <div className="auth-links">
              <p>
                Already verified? <Link to="/login">Login</Link>
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
        <h2>Sign Up</h2>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          <label>Name:</label>
          <input 
            type="text" 
            name="name"
            placeholder="Enter name" 
            value={formData.name}
            onChange={handleChange}
            required 
          />

          <label>Email:</label>
          <input 
            type="email" 
            name="email"
            placeholder="Enter email" 
            value={formData.email}
            onChange={handleChange}
            required 
          />

          <label>Password:</label>
          <input 
            type="password" 
            name="password"
            placeholder="Create password" 
            value={formData.password}
            onChange={handleChange}
            required 
          />
          <label>Confirm Password:</label>
          <input 
            type="password" 
            name="confirmPassword"
            placeholder="Confirm password" 
            value={formData.confirmPassword}
            onChange={handleChange}
            required 
          />

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
          </button>
        </form>

        <div className="auth-links">
          <p>
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
