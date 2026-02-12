import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import "./Auth.css";
import { api } from "../../api";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("verifying"); // verifying, success, error
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    const token = searchParams.get("token");
    
    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link. No token provided.");
      return;
    }

    // Verify email
    const verifyEmail = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_BASE || "http://localhost:5000"}/api/public/verify-email?token=${token}`);
        const data = await response.json();
        
        if (response.ok && data.success) {
          setStatus("success");
          setMessage(data.message || "Email verified successfully! You can now log in.");
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate("/login");
          }, 3000);
        } else {
          setStatus("error");
          setMessage(data.error || "Verification failed. The link may be invalid or expired.");
        }
      } catch (err) {
        setStatus("error");
        setMessage("An error occurred while verifying your email. Please try again.");
        console.error("Verification error:", err);
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h2>Email Verification</h2>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          {status === "verifying" && (
            <div>
              <p style={{ marginBottom: '20px' }}>{message}</p>
              <div className="loading-spinner" style={{ margin: '20px auto' }}></div>
            </div>
          )}
          
          {status === "success" && (
            <div>
              <p style={{ marginBottom: '20px', color: '#00ACEE', fontSize: '18px' }}>
                ✓ {message}
              </p>
              <p style={{ marginBottom: '20px', color: '#666' }}>
                Redirecting to login page...
              </p>
              <Link to="/login" className="auth-btn" style={{ display: 'inline-block', textDecoration: 'none' }}>
                Go to Login
              </Link>
            </div>
          )}
          
          {status === "error" && (
            <div>
              <p style={{ marginBottom: '20px', color: '#e74c3c', fontSize: '18px' }}>
                ✗ {message}
              </p>
              <div style={{ marginTop: '20px' }}>
                <Link to="/signup" className="auth-btn" style={{ display: 'inline-block', textDecoration: 'none', marginRight: '10px' }}>
                  Sign Up Again
                </Link>
                <Link to="/login" className="auth-btn" style={{ display: 'inline-block', textDecoration: 'none' }}>
                  Go to Login
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
