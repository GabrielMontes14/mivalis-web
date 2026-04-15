/**
 * OCEANMAN — Premium Interactions Engine
 * Handles Spotlight effects, hover physics, and dynamic UI micro-interactions.
 */

document.addEventListener('DOMContentLoaded', () => {
    initSpotlightEffect();
    initPulseLoading();
});

/**
 * Initializes the Spotlight effect on cards.
 * It tracks mouse movement over elements with 'spotlight-wrapper'
 * and updates CSS variables to position the subtle radial glow.
 */
function initSpotlightEffect() {
    // We attach listeners globally or dynamically if cards are loaded via AJAX.
    // For single page apps where elements are injected, event delegation on body is better,
    // but mousemove fires too often for delegation to be perfectly performant.
    // We'll use a dynamic observer or attach to the main content area.

    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    mainContent.addEventListener('mousemove', (e) => {
        // Find if target is inside a spotlight wrapper
        const wrapper = e.target.closest('.spotlight-wrapper');
        if (!wrapper) return;

        // Calculate mouse position relative to the wrapper
        const rect = wrapper.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Update CSS variables specifically for this hovered wrapper
        wrapper.style.setProperty('--mouse-x', `${x}px`);
        wrapper.style.setProperty('--mouse-y', `${y}px`);
    });
}

/**
 * Utility to wrap elements in a spotlight wrapper dynamically
 * Required for the CSS effect to work properly.
 */
window.applySpotlight = function (elementSelector) {
    const elements = document.querySelectorAll(elementSelector);
    elements.forEach(el => {
        // Avoid double wrapping
        if (el.parentElement.classList.contains('spotlight-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'spotlight-wrapper';

        // Add spotlight-card class to the element itself
        if (!el.classList.contains('spotlight-card')) {
            el.classList.add('spotlight-card');
        }

        // Insert wrapper before element, then move element into wrapper
        el.parentNode.insertBefore(wrapper, el);
        wrapper.appendChild(el);
    });
};

/**
 * Simulates a subtle pulse/loading skeleton for elements
 */
function initPulseLoading() {
    // Expose a global method to add skeleton loaders
    window.addSkeleton = (element) => {
        element.style.position = 'relative';
        element.style.overflow = 'hidden';

        const skeleton = document.createElement('div');
        skeleton.style.position = 'absolute';
        skeleton.style.inset = '0';
        skeleton.style.zIndex = '10';
        skeleton.style.background = 'linear-gradient(90deg, var(--bg-card) 0%, rgba(255,255,255,0.05) 50%, var(--bg-card) 100%)';
        skeleton.style.backgroundSize = '200% 100%';
        skeleton.style.animation = 'shimmer 1.5s infinite linear';
        skeleton.style.borderRadius = 'inherit';
        skeleton.className = 'temp-skeleton';

        element.appendChild(skeleton);
    };

    window.removeSkeleton = (element) => {
        const skeleton = element.querySelector('.temp-skeleton');
        if (skeleton) skeleton.remove();
    };
}

// Global keyframe for shimmer injected dynamically if not in CSS
if (!document.getElementById('shimmer-style')) {
    const style = document.createElement('style');
    style.id = 'shimmer-style';
    style.textContent = `
        @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
    `;
    document.head.appendChild(style);
}
