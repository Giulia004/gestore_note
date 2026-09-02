(function () {
    'use strict';

    var CHAT_URL = typeof GN_Chat_Live !== 'undefined' ? GN_Chat_Live.chat_url : (typeof GN_Data !== 'undefined' ? GN_Data.restUrl + '/chat' : '');

    document.addEventListener('DOMContentLoaded', function () {
        initChat();
    });

    function initChat() {
        var widget = document.getElementById('gestore-note-chat-widget');
        var toggleBtn = document.getElementById('chat-toggle-btn');
        var containerMsg = document.getElementById('chat-messaggi-container');
        var inputWrapper = containerMsg ? containerMsg.nextElementSibling : null;
        var inputTesto = document.getElementById('chat-input-testo');
        var btnInvia = document.getElementById('chat-invia-btn');

        if (!widget || !toggleBtn || !containerMsg || !inputWrapper || !inputTesto || !btnInvia) return;

        // Apertura e chiusura della chat al click sul pulsante o sull'icona
        toggleBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleChatState();
        });

        // Permette di aprire la chat cliccando anche sul widget chiuso se necessario
        widget.addEventListener('click', function (e) {
            if (!widget.classList.contains('chat-open') && e.target !== inputTesto && e.target !== btnInvia) {
                toggleChatState();
            }
        });

        function toggleChatState() {
            var isOpen = widget.classList.contains('chat-open');

            if (!isOpen) {
                // APRI LA CHAT
                widget.classList.add('chat-open');
                containerMsg.style.display = 'block';
                inputWrapper.style.display = 'flex';
                widget.style.width = '300px';
                widget.style.borderRadius = '12px';
                widget.style.height = 'auto';
                toggleBtn.textContent = '✕';
                caricaMessaggi();
                inputTesto.focus();
            } else {
                // CHIUDI LA CHAT
                widget.classList.remove('chat-open');
                containerMsg.style.display = 'none';
                inputWrapper.style.display = 'none';
                widget.style.width = '58px';
                widget.style.borderRadius = '50px';
                widget.style.height = '58px';
                toggleBtn.textContent = '💬';
            }
        }

        // Funzione di invio messaggio
        var inviaMsg = function () {
            var testo = inputTesto.value.trim();
            if (!testo) return;

            var apiObj = window.GN_API || window.GN_Api;
            if (!apiObj || typeof apiObj.fetch !== 'function') {
                console.error("Errore: GN_API non disponibile.");
                return;
            }

            apiObj.fetch(CHAT_URL, {
                method: 'POST',
                body: JSON.stringify({ testo: testo })
            }).then(function () {
                inputTesto.value = '';
                caricaMessaggi();
            }).catch(console.error);
        };

        btnInvia.addEventListener('click', function (e) {
            e.preventDefault();
            inviaMsg();
        });

        inputTesto.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                inviaMsg();
            }
        });

        caricaMessaggi();
        setInterval(function () {
            if (widget.classList.contains('chat-open')) {
                caricaMessaggi();
            }
        }, 5000);
    }

    function caricaMessaggi() {
        var widget = document.getElementById('gestore-note-chat-widget');
        if (!widget || !widget.classList.contains('chat-open')) return;

        var apiObj = window.GN_API || window.GN_Api;
        if (!apiObj || typeof apiObj.fetch !== 'function' || !CHAT_URL) return;

        apiObj.fetch(CHAT_URL).then(function (messaggi) {
            var container = document.getElementById('chat-messaggi-container');
            if (!container) return;

            container.innerHTML = '';
            if (Array.isArray(messaggi)) {
                var currentUser = (typeof GN_Data !== 'undefined' && GN_Data.currentUser) ? GN_Data.currentUser : '';

                messaggi.forEach(function (m) {
                    var div = document.createElement('div');
                    if (m.autore === currentUser || m.is_current_user) {
                        div.className = 'tuo-messaggio';
                    }
                    div.innerHTML = '<span style="color: #64748b; font-size: 10px;">[' + m.data + ']</span> <strong>' + escapeHtml(m.autore) + ':</strong> ' + escapeHtml(m.testo);
                    container.appendChild(div);
                });
                container.scrollTop = container.scrollHeight;
            }
        }).catch(console.error);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
})();