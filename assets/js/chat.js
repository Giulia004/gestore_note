document.addEventListener('DOMContentLoaded', function () {
    const chatMessages = document.getElementById('gestore-note-chat-messages');
    const chatForm = document.getElementById('gestore-note-chat-form');
    const chatInput = document.getElementById('chat-input-text');
    const statusText = document.getElementById('chat-status-text');
    const mentionsDropdown = document.getElementById('chat-mentions-dropdown');

    // Elementi per la gestione degli allegati
    const fileInput = document.getElementById('chat-file-input');
    const attachBtn = document.getElementById('chat-attach-btn');
    const filePreview = document.getElementById('chat-file-preview');
    const fileNameSpan = document.getElementById('chat-file-name');
    const removeFileBtn = document.getElementById('chat-remove-file');

    if (!chatMessages || !chatForm || !chatInput) return;

    let isFirstLoad = true;
    let noteCacheChat = [];
    let utentiChat = [];
    let lastRenderedMessagesSignature = '';
    let selectedFile = null;

    if (attachBtn && fileInput) {
        attachBtn.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                selectedFile = fileInput.files[0];
                if (fileNameSpan) fileNameSpan.textContent = selectedFile.name;
                if (filePreview) filePreview.style.display = 'flex';
            }
        });
    }

    if (removeFileBtn) {
        removeFileBtn.addEventListener('click', () => {
            selectedFile = null;
            if (fileInput) fileInput.value = '';
            if (filePreview) filePreview.style.display = 'none';
        });
    }

    // Caricamento note
    function caricaNotePerMentions() {
        fetch(gestoreNoteChat.root.replace('/chat', '/note'), {
            method: 'GET',
            headers: { 'X-WP-Nonce': gestoreNoteChat.nonce }
        })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) noteCacheChat = data;
            })
            .catch(err => console.error('Errore recupero note per chat:', err));
    }

    // Caricamento utenti
    function caricaUtentiMentions() {
        fetch(gestoreNoteChat.root.replace('/chat', '/users'), {
            method: 'GET',
            headers: { 'X-WP-Nonce': gestoreNoteChat.nonce }
        })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) utentiChat = data;
            })
            .catch(err => console.error("Errore recupero utenti chat: ", err));
    }

    function caricaMessaggi() {
        fetch(gestoreNoteChat.root, {
            method: 'GET',
            headers: { 'X-WP-Nonce': gestoreNoteChat.nonce }
        })
            .then(response => {
                if (!response.ok) throw new Error('Errore di connessione');
                return response.json();
            })
            .then(data => {
                if (statusText) statusText.textContent = 'Connesso';

                if (Array.isArray(data)) {
                    if (data.length === 0) {
                        const emptyHtml = `
                    <div class="chat-loading-state" style="color: #646970; text-align: center;">
                        💬 Nessun messaggio nella chat. Inizia la conversazione con il team!
                    </div>`;

                        if (chatMessages.innerHTML !== emptyHtml) {
                            chatMessages.innerHTML = emptyHtml;
                        }
                        lastRenderedMessagesSignature = '';
                        return;
                    }

                    let html = '';
                    let lastDayKey = null;

                    data.forEach(msg => {
                        const isSelf = (String(msg.author_id) === String(gestoreNoteChat.currentUserId)) || (msg.author === gestoreNoteChat.currentUserName);
                        const selfClass = isSelf ? ' self' : '';

                        let attachmentHtml = '';
                        if (msg.attachment_url) {
                            const fileName = msg.attachment_url.split('/').pop();
                            attachmentHtml = `
                            <div class="chat-message-attachment">
                                <a href="${escapeHtml(msg.attachment_url)}" target="_blank" title="Scarica allegato">
                                    📎 ${escapeHtml(fileName)}
                                </a>
                            </div>
                        `;
                        }

                        const dataMsg = new Date(msg.date);
                        const currentDayKey = Number.isNaN(dataMsg.getTime()) ? '' : `${dataMsg.getFullYear()}-${String(dataMsg.getMonth() + 1).padStart(2, '0')}-${String(dataMsg.getDate()).padStart(2, '0')}`;
                        const shouldShowDateDivider = currentDayKey && currentDayKey !== lastDayKey;

                        if (shouldShowDateDivider) {
                            html += `<div class="chat-date-divider">${formattaDataBadgeChat(dataMsg)}</div>`;
                            lastDayKey = currentDayKey;
                        }

                        const oraHtml = isSelf ? `<span class="msg-time">${formattaOraChat(dataMsg)}</span>` : '';

                        html += `
                        <div class="chat-message${selfClass}">
                            <div class="chat-message-header">
                                <span class="msg-author">${escapeHtml(msg.author)}</span>
                            </div>
                            <span class="msg-text">${formattaTestoChat(msg.text)}</span>
                            ${attachmentHtml}
                            ${oraHtml}
                        </div>
                    `;
                    });

                    const signature = data.map(msg => `${msg.id || ''}|${msg.author || ''}|${msg.text || ''}|${msg.date || ''}|${msg.attachment_url || ''}`).join('::');
                    const shouldScrollToBottom = isFirstLoad || (chatMessages.scrollHeight - chatMessages.clientHeight <= chatMessages.scrollTop + 80);

                    if (lastRenderedMessagesSignature !== signature) {
                        chatMessages.innerHTML = html;
                        lastRenderedMessagesSignature = signature;

                        if (shouldScrollToBottom) {
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        }

                        isFirstLoad = false;
                    }
                }
            })
            .catch(error => {
                console.error('Errore caricamento chat:', error);
                if (statusText) statusText.textContent = 'Disconnesso (Tentativo in corso...)';
            });
    }

    // Gestione input e autocompletamento misto
    chatInput.addEventListener('input', function () {
        const val = chatInput.value;
        const cursorPos = chatInput.selectionStart;

        const textBeforeCursor = val.substring(0, cursorPos);
        const match = textBeforeCursor.match(/@([^\s]*)$/);

        if (match) {
            const query = match[1].toLowerCase();

            const noteFiltrate = noteCacheChat.filter(n =>
                String(n.id).includes(query) || (n.titolo && n.titolo.toLowerCase().includes(query))
            ).slice(0, 4);

            const utentiFiltrati = utentiChat.filter(u =>
                u.name && u.name.toLowerCase().includes(query)
            ).slice(0, 4);

            if (noteFiltrate.length > 0 || utentiFiltrati.length > 0) {
                mostraDropdownMentionsMisto(noteFiltrate, utentiFiltrati, match.index);
            } else {
                nascondiDropdownMentions();
            }
        } else {
            nascondiDropdownMentions();
        }
    });

    function mostraDropdownMentionsMisto(note, utenti, matchIndex) {
        if (!mentionsDropdown) return;
        mentionsDropdown.innerHTML = '';

        if (note.length > 0) {
            const titoloNote = document.createElement('div');
            titoloNote.className = 'chat-mention-section-title';
            titoloNote.textContent = 'Note / Task';
            mentionsDropdown.appendChild(titoloNote);

            note.forEach(nota => {
                const item = document.createElement('div');
                item.className = 'chat-mention-item';
                item.innerHTML = `<span><strong>#${nota.id}</strong> - ${escapeHtml(nota.titolo)}</span> <span class="note-id">${nota.stato || ''}</span>`;
                item.addEventListener('click', () => selezionaNotaMention(nota, matchIndex));
                mentionsDropdown.appendChild(item);
            });
        }

        if (utenti.length > 0) {
            const titoloUtenti = document.createElement('div');
            titoloUtenti.className = 'chat-mention-section-title';
            titoloUtenti.textContent = 'Utenti';
            mentionsDropdown.appendChild(titoloUtenti);

            utenti.forEach(utente => {
                const item = document.createElement('div');
                item.className = 'chat-mention-item';
                item.innerHTML = `<span>👤 <strong>@${escapeHtml(utente.name)}</strong></span>`;
                item.addEventListener('click', () => selezionaUtenteMention(utente, matchIndex));
                mentionsDropdown.appendChild(item);
            });
        }

        mentionsDropdown.style.display = 'block';
    }

    function nascondiDropdownMentions() {
        if (mentionsDropdown) mentionsDropdown.style.display = 'none';
    }

    function selezionaNotaMention(nota, matchIndex) {
        const val = chatInput.value;
        const cursorPos = chatInput.selectionStart;
        const textBefore = val.substring(0, matchIndex);
        const textAfter = val.substring(cursorPos);

        const tagText = `@${nota.titolo} `;
        chatInput.value = textBefore + tagText + textAfter;

        nascondiDropdownMentions();
        chatInput.focus();
        const newCursorPos = textBefore.length + tagText.length;
        chatInput.setSelectionRange(newCursorPos, newCursorPos);
    }

    function selezionaUtenteMention(utente, matchIndex) {
        const val = chatInput.value;
        const cursorPos = chatInput.selectionStart;
        const textBefore = val.substring(0, matchIndex);
        const textAfter = val.substring(cursorPos);

        const tagText = `@${utente.name} `;
        chatInput.value = textBefore + tagText + textAfter;

        nascondiDropdownMentions();
        chatInput.focus();
        const newCursorPos = textBefore.length + tagText.length;
        chatInput.setSelectionRange(newCursorPos, newCursorPos);
    }

    function formattaDataBadgeChat(data) {
        if (Number.isNaN(data.getTime())) return '';
        return `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
    }

    function formattaOraChat(data) {
        if (Number.isNaN(data.getTime())) return '';
        return new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit', hour12: false }).format(data);
    }

    // Formattazione pulita degli ID
    function formattaTestoChat(testo) {
        if (!testo) return '';
        let escaped = escapeHtml(testo);

        escaped = escaped.replace(/@([a-zA-Z0-9àèéìòùÀÈÉÌÒÙ_\-\s]+)/g, function (match, nomeTrovato) {
            const notaTrovata = noteCacheChat.find(n => n.titolo && n.titolo.toLowerCase() === nomeTrovato.trim().toLowerCase());
            if (notaTrovata) {
                return `<a href="#" class="chat-note-badge" data-note-id="${notaTrovata.id}" title="Apri task">📌 #${notaTrovata.id} - ${notaTrovata.titolo}</a>`;
            }
            return `<span class="chat-user-badge">@${nomeTrovato.trim()}</span>`;
        });

        return escaped;
    }

    chatMessages.addEventListener('click', function (e) {
        const badge = e.target.closest('.chat-note-badge');
        if (!badge) return;
        e.preventDefault();

        const noteId = badge.getAttribute('data-note-id');
        if (noteId) {
            window.location.href = `admin.php?page=gestore-note-bacheca&note_id=${noteId}`;
        } else {
            window.location.href = 'admin.php?page=gestore-note-bacheca';
        }
    });

    chatForm.addEventListener('submit', function (e) {
        e.preventDefault();
        nascondiDropdownMentions();
        const testo = chatInput.value.trim();
        if (!testo && !selectedFile) return;

        chatInput.disabled = true;

        const formData = new FormData();
        formData.append('testo', testo);
        if (selectedFile) formData.append('file', selectedFile);

        fetch(gestoreNoteChat.root, {
            method: 'POST',
            headers: { 'X-WP-Nonce': gestoreNoteChat.nonce },
            body: formData
        })
            .then(response => response.json())
            .then(res => {
                if (res.success || res.id) {
                    chatInput.value = '';
                    selectedFile = null;
                    if (fileInput) fileInput.value = '';
                    if (filePreview) filePreview.style.display = 'none';

                    caricaMessaggi();
                    setTimeout(() => {
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }, 100);
                } else {
                    alert('Errore durante l\'invio del messaggio.');
                }
            })
            .catch(error => {
                console.error('Errore invio:', error);
                alert('Errore di rete durante l\'invio.');
            })
            .finally(() => {
                chatInput.disabled = false;
                chatInput.focus();
            });
    });

    function escapeHtml(text) {
        if (!text) return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.toString().replace(/[&<>"']/g, m => map[m]);
    }

    caricaNotePerMentions();
    caricaUtentiMentions();
    caricaMessaggi();
    setInterval(caricaMessaggi, 15000);
});