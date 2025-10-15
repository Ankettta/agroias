document.addEventListener('DOMContentLoaded', function () {
  // Сбрасываем скролл
  window.scrollTo(0, 0);
  history.replaceState(null, '', window.location.pathname);

  // Плавное появление баннера
  const bannerFadeElements = document.querySelectorAll('.banner__wrapper .fade-in');
  bannerFadeElements.forEach((el, i) => {
    setTimeout(() => el.classList.add('show'), i * 400);
  });

  // Плавное появление при скролле
  const scrollFadeElements = document.querySelectorAll('main .fade-in');
  const appearOnScroll = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('show');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.2, rootMargin: "0px 0px -50px 0px" });

  scrollFadeElements.forEach(el => appearOnScroll.observe(el));

  // ------------------- Бургер
  const burger = document.querySelector('.burger');
  const nav = document.querySelector('.header__nav');
  const header = document.querySelector('.header');

  if (burger && nav) {
    burger.addEventListener('click', e => {
      e.stopPropagation();
      const opened = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', opened);
      nav.setAttribute('aria-hidden', !opened);
    });

    document.addEventListener('click', e => {
      if (!nav.classList.contains('open')) return;
      if (header.contains(e.target)) return;
      nav.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      nav.setAttribute('aria-hidden', 'true');
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && nav.classList.contains('open')) {
        nav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        nav.setAttribute('aria-hidden', 'true');
      }
    });

    // Плавный скролл только для якорей
    document.querySelectorAll('.nav__item a, .btn[href^="#"]').forEach(link => {
      link.addEventListener('click', e => {
        const href = link.getAttribute('href');

        // Если это якорь (начинается с #) — скроллим
        if (href.startsWith('#')) {
          e.preventDefault();
          const targetId = href.substring(1);
          const targetEl = document.getElementById(targetId);
          if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
        }

        // Закрываем меню после клика в любом случае
        if (nav.classList.contains('open')) {
          nav.classList.remove('open');
          burger.setAttribute('aria-expanded', 'false');
          nav.setAttribute('aria-hidden', 'true');
        }
      });
    });
  }

  // ------------------- Переводы
  let currentTranslations = {};
  let activeLang = localStorage.getItem('preferredLang') || "ru";

  async function loadTranslations(lang) {
    try {
      const response = await fetch(`lang/${lang}.json`);
      if (!response.ok) throw new Error(`Failed to load ${lang} translations`);
      currentTranslations = await response.json();
      activeLang = lang;
      localStorage.setItem('preferredLang', lang);
      applyTranslations();
    } catch (error) {
      console.error("Error loading translations:", error);
    }
  }

  function applyTranslations() {
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.getAttribute("data-i18n");
      
      if (currentTranslations[key]) {
        const isIcon = element.tagName === "I" && 
                      (element.classList.contains('fa') || 
                       element.classList.contains('icon') ||
                       element.classList.contains('svg-icon'));

        const isImageWithSrc = element.tagName === "IMG" && element.hasAttribute("src");

        if (isIcon) {
          if (element.textContent.trim() !== '') {
            element.textContent = currentTranslations[key];
          }
        } else if (isImageWithSrc) {
          element.setAttribute("alt", currentTranslations[key]);
        } else if (element.hasAttribute("placeholder")) {
          element.setAttribute("placeholder", currentTranslations[key]);
        } else if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'SPAN', 'A', 'BUTTON', 'LI'].includes(element.tagName)) {
          element.innerHTML = currentTranslations[key];
        } else {
          element.textContent = currentTranslations[key];
        }
      }
    });

    document.documentElement.lang = activeLang;

    const submitBtn = document.querySelector('.cooperation__form-btn');
    if (submitBtn && currentTranslations.form_submit) {
      submitBtn.textContent = currentTranslations.form_submit;
    }
  }

  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.getAttribute("data-lang");
      if (lang && lang !== activeLang) {
        loadTranslations(lang);
        document.querySelectorAll(".lang-btn").forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
    });
  });

  loadTranslations(activeLang);

  // ------------------- Форма с модальным окном
  const cooperationForm = document.getElementById('cooperationForm');
  // 1. Получаем элементы модального окна 
  const successModal = document.getElementById('successModal');
  const closeModalBtn = document.getElementById('closeModal');

  if (cooperationForm && successModal && closeModalBtn) {
    cooperationForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const submitBtn = this.querySelector('.cooperation__form-btn');
      const originalBtnText = submitBtn.textContent; 
      
      submitBtn.disabled = true;
      submitBtn.textContent = currentTranslations.form_sending || 'Отправка...';

      try {
        const formData = new FormData(this);
        const urlEncodedData = new URLSearchParams();
        formData.forEach((value, key) => {
          urlEncodedData.append(key, value.trim());
        });

        const response = await fetch('/send-mail', { 
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: urlEncodedData
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.message || `Ошибка сервера: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.status === 'success') {
          // 2. Открываем модальное окно 
          successModal.classList.add('active');
          this.reset();
        } else {
          alert(currentTranslations.form_error || result.message || 'Ошибка! Попробуйте позже.');
        }
      } catch (error) {
        alert(currentTranslations.form_connection_error || 'Ошибка соединения! Проверьте интернет.');
        console.error('Ошибка отправки формы:', error);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    });

    // 3. Закрытие модального окна по кнопке 
    closeModalBtn.addEventListener('click', () => {
      successModal.classList.remove('active');
    });

    // 4. Закрытие по клику вне модального 
    successModal.addEventListener('click', (e) => {
      if (e.target === successModal) {
        successModal.classList.remove('active');
      }
    });
  }
});
