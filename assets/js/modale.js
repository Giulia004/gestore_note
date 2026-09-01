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

        if (btnSalva)
            btnSalva.addEventListener('click', salvaModificaModale);
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

        modale.style.display = 'flex';
    }

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

        var payload = {
            titolo: titolo,
            contenuto: contenuto,
            priorita: priorita,
            scadenza: scadenza,
            assegnato_a: assegnato_a ? parseInt(assegnato_a, 10) : 0,
            tag_nota: tagSelezionato ? [parseInt(tagSelezionato, 10)] : [],
            categoria_nota: categoriaSelezionata ? [parseInt(categoriaSelezionata, 10)] : []
        };

        window.GN_API.fetch(API_URL + '/' + id, {
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

    window.GN_Modale = { apri: apriModale };
})();