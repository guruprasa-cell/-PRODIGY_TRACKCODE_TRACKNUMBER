/**
 * ==============================================================================
 * Alex Morgan Portfolio - Client-Side Interactive Engine
 * ==============================================================================
 * Features:
 * - Theme switcher with LocalStorage persistence
 * - Rotating headline animation
 * - Sticky navbar & IntersectionObserver Scrollspy
 * - Dynamic category filtering for Skills and Projects
 * - Native <dialog closedby="any"> with light-dismiss fallback
 * - Animated numerical milestone counters
 * - Client-side validated contact form with toast alerts
 * - Mobile responsive drawer navigation
 * ==============================================================================
 */

(function () {
  'use strict';

  // --- DOM Elements ---
  const navbar = document.getElementById('navbar');
  const navLinks = document.querySelectorAll('.nav-link');
  const mobileToggle = document.getElementById('mobileToggle');
  const navLinksContainer = document.getElementById('navLinks');
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');
  const typewriterText = document.getElementById('typewriterText');

  const skillFilterBtns = document.querySelectorAll('.filter-btn');
  const skillCards = document.querySelectorAll('.skill-card');

  const projectFilterBtns = document.querySelectorAll('.p-filter-btn');
  const projectCards = document.querySelectorAll('.project-card');

  const projectModal = document.getElementById('projectModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const openModalBtns = document.querySelectorAll('.open-modal-btn');

  const counterNumbers = document.querySelectorAll('.counter-number');
  const contactForm = document.getElementById('contactForm');
  const submitBtn = document.getElementById('submitBtn');
  const toastPopup = document.getElementById('toastPopup');

  /* ==========================================================================
     1. THEME SWITCHER (DARK / LIGHT)
     ========================================================================== */
  function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    if (themeIcon) {
      themeIcon.textContent = theme === 'light' ? '☀️' : '🌙';
    }
    try {
      localStorage.setItem('alex-portfolio-theme', theme);
    } catch (e) {}
  }

  function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  // Restore saved theme or prefer dark
  try {
    const savedTheme = localStorage.getItem('alex-portfolio-theme') || 'dark';
    applyTheme(savedTheme);
  } catch (e) {
    applyTheme('dark');
  }

  /* ==========================================================================
     2. ROTATING HEADLINE PHRASES
     ========================================================================== */
  const phrases = [
    'Modern Architecture',
    'High-Performance Frontends',
    'Scalable Full-Stack Systems',
    'Pixel-Perfect User Experiences'
  ];
  let phraseIndex = 0;

  function cycleHeadline() {
    if (!typewriterText) return;
    typewriterText.style.opacity = '0';
    typewriterText.style.transform = 'translateY(6px)';

    setTimeout(() => {
      phraseIndex = (phraseIndex + 1) % phrases.length;
      typewriterText.textContent = phrases[phraseIndex];
      typewriterText.style.opacity = '1';
      typewriterText.style.transform = 'translateY(0)';
    }, 300);
  }

  if (typewriterText) {
    typewriterText.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    setInterval(cycleHeadline, 3600);
  }

  /* ==========================================================================
     3. NAVBAR SCROLL EFFECT & SCROLLSPY
     ========================================================================== */
  function onScroll() {
    if (navbar) {
      navbar.classList.toggle('scrolled', window.scrollY > 40);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Scrollspy: Highlight active nav link based on section in view
  const sections = document.querySelectorAll('main section[id]');
  if ('IntersectionObserver' in window && sections.length > 0) {
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const currentId = entry.target.getAttribute('id');
          navLinks.forEach((link) => {
            const isActive = link.getAttribute('href') === `#${currentId}`;
            link.classList.toggle('active', isActive);
            if (isActive) {
              link.setAttribute('aria-current', 'page');
            } else {
              link.removeAttribute('aria-current');
            }
          });
        }
      });
    }, {
      rootMargin: '-30% 0px -50% 0px',
      threshold: 0
    });

    sections.forEach((sec) => sectionObserver.observe(sec));
  }

  /* ==========================================================================
     4. MOBILE NAVIGATION DRAWER
     ========================================================================== */
  function toggleMobileMenu() {
    if (!navLinksContainer || !mobileToggle) return;
    const isOpen = navLinksContainer.classList.toggle('open');
    mobileToggle.classList.toggle('active', isOpen);
    mobileToggle.setAttribute('aria-expanded', isOpen);
  }

  function closeMobileMenu() {
    if (!navLinksContainer || !mobileToggle) return;
    navLinksContainer.classList.remove('open');
    mobileToggle.classList.remove('active');
    mobileToggle.setAttribute('aria-expanded', 'false');
  }

  if (mobileToggle) {
    mobileToggle.addEventListener('click', toggleMobileMenu);
  }

  navLinks.forEach((link) => {
    link.addEventListener('click', closeMobileMenu);
  });

  /* ==========================================================================
     5. SKILLS FILTERING
     ========================================================================== */
  skillFilterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      skillFilterBtns.forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      const filter = btn.getAttribute('data-filter');

      skillCards.forEach((card) => {
        const category = card.getAttribute('data-category');
        if (filter === 'all' || category === filter) {
          card.style.display = 'flex';
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }, 10);
        } else {
          card.style.opacity = '0';
          card.style.transform = 'translateY(8px)';
          setTimeout(() => {
            card.style.display = 'none';
          }, 200);
        }
      });
    });
  });

  /* ==========================================================================
     6. PROJECTS FILTERING & MODAL CASE STUDIES
     ========================================================================== */
  projectFilterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      projectFilterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-pfilter');

      projectCards.forEach((card) => {
        const cat = card.getAttribute('data-pcat');
        if (filter === 'all' || cat === filter) {
          card.style.display = 'flex';
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }, 10);
        } else {
          card.style.opacity = '0';
          card.style.transform = 'translateY(10px)';
          setTimeout(() => {
            card.style.display = 'none';
          }, 200);
        }
      });
    });
  });

  // Project Details Database
  const projectDetails = {
    pulsemetrics: {
      title: 'PulseMetrics Cloud Analytics Platform',
      category: 'Full-Stack SaaS Platform',
      overview: 'An enterprise-tier analytics platform providing real-time telemetry, revenue analytics, and cohort churn models for high-growth SaaS companies.',
      highlights: [
        'Architected real-time ingestion pipeline handling 2M+ events per day with PostgreSQL and Redis caching.',
        'Migrated core web dashboard to Next.js 14 App Router with React Server Components, decreasing initial load time by 42%.',
        'Implemented RBAC (Role-Based Access Control) and OAuth2 Single Sign-On (SSO) for enterprise clients.'
      ],
      stack: ['Next.js 14', 'TypeScript', 'PostgreSQL', 'Prisma', 'Tailwind CSS', 'Docker', 'AWS'],
      liveUrl: '#contact',
      githubUrl: '#contact'
    },
    synthetix: {
      title: 'Synthetix AI Collaborative Workspace',
      category: 'AI & Realtime Collaboration',
      overview: 'A bidirectional streaming LLM workspace with real-time multi-user canvas brainstorming, interactive syntax highlighting, and voice-assisted prompt generation.',
      highlights: [
        'Integrated low-latency WebSockets connection for token-by-token streaming responses with zero UI stutter.',
        'Built interactive code sandbox supporting real-time compilation and visual output previews.',
        'Designed accessible voice interface utilizing native Web Audio API and SpeechRecognition.'
      ],
      stack: ['React 18', 'WebSockets', 'Node.js', 'FastAPI', 'Tailwind CSS', 'Monaco Editor'],
      liveUrl: '#contact',
      githubUrl: '#contact'
    },
    aether: {
      title: 'Aether UI Component Design System',
      category: 'Frontend Architecture & Open-Source',
      overview: 'An accessible, production-ready React and Web Components design system featuring 40+ primitives, full keyboard navigation (WCAG AA), and headless primitives.',
      highlights: [
        'Built with zero runtime CSS overhead utilizing modern CSS Custom Properties and Container Queries.',
        'Comprehensive Storybook documentation with visual regression tests via Playwright.',
        'Adopted by 15+ engineering teams with over 150,000 monthly downloads.'
      ],
      stack: ['React', 'TypeScript', 'Storybook', 'Radix UI', 'Playwright', 'Vite'],
      liveUrl: '#contact',
      githubUrl: '#contact'
    },
    artisan: {
      title: 'Artisan Handcrafted Marketplace',
      category: 'Headless E-Commerce Platform',
      overview: 'A global marketplace connecting independent artisans with global consumers featuring edge rendering, instant search, and localized currency checkout.',
      highlights: [
        'Engineered headless storefront using Next.js Incremental Static Regeneration (ISR) for sub-second product pages.',
        'Integrated Stripe Custom Connect for multi-party payouts and localized currency conversion.',
        'Implemented Algolia instant facet filtering with typo-tolerance and sub-50ms query responses.'
      ],
      stack: ['Next.js', 'Stripe Connect', 'Prisma', 'Algolia Search', 'Redis', 'Vercel Edge'],
      liveUrl: '#contact',
      githubUrl: '#contact'
    }
  };

  function openProjectModal(projectId) {
    const data = projectDetails[projectId];
    if (!data || !projectModal) return;

    modalTitle.textContent = data.title;

    modalBody.innerHTML = `
      <p><strong>Category:</strong> ${data.category}</p>
      <p style="margin: 0.85rem 0 1.25rem;">${data.overview}</p>
      
      <h4>Key Architectural Achievements:</h4>
      <ul>
        ${data.highlights.map((h) => `<li>${h}</li>`).join('')}
      </ul>

      <h4>Technology Stack:</h4>
      <div style="display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.5rem;">
        ${data.stack.map((t) => `<span class="tag">${t}</span>`).join('')}
      </div>

      <div class="modal-footer-links">
        <a href="${data.liveUrl}" class="btn btn-primary btn-sm">
          <span>Live Preview</span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7H11.5M11.5 7L7.5 3M11.5 7L7.5 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        </a>
        <a href="${data.githubUrl}" class="btn btn-secondary btn-sm">
          <span>GitHub Repository</span>
        </a>
      </div>
    `;

    projectModal.showModal();
  }

  openModalBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const projId = btn.getAttribute('data-project');
      openProjectModal(projId);
    });
  });

  if (modalCloseBtn && projectModal) {
    modalCloseBtn.addEventListener('click', () => {
      projectModal.close();
    });
  }

  // Fallback for browsers that do not support <dialog closedby="any"> light-dismiss
  if (projectModal && !('closedBy' in HTMLDialogElement.prototype)) {
    projectModal.addEventListener('click', (event) => {
      if (event.target !== projectModal) return;
      const rect = projectModal.getBoundingClientRect();
      const isDialogContent = (
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      );
      if (!isDialogContent) {
        projectModal.close();
      }
    });
  }

  /* ==========================================================================
     7. ANIMATED NUMERICAL COUNTERS
     ========================================================================== */
  let countersAnimated = false;

  function animateCounters() {
    if (countersAnimated) return;
    countersAnimated = true;

    counterNumbers.forEach((counter) => {
      const target = parseInt(counter.getAttribute('data-target'), 10);
      const duration = 1600; // ms
      const startTime = performance.now();

      function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Easing out cubic
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentVal = Math.floor(easeOut * target);

        counter.textContent = currentVal.toLocaleString();

        if (progress < 1) {
          requestAnimationFrame(updateCounter);
        } else {
          counter.textContent = target.toLocaleString();
        }
      }

      requestAnimationFrame(updateCounter);
    });
  }

  const accomplishmentsSection = document.getElementById('accomplishments');
  if ('IntersectionObserver' in window && accomplishmentsSection) {
    const countObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounters();
          countObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.25 });

    countObserver.observe(accomplishmentsSection);
  } else {
    animateCounters();
  }

  /* ==========================================================================
     8. CONTACT FORM VALIDATION & SUBMISSION
     ========================================================================== */
  function showToast(message) {
    if (!toastPopup) return;
    toastPopup.textContent = message;
    toastPopup.classList.add('show');
    setTimeout(() => {
      toastPopup.classList.remove('show');
    }, 3200);
  }

  if (contactForm) {
    const nameInput = document.getElementById('userName');
    const emailInput = document.getElementById('userEmail');
    const messageInput = document.getElementById('userMessage');

    const nameError = document.getElementById('nameError');
    const emailError = document.getElementById('emailError');
    const messageError = document.getElementById('messageError');

    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      let isValid = true;

      // Clear errors
      nameError.textContent = '';
      emailError.textContent = '';
      messageError.textContent = '';

      // Name validation
      if (!nameInput.value.trim()) {
        nameError.textContent = 'Please enter your name.';
        isValid = false;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailInput.value.trim()) {
        emailError.textContent = 'Please enter your email address.';
        isValid = false;
      } else if (!emailRegex.test(emailInput.value.trim())) {
        emailError.textContent = 'Please enter a valid email address.';
        isValid = false;
      }

      // Message validation
      if (!messageInput.value.trim()) {
        messageError.textContent = 'Please write a brief message.';
        isValid = false;
      } else if (messageInput.value.trim().length < 10) {
        messageError.textContent = 'Message should be at least 10 characters long.';
        isValid = false;
      }

      if (!isValid) return;

      // Simulate sending
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Sending Message...</span>';

      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <span>Send Message</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8L14 2L8 14L7 9L2 8Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        `;
        contactForm.reset();
        showToast('✨ Message received! Thanks for reaching out, Alex will reply soon.');
      }, 900);
    });
  }

  // Keyboard shortcut Esc for modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMobileMenu();
      if (projectModal && projectModal.open) {
        projectModal.close();
      }
    }
  });

  console.log('✦ Alex Morgan Developer Portfolio loaded successfully.');
})();
