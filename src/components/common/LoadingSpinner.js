import React from 'react';

const LoadingSpinner = ({ isFullScreen = false }) => (
  <div className={isFullScreen ? 'spinner-container-fullscreen' : 'spinner-container'}>
    <div className="loading-spinner"></div>
  </div>
);

export default LoadingSpinner;
