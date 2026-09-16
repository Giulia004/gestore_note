(function () {
    'use strict';

    var API_URL = typeof GN_Data !== 'undefined' ? GN_Data.restUrl + '/note' : '';

    document.addEventListener('DOMContentLoaded', function () {
        var btnAnnulla = document.getElementById('modale-btn-annulla');
        var btnSalva = document.getElementById('modale-btn-salva');
        var modale = document.getElementById('gestore-note-modale');

        if (btnAnnulla && modale) {
            btnAnnulla.addEventListener('click', function () {
                modale.style.display = 'none';
            });
        }

        var selectCategoria = document.getElementById('modale-nota-categoria');
        if (selectCategoria) {
            selectCategoria.addEventListener('change', filtraUtentiPerCategoriaModale);
        }

        if (btnSalva) {
            btnSalva.addEventListener('click', salvaModificaModale);
        }

        var btnNuovaCategoria = document.getElementById('nota-aggiungi-categoria-btn');
        if (btnNuovaCategoria) btnNuovaCategoria.addEventListener('click', function () { apriModaleCategoria('create'); });

        var btnModificaCategoria = document.getElementById('nota-modifica-categoria-btn');
        if (btnModificaCategoria) btnModificaCategoria.addEventListener('click', function () { apriModaleCategoria('edit'); });

        var btnChiudiCategoria = document.getElementById('modale-categoria-annulla');
        if (btnChiudiCategoria) btnChiudiCategoria.addEventListener('click', chiudiModaleCategoria);

        var btnSalvaCategoria = document.getElementById('modale-categoria-salva');
        if (btnSalvaCategoria) btnSalvaCategoria.addEventListener('click', salvaCategoria);

        var inputNuovaCategoria = document.getElementById('nuova-categoria-nome');
        if (inputNuovaCategoria) {
            inputNuovaCategoria.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') salvaCategoria();
            });
        }

        var checkAllCategoria = document.getElementById('nuova-categoria-seleziona-tutti');
        if (checkAllCategoria) {
            checkAllCategoria.addEventListener('change', function () {
                var checkboxList = document.querySelectorAll('.categoria-user-checkbox');
                checkboxList.forEach(function (checkbox) {
                    checkbox.checked = checkAllCategoria.checked;
                });
            });
        }

        var selectCategoriaModal = document.getElementById('modale-categoria-seleziona');
        if (selectCategoriaModal) {
            selectCategoriaModal.addEventListener('change', function () {
                var categoriaId = this.value;
                var modale = document.getElementById('gestore-note-categoria-modale');
                var input = document.getElementById('nuova-categoria-nome');
                var utentiWrap = document.getElementById('nuova-categoria-utenti');
                var checkboxes = utentiWrap ? utentiWrap.querySelectorAll('.categoria-user-checkbox') : [];
                var selectedOption = this.options[this.selectedIndex];

                modale && (modale.dataset.categoryId = categoriaId || '');
                modale && (modale.dataset.action = categoriaId ? 'edit' : 'create');

                if (!categoriaId || !selectedOption) {
                    if (input) input.value = '';
                    checkboxes.forEach(function (checkbox) { checkbox.checked = false; });
                    return;
                }

                if (input) input.value = selectedOption.textContent.trim();

                var utentiAbilitati = GN_Data && GN_Data.usersByCategory ? GN_Data.usersByCategory[categoriaId] || [] : [];
                checkboxes.forEach(function (checkbox) {
                    checkbox.checked = utentiAbilitati.some(function (id) {
                        return String(id) === String(checkbox.value);
                    });
                });
            });
        }

        document.addEventListener('change', function (e) {
            if (e.target && e.target.classList && e.target.classList.contains('categoria-user-checkbox')) {
                var wrapper = document.getElementById('nuova-categoria-utenti');
                var all = wrapper ? wrapper.querySelectorAll('.categoria-user-checkbox') : [];
                var checkAll = document.getElementById('nuova-categoria-seleziona-tutti');
                if (checkAll && all.length) {
                    checkAll.checked = Array.from(all).every(function (checkbox) { return checkbox.checked; });
                }
            }
        });

        var btnNuovaTag = document.getElementById('nota-aggiungi-tag-btn');
        if (btnNuovaTag) btnNuovaTag.addEventListener('click', apriModaleTag);

        var btnChiudiTag = document.getElementById('modale-tag-annulla');
        if (btnChiudiTag) btnChiudiTag.addEventListener('click', chiudiModaleTag);

        var btnSalvaTag = document.getElementById('modale-tag-salva');
        if (btnSalvaTag) btnSalvaTag.addEventListener('click', salvaTag);

        var inputNuovaTag = document.getElementById('nuova-tag-nome');
        if (inputNuovaTag) {
            inputNuovaTag.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') salvaTag();
            });
        }

        var btnNuovaNota = document.getElementById('nota-aggiungi-nota-btn');
        if (btnNuovaNota) btnNuovaNota.addEventListener('click', apriModaleNota);

        var btnChiudiNota = document.getElementById('modale-nota-annulla');
        if (btnChiudiNota) btnChiudiNota.addEventListener('click', chiudiModaleNota);

        var btnSalvaNota = document.getElementById('modale-nota-salva');
        if (btnSalvaNota) btnSalvaNota.addEventListener('click', aggiungiNota);

        var inputTitoloNota = document.getElementById('modale-nota-titolo');
        if (inputTitoloNota) {
            inputTitoloNota.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') aggiungiNota();
            });
        }
    });

    function apriModale(nota) {
        var modale = document.getElementById('gestore-note-modale');
        if (!modale) return;

        document.getElementById('modale-nota-id').value = nota.id;
        document.getElementById('modale-nota-titolo').value = nota.titolo || '';
        document.getElementById('modale-nota-contenuto').value = nota.contenuto || '';
        document.getElementById('modale-nota-priorita').value = nota.priorita || 'media';
        document.getElementById('modale-nota-scadenza').value = nota.scadenza || '';
        document.getElementById('modale-nota-tag').value = (nota.tag_nota && nota.tag_nota.length > 0) ? nota.tag_nota[0].id : '';

        var selectCatModale = document.getElementById('modale-nota-categoria');
        var selectAssegnatoModale = document.getElementById('modale-nota-assegnato');
        if (selectCatModale) {
            selectCatModale.value = (nota.categoria_nota && nota.categoria_nota.length > 0) ? nota.categoria_nota[0].id : '';
        }

        filtraUtentiPerCategoriaModale();
        if (selectAssegnatoModale && nota.assegnato_a) {
            selectAssegnatoModale.value = String(nota.assegnato_a.id);
        }

        // Popola i sottotask esistenti nella modale di modifica
        var listaSottotask = document.getElementById('modale-lista-sottotask');
        if (listaSottotask) {
            listaSottotask.innerHTML = '';
            var sottotaskArray = Array.isArray(nota.sottotask) ? nota.sottotask : [];
            sottotaskArray.forEach(function (st) {
                if (typeof window.GN_Sottotask !== 'undefined' && typeof window.GN_Sottotask.aggiungiUI === 'function') {
                    window.GN_Sottotask.aggiungiUI(st.testo, st.completato);
                }
            });
        }

        // Popola lo Storico Attività (Log Audit Trail)
        popolaStoricoLog(nota);

        modale.style.display = 'flex';
    }

    function popolaStoricoLog(nota) {
        var logContainer = document.getElementById('modale-storico-log');
        if (!logContainer) return;

        logContainer.innerHTML = '';
        var logs = Array.isArray(nota.log_attivita) ? nota.log_attivita : [];

        if (logs.length === 0) {
            logContainer.innerHTML = '<em style="font-size: 11px; color: #646970;">Nessuna attività registrata.</em>';
            return;
        }

        logs.forEach(function (log) {
            var item = document.createElement('div');
            item.style.fontSize = '11px';
            item.style.padding = '3px 0';
            item.style.borderBottom = '1px solid #f0f0f1';
            item.textContent = '🕒 ' + (log.data || '') + ' - ' + (log.azione || '');
            logContainer.appendChild(item);
        });
    }

    function apriModaleCategoria(modalita) {
        var modale = document.getElementById('gestore-note-categoria-modale');
        var input = document.getElementById('nuova-categoria-nome');
        var utentiWrap = document.getElementById('nuova-categoria-utenti');
        var titolo = document.getElementById('modale-categoria-titolo');
        var btnSalva = document.getElementById('modale-categoria-salva');
        var checkAll = document.getElementById('nuova-categoria-seleziona-tutti');
        var selectCategoriaInModal = document.getElementById('modale-categoria-seleziona');
        if (!modale || !input || !utentiWrap || !titolo || !btnSalva || !checkAll || !selectCategoriaInModal) return;

        var azione = modalita === 'edit' ? 'edit' : 'create';

        modale.dataset.action = azione;
        modale.dataset.categoryId = '';

        titolo.textContent = azione === 'edit' ? 'Modifica categoria' : 'Nuova categoria';
        btnSalva.textContent = azione === 'edit' ? 'Salva modifiche' : 'Salva categoria';

        input.value = '';
        selectCategoriaInModal.value = '';
        checkAll.checked = false;
        var checkboxes = utentiWrap.querySelectorAll('.categoria-user-checkbox');
        checkboxes.forEach(function (checkbox) { checkbox.checked = false; });

        if (azione === 'edit') {
            modale.dataset.categoryId = '';
        }

        modale.style.display = 'flex';
        setTimeout(function () { input.focus(); }, 50);
    }

    function chiudiModaleCategoria() {
        var modale = document.getElementById('gestore-note-categoria-modale');
        if (modale) {
            modale.style.display = 'none';
            modale.dataset.action = 'create';
            modale.dataset.categoryId = '';
        }
    }

    function salvaCategoria() {
        var modale = document.getElementById('gestore-note-categoria-modale');
        var input = document.getElementById('nuova-categoria-nome');
        var utentiWrap = document.getElementById('nuova-categoria-utenti');
        if (!input || !modale || !utentiWrap) return;

        var nome = input.value.trim();
        if (!nome) {
            alert('Inserisci il nome della categoria.');
            input.focus();
            return;
        }

        var utentiSelezionati = [];
        utentiWrap.querySelectorAll('.categoria-user-checkbox').forEach(function (checkbox) {
            if (checkbox.checked) {
                utentiSelezionati.push(parseInt(checkbox.value, 10));
            }
        });

        var azione = modale.dataset.action === 'edit' ? 'edit' : 'create';
        var categoriaId = modale.dataset.categoryId || '';
        var endpoint = GN_Data.restUrl + '/categoria';
        var options = {
            method: 'POST',
            body: JSON.stringify({ nome: nome, utenti: utentiSelezionati })
        };

        if (azione === 'edit' && categoriaId) {
            endpoint = GN_Data.restUrl + '/categoria/' + categoriaId;
            options.method = 'PUT';
        }

        window.GN_API.fetch(endpoint, options).then(function (categoria) {
            var selectIds = ['nota-nuova-categoria', 'filtro-categoria', 'modale-nota-categoria'];
            selectIds.forEach(function (id) {
                var select = document.getElementById(id);
                if (!select) return;

                var existingOption = Array.from(select.options).find(function (option) { return String(option.value) === String(categoria.id); });
                if (!existingOption) {
                    var option = document.createElement('option');
                    option.value = categoria.id;
                    option.textContent = categoria.name;
                    select.appendChild(option);
                } else {
                    existingOption.textContent = categoria.name;
                }
            });

            var selectNuova = document.getElementById('nota-nuova-categoria');
            if (selectNuova) {
                selectNuova.value = String(categoria.id);
            }

            if (typeof GN_Data !== 'undefined' && Array.isArray(GN_Data.categories)) {
                var index = GN_Data.categories.findIndex(function (item) { return String(item.id) === String(categoria.id); });
                if (index === -1) GN_Data.categories.push({ id: categoria.id, name: categoria.name });
                else GN_Data.categories[index].name = categoria.name;
            }

            GN_Data.usersByCategory = GN_Data.usersByCategory || {};
            GN_Data.usersByCategory[String(categoria.id)] = utentiSelezionati.map(String);

            chiudiModaleCategoria();
            input.value = '';
            var checkAll = document.getElementById('nuova-categoria-seleziona-tutti');
            if (checkAll) checkAll.checked = false;
            utentiWrap.querySelectorAll('.categoria-user-checkbox').forEach(function (checkbox) { checkbox.checked = false; });
        }).catch(function (err) {
            alert(err.message || 'Errore durante il salvataggio della categoria.');
        });
    }

    function apriModaleTag() {
        var modale = document.getElementById('gestore-note-tag-modale');
        var input = document.getElementById('nuova-tag-nome');
        if (!modale || !input) return;
        input.value = '';
        modale.style.display = 'flex';
        setTimeout(function () { input.focus(); }, 50);
    }

    function chiudiModaleTag() {
        var modale = document.getElementById('gestore-note-tag-modale');
        if (modale) modale.style.display = 'none';
    }

    function salvaTag() {
        var input = document.getElementById('nuova-tag-nome');
        if (!input) return;

        var nome = input.value.trim();
        if (!nome) {
            alert('Inserisci il nome dell\'etichetta.');
            input.focus();
            return;
        }

        window.GN_API.fetch(GN_Data.restUrl + '/tag', {
            method: 'POST',
            body: JSON.stringify({ nome: nome })
        }).then(function (tag) {
            var selectIds = ['nota-nuovo-tag', 'filtro-tag', 'modale-nota-tag'];
            selectIds.forEach(function (id) {
                var select = document.getElementById(id);
                if (!select) return;

                var existingOption = Array.from(select.options).find(function (option) { return String(option.value) === String(tag.id); });
                if (!existingOption) {
                    var option = document.createElement('option');
                    option.value = tag.id;
                    option.textContent = tag.name;
                    select.appendChild(option);
                } else {
                    existingOption.textContent = tag.name;
                }
            });

            if (typeof GN_Data !== 'undefined' && Array.isArray(GN_Data.tags)) {
                var existingTag = GN_Data.tags.find(function (item) { return String(item.id) === String(tag.id); });
                if (!existingTag) GN_Data.tags.push({ id: tag.id, name: tag.name });
            }

            chiudiModaleTag();
            input.value = '';
        }).catch(function (err) {
            alert(err.message || 'Errore durante la creazione dell\'etichetta.');
        });
    }

    window.GN_Modale = { apri: apriModale };
})();

function filtraUtentiPerCategoriaModale() {
    var selectCategoria = document.getElementById('modale-nota-categoria');
    var selectUtente = document.getElementById('modale-nota-assegnato');
    if (!selectCategoria || !selectUtente || !GN_Data || !GN_Data.users) return;

    var categoriaId = selectCategoria.value;
    var utenti = GN_Data.users.slice();
    var utentiAbilitati = GN_Data.usersByCategory ? GN_Data.usersByCategory[categoriaId] : [];

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

function salvaModificaModale() {
    var id = document.getElementById('modale-nota-id').value;
    var titolo = document.getElementById('modale-nota-titolo').value.trim();
    var contenuto = document.getElementById('modale-nota-contenuto').value.trim();
    var priorita = document.getElementById('modale-nota-priorita').value;
    var scadenza = document.getElementById('modale-nota-scadenza').value;
    var assegnato_a = document.getElementById('modale-nota-assegnato').value;
    var tagSelezionato = document.getElementById('modale-nota-tag').value;
    var categoriaSelezionata = document.getElementById('modale-nota-categoria') ? document.getElementById('modale-nota-categoria').value : '';

    if (!titolo) { alert("Il titolo non può essere vuoto."); return; }

    var sottotaskList = [];
    var items = document.querySelectorAll('#modale-lista-sottotask .gn-sottotask-item');
    items.forEach(function (item) {
        var span = item.querySelector('span');
        var checkbox = item.querySelector('input[type="checkbox"]');
        if (span) {
            sottotaskList.push({
                testo: span.textContent,
                completato: checkbox ? checkbox.checked : false
            });
        }
    });

    var payload = {
        titolo: titolo,
        contenuto: contenuto,
        priorita: priorita,
        scadenza: scadenza,
        assegnato_a: assegnato_a ? parseInt(assegnato_a, 10) : 0,
        tag_nota: tagSelezionato ? [parseInt(tagSelezionato, 10)] : [],
        categoria_nota: categoriaSelezionata ? [parseInt(categoriaSelezionata, 10)] : [],
        sottotask: sottotaskList
    };

    var apiUrl = typeof GN_Data !== 'undefined' ? GN_Data.restUrl + '/note' : '';

    window.GN_API.fetch(apiUrl + '/' + id, {
        method: 'PUT',
        body: JSON.stringify(payload)
    }).then(function (notaAggiornata) {
        var index = window.noteCache.findIndex(function (n) { return String(n.id) === String(id); });
        if (index !== -1) {
            window.noteCache[index] = notaAggiornata;
        }
        if (typeof window.GN_Board !== 'undefined') {
            window.GN_Board.disegnaBoard();
        }
        document.getElementById('gestore-note-modale').style.display = 'none';
    }).catch(function (err) { alert("Errore durante il salvataggio: " + err.message); });
}

function apriModaleNota() {
    var modale = document.getElementById('gestore-note-modale-nota');
    var input = document.getElementById('modale-nota-titolo');
    if (!modale || !input) return;

    modale.style.display = 'flex';
    setTimeout(function () { input.focus(); }, 50);
}

function chiudiModaleNota() {
    var modale = document.getElementById('gestore-note-modale-nota');
    if (modale) {
        modale.style.display = 'none';
        document.getElementById('modale-nota-titolo').value = '';
        document.getElementById('modale-nota-categoria').value = '';
        document.getElementById('modale-nota-priorita').value = 'media';
        document.getElementById('modale-nota-assegnato').value = '';
        document.getElementById('modale-nota-scadenza').value = '';
        document.getElementById('modale-nota-tag').value = '';
        document.getElementById('modale-nota-allegato').value = '';
    }
}

function aggiungiNota() {
    var input = document.getElementById('modale-nota-titolo');
    if (!input) return;
    var titolo = input.value.trim();
    if (!titolo) {
        alert('Inserisci il titolo della nota.');
        input.focus();
        return;
    }

    var fileInput = document.getElementById('modale-nota-allegato');
    var fileToUpload = fileInput && fileInput.files.length > 0 ? fileInput.files[0] : null;
    var tagSelezionato = document.getElementById('modale-nota-tag') ? document.getElementById('modale-nota-tag').value : '';
    var categoriaSelezionata = document.getElementById('modale-nota-categoria') ? document.getElementById('modale-nota-categoria').value : '';

    var apiUrl = typeof GN_Data !== 'undefined' ? GN_Data.restUrl + '/note' : '';

    var payload = {
        titolo: titolo,
        priorita: document.getElementById('modale-nota-priorita') ? document.getElementById('modale-nota-priorita').value : 'media',
        scadenza: document.getElementById('modale-nota-scadenza') ? document.getElementById('modale-nota-scadenza').value : '',
        assegnato_a: document.getElementById('modale-nota-assegnato') ? document.getElementById('modale-nota-assegnato').value : '',
        tag_nota: tagSelezionato ? [parseInt(tagSelezionato, 10)] : [],
        categoria_nota: categoriaSelezionata ? [parseInt(categoriaSelezionata, 10)] : []
    };

    window.GN_API.fetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
    }).then(function (nota) {
        if (fileToUpload && nota.id) {
            var formData = new FormData();
            formData.append('file', fileToUpload);
            return fetch(apiUrl + '/' + nota.id + '/allegato', {
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
        if (typeof window.GN_Board !== 'undefined') {
            window.GN_Board.disegnaBoard();
        }
        chiudiModaleNota();
    }).catch(function (err) { alert(err.message); });
}