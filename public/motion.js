/**
 * Rankly — Motion System & Micro-Interactions (Midnight Lime)
 * Implements: Spotlight cursor glow, number count-up, spring easing, and reduced motion safety.
 */

(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ─── 1. Cursor-Following Spotlight Glow for Cards ───
    function initSpotlightCards() {
        if (prefersReducedMotion) return;

        document.addEventListener('mousemove', (e) => {
            const cards = document.querySelectorAll('.card, .result-card, .feature-card, .stat-card, .admin-action-card, .db-relation-card, .problem-card');
            cards.forEach(card => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                card.style.setProperty('--mouse-x', `${x}px`);
                card.style.setProperty('--mouse-y', `${y}px`);
            });
        });
    }

    // ─── 2. Number Count-Up Utility ───
    function countUp(el, target, duration = 800, prefix = '', suffix = '') {
        if (prefersReducedMotion) {
            el.textContent = `${prefix}${target}${suffix}`;
            return;
        }

        const start = 0;
        const startTime = performance.now();

        function easeOutCubic(t) {
            return 1 - Math.pow(1 - t, 3);
        }

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const current = Math.floor(start + (target - start) * easeOutCubic(progress));
            el.textContent = `${prefix}${current.toLocaleString()}${suffix}`;

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                el.textContent = `${prefix}${target.toLocaleString()}${suffix}`;
            }
        }

        requestAnimationFrame(update);
    }

    // Auto-trigger count-up on elements with [data-count] when in view
    function initCountUpObservers() {
        const elements = document.querySelectorAll('[data-count]');
        if (!elements.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const count = parseFloat(el.getAttribute('data-count'));
                    const prefix = el.getAttribute('data-prefix') || '';
                    const suffix = el.getAttribute('data-suffix') || '';
                    if (!isNaN(count)) {
                        countUp(el, count, 700, prefix, suffix);
                    }
                    observer.unobserve(el);
                }
            });
        }, { threshold: 0.2 });

        elements.forEach(el => observer.observe(el));
    }

    // ─── 3. Scroll Progress Hairline ───
    function initScrollProgress() {
        const bar = document.getElementById('scrollProgress');
        if (!bar) return;

        function updateProgress() {
            const winScroll = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
            const docHeight = Math.max(
                document.body.scrollHeight, document.documentElement.scrollHeight,
                document.body.offsetHeight, document.documentElement.offsetHeight,
                document.body.clientHeight, document.documentElement.clientHeight
            );
            const winHeight = window.innerHeight || document.documentElement.clientHeight || 0;
            const height = docHeight - winHeight;
            const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
            bar.style.width = `${Math.min(100, Math.max(0, scrolled))}%`;

            const header = document.getElementById('topHeader');
            if (header) {
                header.classList.toggle('scrolled', winScroll > 15);
            }
        }

        window.addEventListener('scroll', updateProgress, { passive: true });
        window.addEventListener('resize', updateProgress, { passive: true });
        updateProgress();
    }

    // ─── 4. Risk Meter Element Creator ───
    function renderRiskMeter(userRank, closingRank) {
        // Safe: userRank <= 0.85 * closingRank
        // Moderate: userRank <= 1.10 * closingRank
        // Reach: userRank > 1.10 * closingRank
        const ratio = closingRank > 0 ? userRank / closingRank : 1;
        // Position on a 0% to 100% bar representing 0.5x to 1.5x
        const minScale = 0.5;
        const maxScale = 1.5;
        const normalized = Math.max(0, Math.min(100, ((ratio - minScale) / (maxScale - minScale)) * 100));

        let zoneClass = 'safe';
        let label = 'Safe';
        if (ratio > 1.10) {
            zoneClass = 'reach';
            label = 'Reach';
        } else if (ratio > 0.85) {
            zoneClass = 'moderate';
            label = 'Moderate';
        }

        return `
            <div class="risk-meter" title="Rank ${userRank} vs Closing ${closingRank} (${ratio.toFixed(2)}x cutoff)">
                <div class="risk-meter__header">
                    <span class="risk-meter__label">Cutoff Position</span>
                    <span class="risk-meter__tag ${zoneClass}">${label} (${ratio.toFixed(2)}x)</span>
                </div>
                <div class="risk-meter__track">
                    <div class="risk-meter__zone risk-meter__zone--safe" style="width:35%;" title="≤0.85x Closing (Safe)"></div>
                    <div class="risk-meter__zone risk-meter__zone--mod" style="width:25%;" title="0.85x-1.10x Closing (Moderate)"></div>
                    <div class="risk-meter__zone risk-meter__zone--reach" style="width:40%;" title=">1.10x Closing (Reach)"></div>
                    <div class="risk-meter__pin ${zoneClass}" style="left: ${normalized}%;"></div>
                </div>
                <div class="risk-meter__ticks">
                    <span>Safe</span>
                    <span style="left:35%;">0.85x</span>
                    <span style="left:60%;">1.0x</span>
                    <span style="margin-left:auto;">Reach</span>
                </div>
            </div>
        `;
    }

    // ─── 5. Scroll-Reveal for Landing Sections ───
    function initScrollReveal() {
        // Ensure all items are visible by default
        const allItems = document.querySelectorAll('.timeline-step, .bento-card, .editorial-problem-item, .trust-stat-card');
        if (prefersReducedMotion) {
            allItems.forEach(el => {
                el.style.opacity = '1';
                el.style.transform = 'none';
            });
            return;
        }

        // Timeline steps: staggered reveal when section enters view
        const timelineSteps = document.querySelectorAll('.timeline-step');
        const timelineContainer = document.querySelector('.timeline-steps');
        if (timelineContainer && timelineSteps.length) {
            const timelineObs = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        timelineSteps.forEach((step, i) => {
                            setTimeout(() => {
                                step.style.opacity = '1';
                                step.style.transform = 'translateY(0)';
                            }, i * 60);
                        });
                        timelineObs.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1 });
            timelineObs.observe(timelineContainer);
        }

        // Stagger group helper with safety check
        function staggerGroup(selector, delayStep = 50) {
            const elements = document.querySelectorAll(selector);
            if (!elements.length) return;

            const obs = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    const el = entry.target;
                    const siblings = Array.from(el.parentElement ? el.parentElement.querySelectorAll(selector) : []);
                    const idx = Math.min(siblings.indexOf(el), 11);
                    setTimeout(() => {
                        el.style.opacity = '1';
                        el.style.transform = 'translateY(0)';
                        el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                    }, idx * delayStep);
                    obs.unobserve(el);
                });
            }, { threshold: 0.1 });

            elements.forEach(el => {
                el.style.opacity = '0.9';
                el.style.transform = 'translateY(8px)';
                obs.observe(el);
            });
        }

        staggerGroup('.bento-card', 60);
        staggerGroup('.editorial-problem-item', 40);
        staggerGroup('.trust-stat-card', 50);
    }

    // ─── Export to window ───
    window.RanklyMotion = {
        countUp,
        renderRiskMeter,
        initCountUpObservers
    };

    function initAll() {
        initSpotlightCards();
        initScrollProgress();
        initCountUpObservers();
        initScrollReveal();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    } else {
        initAll();
    }

})();
