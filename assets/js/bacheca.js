(function () {
    'use strict';

    var API_URL = typeof GN_Data !== 'undefined' ? GN_Data.restUrl + '/note' : '';
    var STATI = ['todo', 'doing', 'done'];
    window.noteCache = [];

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        var btnAggiungi = document.getElementById('nota-aggiungi-btn');
        if (btnAggiungi) btnAggiungi.addEventListener('click', aggiungiNota);

        var selectCategoria = document.getElementById('nota-nuova-categoria');
        if (selectCategoria) {
            selectCategoria.addEventListener('change', aggiornaUtentiPerCategoria);
        }

        var inputTitolo = document.getElementById('nota-nuovo-titolo');
        if (inputTitolo) {
            inputTitolo.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') aggiungiNota();
            });
        }

        ['filtro-ricerca', 'filtro-assegnato', 'filtro-priorita', 'filtro-categoria', 'filtro-tag'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.addEventListener(id === 'filtro-ricerca' ? 'input' : 'change', disegnaBoard);
        });

        STATI.forEach(function (stato) {
            var col = document.querySelector('.bacheca-colonna-note[data-stato="' + stato + '"]');
            if (col) {
                col.addEventListener('dragover', onDragOver);
                col.addEventListener('dragleave', onDragLeave);
                col.addEventListener('drop', onDrop);
            }
        });

        var board = document.getElementById('bacheca-board');
        if (board) {
            board.addEventListener('click', function (e) {
                var btnElimina = e.target.closest('.card-nota-elimina');
                if (btnElimina) {
                    var card = btnElimina.closest('.card-nota');
                    if (card && card.dataset.id && confirm(GN_Data.i18n.confirmDelete)) {
                        eliminaNota(card.dataset.id);
                    }
                    return;
                }

                var btnModifica = e.target.closest('.card-nota-modifica');
                if (btnModifica) {
                    var card = btnModifica.closest('.card-nota');
                    if (card && card.dataset.id) {
                        var nota = window.noteCache.find(function (n) { return String(n.id) === String(card.dataset.id); });
                        if (nota && typeof window.GN_Modale !== 'undefined') {
                            window.GN_Modale.apri(nota);
                        }
                    }
                }
            });
        }

        aggiornaUtentiPerCategoria();
        caricaNote();
    }

    function aggiornaUtentiPerCategoria() {
        var selectCategoria = document.getElementById('nota-nuova-categoria');
        var selectUtente = document.getElementById('nota-nuovo-assegnato');
        if (!selectCategoria || !selectUtente) return;

        var categoriaId = selectCategoria.value;
        var utenti = GN_Data && GN_Data.users ? GN_Data.users.slice() : [];
        var utentiAbilitati = GN_Data && GN_Data.usersByCategory ? GN_Data.usersByCategory[categoriaId] : [];

        if (categoriaId && utentiAbilitati && utentiAbilitati.length) {
            utenti = utenti.filter(function (u) {
                return utentiAbilitati.some(function (id) { return String(id) === String(u.id); });
            });
        }

        selectUtente.innerHTML = '<option value="">-- Nessuno --</option>';
        utenti.forEach(function (u) {
            var option = document.createElement('option');
            option.value = u.id;
            option.textContent = u.name;
            selectUtente.appendChild(option);
        });
    }

    function caricaNote() {
        if (!API_URL) return;
        if (!window.GN_API || typeof window.GN_API.fetch !== 'function') {
            console.error('GN_API non è pronto');
            return;
        }
        window.GN_API.fetch(API_URL).then(function (note) {
            window.noteCache = note;
            disegnaBoard();
        }).catch(console.error);
    }

    function disegnaBoard() {
        var testoCerca = document.getElementById('filtro-ricerca') ? document.getElementById('filtro-ricerca').value.toLowerCase().trim() : '';
        var utenteFiltro = document.getElementById('filtro-assegnato') ? document.getElementById('filtro-assegnato').value : '';
        var prioritaFiltro = document.getElementById('filtro-priorita') ? document.getElementById('filtro-priorita').value : '';
        var categoriaFiltro = document.getElementById('filtro-categoria') ? document.getElementById('filtro-categoria').value : '';
        var tagFiltro = document.getElementById('filtro-tag') ? document.getElementById('filtro-tag').value : '';

        STATI.forEach(function (stato) {
            var contenitore = document.querySelector('.bacheca-colonna-note[data-stato="' + stato + '"]');
            if (!contenitore) return;

            contenitore.innerHTML = '';

            var filtrate = window.noteCache.filter(function (n) {
                if (n.stato !== stato) return false;
                if (testoCerca && (!n.titolo || n.titolo.toLowerCase().indexOf(testoCerca) === -1) && (!n.contenuto || n.contenuto.toLowerCase().indexOf(testoCerca) === -1)) return false;
                if (utenteFiltro && (!n.assegnato_a || String(n.assegnato_a.id) !== String(utenteFiltro))) return false;
                if (prioritaFiltro && n.priorita !== prioritaFiltro) return false;
                if (categoriaFiltro && (!n.categoria_nota || !n.categoria_nota.some(function (c) { return String(c.id) === String(categoriaFiltro); }))) return false;
                if (tagFiltro && (!n.tag_nota || !n.tag_nota.some(function (t) { return String(t.id) === String(tagFiltro); }))) return false;
                return true;
            });

            filtrate.forEach(function (nota) {
                contenitore.appendChild(costruisciCard(nota));
            });

            var conteggioEl = document.querySelector('.bacheca-conteggio[data-conteggio="' + stato + '"]');
            if (conteggioEl) conteggioEl.textContent = filtrate.length;
        });
    }

    function costruisciCard(nota) {
        var tpl = document.getElementById('template-card-nota');
        if (!tpl) return document.createElement('div');

        var nodo = tpl.content.firstElementChild.cloneNode(true);
        nodo.dataset.id = nota.id;

        var tagsEl = nodo.querySelector('.card-nota-tags');
        if (tagsEl && nota.tag_nota) {
            nota.tag_nota.forEach(function (tag) {
                var badge = document.createElement('span');
                badge.className = 'card-nota-tag-badge';
                badge.textContent = tag.name;
                tagsEl.appendChild(badge);
            });
        }

        var categoriaEl = nodo.querySelector('.card-nota-categoria');
        if (!categoriaEl) {
            categoriaEl = document.createElement('div');
            categoriaEl.className = 'card-nota-categoria';
            var titoloEl = nodo.querySelector('.card-nota-titolo');
            if (titoloEl) {
                nodo.insertBefore(categoriaEl, titoloEl);
            } else {
                nodo.appendChild(categoriaEl);
            }
        }
        if (nota.categoria_nota && nota.categoria_nota.length > 0) {
            categoriaEl.textContent = nota.categoria_nota[0].name;
            categoriaEl.style.display = 'inline-block';
        } else {
            categoriaEl.textContent = '';
            categoriaEl.style.display = 'none';
        }

        nodo.querySelector('.card-nota-titolo').textContent = nota.titolo;
        var contenutoEl = nodo.querySelector('.card-nota-contenuto');
        if (contenutoEl) contenutoEl.textContent = nota.contenuto || '';

        var listaCommentiEl = nodo.querySelector('.card-nota-lista-commenti');
        if (listaCommentiEl && nota.commenti) {
            nota.commenti.forEach(function (c) {
                var cDiv = document.createElement('div');
                cDiv.innerHTML = '<strong>' + escapeHtml(c.autore) + ':</strong> ' + escapeHtml(c.testo);
                listaCommentiEl.appendChild(cDiv);
            });
        }

        var btnInviaCommento = nodo.querySelector('.card-nota-btn-commento');
        var inputCommento = nodo.querySelector('.card-nota-input-commento');
        if (btnInviaCommento && inputCommento) {
            var inviaAzione = function () {
                var testo = inputCommento.value.trim();
                if (!testo) return;

                window.GN_API.fetch(API_URL + '/' + nota.id + '/commenti', {
                    method: 'POST',
                    body: JSON.stringify({ testo: testo })
                }).then(function (nuovoCommento) {
                    if (!nota.commenti) nota.commenti = [];
                    nota.commenti.push(nuovoCommento);
                    var cDiv = document.createElement('div');
                    cDiv.innerHTML = '<strong>' + escapeHtml(nuovoCommento.autore) + ':</strong> ' + escapeHtml(nuovoCommento.testo);
                    listaCommentiEl.appendChild(cDiv);
                    inputCommento.value = '';
                }).catch(function (err) { alert(err.message); });
            };
            btnInviaCommento.addEventListener('click', inviaAzione);
            inputCommento.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') { e.preventDefault(); inviaAzione(); }
            });
        }

        var scadenzaEl = nodo.querySelector('.card-nota-scadenza');
        if (scadenzaEl && nota.scadenza) scadenzaEl.textContent = formattaData(nota.scadenza);

        var prioritaEl = nodo.querySelector('.card-nota-priorita');
        if (prioritaEl) prioritaEl.textContent = capitalizza(nota.priorita || 'media');

        nodo.style.borderLeftColor = coloreStato(nota.stato);

        var assegnatoEl = nodo.querySelector('.card-nota-assegnato');
        if (assegnatoEl) {
            var nomeUtente = GN_Data.i18n.unassigned;
            var coloreBadge = '#787c82';
            if (nota.assegnato_a) {
                nomeUtente = nota.assegnato_a.name;
                coloreBadge = coloreUtente(nota.assegnato_a.id);
            }
            assegnatoEl.innerHTML = '<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:' + coloreBadge + '; margin-right:5px;"></span>Assegnato a: ' + nomeUtente;
        }

        nodo.addEventListener('dragstart', function (e) {
            nodo.classList.add('card-nota-dragging');
            e.dataTransfer.setData('text/plain', nota.id);
        });
        nodo.addEventListener('dragend', function () { nodo.classList.remove('card-nota-dragging'); });

        return nodo;
    }

    function aggiungiNota() {
        var input = document.getElementById('nota-nuovo-titolo');
        if (!input) return;
        var titolo = input.value.trim();
        if (!titolo) return;

        var fileInput = document.getElementById('nota-nuovo-allegato');
        var fileToUpload = fileInput && fileInput.files.length > 0 ? fileInput.files[0] : null;
        var tagSelezionato = document.getElementById('nota-nuovo-tag') ? document.getElementById('nota-nuovo-tag').value : '';
        var categoriaSelezionata = document.getElementById('nota-nuova-categoria') ? document.getElementById('nota-nuova-categoria').value : '';

        var payload = {
            titolo: titolo,
            priorita: document.getElementById('nota-nuova-priorita') ? document.getElementById('nota-nuova-priorita').value : 'media',
            scadenza: document.getElementById('nota-nuova-scadenza') ? document.getElementById('nota-nuova-scadenza').value : '',
            assegnato_a: document.getElementById('nota-nuovo-assegnato') ? document.getElementById('nota-nuovo-assegnato').value : '',
            tag_nota: tagSelezionato ? [parseInt(tagSelezionato, 10)] : [],
            categoria_nota: categoriaSelezionata ? [parseInt(categoriaSelezionata, 10)] : []
        };

        window.GN_API.fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
        }).then(function (nota) {
            if (fileToUpload && nota.id) {
                var formData = new FormData();
                formData.append('file', fileToUpload);
                return fetch(API_URL + '/' + nota.id + '/allegato', {
                    method: 'POST',
                    headers: { 'X-WP-Nonce': GN_Data.nonce },
                    body: formData
                }).then(function (res) {
                    if (!res.ok) throw new Error("Errore nel caricamento allegato");
                    return res.json();
                }).then(function (resAllegato) {
                    nota.allegato_url = resAllegato.url;
                    return nota;
                });
            }
            return nota;
        }).then(function (notaFinale) {
            window.noteCache.unshift(notaFinale);
            disegnaBoard();
            input.value = '';
        }).catch(function (err) { alert(err.message); });
    }

    function eliminaNota(id) {
        window.GN_API.fetch(API_URL + '/' + id, { method: 'POST', headers: { 'X-HTTP-Method-Override': 'DELETE' } })
            .then(function () {
                window.noteCache = window.noteCache.filter(function (n) { return String(n.id) !== String(id); });
                disegnaBoard();
            }).catch(function (err) { alert(err.message); });
    }

    function coloreStato(stato) {
        if ('doing' === stato) return '#2271b1';
        if ('done' === stato) return '#00a32a';
        return '#dba617';
    }

    function coloreUtente(userId) {
        if (!userId) return '#787c82';
        var colori = ['#2271b1', '#d63638', '#00a32a', '#8f56e9', '#d97706', '#00857c'];
        return colori[parseInt(userId, 10) % colori.length];
    }

    function onDragOver(e) { e.preventDefault(); e.currentTarget.closest('.bacheca-colonna').classList.add('bacheca-dragover'); }
    function onDragLeave(e) { e.currentTarget.closest('.bacheca-colonna').classList.remove('bacheca-dragover'); }
    function onDrop(e) {
        e.preventDefault();
        var colonna = e.currentTarget.closest('.bacheca-colonna');
        if (!colonna) return;
        colonna.classList.remove('bacheca-dragover');

        var notaId = e.dataTransfer.getData('text/plain');
        var nuovoStato = e.currentTarget.dataset.stato;
        var nota = window.noteCache.find(function (n) { return String(n.id) === String(notaId); });
        if (!nota || nota.stato === nuovoStato) return;

        nota.stato = nuovoStato;
        disegnaBoard();

        window.GN_API.fetch(API_URL + '/' + notaId, {
            method: 'PUT',
            body: JSON.stringify({ stato: nuovoStato }),
        }).catch(function () { caricaNote(); });
    }

    function formattaData(isoDate) {
        if (!isoDate) return '';
        return new Date(isoDate + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
    }

    function capitalizza(testo) {
        if (!testo) return '';
        return testo.charAt(0).toUpperCase() + testo.slice(1);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    window.GN_Board = { disegnaBoard: disegnaBoard };
})();