export function generateAdMockup() {
  const themes = [
    { text: "Find Your Perfect Tech Stack", cta: "Explore Now" },
    { text: "Best Engineering Colleges in TN", cta: "See Rankings" },
    { text: "Master Computer Science", cta: "Join Course" },
    { text: "Laptops for Students", cta: "Check Deals" },
    { text: "Learn AI&ML", cta: "Join Now" },
    { text: "Learn Deep learning", cta: "Join Now" },
    { text: "Learn Data Science", cta: "Join Now" },
    { text: "Learn Data Analytics", cta: "Join Now" },
    { text: "Learn Data Engineering", cta: "Join Now" },
    { text: "Learn Data Visualization", cta: "Join Now" },
    { text: "Learn Data Engineering", cta: "Join Now" },
    { text: "Learn Data Visualization", cta: "Join Now" },
    { text: "Electronics", cta: "Join Now" },
    
  ];

  const theme = themes[Math.floor(Math.random() * themes.length)];

  return `
    <div class="ad-sim">
      <div class="ad-sim-id-badge">Ad</div>
      <div class="ad-sim-controls">
        <i class="fa-solid fa-circle-info"></i>
        <i class="fa-solid fa-xmark"></i>
      </div>
      <div class="ad-sim-content">
        <div class="ad-sim-title">${theme.text}</div>
        <button class="ad-sim-cta">${theme.cta}</button>
      </div>
      <div class="ad-sim-footer">
        <span>Ads by Rankra</span>
      </div>
    </div>
  `;
}
