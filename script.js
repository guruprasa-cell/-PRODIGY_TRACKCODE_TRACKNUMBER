/**
 * ==============================================================================
 * AuraNav - Interactive Fixed Navigation Menu Script
 * ==============================================================================
 * Handles:
 * 1. Scroll-triggered style & color morphing for fixed navbar
 * 2. Top reading/scroll progress bar calculations
 * 3. Dynamic magnetic hover indicator pill
 * 4. Scrollspy section tracking (IntersectionObserver + fallback)
 * 5. Multi-theme live palette switcher (Changing bg & font colors)
 * 6. Responsive mobile drawer & keyboard accessibility
 * ==============================================================================
 */

(function () {
  'use strict';

  // --- DOM Elements ---
  const navbar = document.getElementById('navbar');
  const scrollProgressBar = document.getElementById('scrollProgressBar');
  const scrollTelemetry = document.getElementById('scrollTelemetry');
  const navMenu = document.getElementById('navMenu');
  const navList = document.getElementById('navList');
  const navLinks = document.querySelectorAll('.nav-link');
  const hoverPill = document.getElementById('hoverPill');
  const mobileToggle = document.getElementById('mobileToggle');
  const themePaletteBtn = document.getElementById('themePaletteBtn');
  const themeDropdownPanel = document.getElementById('themeDropdownPanel');
  const paletteOptions = document.querySelectorAll('.palette-option');
  const currentThemeName = document.getElementById('currentThemeName');
  const currentDot = document.querySelector('.current-dot');
  const sections = document.querySelectorAll('main section[id]');

  // Scroll threshold in pixels to trigger .scrolled transformation
  const SCROLL_THRESHOLD = 40;

  // Track state
  let isTicking = false;
  let activeSectionId = 'home';

  /* ==========================================================================
     1. SCROLL DETECTION & DYNAMIC NAVBAR MORPHING
     ========================================================================== */
  function onScroll() {
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = documentHeight > 0 ? (scrollY / documentHeight) * 100 : 0;

    // 1A. Top Progress Bar
    if (scrollProgressBar) {
      scrollProgressBar.style.width = `${Math.min(100, Math.max(0, scrollPercent))}%`;
    }

    // 1B. Toggle .scrolled style transformation on navbar
    const hasScrolledPast = scrollY > SCROLL_THRESHOLD;
    if (navbar) {
      navbar.classList.toggle('scrolled', hasScrolledPast);
    }

    // 1C. Telemetry Status Widget Update
    if (scrollTelemetry) {
      const stateEl = scrollTelemetry.querySelector('.telemetry-state');
      const pxEl = scrollTelemetry.querySelector('.telemetry-px');
      if (stateEl) {
        stateEl.textContent = hasScrolledPast ? 'Scrolled (Active)' : 'Top (Default)';
        stateEl.style.color = hasScrolledPast ? 'var(--nav-accent)' : 'var(--text-muted)';
      }
      if (pxEl) {
        pxEl.textContent = `${Math.round(scrollY)}px scrolled`;
      }
    }

    isTicking = false;
  }

  // RequestAnimationFrame wrapper for high-performance 60/120fps scroll tracking
  window.addEventListener('scroll', () => {
    if (!isTicking) {
      window.requestAnimationFrame(onScroll);
      isTicking = true;
    }
  }, { passive: true });

  // Initial trigger on page load
  onScroll();

  /* ==========================================================================
     2. DYNAMIC HOVER MICRO-INTERACTIONS & MAGNETIC PILL
     ========================================================================== */
  if (hoverPill && navList) {
    function positionHoverPill(targetLink) {
      if (!targetLink || window.innerWidth <= 992) {
        hoverPill.classList.remove('active');
        return;
      }

      const linkRect = targetLink.getBoundingClientRect();
      const menuRect = navList.getBoundingClientRect();

      const x = linkRect.left - menuRect.left;
      const y = linkRect.top - menuRect.top;
      const width = linkRect.width;
      const height = linkRect.height;

      hoverPill.style.width = `${width}px`;
      hoverPill.style.height = `${height}px`;
      hoverPill.style.setProperty('--pill-x', `${x}px`);
      hoverPill.style.setProperty('--pill-y', `${y}px`);
      hoverPill.classList.add('active');
    }

    // Add mouseenter and mouseleave to every navigation link
    navLinks.forEach((link) => {
      link.addEventListener('mouseenter', () => {
        positionHoverPill(link);
      });

      // Keyboard focus support for accessibility
      link.addEventListener('focus', () => {
        positionHoverPill(link);
      });
    });

    // When mouse leaves the entire nav list, return to active link or fade out
    navList.addEventListener('mouseleave', () => {
      const currentActive = document.querySelector('.nav-link.active');
      if (currentActive && window.innerWidth > 992) {
        positionHoverPill(currentActive);
      } else {
        hoverPill.classList.remove('active');
      }
    });

    // Reposition on window resize
    window.addEventListener('resize', () => {
      const currentActive = document.querySelector('.nav-link.active');
      if (currentActive && window.innerWidth > 992) {
        positionHoverPill(currentActive);
      } else {
        hoverPill.classList.remove('active');
      }
    });
  }

  /* ==========================================================================
     3. SCROLLSPY: AUTOMATIC ACTIVE LINK TRACKING
     ========================================================================== */
  function setActiveLink(sectionId) {
    if (activeSectionId === sectionId) return;
    activeSectionId = sectionId;

    navLinks.forEach((link) => {
      const href = link.getAttribute('href');
      const isCurrent = href === `#${sectionId}`;

      link.classList.toggle('active', isCurrent);
      link.classList.toggle(':target-current', isCurrent); // Fallback class per guidance

      if (isCurrent) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  // Modern IntersectionObserver implementation
  if ('IntersectionObserver' in window && sections.length > 0) {
    const observerOptions = {
      root: null,
      rootMargin: '-30% 0px -60% 0px', // Center-band viewport trigger
      threshold: 0
    };

    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          if (id) {
            setActiveLink(id);
          }
        }
      });
    }, observerOptions);

    sections.forEach((sec) => sectionObserver.observe(sec));
  } else {
    // Fallback scroll listener for older engines
    window.addEventListener('scroll', () => {
      const scrollPos = window.scrollY + 200;
      sections.forEach((section) => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        const id = section.getAttribute('id');
        if (scrollPos >= top && scrollPos < top + height) {
          setActiveLink(id);
        }
      });
    }, { passive: true });
  }

  /* ==========================================================================
     4. SMOOTH OFFSET SCROLLING FOR FIXED NAVBAR
     ========================================================================== */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || !targetId.startsWith('#')) return;

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();

        // Calculate offset position to clear fixed navbar
        const navHeight = navbar ? navbar.offsetHeight : 70;
        const targetTop = targetElement.getBoundingClientRect().top + window.scrollY - navHeight;

        window.scrollTo({
          top: targetTop,
          behavior: 'smooth'
        });

        // Close mobile drawer if open
        closeMobileMenu();

        // Update URL hash without jumping
        if (history.pushState) {
          history.pushState(null, null, targetId);
        }
      }
    });
  });

  /* ==========================================================================
     5. THEME / NAVBAR PALETTE SWITCHER
     ========================================================================== */
  const themeLabels = {
    midnight: 'Midnight Indigo',
    cyberpunk: 'Neon Emerald',
    sunset: 'Sunset Crimson',
    light: 'Clean Light Glass'
  };

  function setNavbarTheme(themeKey) {
    if (!themeKey) return;
    document.body.setAttribute('data-theme', themeKey);

    // Update button text
    if (currentThemeName && themeLabels[themeKey]) {
      currentThemeName.textContent = themeLabels[themeKey].split(' ')[0];
    }

    // Update active state in palette options
    paletteOptions.forEach((btn) => {
      const isActive = btn.getAttribute('data-scheme') === themeKey;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive);
    });

    // Save in storage
    try {
      localStorage.setItem('auranav-theme', themeKey);
    } catch (e) {
      /* ignore storage limitations */
    }

    // Close palette panel
    if (themeDropdownPanel) {
      themeDropdownPanel.classList.remove('open');
      if (themePaletteBtn) themePaletteBtn.setAttribute('aria-expanded', 'false');
    }
  }

  // Expose to window for external click handlers
  window.setNavbarTheme = setNavbarTheme;

  // Toggle Theme Panel
  if (themePaletteBtn && themeDropdownPanel) {
    themePaletteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = themeDropdownPanel.classList.toggle('open');
      themePaletteBtn.setAttribute('aria-expanded', isOpen);
    });

    paletteOptions.forEach((opt) => {
      opt.addEventListener('click', () => {
        const scheme = opt.getAttribute('data-scheme');
        setNavbarTheme(scheme);
      });
    });

    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
      if (!themeDropdownPanel.contains(e.target) && e.target !== themePaletteBtn) {
        themeDropdownPanel.classList.remove('open');
        themePaletteBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Restore saved theme or default
  try {
    const savedTheme = localStorage.getItem('auranav-theme') || 'midnight';
    setNavbarTheme(savedTheme);
  } catch (e) {
    setNavbarTheme('midnight');
  }

  /* ==========================================================================
     6. MOBILE NAVIGATION DRAWER & ACCESSIBILITY
     ========================================================================== */
  function openMobileMenu() {
    if (navMenu && mobileToggle) {
      navMenu.classList.add('open');
      mobileToggle.classList.add('active');
      mobileToggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
  }

  function closeMobileMenu() {
    if (navMenu && mobileToggle) {
      navMenu.classList.remove('open');
      mobileToggle.classList.remove('active');
      mobileToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  }

  if (mobileToggle) {
    mobileToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = navMenu && navMenu.classList.contains('open');
      if (isOpen) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });
  }

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMobileMenu();
      if (themeDropdownPanel) {
        themeDropdownPanel.classList.remove('open');
        if (themePaletteBtn) themePaletteBtn.setAttribute('aria-expanded', 'false');
      }
    }
  });

  // Log successful initialization
  console.log('✦ AuraNav interactive navigation menu initialized successfully.');
})();
