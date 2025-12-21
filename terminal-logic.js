const TerminalLogic = (function () {
    let config = {
        state: null,
        ui: {
            content: null,
            tabsContainer: null,
            containerTitle: null
        },
        callbacks: {
            initLazyLoading: null,
            updateAllContent: null,
            startTypingAll: null,
            handleError: null
        }
    };

    const startTime = Date.now();
    let animationFrameIds = [];

    function init(dependencies) {
        config = { ...config, ...dependencies };
        // Bind methods if necessary, though simpler to just use config object
    }

    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function isValidCommand(command) {
        // Chỉ cho phép các ký tự an toàn
        const safeChars = /^[a-zA-Z0-9\s\-_\/\.\?\&\=\+\*\@\#\!\,:;'"\(\)\{\}\[\]\^\$\|~`]+$/;
        return safeChars.test(command) && command.length <= 100;
    }

    function createTerminalInputHTML() {
        return config.state.currentLanguage === 'vi'
            ? createTerminalInputHTML_vi()
            : createTerminalInputHTML_en();
    }

    function createTerminalInputHTML_vi() {
        return `
      <div class="content-section active" id="empty-content">
        <div class="output">
          <div class="command-output"></div>
          <div class="output-line">
            <div class="zsh-unified">
              <span class="zsh-icon manjaro-icon-bg">
                <i class="nf nf-linux-manjaro"></i>
              </span>
              <span class="zsh-file manjaro-file-bg">
                <i class="nf nf-fa-home"></i>~
              </span>
            </div>
            <div class="input-container">
              <span class="input-prompt"></span>
              <input type="text" class="terminal-input" placeholder="cd profile/ hoặc help" autofocus>
              <span class="custom-cursor"></span>
            </div>
          </div>
        </div>
      </div>`;
    }

    function createTerminalInputHTML_en() {
        return `
    <div class="content-section active" id="empty-content">
      <div class="output">
        <div class="command-output"></div>
        <div class="output-line">
          <div class="zsh-unified">
            <span class="zsh-icon manjaro-icon-bg">
              <i class="nf nf-linux-manjaro"></i>
            </span>
            <span class="zsh-file manjaro-file-bg">
              <i class="nf nf-fa-home"></i>~
            </span>
          </div>
          <div class="input-container">
            <span class="input-prompt"></span>
            <input type="text" class="terminal-input" placeholder="cd profile/ or help" autofocus>
            <span class="custom-cursor"></span>
          </div>
        </div>
      </div>
    </div>`;
    }

    function handleTerminalInput(event) {
        try {
            if (event.key !== 'Enter') return;

            const input = event.target;
            const command = input.value.trim();
            const outputDiv = config.ui.content.querySelector('.command-output');

            // Xử lý khi đang trong chế độ tương tác (ví dụ: đang chạy pacman)
            if (config.state.interaction) {
                handleInteractiveInput(command, outputDiv, input);
                return;
            }

            if (!command) return;

            // Tạo một div dòng lệnh mới để hiển thị lại lệnh vừa nhập
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
                config.ui.content.scrollTop = config.ui.content.scrollHeight;
                return;
            }

            executeCommand(command, outputDiv, input);

            input.value = '';
            config.ui.content.scrollTop = config.ui.content.scrollHeight;
            input.focus();
        } catch (error) {
            if (config.callbacks.handleError) {
                config.callbacks.handleError(error, 'terminal input handler');
            } else {
                console.error(error);
            }
        }
    }

    function handleInteractiveInput(value, outputDiv, input) {
        const val = value.toLowerCase();

        // Hiển thị lại lựa chọn của người dùng
        outputDiv.innerHTML += `<div>${escapeHtml(value)}</div>`;

        if (config.state.interaction === 'pacman_confirm') {
            if (val === 'y' || val === 'yes' || val === '') { // Enter mặc định là Yes
                runPacmanPhase2(outputDiv);
            } else {
                outputDiv.innerHTML += `<div class="error">Abort.</div>`;
                config.state.interaction = null;
            }
        }

        input.value = '';
        config.ui.content.scrollTop = config.ui.content.scrollHeight;
    }

    function executeCommand(command, outputDiv, input) {
        if (command === 'cd profile/') {
            config.ui.content.innerHTML = config.state.originalContent;
            config.ui.tabsContainer.style.display = 'flex';
            config.ui.containerTitle.textContent = 'VanDung-dev@manjaro: ~/profile';

            config.callbacks.initLazyLoading();
            config.callbacks.updateAllContent();

            const firstTab = document.querySelector('.tab');
            if (firstTab) {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                firstTab.classList.add('active');
                document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
                const section = document.querySelector('.content-section');
                if (section) {
                    section.classList.add('active');
                    config.callbacks.startTypingAll();
                }
            }
        } else if (command === 'neofetch') {
            const uptime = calculateUptime();
            outputDiv.innerHTML += `
        <div class="neofetch-output">
  ██████████████████  ████████  VanDung-dev@manjaro 
  ██████████████████  ████████  ----------------- 
  ██████████████████  ████████  OS: Manjaro Linux x86_64 
  ██████████████████  ████████  Host: ASUS TUF Gaming A16 FA617NS
  ████████            ████████  Kernel: 6.6.10-1-MANJARO 
  ████████  ████████  ████████  Uptime: ${uptime}
  ████████  ████████  ████████  Packages: 1250 (pacman), 12 (flatpak) 
  ████████  ████████  ████████  Shell: zsh 5.9 
  ████████  ████████  ████████  Resolution: 1920x1080 
  ████████  ████████  ████████  DE: GNOME 45.2 
  ████████  ████████  ████████  WM: Mutter 
  ████████  ████████  ████████  WM Theme: Adwaita 
  ████████  ████████  ████████  Theme: adw-gtk3-dark [GTK2/3] 
  ████████  ████████  ████████  Icons: Papirus-Dark-Maia [GTK2/3] 
                                Terminal: gnome-terminal 
                                CPU: AMD Ryzen 7 7735HS (16) @ 4.75GHz 
                                GPU: AMD ATI Radeon RX 7600S 
                                Memory: 6200MiB / 16384MiB 
        </div>`;
        } else if (command === 'ls' || command === 'ls -la' || command === 'll') {
            outputDiv.innerHTML += `
      <div class="ls-output">
        <span class="dir">profile</span> <span class="file">README.md</span>
      </div>`;
        } else if (command === 'clear') {
            outputDiv.innerHTML = '';
        } else if (command === 'python --version') {
            outputDiv.innerHTML += `<div class="python-version-output">Python 3.12.1</div>`;
        } else if (command === 'git status') {
            outputDiv.innerHTML += `
      <div class="git-status-output">
      On branch main<br>
      Your branch is up to date with 'origin/main'.<br>
      nothing to commit, working tree clean
      </div>`;
        } else if (command === 'sudo pacman -Syu') {
            runPacmanPhase1(outputDiv, input);
        } else if (command === 'help') {
            outputDiv.innerHTML += config.state.currentLanguage === 'vi' ? helpOutputVi() : helpOutputEn();
        } else {
            outputDiv.innerHTML += `<div class="error">zsh: command not found: ${escapeHtml(command)}</div>`;
        }
    }

    function calculateUptime() {
        const now = Date.now();
        const diff = now - startTime;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);

        let uptimeStr = "";
        if (hours > 0) uptimeStr += `${hours} hours, `;
        if (mins > 0) uptimeStr += `${mins} mins, `;
        uptimeStr += `${secs} secs`;
        return uptimeStr;
    }

    function runPacmanPhase1(outputDiv, input) {
        outputDiv.innerHTML += `<div class="updating-output" id="updating-output-${Date.now()}"></div>`;
        const outputId = outputDiv.lastElementChild.id;

        const lines = [
            '[sudo] password for VanDung-dev: **********',
            ':: Synchronizing package databases...',
            ' core is up to date',
            ' extra is up to date',
            ' community is up to date',
            ' multilib is up to date',
            ':: Starting full system upgrade...',
            ' resolving dependencies...',
            ' looking for conflicting packages...',
            ' Packages (5) linux-6.6.10  python-3.12.1  zsh-5.9.1  nano-7.2  git-2.44.0',
            '',
            'Total Download Size:    145.20 MiB',
            'Total Installed Size:   512.50 MiB',
            'Net Upgrade Size:       12.30 MiB',
            ''
        ];

        let idx = 0;
        function printNext() {
            const output = document.getElementById(outputId);
            if (!output) return;

            if (idx < lines.length) {
                output.innerHTML += lines[idx] + '<br>';
                idx++;
                config.ui.content.scrollTop = config.ui.content.scrollHeight;
                setTimeout(printNext, Math.random() * 200 + 50);
            } else {
                // Kết thúc phase 1, hỏi xác nhận
                output.innerHTML += ':: Proceed with installation? [Y/n] ';
                config.ui.content.scrollTop = config.ui.content.scrollHeight;
                config.state.interaction = 'pacman_confirm';
                input.focus();
            }
        }
        printNext();
    }

    function runPacmanPhase2(outputDiv) {
        outputDiv.innerHTML += `<div class="updating-output" id="updating-output-phase2-${Date.now()}"></div>`;
        const outputId = outputDiv.lastElementChild.id;

        const lines = [
            ':: Retrieving packages...',
            ' linux-6.6.10-1-x86_64     120.5 MiB  12.5 MiB/s  00:10 [######################] 100%',
            ' python-3.12.1-1-x86_64     20.2 MiB  10.1 MiB/s  00:02 [######################] 100%',
            '(5/5) checking keys in keyring                         [######################] 100%',
            '(5/5) checking package integrity                       [######################] 100%',
            '(5/5) loading package files                            [######################] 100%',
            '(5/5) checking for file conflicts                      [######################] 100%',
            '(5/5) checking available disk space                    [######################] 100%',
            ':: Processing package changes...',
            '(1/5) upgrading linux                                  [######################] 100%',
            '(2/5) upgrading python                                 [######################] 100%',
            '(3/5) upgrading zsh                                    [######################] 100%',
            '(4/5) upgrading nano                                   [######################] 100%',
            '(5/5) upgrading git                                    [######################] 100%',
            ':: Running post-transaction hooks...',
            '(1/3) Arming ConditionNeedsUpdate...',
            '(2/3) Updating icon theme caches...',
            '(3/3) Updating the desktop file MIME type cache...',
            '',
            'System updated successfully!'
        ];

        let idx = 0;
        config.state.interaction = null; // Clear interaction state

        function printNext() {
            const output = document.getElementById(outputId);
            if (!output) return;

            if (idx < lines.length) {
                output.innerHTML += lines[idx] + '<br>';
                idx++;
                config.ui.content.scrollTop = config.ui.content.scrollHeight;
                setTimeout(printNext, Math.random() * 100 + 30);
            }
        }
        printNext();
    }

    function helpOutputVi() {
        return `<div class="help-output">
      <strong>Các lệnh có thể dùng:</strong>
      <ul>
        <li><code>cd profile/</code> - Chuyển thư mục profile</li>
        <li><code>ls</code> - Liệt kê file/thư mục</li>
        <li><code>clear</code> - Xóa màn hình terminal</li>
        <li><code>neofetch</code> - Hiện thông tin hệ thống</li>
        <li><code>python --version</code> - Xem phiên bản Python</li>
        <li><code>help</code> - Hiện hướng dẫn này</li>
      </ul>
    </div>`;
    }

    function helpOutputEn() {
        return `<div class="help-output">
      <strong>Available Commands:</strong>
      <ul>
        <li><code>cd</code> - Change directory</li>
        <li><code>ls</code> - List files</li>
        <li><code>clear</code> - Clear the terminal</li>
        <li><code>neofetch</code> - Display system information</li>
        <li><code>python --version</code> - Show Python version</li>
        <li><code>help</code> - Show this help message</li>
      </ul>
    </div>`;
    }

    return {
        init,
        handleTerminalInput,
        createTerminalInputHTML
    };
})();
