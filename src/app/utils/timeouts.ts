// Centralized timeout values grouped by component for consistent naming.
export const TIMEOUTS = {
  illustrations: {
    dotHide: 600,
    previewHide: 500,
  },
  aboutPage: {
    initialAnimation: 1500,
    initialDelay: 100,
    skillInitDelay: 2000,
    skillStagger: 100,
    glowDuration: 1000,
    glowRandomBase: 2000,
    glowRandomVariance: 5000,
    floatingDotsInit: 3000,
    smallAnimation: 200,
    iconAnimation: 300,
    capsuleReset: 400,
    staggerSmall: 80,
  },
  processSection: {
    fadeDelay: 50,
  },
  textOverlay: {
    transition: 400,
    contentDelay: 20,
    openDelay: 50,
  },
  threeService: {
    scrollCooldown: 2000,
  },
  shared: {
    rafDelay: 10,
  },
};

export default TIMEOUTS;
