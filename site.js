(function () {
  const DESKTOP_MEDIA_QUERY = '(min-width: 701px)';

  function isDesktopLayout() {
    return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function initFaviconBadge() {
    const image = new Image();
    image.src = 'P.jpg';

    image.addEventListener('load', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;

      const context = canvas.getContext('2d');
      if (!context) return;

      context.clearRect(0, 0, 64, 64);

      context.fillStyle = '#f7f4ef';
      context.beginPath();
      context.arc(32, 32, 30, 0, Math.PI * 2);
      context.fill();

      context.save();
      context.beginPath();
      context.arc(32, 32, 28, 0, Math.PI * 2);
      context.closePath();
      context.clip();
      context.drawImage(image, 4, 4, 56, 56);
      context.restore();

      context.strokeStyle = 'rgba(26, 24, 20, 0.16)';
      context.lineWidth = 1.4;
      context.beginPath();
      context.arc(32, 32, 28, 0, Math.PI * 2);
      context.stroke();

      const faviconUrl = canvas.toDataURL('image/png');
      document.querySelectorAll('link[rel="icon"]').forEach((link) => link.remove());

      const favicon = document.createElement('link');
      favicon.rel = 'icon';
      favicon.type = 'image/png';
      favicon.href = faviconUrl;
      document.head.appendChild(favicon);
    });
  }

  function initCursor() {
    const cursorDot = document.getElementById('cd');
    if (!cursorDot) return { registerHover() {} };

    let mouseX = 0;
    let mouseY = 0;
    let cursorX = 0;
    let cursorY = 0;
    let hoveredElement = null;

    document.addEventListener('mousemove', (event) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
    });

    function morphCursor(element) {
      const rect = element.getBoundingClientRect();
      const isNavItem = !!element.closest('.nav-pill');
      const radius = isNavItem ? '999px' : (getComputedStyle(element).borderRadius || '999px');
      const inset = isNavItem ? 4 : 6;

      cursorDot.style.width = Math.max(18, rect.width - inset) + 'px';
      cursorDot.style.height = Math.max(18, rect.height - inset) + 'px';
      cursorDot.style.borderRadius = radius;
    }

    function resetCursor() {
      cursorDot.style.width = '12px';
      cursorDot.style.height = '12px';
      cursorDot.style.borderRadius = '999px';
    }

    function registerHover(elements) {
      elements.forEach((element) => {
        if (element.dataset.cursorBound === 'true') return;
        element.dataset.cursorBound = 'true';

        const isPill =
          element.classList.contains('pill') ||
          element.classList.contains('cbtn') ||
          element.classList.contains('sec-nav-link') ||
          !!element.closest('.nav-pill');

        element.addEventListener('mouseenter', () => {
          document.body.classList.add('hov');
          if (!isPill) return;
          hoveredElement = element;
          morphCursor(element);
        });

        element.addEventListener('mouseleave', () => {
          document.body.classList.remove('hov');
          if (!isPill) return;
          hoveredElement = null;
          resetCursor();
        });
      });
    }

    function tick() {
      let targetX = mouseX;
      let targetY = mouseY;

      if (hoveredElement) {
        const rect = hoveredElement.getBoundingClientRect();
        targetX = rect.left + rect.width / 2;
        targetY = rect.top + rect.height / 2;
      }

      cursorX += (targetX - cursorX) * 0.14;
      cursorY += (targetY - cursorY) * 0.14;
      cursorDot.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0) translate3d(-50%, -50%, 0)`;
      requestAnimationFrame(tick);
    }

    registerHover(document.querySelectorAll('a, button, .pill, .cbtn, .sec-nav-link'));
    requestAnimationFrame(tick);

    return { registerHover };
  }

  function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const name = document.getElementById('contactName')?.value || '';
      const email = document.getElementById('contactEmail')?.value || '';
      const message = document.getElementById('contactMessage')?.value || '';
      const subject = `New message from ${name}`;
      const body = `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;

      window.location.href =
        `mailto:srishanthsurakanti@gmail.com?subject=${encodeURIComponent(subject)}` +
        `&body=${encodeURIComponent(body)}`;
    });
  }

  function initRevealSections(selector, threshold) {
    const revealItems = document.querySelectorAll(selector);
    if (!revealItems.length) return;

    revealItems.forEach((item) => item.classList.add('in'));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('in');
        });
      },
      { threshold }
    );

    revealItems.forEach((item) => observer.observe(item));
  }

  function initScrollerPage(config) {
    const scrollContainer = document.querySelector('.h-scroll-container');
    if (!scrollContainer) return;

    const slides = Array.from(document.querySelectorAll('main > section, main > .about'));
    const navPill = document.querySelector('.nav-pill');
    const navLinks = Array.from(document.querySelectorAll('.nav-pill a'));
    const dotsContainer = document.getElementById('slideDots');
    const secNav = document.getElementById('secNav');
    const cursor = initCursor();

    let isScrollLocked = false;
    let scrollLockTimer = null;
    let scrollAnimFrame = null;
    let activeSectionId = null;
    let secNavAnimTimer = null;
    let currentSlideIndex = 0;
    let lastWheelNavigationAt = 0;

    function releaseScrollLock(delay = 0) {
      clearTimeout(scrollLockTimer);
      scrollLockTimer = setTimeout(() => {
        isScrollLocked = false;
      }, delay);
    }

    function animateScrollTo(left, onComplete) {
      if (!isDesktopLayout()) {
        scrollContainer.scrollLeft = left;
        if (onComplete) onComplete();
        return;
      }

      if (scrollAnimFrame) cancelAnimationFrame(scrollAnimFrame);

      const start = scrollContainer.scrollLeft;
      const distance = left - start;
      const duration = 420;
      const startTime = performance.now();
      const previousSnap = scrollContainer.style.scrollSnapType;
      scrollContainer.style.scrollSnapType = 'none';

      function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeInOutCubic(progress);

        scrollContainer.scrollLeft = start + distance * eased;

        if (progress < 1) {
          scrollAnimFrame = requestAnimationFrame(step);
          return;
        }

        scrollContainer.style.scrollSnapType = previousSnap;
        scrollAnimFrame = null;
        if (onComplete) onComplete();
      }

      scrollAnimFrame = requestAnimationFrame(step);
    }

    function getCurrentIndex() {
      const width = scrollContainer.clientWidth;
      return Math.round(scrollContainer.scrollLeft / width);
    }

    function goToSlide(index) {
      const boundedIndex = Math.max(0, Math.min(slides.length - 1, index));
      const target = slides[boundedIndex];

      if (!target || boundedIndex === currentSlideIndex) return false;
      currentSlideIndex = boundedIndex;

      if (isDesktopLayout()) {
        animateScrollTo(target.offsetLeft);
        return true;
      }

      target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
      return true;
    }

    function handleDirectionalScroll(direction) {
      if (isScrollLocked) return;

      isScrollLocked = true;
      const didMove = goToSlide(currentSlideIndex + direction);

      if (!didMove) {
        releaseScrollLock(120);
        return;
      }

      releaseScrollLock(isDesktopLayout() ? 650 : 450);
    }

    function updateSlidingBackground() {
      if (!navPill) return;

      const activeLink = document.querySelector('.nav-pill a.active');
      if (!activeLink) {
        navPill.classList.remove('has-active');
        return;
      }

      const linkRect = activeLink.getBoundingClientRect();
      const containerRect = navPill.getBoundingClientRect();

      navPill.style.setProperty('--active-left', linkRect.left - containerRect.left + 'px');
      navPill.style.setProperty('--active-width', linkRect.width + 'px');
      navPill.classList.add('has-active');
    }

    function animateSecondaryNav() {
      if (!secNav) return;

      secNav.classList.remove('reveal');
      void secNav.offsetWidth;
      secNav.classList.add('reveal');

      clearTimeout(secNavAnimTimer);
      secNavAnimTimer = setTimeout(() => {
        secNav.classList.remove('reveal');
      }, 450);
    }

    function updateSecondaryNav(sectionId) {
      if (!secNav || activeSectionId === sectionId) return;
      activeSectionId = sectionId;

      const items = config.sectionActions?.[sectionId]?.links || [];
      secNav.innerHTML = '';

      if (!items.length) {
        secNav.classList.remove('visible', 'reveal');
        return;
      }

      items.forEach((item) => {
        const link = document.createElement('a');
        link.className = 'sec-nav-link';
        link.href = item.href;
        if (item.target) link.target = item.target;
        if (item.download) link.setAttribute('download', '');
        link.innerHTML = (item.icon || '') + item.text;
        secNav.appendChild(link);
      });

      cursor.registerHover(secNav.querySelectorAll('.sec-nav-link'));
      secNav.classList.add('visible');
      animateSecondaryNav();
    }

    function updateActiveState(section) {
      const isHome = section.id === 'home';
      const activeIndex = slides.indexOf(section);
      if (activeIndex !== -1) currentSlideIndex = activeIndex;

      section.classList.add('in');

      navLinks.forEach((link) => {
        const isMatch = link.getAttribute('href') === '#' + section.id;
        link.classList.toggle('active', !isHome && isMatch);
      });

      dotsContainer?.querySelectorAll('.slide-dot').forEach((dot, index) => {
        dot.classList.toggle('active', index === activeIndex);
      });

      updateSlidingBackground();
      updateSecondaryNav(section.id);
    }

    scrollContainer.addEventListener(
      'wheel',
      (event) => {
        const verticalDelta = Math.abs(event.deltaY);
        const horizontalDelta = Math.abs(event.deltaX);
        const dominantDelta = verticalDelta >= horizontalDelta ? event.deltaY : event.deltaX;
        const now = performance.now();

        event.preventDefault();

        if (Math.abs(dominantDelta) < 10) return;
        if (isDesktopLayout() && now - lastWheelNavigationAt < 900) return;

        lastWheelNavigationAt = now;
        handleDirectionalScroll(dominantDelta > 0 ? 1 : -1);
      },
      { passive: false }
    );

    let touchStartX = 0;
    let touchStartY = 0;

    scrollContainer.addEventListener(
      'touchstart',
      (event) => {
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
      },
      { passive: true }
    );

    scrollContainer.addEventListener(
      'touchend',
      (event) => {
        const deltaX = touchStartX - event.changedTouches[0].clientX;
        const deltaY = touchStartY - event.changedTouches[0].clientY;

        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 40) {
          handleDirectionalScroll(deltaX > 0 ? 1 : -1);
        }
      },
      { passive: true }
    );

    slides.forEach((slide, index) => {
      if (!dotsContainer) return;

      const dot = document.createElement('div');
      dot.className = 'slide-dot' + (index === 0 ? ' active' : '');
      if (config.slideLabels?.[index]) dot.title = config.slideLabels[index];
      dot.addEventListener('click', () => goToSlide(index));
      dotsContainer.appendChild(dot);
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) updateActiveState(entry.target);
        });
      },
      { threshold: 0.5 }
    );

    slides.forEach((slide) => {
      if (slide.id) observer.observe(slide);
    });

    document.querySelectorAll('.nav-pill a, .nav-icon-btn').forEach((element) => {
      element.addEventListener('click', (event) => {
        const href = element.getAttribute('href');
        if (!href || !href.startsWith('#')) return;

        event.preventDefault();
        const target = document.getElementById(href.slice(1));
        const targetIndex = slides.indexOf(target);
        if (targetIndex !== -1) {
          goToSlide(targetIndex);
          return;
        }

        if (!target) return;

        if (isDesktopLayout()) {
          animateScrollTo(target.offsetLeft);
        } else {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') secNav?.classList.remove('visible');
    });

    window.addEventListener('resize', updateSlidingBackground);

    if (slides[0]?.id === 'home') {
      currentSlideIndex = 0;
      navLinks.forEach((link) => link.classList.remove('active'));
      updateSlidingBackground();
      updateSecondaryNav('home');
    }

    initContactForm();
  }

  function initStandalonePage(options) {
    initCursor();
    initRevealSections(options?.revealSelector || '.rev', options?.threshold || 0.07);
  }

  window.PortfolioSite = {
    initFaviconBadge,
    initScrollerPage,
    initStandalonePage,
  };

  initFaviconBadge();
})();
