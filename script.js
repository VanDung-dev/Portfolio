document.addEventListener('DOMContentLoaded', function () {
  // ======================== THAM CHIẾU DOM ========================
  const terminalContainer = document.querySelector('.container');
  const appIcon = document.getElementById('app-icon');
  const redDot = document.getElementById('red-dot');
  const content = document.querySelector('.content');
  const tabsContainer = document.querySelector('.tabs-container');
  const ContainerTitle = document.querySelector('.container-title');
  const dockAppIcon = document.getElementById('dock-terminal');
  const dockRedDot = document.getElementById('dock-terminal-red-dot');
  const dock = document.querySelector('.dock');
  const themeSelector = document.getElementById('theme-selector');
  const dockGithub = document.getElementById('dock-github');

  // ======================== TRẠNG THÁI ỨNG DỤNG ========================
  const state = {
    isMaximized: false,
    isMinimized: true,
    isClosed: false,
    originalContent: content.innerHTML,
    minimizedContent: content.innerHTML,
    minimizedTitle: ContainerTitle.textContent,
    currentLanguage: localStorage.getItem('language') || 'vi',
    contentData: null, // Dữ liệu nội dung sẽ được tải từ file JSON
    isContentLoaded: false, // Trạng thái tải nội dung
    interaction: null // Trạng thái tương tác (ví dụ: chờ xác nhận Y/n)
  };



  // ======================== QUÁ TRÌNH KHỞI ĐỘNG ========================
  function runBootSequence() {
    const bootScreen = document.getElementById('boot-screen');
    const bootContent = bootScreen.querySelector('.boot-content');

    // Mô phỏng các thông báo khởi động Linux phức tạp
    const bootMessages = [
      { msg: 'Loading Linux 6.6.10-1-MANJARO...', status: 'OK' },
      { msg: 'Loading initial ramdisk...', status: 'OK' },
      { msg: 'Starting systemd-udevd...', status: 'OK' },
      { msg: 'Created slice System Slice.', status: 'OK' },
      { msg: 'Starting Load/Save Random Seed...', status: 'OK' },
      { msg: 'Started Apply Kernel Variables.', status: 'OK' },
      { msg: 'Formatted /dev/nvme0n1p2 as ext4.', status: 'OK' },
      { msg: 'Mounting /sys/kernel/security...', status: 'OK' },
      { msg: 'Mounted /boot/efi.', status: 'OK' },
      { msg: 'Starting Network Manager...', status: 'OK' },
      { msg: 'Reached target Network.', status: 'OK' },
      { msg: 'Starting TLP system startup/shutdown...', status: 'OK' },
      { msg: 'Started Daily man-db regeneration.', status: 'OK' },
      { msg: 'Reached target Multi-User System.', status: 'OK' },
      { msg: 'Starting GNOME Display Manager...', status: 'OK' },
      { msg: 'Started GNOME Display Manager.', status: 'OK' },
      { msg: 'Starting User Manager for UID 1000...', status: 'OK' }
    ];

    let delay = 0;

    function addLine(text, status) {
      const div = document.createElement('div');
      div.className = 'boot-line';

      const statusSpan = document.createElement('span');
      statusSpan.className = `boot-status status-${status ? status.toLowerCase() : 'ok'}`;
      statusSpan.innerText = `[  ${status || 'OK'}  ]`;

      const msgSpan = document.createElement('span');
      msgSpan.className = 'boot-message';
      msgSpan.innerText = text;

      div.appendChild(statusSpan);
      div.appendChild(msgSpan);

      bootContent.appendChild(div);
      window.scrollTo(0, document.body.scrollHeight);
    }

    let i = 0;
    function printLoop() {
      if (i < bootMessages.length) {
        const m = bootMessages[i];
        addLine(m.msg, m.status);
        i++;
        // Độ trễ ngẫu nhiên để mô phỏng quá trình xử lý
        setTimeout(printLoop, Math.random() * 150 + 50);
      } else {
        // Đợi 3 giây trước khi kiểm tra tải nội dung
        setTimeout(checkLoad, 3000);
      }
    }

    function checkLoad() {
      if (state.isContentLoaded) {
        addLine('Reached target Graphical Interface.', 'OK');
        setTimeout(() => {
          bootScreen.style.transition = 'opacity 0.8s ease';
          bootScreen.style.opacity = '0';
          setTimeout(() => {
            bootScreen.style.display = 'none';
            // Kích hoạt hoạt ảnh hiển thị thiết bị đầu cuối sau 3 giây
            setTimeout(() => {
              openTerminal(true);
            }, 3000);
          }, 800);
        }, 500);
      } else {
        // Nếu vẫn đang tải, in ra một số tin nhắn chờ
        addLine('Waiting for local file system...', 'OK');
        setTimeout(checkLoad, 800);
      }
    }

    printLoop();
  }

  // ======================== KHỞI TẠO ========================
  function initialize() {
    if (window.innerWidth <= 450) {
      document.querySelector('.gnome-bar').style.display = 'none';
    }

    ContainerTitle.textContent = 'VanDung-dev@manjaro: ~/profile';
    initTheme();

    const savedLang = localStorage.getItem('language') || 'vi';
    setLanguage(savedLang);

    terminalContainer.style.display = 'none';

    appIcon.style.display = 'flex';
    redDot.style.display = 'block';
    redDot.classList.add('visible');
    dockRedDot.style.display = 'block';
    dockRedDot.classList.add('visible');

    dock.classList.remove('hidden');

    state.isMinimized = true; // Đặt trạng thái ban đầu là thu nhỏ/đóng hiệu quả
    state.isClosed = true;



    // Bắt đầu quá trình khởi động ngay lập tức
    runBootSequence();

    // Tải nội dung từ file JSON
    loadContentFromJSON(() => {
      state.isContentLoaded = true;
    });

    setupEventListeners();
    setupKeyboardNavigation(); // Thêm hỗ trợ điều hướng bàn phím
    updateClock();
    setInterval(updateClock, 60000);

    // Initialize TerminalLogic
    TerminalLogic.init({
      state: state,
      ui: {
        content: content,
        tabsContainer: tabsContainer,
        containerTitle: ContainerTitle
      },
      callbacks: {
        initLazyLoading: initLazyLoading,
        updateAllContent: updateAllContent,
        startTypingAll: startTypingAll,
        handleError: handleError
      }
    });

    // Tải nội dung terminal
    fetch('terminal-content.json')
      .then(response => response.json())
      .then(data => {
        TerminalLogic.loadContent(data);
      })
      .catch(error => handleError(error, 'loading terminal content'));
  }

  // ======================== TẢI NỘI DUNG ========================
  // Hàm tải nội dung từ file JSON
  function loadContentFromJSON(callback) {
    fetch('content.json')
      .then(response => response.json())
      .then(data => {
        state.contentData = data;
        updateAllContent(); // Cập nhật toàn bộ nội dung sau khi tải xong
        if (callback) callback();
      })
      .catch(error => {
        console.error('Error loading content from JSON:', error);
        // Quay lại nội dung gốc nếu tải JSON thất bại
        if (callback) callback();
      });
  }

  // Cập nhật toàn bộ nội dung từ dữ liệu JSON
  function updateAllContent() {
    if (!state.contentData) return;
    updateHomeContent();
    updateProjectsContent();
    updateCertificatesContent();
    updateContactContent();
    setLanguage(state.currentLanguage);
  }

  // Cập nhật nội dung trang chủ từ dữ liệu JSON
  function updateHomeContent() {
    if (!state.contentData.profile) return;

    const viContent = state.contentData.profile.vi;
    const enContent = state.contentData.profile.en;

    const viHomeSection = document.querySelector('#home-content .lang-content.lang-vi');
    const enHomeSection = document.querySelector('#home-content .lang-content.lang-en');

    if (viHomeSection) {
      viHomeSection.innerHTML = `
        <div class="profile-header">
          <div class="avatar-container">
            <div class="avatar">
              <img 
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E" 
              data-src="images/avatar.webp" 
              alt="Avatar"
              class="lazy-load"
              style="width:100%;height:100%;object-fit:cover;border-radius:50%;"
              >
            </div>
          </div>
          <div class="profile-info">
            <div class="name">${viContent.name}</div>
            <div class="title">${viContent.title}</div>
            <div class="about">
              <p>${viContent.about[0]}</p>
              <p>${viContent.about[1]}</p>
              <p>${viContent.about[2]}</p>
            </div>
          </div>
        </div>
        <div class="skills">
          <p><strong>Kỹ năng chính:</strong></p>
          <div>
            ${viContent.skills.map(skill =>
        `<span class="skill-tag"><i class="nf ${skill.icon}"></i> ${skill.name}</span>`
      ).join('')}
          </div>
        </div>
        <div class="social-links">
          ${viContent.socialLinks.map(link =>
        `<a href="${link.url}" class="social-link" target="_blank" rel="noopener noreferrer">
              <i class="nf ${link.icon}"></i> ${link.name}
            </a>`
      ).join('')}
        </div>
      `;
    }

    if (enHomeSection) {
      enHomeSection.innerHTML = `
        <div class="profile-header">
          <div class="avatar-container">
            <div class="avatar">
              <img 
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E" 
              data-src="images/avatar.webp" 
              alt="Avatar"
              class="lazy-load"
              style="width:100%;height:100%;object-fit:cover;border-radius:50%;"
              >
            </div>
          </div>
          <div class="profile-info">
            <div class="name">${enContent.name}</div>
            <div class="title">${enContent.title}</div>
            <div class="about">
              <p>${enContent.about[0]}</p>
              <p>${enContent.about[1]}</p>
              <p>${enContent.about[2]}</p>
            </div>
          </div>
        </div>
        <div class="skills">
          <p><strong>Key Skills:</strong></p>
          <div>
            ${enContent.skills.map(skill =>
        `<span class="skill-tag"><i class="nf ${skill.icon}"></i> ${skill.name}</span>`
      ).join('')}
          </div>
        </div>
        <div class="social-links">
          ${enContent.socialLinks.map(link =>
        `<a href="${link.url}" class="social-link" target="_blank" rel="noopener noreferrer">
              <i class="nf ${link.icon}"></i> ${link.name}
            </a>`
      ).join('')}
        </div>
      `;
    }
  }

  // Cập nhật nội dung dự án từ dữ liệu JSON
  function updateProjectsContent() {
    if (!state.contentData.projects) return;

    const viProjects = state.contentData.projects.vi;
    const enProjects = state.contentData.projects.en;

    const viProjectsSection = document.querySelector('#projects-content .lang-content.lang-vi');
    const enProjectsSection = document.querySelector('#projects-content .lang-content.lang-en');

    if (viProjectsSection) {
      viProjectsSection.innerHTML = viProjects.map(project => `
        <div class="project">
          <div class="project-title"><i class="nf ${project.icon}"></i>${project.title}</div>
          <div class="project-description">
            ${project.description}
          </div>
          <a href="${project.githubUrl}" class="github-link" target="_blank" rel="noopener noreferrer">
            <i class="nf fa-github"></i>${project.githubText}
          </a>
        </div>
      `).join('');
    }

    if (enProjectsSection) {
      enProjectsSection.innerHTML = enProjects.map(project => `
        <div class="project">
          <div class="project-title"><i class="nf ${project.icon}"></i>${project.title}</div>
          <div class="project-description">
            ${project.description}
          </div>
          <a href="${project.githubUrl}" class="github-link" target="_blank" rel="noopener noreferrer">
            <i class="nf fa-github"></i> ${project.githubText}
          </a>
        </div>
      `).join('');
    }
  }

  // Cập nhật nội dung chứng chỉ từ dữ liệu JSON
  function updateCertificatesContent() {
    if (!state.contentData.certificates) return;

    const viCertificates = state.contentData.certificates.vi;
    const enCertificates = state.contentData.certificates.en;

    const viCertificatesSection = document.querySelector('#certificates-content .lang-content.lang-vi');
    const enCertificatesSection = document.querySelector('#certificates-content .lang-content.lang-en');

    if (viCertificatesSection) {
      viCertificatesSection.innerHTML = viCertificates.map(certificate => `
        <div class="certificate">
          <div class="certificate-title"><i class="nf ${certificate.icon}"></i>${certificate.title}</div>
          <div class="certificate-org"><i class="nf nf-fa-university"></i> ${certificate.organization}</div>
          <div class="certificate-date">${certificate.date}</div>
          ${certificate.descriptions ?
          certificate.descriptions.map(desc => `<div class="certificate-desc">${desc}</div>`).join('') :
          `<div class="certificate-desc">${certificate.description}</div>`
        }
          ${certificate.certificateUrl ?
          `<a href="${certificate.certificateUrl}" class="certificates-link" target="_blank" rel="noopener noreferrer">
              <i class="nf nf-fa-certificate"></i> ${certificate.certificateText}
            </a>` : ''
        }
        </div>
      `).join('');
    }

    if (enCertificatesSection) {
      enCertificatesSection.innerHTML = enCertificates.map(certificate => `
        <div class="certificate">
          <div class="certificate-title"><i class="nf ${certificate.icon}"></i>${certificate.title}</div>
          <div class="certificate-org"><i class="nf nf-fa-university"></i> ${certificate.organization}</div>
          <div class="certificate-date">${certificate.date}</div>
          ${certificate.descriptions ?
          certificate.descriptions.map(desc => `<div class="certificate-desc">${desc}</div>`).join('') :
          `<div class="certificate-desc">${certificate.description}</div>`
        }
          ${certificate.certificateUrl ?
          `<a href="${certificate.certificateUrl}" class="certificates-link" target="_blank" rel="noopener noreferrer">
              <i class="nf nf-fa-certificate"></i> ${certificate.certificateText}
            </a>` : ''
        }
        </div>
      `).join('');
    }
  }

  // Cập nhật nội dung liên hệ từ dữ liệu JSON
  function updateContactContent() {
    if (!state.contentData.contact) return;

    const viContact = state.contentData.contact.vi;
    const enContact = state.contentData.contact.en;

    const viContactSection = document.querySelector('#contact-content .lang-content.lang-vi');
    const enContactSection = document.querySelector('#contact-content .lang-content.lang-en');

    if (viContactSection) {
      viContactSection.innerHTML = `
        <div class="contact-info">
          <div class="contact-card">
            <div class="contact-title"><i class="nf nf-fa-address_card"></i>${viContact.contactTitle}</div>
            <div class="contact-detail"><i class="nf nf-fa-envelope"></i> ${viContact.email}</div>
            <div class="contact-detail"><i class="nf nf-fa-phone"></i> ${viContact.phone}</div>
            <div class="contact-detail"><i class="nf nf-fa-map_marker"></i> ${viContact.address}</div>
          </div>
          <div class="contact-card">
            <div class="contact-title"><i class="nf nf-fa-comment"></i>${viContact.messageTitle}</div>
            <div class="contact-detail">${viContact.messageDescription}</div>
            <div class="social-links">
              ${viContact.socialLinks.map(link =>
        `<a href="${link.url}" class="social-link" target="_blank" rel="noopener noreferrer">
                  <i class="nf ${link.icon}"></i> ${link.name}
                </a>`
      ).join('')}
            </div>
          </div>
          <div class="contact-card">
            <div class="contact-title"><i class="nf nf-fa-calendar_days"></i>${viContact.scheduleTitle}</div>
            <div class="contact-detail">${viContact.scheduleDescription}</div>
            <a href="${viContact.scheduleUrl}" class="github-link" target="_blank" rel="noopener noreferrer">
              ${viContact.scheduleText}
            </a>
          </div>
        </div>
      `;
    }

    if (enContactSection) {
      enContactSection.innerHTML = `
        <div class="contact-info">
          <div class="contact-card">
            <div class="contact-title"><i class="nf nf-fa-address_card"></i>${enContact.contactTitle}</div>
            <div class="contact-detail"><i class="nf nf-fa-envelope"></i> ${enContact.email}</div>
            <div class="contact-detail"><i class="nf nf-fa-phone"></i> ${enContact.phone}</div>
            <div class="contact-detail"><i class="nf nf-fa-map_marker"></i> ${enContact.address}</div>
          </div>
          <div class="contact-card">
            <div class="contact-title"><i class="nf nf-fa-comment"></i>${enContact.messageTitle}</div>
            <div class="contact-detail">${enContact.messageDescription}</div>
            <div class="social-links">
              ${enContact.socialLinks.map(link =>
        `<a href="${link.url}" class="social-link" target="_blank" rel="noopener noreferrer">
                  <i class="nf ${link.icon}"></i> ${link.name}
                </a>`
      ).join('')}
            </div>
          </div>
          <div class="contact-card">
            <div class="contact-title"><i class="nf nf-fa-calendar_days"></i>${enContact.scheduleTitle}</div>
            <div class="contact-detail">${enContact.scheduleDescription}</div>
            <a href="${enContact.scheduleUrl}" class="github-link" target="_blank" rel="noopener noreferrer">
              ${enContact.scheduleText}
            </a>
          </div>
        </div>
      `;
    }
  }

  // ======================== XỬ LÝ SỰ KIỆN ========================
  function setupEventListeners() {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', handleTabClick);
    });

    document.querySelector('.minimize')?.addEventListener('click', minimizeTerminal);
    document.querySelector('.maximize')?.addEventListener('click', toggleMaximize);
    document.querySelector('.close')?.addEventListener('click', closeTerminal);
    document.querySelector('.resize-handle')?.addEventListener('mousedown', initResize);

    if (!isMobileDevice()) {
      document.querySelector('.terminal-header').addEventListener('mousedown', startDrag);
    }

    appIcon.addEventListener('click', handleAppIconClick);

    dockAppIcon?.addEventListener('click', handleAppIconClick);

    document.querySelector('.language-toggle')?.addEventListener('click', toggleLanguage);

    document.querySelectorAll('.avatar img').forEach(img => {
      img.addEventListener('error', handleAvatarError);
    });

    themeSelector?.addEventListener('click', toggleThemePopup);

    dockGithub?.addEventListener('click', (e) => {
      e.preventDefault();
      window.open('https://github.com/VanDung-dev', '_blank', 'noopener,noreferrer');
    });

    document.querySelectorAll('a[href^="http"]').forEach(link => {
      link.addEventListener('click', (e) => {
        if (link.target !== '_blank') {
          e.preventDefault();
          window.open(link.href, '_blank', 'noopener,noreferrer');
        }
      });
    });
  }

  // ======================== CHỨC NĂNG HỆ THỐNG ========================
  function updateClock() {
    const clockElement = document.getElementById('clock');
    if (!clockElement) return;

    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateString = now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });

    clockElement.innerHTML = `${dateString} &nbsp; ${timeString}`;
  }

  // ======================== ĐIỀU KHIỂN TERMINAL ========================
  function minimizeTerminal() {
    state.minimizedContent = content.innerHTML;
    state.minimizedTitle = ContainerTitle.textContent;

    terminalContainer.classList.add('minimized');
    setTimeout(() => {
      terminalContainer.style.display = 'none';
      terminalContainer.classList.remove('minimized');

      appIcon.style.display = 'flex';
      redDot.style.display = 'block';
      redDot.classList.add('visible');
      dockRedDot.style.display = 'block';
      dockRedDot.classList.add('visible');

      dock.classList.remove('hidden');

      state.isMinimized = true;
    }, 200);
  }

  function toggleMaximize() {
    const gnomeBarHeight = 40;
    const gnomeBarOffset = 5;
    const isMobile = window.innerWidth <= 450;

    if (!state.isMaximized) {
      terminalContainer.classList.add('maximized');
      if (isMobile) {
        Object.assign(terminalContainer.style, {
          width: '100vw',
          height: '100vh',
          borderRadius: '0',
          position: 'fixed',
          top: 'auto',
          left: 'auto'
        });
      } else {
        Object.assign(terminalContainer.style, {
          width: '100vw',
          height: `calc(100vh - ${gnomeBarHeight + gnomeBarOffset}px)`,
          maxWidth: '100%',
          borderRadius: '0',
          position: 'fixed',
          top: `${gnomeBarHeight}px`,
          left: 'auto',
          zIndex: '1000'
        });
      }
    } else {
      terminalContainer.classList.remove('maximized');
      Object.assign(terminalContainer.style, {
        width: '80vw',
        height: '80vh',
        maxWidth: '1200px',
        borderRadius: '12px',
        position: 'relative',
        top: 'auto',
        left: 'auto',
        zIndex: '1'
      });
    }
    state.isMaximized = !state.isMaximized;
  }

  function closeTerminal() {
    terminalContainer.classList.add('closed');
    setTimeout(() => {
      terminalContainer.style.display = 'none';
      terminalContainer.classList.remove('closed');

      redDot.style.display = 'none';
      redDot.classList.remove('visible');
      dockRedDot.style.display = 'none';
      dockRedDot.classList.remove('visible');

      content.innerHTML = TerminalLogic.createTerminalInputHTML();
      tabsContainer.style.display = 'none';
      ContainerTitle.textContent = 'VanDung-dev@manjaro';

      appIcon.style.display = 'flex';

      dock.classList.remove('hidden');

      state.isClosed = true;
      state.isMinimized = false;
    }, 200);
  }

  // ======================== CHỨC NĂNG THAY ĐỔI KÍCH THƯỚC ========================
  function initResize(e) {
    e.preventDefault();

    // Thêm class resizing khi bắt đầu thay đổi kích thước
    terminalContainer.classList.add('resizing');

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = parseInt(document.defaultView.getComputedStyle(terminalContainer).width, 10);
    const startHeight = parseInt(document.defaultView.getComputedStyle(terminalContainer).height, 10);

    // Lấy vị trí ban đầu của terminal
    const rect = terminalContainer.getBoundingClientRect();
    const startLeft = rect.left;
    const startTop = rect.top;

    function resize(e) {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      const newWidth = startWidth + deltaX;
      const newHeight = startHeight + deltaY;

      // Giới hạn kích thước tối thiểu
      const minWidth = 400;
      const minHeight = 300;

      if (newWidth >= minWidth) {
        terminalContainer.style.width = `${newWidth}px`;
        // Giữ cho cạnh trái cố định bằng cách điều chỉnh vị trí left
        terminalContainer.style.left = `${startLeft}px`;
      }

      if (newHeight >= minHeight) {
        terminalContainer.style.height = `${newHeight}px`;
        // Giữ cho cạnh trên cố định bằng cách điều chỉnh vị trí top
        terminalContainer.style.top = `${startTop}px`;
      }

      // Đảm bảo terminal có position là fixed khi thay đổi kích thước
      terminalContainer.style.position = 'fixed';
      terminalContainer.style.margin = '0';
    }

    function stopResize() {
      // Xóa class resizing khi kết thúc thay đổi kích thước
      terminalContainer.classList.remove('resizing');
      document.removeEventListener('mousemove', resize);
      document.removeEventListener('mouseup', stopResize);
    }

    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
  }

  function debounce(func, wait) {
    let timeout;
    return function () {
      const context = this;
      const args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }

  window.addEventListener('resize', debounce(function () {
    if (window.innerWidth <= 450) {
      document.querySelector('.gnome-bar').style.display = 'none';
    } else {
      document.querySelector('.gnome-bar').style.display = 'flex';
    }
  }, 100));

  function throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function () {
      const context = this;
      const args = arguments;
      if (!lastRan) {
        func.apply(context, args);
        lastRan = Date.now();
      } else {
        clearTimeout(lastFunc);
        lastFunc = setTimeout(function () {
          if ((Date.now() - lastRan) >= limit) {
            func.apply(context, args);
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    };
  }

  window.addEventListener('resize', throttle(function () {
    if (window.innerWidth <= 450) {
      document.querySelector('.gnome-bar').style.display = 'none';
    } else {
      document.querySelector('.gnome-bar').style.display = 'flex';
    }
  }, 100));

  // ======================== ĐIỀU KHIỂN BIỂU TƯỢNG ỨNG DỤNG ========================
  function handleAppIconClick() {
    if (state.isClosed) openTerminal();
    else if (state.isMinimized) restoreTerminal();
    else minimizeTerminal();
  }

  function openTerminal(isBoot = false) {
    initLazyLoading()
    appIcon.style.display = 'none';
    terminalContainer.style.display = 'block';
    terminalContainer.classList.add('restore');

    dock.classList.add('hidden');

    setTimeout(() => {
      terminalContainer.classList.remove('restore');

      if (isBoot) {
        // Chế độ khởi động: Hiển thị nội dung hồ sơ đầy đủ
        content.innerHTML = state.originalContent;
        tabsContainer.style.display = 'flex';
        ContainerTitle.textContent = 'VanDung-dev@manjaro: ~/profile';

        // Chèn lại nội dung khi viết lại INNERHTML xóa dữ liệu động
        updateAllContent();

        // Đảm bảo tab "Trang chủ" và nội dung đang hoạt động
        const firstTab = document.querySelector('.tab[data-tab="home"]');
        if (firstTab) firstTab.classList.add('active');

        const homeContent = document.getElementById('home-content');
        if (homeContent) homeContent.classList.add('active');

        startTypingAll();
      } else {
        // Chế độ thủ công: Hiển thị lời nhắc thiết bị đầu cuối trống
        // Sử dụng TerminalLogic để tạo HTML
        content.innerHTML = TerminalLogic.createTerminalInputHTML();
        tabsContainer.style.display = 'none';
        ContainerTitle.textContent = 'VanDung-dev@manjaro';

        const input = content.querySelector('.terminal-input');
        if (input) {
          setupCursor(input);
          // Sử dụng TerminalLogic handle
          input.addEventListener('keydown', TerminalLogic.handleTerminalInput);
          input.focus();
        }
      }

      state.isClosed = false;
      state.isMinimized = false;
    }, 200);
  }

  function restoreTerminal() {
    initLazyLoading()
    appIcon.style.display = 'none';
    redDot.style.display = 'none';
    redDot.classList.remove('visible');
    dockRedDot.style.display = 'none';
    dockRedDot.classList.remove('visible');

    terminalContainer.style.display = 'block';
    terminalContainer.classList.add('restore');

    dock.classList.add('hidden');

    setTimeout(() => {
      terminalContainer.classList.remove('restore');

      if (state.minimizedContent) {
        content.innerHTML = state.minimizedContent;
        ContainerTitle.textContent = state.minimizedTitle;
        tabsContainer.style.display = state.minimizedTitle.includes('profile') ? 'flex' : 'none';
        startTypingAll();
      }

      state.isMinimized = false;
    }, 200);
  }

  // ======================== NỘI DUNG TERMINAL ========================




  function handleError(error, context = '') {
    console.error(`Error${context ? ` in ${context}` : ''}:`, error);
  }








  function handleTerminalInput(event) {
    try {
      if (event.key !== 'Enter') return;

      const input = event.target;
      const command = input.value.trim();
      const outputDiv = content.querySelector('.command-output');

      // Xử lý khi đang trong chế độ tương tác (ví dụ: đang chạy pacman)
      if (state.interaction) {
        handleInteractiveInput(command, outputDiv, input);
        return;
      }

      if (!command) return;

      // Tạo một div dòng lệnh mới để hiển thị lại lệnh vừa nhập (giống terminal thật)
      const commandLineDiv = document.createElement('div');
      commandLineDiv.className = 'output-line';
      commandLineDiv.innerHTML = `
        <div class="zsh-unified">
          <span class="zsh-icon manjaro-icon-bg"><i class="nf nf-linux-manjaro"></i></span>
          <span class="zsh-file manjaro-file-bg"><i class="nf nf-fa-home"></i>~</span>
        </div>
        <span class="command">${escapeHtml(command)}</span>
      `;
      outputDiv.appendChild(commandLineDiv);

      if (!isValidCommand(command)) {
        outputDiv.innerHTML += `<div class="error">Invalid command: contains unsafe characters</div>`;
        input.value = '';
        content.scrollTop = content.scrollHeight;
        return;
      }

      executeCommand(command, outputDiv, input);

      input.value = '';
      content.scrollTop = content.scrollHeight;
      input.focus();
    } catch (error) {
      handleError(error, 'terminal input handler');
    }
  }

  function handleInteractiveInput(value, outputDiv, input) {
    const val = value.toLowerCase();

    // Hiển thị lại lựa chọn của người dùng
    outputDiv.innerHTML += `<div>${escapeHtml(value)}</div>`;

    if (state.interaction === 'pacman_confirm') {
      if (val === 'y' || val === 'yes' || val === '') { // Enter mặc định là Yes
        runPacmanPhase2(outputDiv);
      } else {
        outputDiv.innerHTML += `<div class="error">Abort.</div>`;
        state.interaction = null;
      }
    }

    input.value = '';
    content.scrollTop = content.scrollHeight;
  }









  // ======================== CÁC HÀM HỖ TRỢ UI ========================
  let tempSpan = null;

  function setupCursor(input) {
    input.style.caretColor = 'transparent';

    const cursor = input.nextElementSibling?.classList.contains('custom-cursor')
      ? input.nextElementSibling
      : createCursorElement(input.parentNode);

    if (!tempSpan) {
      tempSpan = document.createElement('span');
      Object.assign(tempSpan.style, {
        position: 'absolute',
        visibility: 'hidden',
        whiteSpace: 'pre',
        top: '-9999px',
        left: '-9999px',
        pointerEvents: 'none'
      });
      document.body.appendChild(tempSpan);
    }

    tempSpan.style.font = window.getComputedStyle(input).font;

    input.addEventListener('mousedown', handleMouseDown);
    input.addEventListener('mousemove', handleMouseMove);
    input.addEventListener('mouseup', handleMouseUp);

    input.addEventListener('keydown', handleKeyDown);
    input.addEventListener('input', handleInput);

    input.addEventListener('focus', () => cursor.style.opacity = '1');
    input.addEventListener('blur', () => cursor.style.opacity = '0');

    updateCursorPosition(input, cursor);
  }

  function handleMouseDown(e) {
    const input = e.target;
    const cursor = input.nextElementSibling;
    const rect = input.getBoundingClientRect();
    const x = e.clientX - rect.left;

    input.dataset.selectionStart = calculatePosition(input, x);
    setCursorPosition(input, cursor, x);
    input.dataset.selecting = "true";
  }

  function handleMouseMove(e) {
    const input = e.target;
    const cursor = input.nextElementSibling;

    if (input.dataset.selecting === "true") {
      const rect = input.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const endPos = calculatePosition(input, x);
      const startPos = parseInt(input.dataset.selectionStart);

      input.setSelectionRange(Math.min(startPos, endPos), Math.max(startPos, endPos));
      setCursorPosition(input, cursor, x);
    }
  }

  function handleMouseUp() {
    const input = event.target;
    const cursor = input.nextElementSibling;

    input.dataset.selecting = "false";
    updateCursorPosition(input, cursor);
  }

  function handleKeyDown(e) {
    const input = e.target;
    const cursor = input.nextElementSibling;

    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      requestAnimationFrame(() => updateCursorPosition(input, cursor));
    }
  }

  function handleInput() {
    const input = event.target;
    const cursor = input.nextElementSibling;

    requestAnimationFrame(() => updateCursorPosition(input, cursor));
  }

  function calculatePosition(input, clickX) {
    const text = input.value;
    let position = 0;

    for (let i = 0; i <= text.length; i++) {
      tempSpan.textContent = text.substring(0, i);
      const width = tempSpan.offsetWidth;

      if (clickX < width + 3) {
        position = i;
        break;
      }

      if (i === text.length) {
        position = text.length;
      }
    }

    return position;
  }

  function setCursorPosition(input, cursor, clickX) {
    const position = calculatePosition(input, clickX);
    input.setSelectionRange(position, position);
    updateCursorPosition(input, cursor);
  }

  function updateCursorPosition(input, cursor) {
    tempSpan.textContent = input.value.substring(0, input.selectionStart);
    cursor.style.left = `${tempSpan.offsetWidth}px`;
  }

  function createCursorElement(parent) {
    const cursor = document.createElement('span');
    cursor.className = 'custom-cursor';
    parent.appendChild(cursor);
    return cursor;
  }

  function handleTabClick() {
    clearAnimationFrames();

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    this.classList.add('active');

    document.querySelectorAll('.content-section').forEach(section => {
      section.classList.remove('active');
    });

    const tabName = this.getAttribute('data-tab');
    const section = document.getElementById(`${tabName}-content`);
    if (section) {
      section.classList.add('active');
      ContainerTitle.textContent = 'VanDung-dev@manjaro: ~/profile';
      startTypingAll();
    }
  }

  if (isMobileDevice()) {
    window.addEventListener('resize', handleMobileKeyboard);
  }

  function handleMobileKeyboard() {
    if (window.innerHeight < window.outerHeight * 0.7) {
      terminalContainer.style.height = `${window.innerHeight - 40}px`;
    } else {
      terminalContainer.style.height = '90vh';
    }
  }

  // ======================== HOẠT ẢNH ========================
  const commands = [
    "python --version ",
    "pip install -r requirements.txt ",
    "python main.py ",
    "git status ",
    "git add . ",
    "git commit -m 'Update profile' ",
    "git push ",
    "python chess_game.py ",
    "python discord_bot.py ",
    "python blockchain_demo.py ",
    "ls -la ",
    "cd projects/ ",
    "python --version "
  ];

  let animationFrameIds = [];

  function clearAnimationFrames() {
    animationFrameIds.forEach(id => { cancelAnimationFrame(id); });
    animationFrameIds = [];
    document.querySelectorAll('.command[data-animation-id]').forEach(el => {
      const id = el.dataset.animationId;
      if (id) {
        cancelAnimationFrame(id);
        delete el.dataset.animationId;
      }
    });
  }

  function startTypingAll() {
    clearAnimationFrames();
    const activeSection = document.querySelector('.content-section.active');
    if (!activeSection) return;

    activeSection.querySelectorAll('.command').forEach(commandEl => {
      const cursorEl = commandEl.querySelector('.cursor');
      if (cursorEl) animateCommand(commandEl);
    });
  }

  function animateCommand(commandElement) {
    let currentCommand = "";
    let charIndex = 0;
    let commandIndex = 0;
    let isDeleting = false;
    let isWaiting = false;
    let waitStart = 0;
    let lastTimestamp = 0;
    let animationFrameId = null;

    commandElement.innerHTML = `<span class="typed"></span><span class="cursor"></span>`;
    const typedSpan = commandElement.querySelector('.typed');

    function type(timestamp) {
      if (!lastTimestamp) lastTimestamp = timestamp;

      if (isWaiting) {
        if (timestamp - waitStart >= 1500) { // Giảm thời gian chờ xuống còn 1.5s để mượt hơn
          isWaiting = false;
          isDeleting = true;
          lastTimestamp = timestamp;
        }
        animationFrameId = requestAnimationFrame(type);
        return;
      }

      const elapsed = timestamp - lastTimestamp;
      const typingSpeed = isDeleting ? 20 : 40 + Math.random() * 30;

      if (elapsed >= typingSpeed) {
        const currentText = commands[commandIndex];
        if (!currentText) return;

        if (!isDeleting && !isWaiting && charIndex < currentText.length) {
          currentCommand += currentText.charAt(charIndex++);
        } else if (isDeleting && charIndex > 0) {
          currentCommand = currentCommand.slice(0, -1);
          charIndex--;
        }

        typedSpan.textContent = currentCommand;

        if (!isDeleting && !isWaiting && charIndex === currentText.length) {
          isWaiting = true;
          waitStart = timestamp;
        }

        if (isDeleting && charIndex === 0) {
          isDeleting = false;
          commandIndex = (commandIndex + 1) % commands.length;
        }

        lastTimestamp = timestamp;
      }

      animationFrameId = requestAnimationFrame(type);
    }

    // Hủy animation cũ nếu có
    if (commandElement.dataset.animationId) {
      cancelAnimationFrame(commandElement.dataset.animationId);
    }

    animationFrameId = requestAnimationFrame(type);
    commandElement.dataset.animationId = animationFrameId;
  }

  // ======================== QUẢN LÝ NGÔN NGỮ ========================
  function toggleLanguage() {
    const newLang = state.currentLanguage === 'vi' ? 'en' : 'vi';
    setLanguage(newLang);
  }

  function setLanguage(lang) {
    initLazyLoading()
    state.currentLanguage = lang;
    localStorage.setItem('language', lang);
    document.cookie = `language=${lang}; path=/; max-age=31536000`; // 1 năm

    document.querySelectorAll('.lang-content').forEach(content => {
      content.style.display = content.classList.contains(`lang-${lang}`) ? 'block' : 'none';
    });

    const languageIcon = document.querySelector('.language-toggle .language-icon');
    if (languageIcon) languageIcon.textContent = lang;

    if (state.isClosed || state.isMinimized) return;
    if (content.querySelector('#empty-content')) {
      content.innerHTML = TerminalLogic.createTerminalInputHTML();
      const input = content.querySelector('.terminal-input');
      if (input) {
        setupCursor(input);
        input.addEventListener('keydown', TerminalLogic.handleTerminalInput);
        input.focus();
      }
    }

    startTypingAll();
  }

  // ======================== XỬ LÝ LỖI ========================
  function handleAvatarError() {
    const parent = this.parentNode;
    this.style.display = 'none';

    if (!parent.querySelector('.avatar-fallback')) {
      const fallback = document.createElement('span');
      fallback.className = 'avatar-fallback';
      Object.assign(fallback.style, {
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '80px'
      });
      fallback.textContent = 'dev';
      parent.appendChild(fallback);
    }
  }

  // ======================== TẢI CHẬM (LAZY LOADING) ========================
  function initLazyLoading() {
    const lazyImages = document.querySelectorAll('img.lazy-load');

    if ('IntersectionObserver' in window) {
      const lazyImageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.onload = () => {
                img.classList.add('loaded');
              };
              img.classList.remove('lazy-load');
              lazyImageObserver.unobserve(img);
            }
          }
        });
      }, {
        rootMargin: '100px 0px', // Load ảnh trước khi chúng xuất hiện 100px
        threshold: 0.01
      });

      lazyImages.forEach(img => {
        lazyImageObserver.observe(img);
      });
    } else {
      // Fallback cho trình duyệt không hỗ trợ IntersectionObserver
      lazyImages.forEach(img => {
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.classList.remove('lazy-load');
        }
      });
    }
  }

  // ======================== QUẢN LÝ GIAO DIỆN (THEME) ========================
  function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'default';
    setTheme(savedTheme);

    createThemePopup();
  }

  function setTheme(themeName) {
    const themeClasses = ['theme-default', 'theme-blue', 'theme-red', 'theme-yellow', 'theme-green'];
    document.body.classList.remove(...themeClasses);

    document.body.classList.add(`theme-${themeName}`);

    localStorage.setItem('theme', themeName);

    document.querySelectorAll('.theme-option').forEach(option => {
      option.classList.toggle('active', option.classList.contains(`theme-${themeName}`));
    });
  }

  function toggleThemePopup(e) {
    e.stopPropagation();
    const popup = document.getElementById('theme-popup');
    popup.style.display = popup.style.display === 'flex' ? 'none' : 'flex';
  }

  function createThemePopup() {
    let themePopup = document.getElementById('theme-popup');

    if (!themePopup) {
      themePopup = document.createElement('div');
      themePopup.className = 'theme-selector-popup';
      themePopup.id = 'theme-popup';
      document.body.appendChild(themePopup);
    }

    themePopup.innerHTML = '';

    // Thêm nút đóng
    const closeBtn = document.createElement('div');
    closeBtn.className = 'close-theme-popup';
    closeBtn.id = 'close-theme-popup';
    closeBtn.innerHTML = '<i class="nf nf-md-close"></i>';
    themePopup.appendChild(closeBtn);

    // Tạo container cho các ô màu
    const themesContainer = document.createElement('div');
    themesContainer.className = 'themes-container';
    themesContainer.style.display = 'flex';
    themesContainer.style.flexWrap = 'wrap';
    themesContainer.style.justifyContent = 'center';
    themesContainer.style.gap = '12px';
    themesContainer.style.marginTop = '15px';
    themesContainer.style.width = '100%';

    const themes = ['default', 'blue', 'red', 'yellow', 'green'];

    themes.forEach(theme => {
      const option = document.createElement('div');
      option.className = `theme-option theme-${theme}`;
      option.title = theme.charAt(0).toUpperCase() + theme.slice(1);
      option.addEventListener('click', () => {
        setTheme(theme);
        themePopup.style.display = 'none';
      });
      themesContainer.appendChild(option);
    });

    themePopup.appendChild(themesContainer);

    themePopup.style.display = 'none';

    // Thêm sự kiện cho nút đóng
    closeBtn.addEventListener('click', () => {
      themePopup.style.display = 'none';
    });

    // Đóng popup khi click bên ngoài
    document.addEventListener('click', (e) => {
      if (e.target.closest('.theme-selector-popup') || e.target.closest('#theme-selector')) return;
      if (themePopup.style.display === 'flex') {
        themePopup.style.display = 'none';
      }
    });

    const currentTheme = localStorage.getItem('theme') || 'default';
    document.querySelectorAll('.theme-option').forEach(option => {
      if (option.classList.contains(`theme-${currentTheme}`)) {
        option.classList.add('active');
      }
    });
  }

  // ======================== CHỨC NĂNG KÉO THẢ ========================
  let isDragging = false;
  let dragStartX, dragStartY;
  let initialContainerLeft, initialContainerTop;

  // Hàm kiểm tra thiết bị có phải là mobile/tablet không
  function isMobileDevice() {
    return (typeof window.orientation !== "undefined") ||
      (navigator.userAgent.indexOf('IEMobile') !== -1) ||
      (window.innerWidth <= 1024);
  }

  function startDrag(e) {
    // Không kéo thả trên thiết bị di động
    if (isMobileDevice()) return;

    if (state.isMaximized) return;

    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;

    const rect = terminalContainer.getBoundingClientRect();
    initialContainerLeft = rect.left;
    initialContainerTop = rect.top;

    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);

    terminalContainer.style.cursor = 'grabbing';
    terminalContainer.style.userSelect = 'none';
  }

  function onDrag(e) {
    if (!isDragging) return;

    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    const newLeft = initialContainerLeft + dx;
    const newTop = initialContainerTop + dy;

    terminalContainer.style.left = `${newLeft}px`;
    terminalContainer.style.top = `${newTop}px`;
    terminalContainer.style.position = 'fixed';
    terminalContainer.style.margin = '0';
    if (!terminalContainer.classList.contains('dragging')) {
      terminalContainer.classList.add('dragging');
    }
  }

  function stopDrag() {
    isDragging = false;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);

    terminalContainer.style.cursor = '';
    terminalContainer.style.userSelect = '';
    terminalContainer.classList.remove('dragging');
  }

  // ======================== KHỞI CHẠY ỨNG DỤNG ========================
  initialize();
  initLazyLoading();



  // Thêm hàm xử lý lỗi hình ảnh
  function handleImageError(img) {
    img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="%23cccccc"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
    img.alt = 'Hình ảnh không khả dụng';
  }

  function handleImageLoad(img) {
    img.classList.add('loaded');
  }

  // Cập nhật hàm loadImage
  function loadImage(img) {
    const realSrc = img.getAttribute('data-src');
    if (realSrc) {
      img.src = realSrc;
      img.onload = () => handleImageLoad(img);
      img.onerror = () => handleImageError(img);
    }
  }

  // Thêm hỗ trợ điều hướng bàn phím
  function setupKeyboardNavigation() {
    // Điều hướng tab bằng phím mũi tên
    document.addEventListener('keydown', (e) => {
      // Chỉ xử lý nếu focus không ở trong trường input
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }

      const tabs = document.querySelectorAll('.tab');
      const activeTab = document.querySelector('.tab.active');
      let currentIndex = Array.from(tabs).indexOf(activeTab);

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        currentIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        tabs[currentIndex].click();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        currentIndex = (currentIndex + 1) % tabs.length;
        tabs[currentIndex].click();
      } else if (e.key === 'Home') {
        e.preventDefault();
        tabs[0].click();
      } else if (e.key === 'End') {
        e.preventDefault();
        tabs[tabs.length - 1].click();
      }
    });
  }

});