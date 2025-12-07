// Landing page animations and interactions
document.addEventListener('DOMContentLoaded', () => {
    // Animated gradient background
    const backgroundGlow = document.querySelector('.background-glow');
    if (backgroundGlow) {
        let rotation = 0;
        setInterval(() => {
            rotation += 0.1;
            backgroundGlow.style.transform = `rotate(${rotation}deg)`;
        }, 50);
    }

    // Floating elements animation
    const floatingElements = document.querySelectorAll('.floating-element');
    floatingElements.forEach((el, index) => {
        const randomDelay = index * 1000;
        const randomDuration = 3000 + Math.random() * 2000;
        
        setInterval(() => {
            const randomX = (Math.random() - 0.5) * 100;
            const randomY = (Math.random() - 0.5) * 100;
            el.style.transform = `translate(${randomX}px, ${randomY}px) rotate(${Math.random() * 360}deg)`;
        }, randomDuration);
    });

    // Glass card tilt effect
    const glassCard = document.querySelector('.glass-card');
    if (glassCard) {
        document.addEventListener('mousemove', (e) => {
            const rect = glassCard.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            const rotateX = (y / rect.height) * 10;
            const rotateY = -(x / rect.width) * 10;
            
            glassCard.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });
        
        glassCard.addEventListener('mouseleave', () => {
            glassCard.style.transform = 'rotateX(0) rotateY(0)';
        });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href !== '#') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });

    // Feature cards stagger animation on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 100);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.feature-card').forEach((card) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.5s, transform 0.5s';
        observer.observe(card);
    });

    // Typing animation for the code block
    const codeBlock = document.querySelector('.code-block');
    if (codeBlock) {
        const originalHTML = codeBlock.innerHTML;
        codeBlock.innerHTML = '';
        
        let charIndex = 0;
        const typingSpeed = 20;
        
        function typeWriter() {
            if (charIndex < originalHTML.length) {
                codeBlock.innerHTML += originalHTML.charAt(charIndex);
                charIndex++;
                setTimeout(typeWriter, typingSpeed);
            }
        }
        
        // Start typing animation after a delay
        setTimeout(typeWriter, 500);
    }

    // Add glow effect to primary button
    const primaryBtn = document.querySelector('.btn-primary');
    if (primaryBtn) {
        primaryBtn.addEventListener('mouseenter', () => {
            primaryBtn.style.boxShadow = '0 0 40px rgba(0, 255, 136, 0.6)';
        });
        
        primaryBtn.addEventListener('mouseleave', () => {
            primaryBtn.style.boxShadow = '0 0 20px rgba(0, 255, 136, 0.3)';
        });
    }
});
