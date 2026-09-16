(function () {
    'use strict';

    function aggiornaContatoreChecklist() {
        const counterEl = document.getElementById('sottotask-counter');
        const listaContainer = document.getElementById('modale-lista-sottotask');
        if (!counterEl || !listaContainer) return;

        const totali = listaContainer.querySelectorAll('.gn-sottotask-item').length;
        const completati = listaContainer.querySelectorAll('.gn-sottotask-item.completato').length;

        counterEl.textContent = completati + ' di ' + totali + ' completati';
    }

    function aggiungiSottotaskUI(testo = '', completato = false) {
        const listaContainer = document.getElementById('modale-lista-sottotask');
        const inputNuovo = document.getElementById('input-nuovo-sottotask');

        if (!listaContainer) return;

        const testoPulito = typeof testo === 'string' ? testo.trim() : '';
        if (!testoPulito) return;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'gn-sottotask-item' + (completato ? ' completato' : '');

        itemDiv.innerHTML = `
            <label>
                <input type="checkbox" class="gn-sottotask-checkbox" ${completato ? 'checked' : ''}>
                <span>${escapeHtml(testoPulito)}</span>
            </label>
            <button type="button" class="gn-sottotask-elimina">&times;</button>
        `;

        const checkbox = itemDiv.querySelector('.gn-sottotask-checkbox');
        checkbox.addEventListener('change', function () {
            if (this.checked) {
                itemDiv.classList.add('completato');
            } else {
                itemDiv.classList.remove('completato');
            }
            aggiornaContatoreChecklist();
        });

        const btnElimina = itemDiv.querySelector('.gn-sottotask-elimina');
        btnElimina.addEventListener('click', function () {
            itemDiv.remove();
            aggiornaContatoreChecklist();
        });

        listaContainer.appendChild(itemDiv);

        if (inputNuovo) {
            inputNuovo.value = '';
            inputNuovo.focus();
        }

        aggiornaContatoreChecklist();
    }

    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function (m) { return map[m]; });
    }

    document.addEventListener('DOMContentLoaded', function () {
        const btnAggiungi = document.getElementById('btn-aggiungi-sottotask');
        const inputNuovo = document.getElementById('input-nuovo-sottotask');

        if (btnAggiungi && inputNuovo) {
            btnAggiungi.addEventListener('click', function (e) {
                e.preventDefault();
                aggiungiSottotaskUI(inputNuovo.value, false);
            });

            inputNuovo.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    aggiungiSottotaskUI(inputNuovo.value, false);
                }
            });
        }
    });

    window.GN_Sottotask = {
        aggiungiUI: aggiungiSottotaskUI,
        aggiornaContatore: aggiornaContatoreChecklist
    };
    
})();