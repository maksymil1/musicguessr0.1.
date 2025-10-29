// import React from 'react';
import "../App.css"; // Zaimportuj plik CSS dla stylów

function Test() {
  return (
    <div className="App">
      <div className="header">
        <div className="menu-icon">☰</div>
        <div className="profile-icon">
          <a href="google.com" target="_blank">
            👤
          </a>
        </div>
      </div>
      <div className="title">MUSICGUESSR</div>
      <div className="buttons-container">
        <button className="main-button play-button">PLAY</button>
        <button className="main-button friends-button">FRIENDS</button>
        <button className="main-button stats-button">STATS</button>
      </div>
    </div>
    //test
  );
}

export default Test;
