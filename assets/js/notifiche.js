document.addEventListener('DOMContentLoaded', function () {
    if (typeof gestoreNoteChat === 'undefined') return;

    let ultimoIdLetto = localStorage.getItem('gn_ultimo_chat_id') || 0;

    const container = document.createElement('div');
    container.id = 'gestore-note-toast-container';
    document.body.appendChild(container);

    fetch(gestoreNoteChat.root, {
        method: 'GET',
        headers: { 'X-WP-Nonce': gestoreNoteChat.nonce }
    })
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data) && data.length > 0) {
                const ultimoMessaggio = data[data.length - 1];
                if (!ultimoIdLetto) {
                    ultimoIdLetto = ultimoMessaggio.id;
                    localStorage.setItem('gn_ultimo_chat_id', ultimoIdLetto);
                }
            }
        })
        .catch(err => console.error("Errore inizializzazione notifiche", err));

    function controllaNuoviMessaggi() {
        fetch(gestoreNoteChat.root, {
            method: 'GET',
            headers: { 'X-WP-Nonce': gestoreNoteChat.nonce }
        })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    const ultimoMessaggio = data[data.length - 1];

                    if (ultimoIdLetto && Number(ultimoMessaggio.id) > Number(ultimoIdLetto)) {
                        if (String(ultimoMessaggio.author_id) !== String(gestoreNoteChat.currentUserId)) {

                            // Rilevamento menzione tramite nome utente pulito (@NomeUtente)
                            const nomeUtenteCorrente = gestoreNoteChat.currentUserName;
                            const tagMioUtente = `@${nomeUtenteCorrente}`;
                            const isMenzione = ultimoMessaggio.text && ultimoMessaggio.text.includes(tagMioUtente);

                            if (isMenzione) {
                                mostraNotifica(ultimoMessaggio.author, ultimoMessaggio.text, true);
                                playNotificaAudio(true);
                            } else {
                                mostraNotifica(ultimoMessaggio.author, ultimoMessaggio.text, false);
                                playNotificaAudio(false);
                            }
                        }
                        ultimoIdLetto = ultimoMessaggio.id;
                        localStorage.setItem('gn_ultimo_chat_id', ultimoIdLetto);
                    }
                }
            })
            .catch(err => console.error("Errore controllo notifiche", err));
    }

    function mostraNotifica(autore, testo, isMenzione) {
        const toast = document.createElement('div');
        toast.className = 'gestore-note-toast';

        if (isMenzione) {
            toast.style.borderLeftColor = '#d63638';
        }

        const titoloHtml = isMenzione
            ? `⚠️ ${escapeHtml(autore)} ti ha menzionato!`
            : `Nuovo messaggio da ${escapeHtml(autore)}`;

        toast.innerHTML = `
            <span class="toast-title">${titoloHtml}</span>
            <span>${escapeHtml(testo ? testo.substring(0, 60) : 'Allegato ricevuto')}</span>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 6000);
    }

    function playNotificaAudio(isMenzione) {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(isMenzione ? 880 : 587.33, audioCtx.currentTime);

            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);

            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.25);
        } catch (e) {
            console.error("Errore riproduzione audio notifica", e);
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.toString().replace(/[&<>"']/g, m => map[m]);
    }

    setInterval(controllaNuoviMessaggi, 15000);
});