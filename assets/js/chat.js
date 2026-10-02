document.addEventListener('DOMContentLoaded', function () {
    const chatMessages = document.getElementById('gestore-note-chat-messages');
    const chatForm = document.getElementById('gestore-note-chat-form');
    const chatInput = document.getElementById('chat-input-text');
    const statusText = document.getElementById('chat-status-text');
    const mentionsDropdown = document.getElementById('chat-mentions-dropdown');
    const createTaskModal = document.getElementById('chat-create-task-modal');
    const createTaskForm = document.getElementById('chat-create-task-form');
    const taskCategory = document.getElementById('chat-task-category');
    const taskAssignee = document.getElementById('chat-task-assignee');
    const taskFeedback = document.getElementById('chat-task-feedback');
    const taskSubmitButton = document.getElementById('chat-task-submit');
    const taskCancelButton = document.getElementById('chat-task-cancel');

    // Elementi per la gestione degli allegati
    const fileInput = document.getElementById('chat-file-input');
    const attachBtn = document.getElementById('chat-attach-btn');
    const filePreview = document.getElementById('chat-file-preview');
    const fileNameSpan = document.getElementById('chat-file-name');
    const removeFileBtn = document.getElementById('chat-remove-file');

    if (!chatMessages || !chatForm || !chatInput) return;

    let taskSaving = false;
    let taskCreated = false;

    function openTaskModal(title = '') {
        if (!createTaskModal || !createTaskForm || taskSaving) return false;
        createTaskForm.reset();
        taskCreated = false;
        if (taskSubmitButton) taskSubmitButton.disabled = false;
        if (taskCancelButton) {
            taskCancelButton.disabled = false;
            taskCancelButton.textContent = 'Annulla';
        }
        if (taskFeedback) {
            taskFeedback.textContent = '';
            taskFeedback.classList.remove('is-error', 'is-success');
        }
        updateTaskAssigneeOptions();
        document.getElementById('chat-task-title').value = title;
        createTaskModal.style.display = 'flex';
        document.getElementById('chat-task-title').focus();
        return true;
    }

    function closeTaskModal() {
        if (!createTaskModal || !createTaskForm) return;
        if (taskSaving) return;
        createTaskModal.style.display = 'none';
        createTaskForm.reset();
        taskCreated = false;
        if (taskCancelButton) taskCancelButton.textContent = 'Annulla';
        if (taskSubmitButton) taskSubmitButton.disabled = false;
        if (taskFeedback) {
            taskFeedback.textContent = '';
            taskFeedback.classList.remove('is-error', 'is-success');
        }
        if (taskAssignee && typeof gestoreNoteChat !== 'undefined') {
            updateTaskAssigneeOptions();
        }
    }

    function updateTaskAssigneeOptions() {
        if (!taskCategory || !taskAssignee || !gestoreNoteChat.users) return;

        const selectedAssignee = taskAssignee.value;
        const allowedUsers = (gestoreNoteChat.usersByCategory || {})[taskCategory.value] || [];
        const users = taskCategory.value && allowedUsers.length
            ? gestoreNoteChat.users.filter(user => allowedUsers.some(id => String(id) === String(user.id)))
            : gestoreNoteChat.users;

        taskAssignee.replaceChildren(new Option('-- Nessuno --', ''));
        users.forEach(user => taskAssignee.add(new Option(user.name, user.id)));
        if (users.some(user => String(user.id) === selectedAssignee)) {
            taskAssignee.value = selectedAssignee;
        }
    }

    if (createTaskModal && createTaskForm) {
        taskCancelButton.addEventListener('click', closeTaskModal);
        createTaskModal.addEventListener('click', event => {
            if (event.target === createTaskModal) closeTaskModal();
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && createTaskModal.style.display !== 'none') closeTaskModal();
        });
        if (taskCategory) taskCategory.addEventListener('change', updateTaskAssigneeOptions);

        createTaskForm.addEventListener('submit', event => {
            event.preventDefault();
            if (taskSaving || taskCreated) return;
            const title = document.getElementById('chat-task-title').value.trim();
            if (!title) {
                document.getElementById('chat-task-title').focus();
                return;
            }

            const categoryId = taskCategory.value;
            const tagId = document.getElementById('chat-task-tag').value;
            const payload = {
                titolo: title,
                contenuto: document.getElementById('chat-task-content').value.trim(),
                priorita: document.getElementById('chat-task-priority').value,
                scadenza: document.getElementById('chat-task-due-date').value,
                assegnato_a: taskAssignee.value ? parseInt(taskAssignee.value, 10) : 0,
                categoria_nota: categoryId ? [parseInt(categoryId, 10)] : [],
                tag_nota: tagId ? [parseInt(tagId, 10)] : []
            };

            taskSaving = true;
            taskSubmitButton.disabled = true;
            taskCancelButton.disabled = true;
            taskFeedback.textContent = 'Creazione della task...';
            taskFeedback.classList.remove('is-error', 'is-success');

            const taskEndpoint = gestoreNoteChat.root.replace(/\/chat\/?$/, '/note');
            fetch(taskEndpoint, {
                method: 'POST',
                headers: {
                    'X-WP-Nonce': gestoreNoteChat.nonce,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })
                .then(async response => {
                    const responseText = await response.text();
                    let result;
                    try {
                        result = JSON.parse(responseText);
                    } catch {
                        const contentType = response.headers.get('content-type') || 'sconosciuto';
                        console.error('Risposta non JSON durante la creazione della task:', {
                            status: response.status,
                            contentType,
                            url: response.url
                        });
                        throw new Error(`Il server ha restituito una risposta non valida (HTTP ${response.status}, ${contentType}). Controlla la scheda Rete e i log PHP.`);
                    }
                    if (!response.ok) throw new Error(result.message || 'Errore durante la creazione della task.');
                    return result;
                })
                .then(() => {
                    taskCreated = true;
                    taskFeedback.textContent = 'Task creata. La trovi nella bacheca.';
                    taskFeedback.classList.add('is-success');
                    taskCancelButton.textContent = 'Chiudi';
                })
                .catch(error => {
                    taskFeedback.textContent = error.message || 'Errore di rete durante la creazione della task.';
                    taskFeedback.classList.add('is-error');
                })
                .finally(() => {
                    taskSaving = false;
                    taskCancelButton.disabled = false;
                    if (!taskCreated) taskSubmitButton.disabled = false;
                });
        });
    }

    let isFirstLoad = true;
    let noteCacheChat = [];
    let utentiChat = [];
    let lastRenderedMessagesSignature = '';
    let selectedFile = null;
    let editingId = null;              // id del messaggio in modifica (null = nessuno)
    const messaggiPerId = new Map();   // ultimi messaggi ricevuti, per id

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
                    messaggiPerId.clear();
                    data.forEach(m => messaggiPerId.set(String(m.id), m));

                    // Il messaggio in modifica è stato eliminato altrove: esco dalla modalità modifica
                    if (editingId !== null && !messaggiPerId.has(editingId)) {
                        editingId = null;
                    }

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
                        const modificatoHtml = msg.edited ? '<span class="msg-edited">(modificato)</span>' : '';

                        let azioniHtml = '';
                        if (msg.can_edit || msg.can_delete) {
                            const idAttr = escapeHtml(msg.id);
                            azioniHtml = `<span class="msg-actions">
                                ${msg.can_edit ? `<button type="button" class="msg-action-btn" data-action="modifica" data-msg-id="${idAttr}" title="Modifica messaggio" aria-label="Modifica messaggio">✏️</button>` : ''}
                                ${msg.can_delete ? `<button type="button" class="msg-action-btn" data-action="elimina" data-msg-id="${idAttr}" title="Elimina messaggio" aria-label="Elimina messaggio">🗑️</button>` : ''}
                            </span>`;
                        }

                        html += `
                        <div class="chat-message${selfClass}" data-msg-id="${escapeHtml(msg.id)}">
                            <div class="chat-message-header">
                                <span class="msg-author">${escapeHtml(msg.author)}</span>
                                ${modificatoHtml}
                                ${azioniHtml}
                            </div>
                            <span class="msg-text">${formattaTestoChat(msg.text)}</span>
                            ${attachmentHtml}
                            ${oraHtml}
                        </div>
                    `;
                    });

                    const signature = data.map(msg => `${msg.id || ''}|${msg.author || ''}|${msg.text || ''}|${msg.date || ''}|${msg.attachment_url || ''}|${msg.edited ? 1 : 0}|${msg.can_edit ? 1 : 0}|${msg.can_delete ? 1 : 0}`).join('::');
                    const shouldScrollToBottom = isFirstLoad || (chatMessages.scrollHeight - chatMessages.clientHeight <= chatMessages.scrollTop + 80);

                    // Non ridisegno la lista mentre l'utente sta modificando un messaggio,
                    // altrimenti l'aggiornamento automatico cancellerebbe il testo in corso
                    if (editingId === null && lastRenderedMessagesSignature !== signature) {
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

    // ------------------------------------------------------------------
    // Modifica ed eliminazione dei messaggi
    // ------------------------------------------------------------------

    // PUT/DELETE inviati come POST + method override, così funzionano anche
    // dove il server blocca i metodi HTTP non standard
    function richiestaMessaggio(id, metodo, payload) {
        const headers = {
            'X-WP-Nonce': gestoreNoteChat.nonce,
            'X-HTTP-Method-Override': metodo
        };
        const opts = { method: 'POST', headers: headers, credentials: 'same-origin' };

        if (payload) {
            headers['Content-Type'] = 'application/json';
            opts.body = JSON.stringify(payload);
        }

        return fetch(gestoreNoteChat.root + '/' + encodeURIComponent(id), opts).then(async res => {
            let data = null;
            try { data = await res.json(); } catch (err) { /* risposta non JSON */ }
            if (!res.ok) throw new Error((data && data.message) || 'Errore di rete');
            return data;
        });
    }

    function chiudiEditor() {
        const editor = chatMessages.querySelector('.msg-edit-box');
        if (editor) {
            const testoEl = editor.previousElementSibling;
            if (testoEl) testoEl.style.display = '';
            editor.remove();
        }
        editingId = null;
    }

    function avviaModifica(id) {
        const msg = messaggiPerId.get(String(id));
        const box = chatMessages.querySelector(`.chat-message[data-msg-id="${id}"]`);
        const testoEl = box ? box.querySelector('.msg-text') : null;
        if (!msg || !testoEl) return;

        if (editingId !== null) chiudiEditor();
        editingId = String(id);

        const editor = document.createElement('div');
        editor.className = 'msg-edit-box';
        editor.innerHTML = `
            <input type="text" class="msg-edit-input" maxlength="2000" autocomplete="off">
            <div class="msg-edit-actions">
                <button type="button" class="button button-small msg-edit-cancel">Annulla</button>
                <button type="button" class="button button-primary button-small msg-edit-save">Salva</button>
            </div>`;

        const input = editor.querySelector('.msg-edit-input');
        const saveBtn = editor.querySelector('.msg-edit-save');
        const cancelBtn = editor.querySelector('.msg-edit-cancel');
        input.value = msg.text || '';

        saveBtn.addEventListener('click', () => salvaModifica(id, input, saveBtn, cancelBtn));
        cancelBtn.addEventListener('click', chiudiEditor);
        input.addEventListener('keydown', function (ev) {
            if (ev.key === 'Enter') {
                ev.preventDefault();
                salvaModifica(id, input, saveBtn, cancelBtn);
            } else if (ev.key === 'Escape') {
                ev.preventDefault();
                chiudiEditor();
            }
        });

        testoEl.style.display = 'none';
        testoEl.after(editor);
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
    }

    function salvaModifica(id, input, saveBtn, cancelBtn) {
        const msg = messaggiPerId.get(String(id));
        const testo = input.value.trim();

        if (msg && testo === (msg.text || '').trim()) {
            chiudiEditor();
            return;
        }
        if (!testo && !(msg && msg.attachment_url)) {
            alert('Il messaggio non può essere vuoto.');
            input.focus();
            return;
        }

        input.disabled = saveBtn.disabled = cancelBtn.disabled = true;

        richiestaMessaggio(id, 'PUT', { testo: testo })
            .then(() => {
                chiudiEditor();
                caricaMessaggi();
            })
            .catch(err => {
                alert(err.message || 'Errore durante la modifica del messaggio.');
                input.disabled = saveBtn.disabled = cancelBtn.disabled = false;
                input.focus();
            });
    }

    function eliminaMessaggio(id, btn) {
        const msg = messaggiPerId.get(String(id));
        let conferma = 'Vuoi eliminare questo messaggio? L\'operazione non può essere annullata.';
        if (msg && msg.attachment_url) conferma += '\nVerrà eliminato anche il file allegato.';
        if (!window.confirm(conferma)) return;

        btn.disabled = true;

        richiestaMessaggio(id, 'DELETE')
            .then(() => {
                if (editingId === String(id)) editingId = null;
                caricaMessaggi();
            })
            .catch(err => {
                alert(err.message || 'Errore durante l\'eliminazione del messaggio.');
                btn.disabled = false;
            });
    }

    chatMessages.addEventListener('click', function (e) {
        const btn = e.target.closest('.msg-action-btn');
        if (!btn) return;
        const id = btn.getAttribute('data-msg-id');
        const azione = btn.getAttribute('data-action');
        if (azione === 'modifica') avviaModifica(id);
        if (azione === 'elimina') eliminaMessaggio(id, btn);
    });

    // ------------------------------------------------------------------

    chatForm.addEventListener('submit', function (e) {
        e.preventDefault();
        nascondiDropdownMentions();
        const testo = chatInput.value.trim();
        const taskCommand = testo.match(/^\/task(?:\s+(.+))?$/i);
        if (taskCommand) {
            if (openTaskModal(taskCommand[1] || '')) chatInput.value = '';
            return;
        }
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