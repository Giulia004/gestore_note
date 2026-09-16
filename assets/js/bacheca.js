(function () {
    'use strict';

    var API_URL = typeof GN_Data !== 'undefined' ? GN_Data.restUrl + '/note' : '';
    var STATI = ['todo', 'doing', 'done'];
    var STATI_LABEL = { todo: 'Da fare', doing: 'In corso', done: 'Completato' };
    window.noteCache = [];

    document.addEventListener('DOMContentLoaded', function () {
        init();

        // Campanello dropdown notifiche
        var campanello = document.getElementById('bacheca-notifiche-scadenze');
        var dropdown = document.getElementById('gn-notifiche-dropdown');

        if (campanello && dropdown) {
            campanello.addEventListener('click', function (e) {
                e.stopPropagation();
                var isOpen = dropdown.style.display === 'block';
                dropdown.style.display = isOpen ? 'none' : 'block';
                if (!isOpen) {
                    popolaListaNotificheDropdown();
                }
            });

            document.addEventListener('click', function (e) {
                if (!campanello.contains(e.target) && !dropdown.contains(e.target)) {
                    dropdown.style.display = 'none';
                }
            });
        }

        // Ascoltatore globale unificato per TUTTI i filtri e l'ordinamento nella toolbar
        var barraFiltri = document.querySelector('.bacheca-filtri');
        if (barraFiltri) {
            barraFiltri.addEventListener('input', function () {
                disegnaBoard();
            });
            barraFiltri.addEventListener('change', function () {
                disegnaBoard();
            });
        }

        // ✋ ATTIVAZIONE EVENTI DRAG & DROP SULLE COLONNE
        inizializzaDragAndDropColonne();
    });

    function init() {
        caricaNote();
    }

    function caricaNote() {
        if (!API_URL) return;
        if (!window.GN_API || typeof window.GN_API.fetch !== 'function') return;
        window.GN_API.fetch(API_URL).then(function (note) {
            window.noteCache = note;
            disegnaBoard();
        }).catch(console.error);
    }

    function disegnaBoard() {
        // Leggiamo i valori correnti di tutti i filtri e dell'ordinamento dalla UI
        var testoRicerca = document.getElementById('filtro-ricerca') ? document.getElementById('filtro-ricerca').value.toLowerCase() : '';
        var filtroUtente = document.getElementById('filtro-assegnato') ? document.getElementById('filtro-assegnato').value : '';
        var filtroPriorita = document.getElementById('filtro-priorita') ? document.getElementById('filtro-priorita').value : '';
        var filtroCategoria = document.getElementById('filtro-categoria') ? document.getElementById('filtro-categoria').value : '';
        var filtroTag = document.getElementById('filtro-tag') ? document.getElementById('filtro-tag').value : '';
        var filtroOrdine = document.getElementById('filtro-ordinamento') ? document.getElementById('filtro-ordinamento').value : '';

        STATI.forEach(function (stato) {
            var contenitore = document.querySelector('.bacheca-colonna-note[data-stato="' + stato + '"]');
            if (!contenitore) return;

            contenitore.innerHTML = '';

            // 1. Filtraggio combinato per stato e per tutti i criteri selezionati
            var filtrate = window.noteCache.filter(function (n) {
                if (n.stato !== stato) return false;

                // Ricerca testuale
                if (testoRicerca) {
                    var matchTitolo = n.titolo && n.titolo.toLowerCase().indexOf(testoRicerca) !== -1;
                    var matchContenuto = n.contenuto && n.contenuto.toLowerCase().indexOf(testoRicerca) !== -1;
                    if (!matchTitolo && !matchContenuto) return false;
                }

                // Assegnatario
                if (filtroUtente) {
                    if (!n.assegnato_a || String(n.assegnato_a.id) !== String(filtroUtente)) return false;
                }

                // Priorità
                if (filtroPriorita) {
                    if (!n.priorita || n.priorita !== filtroPriorita) return false;
                }

                // Categoria
                if (filtroCategoria) {
                    var haCat = Array.isArray(n.categoria_nota) && n.categoria_nota.some(function (c) {
                        return String(c.id) === String(filtroCategoria);
                    });
                    if (!haCat) return false;
                }

                // Etichetta / Tag
                if (filtroTag) {
                    var haTag = Array.isArray(n.tag_nota) && n.tag_nota.some(function (t) {
                        return String(t.id) === String(filtroTag);
                    });
                    if (!haTag) return false;
                }

                return true;
            });

            // 2. Ordinamento avanzato in base alla scelta nel menu a tendina
            if (filtroOrdine === 'scadenza') {
                filtrate.sort(function (a, b) {
                    if (!a.scadenza) return 1;
                    if (!b.scadenza) return -1;
                    return a.scadenza.localeCompare(b.scadenza);
                });
            } else if (filtroOrdine === 'priorita') {
                var pesi = { alta: 1, media: 2, bassa: 3 };
                filtrate.sort(function (a, b) {
                    var pA = pesi[a.priorita] || 2;
                    var pB = pesi[b.priorita] || 2;
                    return pA - pB;
                });
            }

            // 3. Render delle card filtrate e ordinate nella rispettiva colonna
            filtrate.forEach(function (nota) {
                contenitore.appendChild(costruisciCard(nota, stato));
            });

            var conteggioEl = document.querySelector('.bacheca-conteggio[data-conteggio="' + stato + '"]');
            if (conteggioEl) conteggioEl.textContent = filtrate.length;
        });

        aggiornaNotificheScadenze();
    }

    function inizializzaDragAndDropColonne() {
        var colonne = document.querySelectorAll('.bacheca-colonna');
        colonne.forEach(function (colonna) {
            colonna.addEventListener('dragover', function (e) {
                e.preventDefault();
                colonna.classList.add('bacheca-dragover');
            });

            colonna.addEventListener('dragleave', function (e) {
                e.preventDefault();
                colonna.classList.remove('bacheca-dragover');
            });

            colonna.addEventListener('drop', function (e) {
                e.preventDefault();
                colonna.classList.remove('bacheca-dragover');

                var notaId = e.dataTransfer.getData('text/plain');
                var nuovoStato = colonna.querySelector('.bacheca-colonna-note').dataset.stato;

                if (!notaId || !nuovoStato) return;

                var notaTrovata = window.noteCache.find(function (n) { return String(n.id) === String(notaId); });
                if (notaTrovata && notaTrovata.stato !== nuovoStato) {
                    cambiaStatoNota(notaTrovata, nuovoStato);
                }
            });
        });
    }

    function costruisciCard(nota, statoCorrente) {
        var tpl = document.getElementById('template-card-nota');
        if (!tpl) return document.createElement('div');

        var nodo = tpl.content.firstElementChild.cloneNode(true);
        nodo.dataset.id = nota.id;

        // 🏷️ TAGS / ETICHETTE
        var tagsEl = nodo.querySelector('.card-nota-tags');
        if (tagsEl && nota.tag_nota) {
            nota.tag_nota.forEach(function (tag) {
                var badge = document.createElement('span');
                badge.className = 'card-nota-tag-badge';
                badge.textContent = tag.name;
                tagsEl.appendChild(badge);
            });
        }

        // 📂 CATEGORIA
        var categoriaEl = nodo.querySelector('.card-nota-categoria');
        if (!categoriaEl) {
            categoriaEl = document.createElement('div');
            categoriaEl.className = 'card-nota-categoria';
            var titoloEl = nodo.querySelector('.card-nota-titolo');
            if (titoloEl) nodo.insertBefore(categoriaEl, titoloEl);
        }
        if (nota.categoria_nota && nota.categoria_nota.length > 0) {
            categoriaEl.textContent = nota.categoria_nota[0].name;
            categoriaEl.style.display = 'inline-block';
        } else {
            categoriaEl.style.display = 'none';
        }

        nodo.querySelector('.card-nota-titolo').textContent = nota.titolo;
        var contenutoEl = nodo.querySelector('.card-nota-contenuto');
        if (contenutoEl) contenutoEl.textContent = nota.contenuto || '';

        popolaSottotaskCard(nodo, nota);
        formattaScadenzaCard(nodo, nota);

        // 💬 COMMENTI
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
                    aggiornaNotificheScadenze();
                }).catch(function (err) { alert(err.message); });
            };
            btnInviaCommento.addEventListener('click', inviaAzione);
            inputCommento.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') { e.preventDefault(); inviaAzione(); }
            });
        }

        // ⚡ PRIORITÀ E ASSEGNATO
        var prioritaEl = nodo.querySelector('.card-nota-priorita');
        if (prioritaEl && nota.priorita) {
            prioritaEl.textContent = nota.priorita.charAt(0).toUpperCase() + nota.priorita.slice(1);
        }

        var assegnatoEl = nodo.querySelector('.card-nota-assegnato');
        if (assegnatoEl) {
            var nomeUtente = typeof GN_Data !== 'undefined' && GN_Data.i18n ? GN_Data.i18n.unassigned : 'Non assegnato';
            var coloreBadge = '#787c82';
            if (nota.assegnato_a) {
                nomeUtente = nota.assegnato_a.name;
                if (typeof coloreUtente === 'function') coloreBadge = coloreUtente(nota.assegnato_a.id);
            }
            assegnatoEl.innerHTML = '<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:' + coloreBadge + '; margin-right:5px;"></span>Assegnato a: ' + nomeUtente;
        }

        // 🔀 SPOSTAMENTO RAPIDO TRAMITE FRECCE
        var spostaContainer = nodo.querySelector('.card-nota-spostamento-rapido');
        if (spostaContainer) {
            spostaContainer.innerHTML = '';
            var idxStato = STATI.indexOf(statoCorrente);

            if (idxStato > 0) {
                var btnSxEl = document.createElement('button');
                btnSxEl.type = 'button';
                btnSxEl.className = 'button-link card-sposta-btn';
                btnSxEl.title = 'Sposta in ' + STATI_LABEL[STATI[idxStato - 1]];
                btnSxEl.textContent = '◀';
                btnSxEl.addEventListener('click', function (e) {
                    e.stopPropagation();
                    cambiaStatoNota(nota, STATI[idxStato - 1]);
                });
                spostaContainer.appendChild(btnSxEl);
            }

            if (idxStato < STATI.length - 1) {
                var btnDxEl = document.createElement('button');
                btnDxEl.type = 'button';
                btnDxEl.className = 'button-link card-sposta-btn';
                btnDxEl.title = 'Sposta in ' + STATI_LABEL[STATI[idxStato + 1]];
                btnDxEl.textContent = '▶';
                btnDxEl.addEventListener('click', function (e) {
                    e.stopPropagation();
                    cambiaStatoNota(nota, STATI[idxStato + 1]);
                });
                spostaContainer.appendChild(btnDxEl);
            }
        }

        // ✏️ MODIFICA & ❌ ELIMINA
        var btnModifica = nodo.querySelector('.card-nota-modifica');
        if (btnModifica) {
            btnModifica.addEventListener('click', function (e) {
                e.stopPropagation();
                if (typeof window.GN_Modale !== 'undefined' && typeof window.GN_Modale.apri === 'function') {
                    window.GN_Modale.apri(nota);
                }
            });
        }

        var btnElimina = nodo.querySelector('.card-nota-elimina');
        if (btnElimina) {
            btnElimina.addEventListener('click', function (e) {
                e.stopPropagation();
                if (confirm('Sei sicuro di voler eliminare questa task?')) {
                    window.GN_API.fetch(API_URL + '/' + nota.id, { method: 'POST' }).then(function () {
                        window.noteCache = window.noteCache.filter(function (n) { return String(n.id) !== String(nota.id); });
                        disegnaBoard();
                    }).catch(function (err) { alert("Errore: " + err.message); });
                }
            });
        }

        // ✋ DRAG AND DROP SULLA CARD
        nodo.addEventListener('dragstart', function (e) {
            nodo.classList.add('card-nota-dragging');
            e.dataTransfer.setData('text/plain', nota.id);
        });
        nodo.addEventListener('dragend', function () { nodo.classList.remove('card-nota-dragging'); });

        return nodo;
    }

    function cambiaStatoNota(nota, nuovoStato) {
        window.GN_API.fetch(API_URL + '/' + nota.id, {
            method: 'PUT',
            body: JSON.stringify({ stato: nuovoStato })
        }).then(function (notaAggiornata) {
            nota.stato = nuovoStato;
            if (notaAggiornata && notaAggiornata.log_attivita) {
                nota.log_attivita = notaAggiornata.log_attivita;
            }
            disegnaBoard();
        }).catch(function (err) { alert("Errore nello spostamento: " + err.message); });
    }

    function popolaSottotaskCard(card, nota) {
        var container = card.querySelector('.card-nota-sottotask-preview');
        if (!container) return;
        container.innerHTML = '';
        var lista = Array.isArray(nota.sottotask) ? nota.sottotask : [];
        if (lista.length === 0) { container.style.display = 'none'; return; }
        container.style.display = 'flex';

        var completati = lista.filter(function (st) { return st.completato; }).length;
        var header = document.createElement('div');
        header.className = 'card-nota-sottotask-header';
        header.innerHTML = '<span>Checklist</span><span>' + completati + '/' + lista.length + '</span>';
        container.appendChild(header);

        lista.forEach(function (st) {
            var row = document.createElement('label');
            row.className = 'card-nota-sottotask-item-preview';
            var checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = !!st.completato;
            var span = document.createElement('span');
            span.textContent = st.testo;
            if (st.completato) { span.style.textDecoration = 'line-through'; span.style.color = '#8c8f94'; }

            checkbox.addEventListener('change', function () {
                st.completato = checkbox.checked;
                span.style.textDecoration = checkbox.checked ? 'line-through' : 'none';
                span.style.color = checkbox.checked ? '#8c8f94' : '#3c434a';

                var nuotCompletati = nota.sottotask.filter(function (item) { return item.completato; }).length;
                header.querySelector('span:last-child').textContent = nuotCompletati + '/' + nota.sottotask.length;

                window.GN_API.fetch(API_URL + '/' + nota.id, {
                    method: 'PUT',
                    body: JSON.stringify({ sottotask: nota.sottotask })
                }).catch(console.error);
            });
            row.appendChild(checkbox);
            row.appendChild(span);
            container.appendChild(row);
        });
    }

    function formattaScadenzaCard(nodo, nota) {
        var scadenzaEl = nodo.querySelector('.card-nota-scadenza');
        var badgeScadenza = nodo.querySelector('.card-nota-badge-scadenza');
        if (!scadenzaEl) return;

        if (!nota.scadenza) {
            scadenzaEl.style.display = 'none';
            if (badgeScadenza) badgeScadenza.style.display = 'none';
            return;
        }

        scadenzaEl.style.display = 'inline-flex';
        scadenzaEl.textContent = '📅 ' + formattaData(nota.scadenza);

        if (nota.stato !== 'done') {
            var oggi = new Date(); oggi.setHours(0, 0, 0, 0);
            var dataScadenza = new Date(nota.scadenza + 'T00:00:00'); dataScadenza.setHours(0, 0, 0, 0);
            var diffGiorni = Math.round((dataScadenza.getTime() - oggi.getTime()) / (1000 * 3600 * 24));

            if (badgeScadenza) {
                badgeScadenza.style.display = 'inline-flex';
                badgeScadenza.style.alignItems = 'center';
                badgeScadenza.style.gap = '4px';
                badgeScadenza.style.fontSize = '10px';
                badgeScadenza.style.padding = '2px 6px';
                badgeScadenza.style.borderRadius = '3px';
                badgeScadenza.style.fontWeight = '600';
                badgeScadenza.style.marginBottom = '6px';
            }

            if (diffGiorni < 0) {
                nodo.classList.add('scaduta');
                if (badgeScadenza) { badgeScadenza.style.backgroundColor = '#fcf0f0'; badgeScadenza.style.color = '#d63638'; badgeScadenza.textContent = '⚠️ Scaduta'; }
            } else if (diffGiorni === 0) {
                nodo.classList.add('in-scadenza-oggi');
                if (badgeScadenza) { badgeScadenza.style.backgroundColor = '#fef8ee'; badgeScadenza.style.color = '#b98c0a'; badgeScadenza.textContent = '⏰ Scade oggi'; }
            } else if (badgeScadenza) {
                badgeScadenza.style.display = 'none';
            }
        }
    }

    function aggiornaNotificheScadenze() {
        var badgeEl = document.getElementById('gn-badge-conteggio');
        if (!badgeEl) return;

        var oggi = new Date(); oggi.setHours(0, 0, 0, 0);
        var totaleNotifiche = 0;

        window.noteCache.forEach(function (nota) {
            if (nota.scadenza && nota.stato !== 'done') {
                var dataScadenza = new Date(nota.scadenza + 'T00:00:00'); dataScadenza.setHours(0, 0, 0, 0);
                if (Math.round((dataScadenza.getTime() - oggi.getTime()) / (1000 * 3600 * 24)) <= 0) {
                    totaleNotifiche++;
                }
            }
        });

        if (totaleNotifiche > 0) {
            badgeEl.textContent = totaleNotifiche;
            badgeEl.style.display = 'inline-block';
        } else {
            badgeEl.style.display = 'none';
        }
    }

    function popolaListaNotificheDropdown() {
        var listaContainer = document.getElementById('gn-notifiche-lista');
        if (!listaContainer) return;
        listaContainer.innerHTML = '';

        var oggi = new Date(); oggi.setHours(0, 0, 0, 0);
        var elementiNotifica = [];

        window.noteCache.forEach(function (nota) {
            if (nota.scadenza && nota.stato !== 'done') {
                var dataScadenza = new Date(nota.scadenza + 'T00:00:00'); dataScadenza.setHours(0, 0, 0, 0);
                var diffGiorni = Math.round((dataScadenza.getTime() - oggi.getTime()) / (1000 * 3600 * 24));
                if (diffGiorni <= 0) {
                    elementiNotifica.push({
                        tipo: 'scadenza',
                        nota: nota,
                        titolo: nota.titolo,
                        testo: diffGiorni < 0 ? '⚠️ Scaduta da ' + Math.abs(diffGiorni) + ' giorni' : '⏰ Scade oggi',
                        classe: diffGiorni < 0 ? '' : 'oggi'
                    });
                }
            }
            if (nota.commenti && nota.commenti.length > 0) {
                var ultimoCommento = nota.commenti[nota.commenti.length - 1];
                elementiNotifica.push({
                    tipo: 'commento',
                    nota: nota,
                    titolo: nota.titolo,
                    testo: '💬 ' + ultimoCommento.autore + ': "' + ultimoCommento.testo + '"',
                    classe: 'commento-notifica'
                });
            }
        });

        if (elementiNotifica.length === 0) {
            listaContainer.innerHTML = '<div class="gn-notifiche-vuoto">Nessuna nuova notifica 🎉</div>';
            return;
        }

        elementiNotifica.forEach(function (item) {
            var div = document.createElement('div');
            div.className = 'gn-notifiche-item';
            div.innerHTML = `
                <div class="gn-notifiche-item-titolo">${escapeHtml(item.titolo)}</div>
                <div class="gn-notifiche-item-data ${item.classe}">${escapeHtml(item.testo)}</div>
            `;
            div.addEventListener('click', function () {
                document.getElementById('gn-notifiche-dropdown').style.display = 'none';
                if (typeof window.GN_Modale !== 'undefined' && typeof window.GN_Modale.apri === 'function') {
                    window.GN_Modale.apri(item.nota);
                }
            });
            listaContainer.appendChild(div);
        });
    }

    function formattaData(isoDate) {
        if (!isoDate) return '';
        return new Date(isoDate + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    window.GN_Board = { disegnaBoard: disegnaBoard };
})();