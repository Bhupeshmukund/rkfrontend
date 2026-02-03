import React, { useState } from "react";
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
