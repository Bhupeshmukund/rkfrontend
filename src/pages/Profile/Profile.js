import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Profile.css";
import { api } from "../../api";

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("authToken");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      navigate("/login");
      return;
    }

    try {
      setUser(JSON.parse(userData));
    } catch (e) {
      console.error("Error parsing user data:", e);
      navigate("/login");
    }
  }, [navigate]);

  const handlePasswordChange = (e) => {
    setPasswordForm({
      ...passwordForm,
      [e.target.name]: e.target.value
    });
    setPasswordError("");
    setPasswordSuccess("");
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    setLoading(true);

    // Validate passwords match
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match");
      setLoading(false);
      return;
    }

    // Validate password length
    if (passwordForm.newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    try {
      await api.updatePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );

      setPasswordSuccess("Password updated successfully!");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    } catch (err) {
      setPasswordError(err.message || "Failed to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="profile-page"><div className="loading">Loading...</div></div>;
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <h1>My Profile</h1>

        {/* Profile Information Section */}
        <div className="profile-section">
          <h2>Profile Information</h2>
          <div className="profile-info-card">
            <div className="info-row">
              <span className="info-label">Name:</span>
              <span className="info-value">{user.name || "N/A"}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Email:</span>
              <span className="info-value">{user.email || "N/A"}</span>
            </div>
            <div className="info-row">
              <span className="info-label">User ID:</span>
              <span className="info-value">#{user.id || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Update Password Section */}
        <div className="profile-section">
          <h2>Update Password</h2>
          <form className="password-form" onSubmit={handlePasswordUpdate}>
            {passwordError && (
              <div className="error-message">{passwordError}</div>
            )}
            {passwordSuccess && (
              <div className="success-message">{passwordSuccess}</div>
            )}

            <div className="form-group">
              <label htmlFor="currentPassword">Current Password</label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
                required
                placeholder="Enter current password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
                required
                placeholder="Enter new password (min 6 characters)"
                minLength="6"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
                required
                placeholder="Confirm new password"
                minLength="6"
              />
            </div>

            <button type="submit" className="update-btn" disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;

