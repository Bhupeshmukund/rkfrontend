import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Auth.css";
import { api } from "../../api";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState("");

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
    setLoading(true);

    try {
      const response = await api.login(formData.email, formData.password);
      
      // Store token/user info in localStorage
      if (response.token) {
        localStorage.setItem("authToken", response.token);
      }
      if (response.user) {
        localStorage.setItem("user", JSON.stringify(response.user));
      }

      // Dispatch auth change event
      window.dispatchEvent(new CustomEvent('authChanged'));
      
      // Redirect to homepage or intended page
      navigate("/");
    } catch (err) {
      // Check if error is due to unverified email
      if (err.requiresVerification || err.message?.includes("verify your email")) {
        setRequiresVerification(true);
        setError(err.message || "Please verify your email before logging in. Check your inbox for the verification link.");
      } else {
        setError(err.message || "Login failed. Please check your credentials.");
        setRequiresVerification(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0 || !formData.email) return;

    setLoading(true);
    setError("");
    setResendSuccess("");

    try {
      await api.resendVerification(formData.email);
      setResendSuccess("Verification email sent successfully! Please check your inbox.");
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

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h2>Login</h2>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          {resendSuccess && <div className="success-message" style={{ background: '#d4edda', color: '#155724', padding: '12px', borderRadius: '4px', marginBottom: '15px' }}>{resendSuccess}</div>}
          
          {requiresVerification && (
            <div style={{ 
              background: '#fff3cd', 
              border: '1px solid #ffc107', 
              borderRadius: '4px', 
              padding: '15px', 
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <p style={{ margin: '0 0 10px 0', color: '#856404' }}>
                Your email is not verified. Please check your inbox for the verification link.
              </p>
              <button 
                type="button" 
                onClick={handleResendVerification}
                disabled={loading || resendCooldown > 0}
                style={{
                  background: resendCooldown > 0 ? '#6c757d' : '#00ACEE',
                  color: 'white',
                  border: 'none',
                  padding: '8px 20px',
                  borderRadius: '4px',
                  cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {loading 
                  ? "Sending..." 
                  : resendCooldown > 0 
                    ? `Resend in ${resendCooldown}s` 
                    : "Resend Verification Link"}
              </button>
            </div>
          )}
          
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
          <div className="password-input-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Enter password"
              value={formData.password}
              onChange={handleChange}
              required
              className="password-input"
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
            </button>
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "SIGNING IN..." : "SIGN IN"}
          </button>
        </form>

        <div className="auth-links">
          <p>
            <Link to="/forgot-password">Forgot Password?</Link>
          </p>
          <p>
            Don't have an account? <Link to="/signup">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
