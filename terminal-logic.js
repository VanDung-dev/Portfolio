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
        },
        content: null // Lưu trữ nội dung đã tải tại đây
    };

    const startTime = Date.now();
    let animationFrameIds = [];

    function init(dependencies) {
        config = { ...config, ...dependencies };
    }

    function loadContent(data) {
        config.content = data;
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

    // Trình trợ giúp để lấy nội dung chuỗi từ mảng hoặc chuỗi
    function getContentString(content) {
        if (!content) return '';
        if (Array.isArray(content)) return content.join('\n');
        return content;
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
                        <input type="text" class="terminal-input" placeholder="cd portfolio/ hoặc help" autofocus>
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
                    <input type="text" class="terminal-input" placeholder="cd portfolio/ or help" autofocus>
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
        if (command === 'cd portfolio/') {
            config.ui.content.innerHTML = config.state.originalContent;
            config.ui.tabsContainer.style.display = 'flex';
            config.ui.containerTitle.textContent = 'VanDung-dev@manjaro: ~/portfolio';

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
            if (config.content && config.content.neofetch) {
                const neofetchContent = getContentString(config.content.neofetch);
                outputDiv.innerHTML += neofetchContent.replace('{{uptime}}', uptime);
            } else {
                outputDiv.innerHTML += `<div class="error">Neofetch content not loaded</div>`;
            }
        } else if (command === 'ls' || command === 'ls -la' || command === 'll') {
            outputDiv.innerHTML += getContentString(config.content?.ls) || 'ls';
        } else if (command === 'clear') {
            outputDiv.innerHTML = '';
        } else if (command === 'python --version') {
            outputDiv.innerHTML += getContentString(config.content?.pythonVersion) || 'Python 3.12.1';
        } else if (command === 'git status') {
            outputDiv.innerHTML += getContentString(config.content?.gitStatus) || 'On branch main';
        } else if (command === 'sudo pacman -Syu') {
            runPacmanPhase1(outputDiv, input);
        } else if (command === 'help') {
            outputDiv.innerHTML += config.state.currentLanguage === 'vi'
                ? (getContentString(config.content?.help?.vi) || 'Help')
                : (getContentString(config.content?.help?.en) || 'Help');
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

        const lines = config.content?.pacman?.phase1 || [];

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

        const lines = config.content?.pacman?.phase2 || [];

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

    return {
        init,
        loadContent,
        handleTerminalInput,
        createTerminalInputHTML
    };
})();
